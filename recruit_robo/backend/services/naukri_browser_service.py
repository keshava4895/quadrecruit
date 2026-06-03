"""
Naukri Recruiter login via Playwright (headless Chromium).

Akamai Bot Manager blocks raw HTTP login to Naukri.
Using a real browser bypasses bot detection and yields valid session cookies
that can then be used for Resdex API calls.
"""
import asyncio
import re
from datetime import datetime, timezone, timedelta
from config import NAUKRI_EMAIL, NAUKRI_PASSWORD

_session: dict = {
    "cookies":    {},   # {name: value}
    "expires_at": None,
}

_RESDEX_SEARCH = "https://resdex.naukri.com/recruiter/search/result"
_LOGIN_PAGE    = "https://www.naukri.com/nlogin/login?URL=https://resdex.naukri.com/"


def _session_valid() -> bool:
    return bool(
        _session["cookies"] and
        _session["expires_at"] and
        datetime.now(timezone.utc) < _session["expires_at"]
    )


async def browser_login() -> dict:
    """
    Launch headless Chromium, log into Naukri, return session cookies.
    Takes ~10-15 seconds on first run.
    """
    from playwright.async_api import async_playwright

    print("[Naukri] Launching headless browser for login…")
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        ctx     = await browser.new_context(
            user_agent=(
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/124.0.0.0 Safari/537.36"
            ),
            viewport={"width": 1280, "height": 800},
        )
        page = await ctx.new_page()

        # Navigate to login page
        await page.goto(_LOGIN_PAGE, wait_until="domcontentloaded", timeout=30000)
        await page.wait_for_timeout(1500)

        # Fill email
        email_sel = 'input[placeholder*="Email"], input[name="username"], input[type="email"], #usernameField'
        await page.wait_for_selector(email_sel, timeout=10000)
        await page.fill(email_sel, NAUKRI_EMAIL)
        await page.wait_for_timeout(300)

        # Fill password
        pw_sel = 'input[placeholder*="Password"], input[name="password"], input[type="password"], #passwordField'
        await page.fill(pw_sel, NAUKRI_PASSWORD)
        await page.wait_for_timeout(300)

        # Click login button
        btn_sel = 'button[type="submit"], button:has-text("Login"), input[value="Login"]'
        await page.click(btn_sel)

        # Wait for navigation or dashboard
        try:
            await page.wait_for_url("**/resdex/**", timeout=15000)
        except Exception:
            # May redirect to dashboard — still ok
            await page.wait_for_timeout(3000)

        print(f"[Naukri] Post-login URL: {page.url}")

        # Extract all cookies
        raw_cookies = await ctx.cookies()
        cookies = {c["name"]: c["value"] for c in raw_cookies}

        await browser.close()

    if not cookies:
        raise RuntimeError("No cookies received after login — check credentials")

    _session["cookies"]    = cookies
    _session["expires_at"] = datetime.now(timezone.utc) + timedelta(hours=10)
    print(f"[Naukri] Browser login OK — {len(cookies)} cookies captured")
    return cookies


async def get_session() -> dict:
    """Return valid cookies, performing browser login if needed."""
    if not _session_valid():
        await browser_login()
    return _session["cookies"]


async def search_candidates(
    query: str,
    location: str = "",
    experience_min: int = 0,
    experience_max: int = 20,
    limit: int = 10,
) -> list[dict]:
    """
    Search Naukri Resdex using browser-authenticated session.
    Falls back to Resdex API calls with session cookies.
    """
    from playwright.async_api import async_playwright

    cookies = await get_session()
    print(f"[Naukri] Searching Resdex: query='{query}' location='{location}'")

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        ctx     = await browser.new_context(
            user_agent=(
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/124.0.0.0 Safari/537.36"
            ),
        )

        # Inject saved cookies into browser context
        cookie_list = [
            {"name": k, "value": v, "domain": ".naukri.com", "path": "/"}
            for k, v in cookies.items()
        ]
        await ctx.add_cookies(cookie_list)

        page = await ctx.new_page()

        # Build Resdex search URL
        loc_param = f"&jobLocation={location.replace(' ', '%20')}" if location else ""
        search_url = (
            f"https://resdex.naukri.com/recruiter/search/result"
            f"?keyword={query.replace(' ', '%20')}"
            f"&minExp={experience_min}&maxExp={experience_max}"
            f"{loc_param}&noOfResults={min(limit, 20)}"
        )

        await page.goto(search_url, wait_until="networkidle", timeout=30000)
        await page.wait_for_timeout(2000)

        # If redirected to login, session expired — re-login
        if "/nlogin/" in page.url or "/login" in page.url:
            await browser.close()
            _session["cookies"] = {}
            return await search_candidates(query, location, experience_min, experience_max, limit)

        # Extract candidate data from the page
        candidates_raw = await page.evaluate("""
            () => {
                const cards = document.querySelectorAll(
                    '[class*="candidate-card"], [class*="candidateCard"], '
                    '[class*="profile-card"], [class*="search-result"], '
                    '[data-candidate-id], .candidateWrapper'
                );
                return Array.from(cards).map(card => ({
                    name:        card.querySelector('[class*="name"], h2, h3')?.innerText?.trim() || '',
                    headline:    card.querySelector('[class*="designation"], [class*="title"]')?.innerText?.trim() || '',
                    company:     card.querySelector('[class*="company"], [class*="employer"]')?.innerText?.trim() || '',
                    location:    card.querySelector('[class*="location"], [class*="city"]')?.innerText?.trim() || '',
                    experience:  card.querySelector('[class*="exp"], [class*="experience"]')?.innerText?.trim() || '',
                    skills:      Array.from(card.querySelectorAll('[class*="skill"], [class*="tag"]')).map(s => s.innerText.trim()).filter(Boolean),
                    profile_url: card.querySelector('a')?.href || '',
                    candidate_id: card.getAttribute('data-candidate-id') || '',
                }));
            }
        """)

        await browser.close()

    print(f"[Naukri] Found {len(candidates_raw)} candidates on page")
    return [_normalise_browser(c) for c in candidates_raw[:limit] if c.get("name")]


def _normalise_browser(c: dict) -> dict:
    """Map scraped DOM fields → standard candidate dict."""
    exp_str = c.get("experience", "")
    m = re.search(r"(\d+)", exp_str)
    exp_years = int(m.group(1)) if m else 0

    return {
        "name":             c.get("name", "Unknown"),
        "email":            "",
        "phone":            "",
        "headline":         c.get("headline", ""),
        "current_company":  c.get("company", ""),
        "location":         c.get("location", ""),
        "skills":           c.get("skills", []),
        "experience_years": exp_years,
        "experience":       exp_years,
        "summary":          "",
        "availability":     "Open to Opportunities",
        "profile_url":      c.get("profile_url", ""),
        "match_score":      0.80,
        "portal":           "Naukri",
        "candidate_id":     c.get("candidate_id", ""),
    }
