"""
Generate Quad Recruit – Application Flow diagram as PNG.
"""
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
from matplotlib.patches import FancyBboxPatch, FancyArrowPatch
import matplotlib.patheffects as pe

fig, ax = plt.subplots(figsize=(20, 26))
ax.set_xlim(0, 20)
ax.set_ylim(0, 26)
ax.axis("off")
fig.patch.set_facecolor("#0f0f13")
ax.set_facecolor("#0f0f13")

# ── Colour palette ────────────────────────────────────────────────────────────
C = {
    "header":    "#7c3aed",   # purple  – section headers
    "frontend":  "#1d4ed8",   # blue    – frontend boxes
    "backend":   "#0f766e",   # teal    – backend / API boxes
    "ai":        "#b45309",   # amber   – AI / OpenAI boxes
    "db":        "#166534",   # green   – database boxes
    "fallback":  "#374151",   # grey    – fallback / mock boxes
    "arrow":     "#6b7280",   # mid-grey arrows
    "text":      "#f9fafb",   # near-white text
    "subtext":   "#9ca3af",   # grey subtext
    "border":    "#374151",   # box border
    "accent":    "#f59e0b",   # yellow accent line
}

def box(ax, x, y, w, h, label, sublabel="", color="#1d4ed8", radius=0.25, fontsize=10):
    rect = FancyBboxPatch((x, y), w, h,
        boxstyle=f"round,pad=0.0,rounding_size={radius}",
        linewidth=1.5, edgecolor=color, facecolor=color + "30",
        zorder=3)
    ax.add_patch(rect)
    ty = y + h / 2 + (0.12 if sublabel else 0)
    ax.text(x + w/2, ty, label, ha="center", va="center",
            color=C["text"], fontsize=fontsize, fontweight="bold",
            zorder=4, wrap=True)
    if sublabel:
        ax.text(x + w/2, y + h/2 - 0.22, sublabel, ha="center", va="center",
                color=C["subtext"], fontsize=8, zorder=4, style="italic")

def header(ax, x, y, w, label, color="#7c3aed"):
    rect = FancyBboxPatch((x, y), w, 0.55,
        boxstyle="round,pad=0.0,rounding_size=0.15",
        linewidth=0, facecolor=color, zorder=3)
    ax.add_patch(rect)
    ax.text(x + w/2, y + 0.275, label, ha="center", va="center",
            color="white", fontsize=11, fontweight="bold", zorder=4)

def arrow(ax, x1, y1, x2, y2, label="", color="#6b7280"):
    ax.annotate("", xy=(x2, y2), xytext=(x1, y1),
        arrowprops=dict(arrowstyle="-|>", color=color, lw=1.5),
        zorder=2)
    if label:
        mx, my = (x1+x2)/2, (y1+y2)/2
        ax.text(mx + 0.1, my, label, color=C["subtext"], fontsize=7.5,
                va="center", zorder=5)

def dashed_arrow(ax, x1, y1, x2, y2, label="", color="#4b5563"):
    ax.annotate("", xy=(x2, y2), xytext=(x1, y1),
        arrowprops=dict(arrowstyle="-|>", color=color, lw=1.2,
                        linestyle="dashed"),
        zorder=2)
    if label:
        mx, my = (x1+x2)/2, (y1+y2)/2
        ax.text(mx + 0.1, my, label, color=C["subtext"], fontsize=7.5,
                va="center", zorder=5)

# ══════════════════════════════════════════════════════════════════════════════
# Title
# ══════════════════════════════════════════════════════════════════════════════
ax.text(10, 25.3, "Quad Recruit — Application Flow", ha="center", va="center",
        color="white", fontsize=16, fontweight="bold")
ax.text(10, 24.85, "React Frontend  ·  FastAPI Backend  ·  Azure Cosmos DB  ·  AI-powered screening",
        ha="center", va="center", color=C["subtext"], fontsize=9.5)

# divider
ax.plot([0.5, 19.5], [24.6, 24.6], color=C["accent"], lw=1.5)

# ══════════════════════════════════════════════════════════════════════════════
# SECTION 1 — USER / FRONTEND
# ══════════════════════════════════════════════════════════════════════════════
header(ax, 0.4, 23.7, 19.2, "① FRONTEND  (React + Vite  ·  localhost:3000)", color="#1e40af")

# Row of frontend pages
pages = [
    ("Dashboard",    "Overview & stats"),
    ("Jobs",         "Create / list jobs"),
    ("Candidates",   "Search & screen"),
    ("Resume Scorer","Upload & score"),
]
px = [0.7, 5.4, 10.1, 14.8]
for i, (name, sub) in enumerate(pages):
    box(ax, px[i], 22.5, 4.2, 1.0, name, sub, color=C["frontend"], fontsize=9)

# Arrow: Frontend → Vite Proxy
arrow(ax, 10, 22.5, 10, 21.55, label="HTTP /api/*")

# ══════════════════════════════════════════════════════════════════════════════
# SECTION 2 — VITE PROXY
# ══════════════════════════════════════════════════════════════════════════════
box(ax, 6.5, 21.0, 7, 0.8, "Vite Dev Proxy",
    "strips /api prefix → forwards to :8000", color="#6d28d9", fontsize=9)
arrow(ax, 10, 21.0, 10, 20.05, label="HTTP /*")

# ══════════════════════════════════════════════════════════════════════════════
# SECTION 3 — FASTAPI BACKEND
# ══════════════════════════════════════════════════════════════════════════════
header(ax, 0.4, 19.6, 19.2, "② BACKEND  (FastAPI + Uvicorn  ·  localhost:8000)", color="#0f766e")

# Route groups
routes = [
    ("/jobs",        "CRUD jobs"),
    ("/candidates",  "Add / screen"),
    ("/search",      "Portal search"),
    ("/email",       "Draft & send"),
    ("/gmail",       "OAuth flow"),
]
rx = [0.6, 4.5, 8.4, 12.3, 16.2]
for i, (route, desc) in enumerate(routes):
    box(ax, rx[i], 18.5, 3.6, 0.85, route, desc, color=C["backend"], fontsize=8.5)

# ══════════════════════════════════════════════════════════════════════════════
# SECTION 4 — SERVICES  (3 columns)
# ══════════════════════════════════════════════════════════════════════════════
header(ax, 0.4, 18.1, 19.2, "③ SERVICES", color="#374151")

# ── Resume Screening flow ─────────────────────────────────────────────────────
header(ax, 0.5, 17.5, 5.8, "Resume Screening", color="#1d4ed8")

box(ax, 0.6, 16.5, 5.6, 0.8, "extract_text_from_bytes()",
    "PDF → pypdf  |  DOCX → python-docx  |  TXT → utf-8", color=C["frontend"], fontsize=8)
arrow(ax, 3.4, 16.5, 3.4, 15.65)

box(ax, 0.6, 14.8, 5.6, 0.8, "screen_resume()",
    "Parse name / email / phone / skills / experience", color=C["backend"], fontsize=8)

# AI tiers inside screening
box(ax, 0.6, 13.6, 1.7, 0.9, "Tier 1\nAzure OpenAI", color=C["ai"], fontsize=7.5)
box(ax, 2.45, 13.6, 1.7, 0.9, "Tier 2\nOpenAI", color=C["ai"], fontsize=7.5)
box(ax, 4.3, 13.6, 1.9, 0.9, "Tier 3\nRegex Parser", color=C["fallback"], fontsize=7.5)

arrow(ax, 3.4, 14.8, 1.45, 14.5)
arrow(ax, 3.4, 14.8, 3.3,  14.5)
arrow(ax, 3.4, 14.8, 5.25, 14.5)

# ── Candidate Search flow ─────────────────────────────────────────────────────
header(ax, 7.1, 17.5, 5.8, "Candidate Search", color="#1d4ed8")

box(ax, 7.2, 16.5, 5.6, 0.8, "search_portal_candidates()",
    "LinkedIn / Naukri / Indeed / Monster / Glassdoor", color=C["backend"], fontsize=8)
arrow(ax, 10, 16.5, 10, 15.65)

box(ax, 7.2, 14.8, 5.6, 0.8, "_generate_candidates()",
    "Routes to best available AI tier", color=C["backend"], fontsize=8)

box(ax, 7.2, 13.6, 1.7, 0.9, "Tier 1\nAzure OpenAI", color=C["ai"], fontsize=7.5)
box(ax, 9.05, 13.6, 1.7, 0.9, "Tier 2\nOpenAI", color=C["ai"], fontsize=7.5)
box(ax, 10.9, 13.6, 1.9, 0.9, "Tier 3\nMock Gen\n(no key needed)", color=C["fallback"], fontsize=7.5)

arrow(ax, 10, 14.8, 8.05,  14.5)
arrow(ax, 10, 14.8, 9.9,   14.5)
arrow(ax, 10, 14.8, 11.85, 14.5)

# ── Matching / Email flow ─────────────────────────────────────────────────────
header(ax, 13.7, 17.5, 5.8, "Matching & Email", color="#1d4ed8")

box(ax, 13.8, 16.5, 5.6, 0.8, "compute_match()",
    "Semantic embed (60%) + Overlap (30%) + Exp (10%)", color=C["backend"], fontsize=8)
arrow(ax, 16.6, 16.5, 16.6, 15.65)

box(ax, 13.8, 14.8, 5.6, 0.8, "email_routes  /email/bulk-draft",
    "AI-drafted outreach + INTERESTED / NOT INTERESTED", color=C["backend"], fontsize=8)
arrow(ax, 16.6, 14.8, 16.6, 14.0)

box(ax, 13.8, 13.2, 5.6, 0.7, "Gmail OAuth → send_email()",
    "Google Gmail API", color=C["ai"], fontsize=8)

# ══════════════════════════════════════════════════════════════════════════════
# SECTION 5 — DATABASE LAYER
# ══════════════════════════════════════════════════════════════════════════════
header(ax, 0.4, 12.5, 19.2, "④ DATABASE  (3-tier auto-detect)", color="#166534")

box(ax, 0.6, 11.3, 5.6, 0.9, "Tier 1 — Azure Cosmos DB",
    "MongoDB API  ·  COSMOS_CONNECTION_STRING", color=C["db"], fontsize=9)
box(ax, 7.2, 11.3, 5.6, 0.9, "Tier 2 — Local MongoDB",
    "motor driver  ·  mongodb://localhost:27017", color=C["db"], fontsize=9)
box(ax, 13.8, 11.3, 5.6, 0.9, "Tier 3 — JSON File Store",
    "backend/data/*.json  (zero setup)", color=C["fallback"], fontsize=9)

# Collections
colls = ["candidate_info", "job_info", "job_candidates"]
cx = [1.2, 7.8, 14.4]
for i, coll in enumerate(colls):
    box(ax, cx[i], 10.0, 4.4, 0.7, coll, color="#1f2937", fontsize=8.5)

# ══════════════════════════════════════════════════════════════════════════════
# SECTION 6 — END-TO-END FLOWS
# ══════════════════════════════════════════════════════════════════════════════
header(ax, 0.4, 9.3, 19.2, "⑤ KEY END-TO-END FLOWS", color="#4c1d95")

flow_data = [
    ("[1] Upload Resume",
     ["1. Select PDF / DOCX / TXT",
      "2. pypdf / python-docx extracts text",
      "3. AI (or regex) parses: name, email,",
      "    phone, skills, experience",
      "4. compute_match() scores vs job",
      "5. Candidate stored in DB",
      "6. Score + contact info returned to UI"],
     C["frontend"]),
    ("[2] Search Candidates",
     ["1. Enter role + location + filters",
      "2. Choose portal (LinkedIn/Naukri...)",
      "3. If API key -> real portal API",
      "4. Else -> Azure/OpenAI/Mock (auto)",
      "5. Results sorted by match_score",
      "6. Shortlist -> Save to job"],
     C["backend"]),
    ("[3] Bulk Send Mail",
     ["1. Click 'Send Mail' in Candidates",
      "2. AI drafts personalised email",
      "    per candidate",
      "3. INTERESTED / NOT INTERESTED",
      "    reply loopback appended",
      "4. Gmail OAuth sends each mail",
      "5. Status tracked in DB"],
     C["ai"]),
    ("[4] Job Management",
     ["1. Create job with description",
      "2. AI extracts skills & experience",
      "3. Job stored in job_info collection",
      "4. Appears in Jobs list + dropdown",
      "5. Candidates screened against job",
      "6. Top candidates ranked & shown"],
     C["db"]),
]

fx = [0.5, 5.25, 10.0, 14.75]
for i, (title, steps, color) in enumerate(flow_data):
    # card background
    rect = FancyBboxPatch((fx[i], 2.0), 4.5, 7.0,
        boxstyle="round,pad=0.0,rounding_size=0.2",
        linewidth=1.5, edgecolor=color, facecolor=color + "18", zorder=3)
    ax.add_patch(rect)
    ax.text(fx[i] + 2.25, 8.7, title, ha="center", va="center",
            color="white", fontsize=9.5, fontweight="bold", zorder=4)
    for j, step in enumerate(steps):
        ax.text(fx[i] + 0.25, 8.2 - j * 0.9, step,
                color=C["subtext"], fontsize=8, va="top", zorder=4,
                linespacing=1.3)

# ══════════════════════════════════════════════════════════════════════════════
# SECTION 7 — LEGEND
# ══════════════════════════════════════════════════════════════════════════════
legend_items = [
    (C["frontend"],  "Frontend / UI"),
    (C["backend"],   "Backend Service / Route"),
    (C["ai"],        "AI / OpenAI Layer"),
    (C["db"],        "Database Layer"),
    (C["fallback"],  "Fallback (no key needed)"),
]
lx = 0.6
for color, label in legend_items:
    rect = FancyBboxPatch((lx, 0.55), 0.35, 0.35,
        boxstyle="round,pad=0.0,rounding_size=0.05",
        linewidth=1, edgecolor=color, facecolor=color + "60", zorder=5)
    ax.add_patch(rect)
    ax.text(lx + 0.5, 0.72, label, color=C["subtext"], fontsize=8, va="center", zorder=5)
    lx += 3.5

ax.text(10, 0.2, "Quad Recruit · Quadrant Technologies LLC",
        ha="center", color="#4b5563", fontsize=8)

# ══════════════════════════════════════════════════════════════════════════════
out = r"c:\Users\Quadrant\OneDrive - Quadrant Technologies LLC\Desktop\recruit_robo_project\QuadRecruit_Flow.png"
plt.savefig(out, dpi=180, bbox_inches="tight",
            facecolor=fig.get_facecolor(), edgecolor="none")
plt.close()
print(f"Saved: {out}")
