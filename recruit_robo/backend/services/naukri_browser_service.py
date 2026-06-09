"""
Naukri Recruiter login via Playwright (headless Chromium).

Akamai Bot Manager blocks raw HTTP login to Naukri.
Using a real browser bypasses bot detection and yields valid session cookies
that can then be used for Resdex API calls.
"""
import re
from datetime import datetime, timezone, timedelta

_session: dict = {
    "cookies":    {},
    "expires_at": None,
}

_BASE_URL      = "https://recruit.naukri.com"
_RESDEX_SEARCH = f"{_BASE_URL}/recruiter/search/result"
_LOGIN_PAGE    = f"https://www.naukri.com/nlogin/login?URL={_BASE_URL}/"

# Required for running Chromium inside a Docker container as root
_CHROMIUM_ARGS = [
    "--no-sandbox",
    "--disable-setuid-sandbox",
    "--disable-dev-shm-usage",
    "--disable-gpu",
]


def _session_valid() -> bool:
    return bool(
        _session["cookies"] and
        _session["expires_at"] and
        datetime.now(timezone.utc) < _session["expires_at"]
    )


async def browser_login(email: str, password: str) -> dict:
    """
    Launch headless Chromium, log into Naukri, return session cookies.
    Takes ~15-25 seconds on first run inside a container.
    """
    if not email or not password:
        raise RuntimeError("Naukri email/password not configured. Go to Account settings → Portals → Naukri.")

    from playwright.async_api import async_playwright

    print("[Naukri] Launching headless browser for login…")
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True, args=_CHROMIUM_ARGS)
        ctx = await browser.new_context(
            user_agent=(
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/124.0.0.0 Safari/537.36"
            ),
            viewport={"width": 1280, "height": 800},
            locale="en-IN",
        )
        page = await ctx.new_page()

        await page.goto(_LOGIN_PAGE, wait_until="domcontentloaded", timeout=30000)
        await page.wait_for_timeout(2500)

        # Dismiss any popups (app download, cookie consent, etc.)
        for popup_sel in [
            '[class*="popup"] [class*="close"]',
            'button[class*="close"]',
            '[aria-label="Close"]',
            'button:has-text("×")',
        ]:
            try:
                btn = page.locator(popup_sel).first
                if await btn.is_visible(timeout=1500):
                    await btn.click()
                    await page.wait_for_timeout(500)
            except Exception:
                pass

        # Fill email — try multiple selectors
        email_selectors = [
            '#usernameField',
            'input[placeholder*="Email ID"]',
            'input[placeholder*="Email"]',
            'input[name="username"]',
            'input[type="email"]',
            'input[type="text"]:visible',
        ]
        email_filled = False
        for sel in email_selectors:
            try:
                await page.wait_for_selector(sel, timeout=4000, state="visible")
                await page.fill(sel, NAUKRI_EMAIL)
                email_filled = True
                print(f"[Naukri] Email filled via: {sel}")
                break
            except Exception:
                continue

        if not email_filled:
            title = await page.title()
            raise RuntimeError(
                f"Could not find email field on Naukri login page. "
                f"Page title: '{title}' URL: {page.url}"
            )

        await page.wait_for_timeout(300)

        # Fill password
        pw_selectors = [
            '#passwordField',
            'input[placeholder*="Password"]',
            'input[name="password"]',
            'input[type="password"]',
        ]
        for sel in pw_selectors:
            try:
                await page.wait_for_selector(sel, timeout=4000, state="visible")
                await page.fill(sel, NAUKRI_PASSWORD)
                break
            except Exception:
                continue

        # Fill email
        email_sel = 'input[placeholder*="Email"], input[name="username"], input[type="email"], #usernameField'
        await page.wait_for_selector(email_sel, timeout=10000)
        await page.fill(email_sel, email)
        await page.wait_for_timeout(300)

        # Fill password
        pw_sel = 'input[placeholder*="Password"], input[name="password"], input[type="password"], #passwordField'
        await page.fill(pw_sel, password)
        await page.wait_for_timeout(300)

        # Click login button
        btn_selectors = [
            'button[type="submit"]',
            'button:has-text("Login")',
            '[class*="loginBtn"]',
            'input[value="Login"]',
        ]
        for sel in btn_selectors:
            try:
                await page.click(sel, timeout=5000)
                break
            except Exception:
                continue

        # Wait for redirect to recruit.naukri.com
        try:
            await page.wait_for_url("*recruit.naukri.com*", timeout=20000)
        except Exception:
            await page.wait_for_timeout(5000)

        print(f"[Naukri] Post-login URL: {page.url}")

        raw_cookies = await ctx.cookies()
        cookies = {c["name"]: c["value"] for c in raw_cookies}
        await browser.close()

    if not cookies:
        raise RuntimeError("No cookies received after login — check credentials")

    _session["cookies"]    = cookies
    _session["expires_at"] = datetime.now(timezone.utc) + timedelta(hours=10)
    print(f"[Naukri] Browser login OK — {len(cookies)} cookies captured")
    return cookies


async def get_session(email: str = "", password: str = "") -> dict:
    """Return valid cookies, performing browser login if needed."""
    if not _session_valid():
        await browser_login(email, password)
    return _session["cookies"]


async def search_candidates(
    query: str,
    location: str = "",
    experience_min: int = 0,
    experience_max: int = 20,
    limit: int = 10,
    email: str = "",
    password: str = "",
) -> list[dict]:
    """Search Naukri Resdex using browser-authenticated session."""
    from playwright.async_api import async_playwright

    cookies = await get_session(email, password)
    print(f"[Naukri] Searching Resdex: query='{query}' location='{location}'")

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True, args=_CHROMIUM_ARGS)
        ctx = await browser.new_context(
            user_agent=(
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/124.0.0.0 Safari/537.36"
            ),
        )

        cookie_list = [
            {"name": k, "value": v, "domain": ".naukri.com", "path": "/", "sameSite": "Lax"}
            for k, v in cookies.items()
        ]
        await ctx.add_cookies(cookie_list)

        page = await ctx.new_page()

        loc_param = f"&jobLocation={location.replace(' ', '%20')}" if location else ""
        search_url = (
            f"{_RESDEX_SEARCH}"
            f"?keyword={query.replace(' ', '%20')}"
            f"&minExp={experience_min}&maxExp={experience_max}"
            f"{loc_param}&noOfResults={min(limit, 20)}"
        )

        await page.goto(search_url, wait_until="networkidle", timeout=30000)
        await page.wait_for_timeout(2000)

        # Session expired — re-login once
        if "/nlogin/" in page.url or "naukri.com/login" in page.url:
            await browser.close()
            _session["cookies"] = {}
            return await search_candidates(query, location, experience_min, experience_max, limit, email, password)

        candidates_raw = await page.evaluate("""
            () => {
                const cards = document.querySelectorAll(
                    '[class*="candidate-card"], [class*="candidateCard"], '
                    '[class*="profile-card"], [class*="search-result"], '
                    '[data-candidate-id], .candidateWrapper'
                );
                return Array.from(cards).map(card => ({
                    name:         card.querySelector('[class*="name"], h2, h3')?.innerText?.trim() || '',
                    headline:     card.querySelector('[class*="designation"], [class*="title"]')?.innerText?.trim() || '',
                    company:      card.querySelector('[class*="company"], [class*="employer"]')?.innerText?.trim() || '',
                    location:     card.querySelector('[class*="location"], [class*="city"]')?.innerText?.trim() || '',
                    experience:   card.querySelector('[class*="exp"], [class*="experience"]')?.innerText?.trim() || '',
                    skills:       Array.from(card.querySelectorAll('[class*="skill"], [class*="tag"]')).map(s => s.innerText.trim()).filter(Boolean),
                    profile_url:  card.querySelector('a')?.href || '',
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
