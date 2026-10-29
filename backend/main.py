"""BrandBench backend (FastAPI). Rules run as code first. Storage: PostgreSQL when DATABASE_URL is set (docker compose), otherwise in memory (no database file)."""
import os, re, json, datetime as dt
from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
app = FastAPI(title="BrandBench")
TODAY = dt.date.today()
BRAND = {"name": "FitNest (demo brand)", "palette": ["#0B6E4F", "#F4F1DE", "#1B1B1E"],
 "disclaimer": "Results vary by individual.",
 "facts": [{"key": "price", "label": "Starting price", "value": "599", "show": "Rs 599/month", "source": "Pricing sheet v4", "owner": "Product team", "verified": "2026-10-02", "valid_days": 90},
           {"key": "members", "label": "Active members", "value": "8200", "show": "8,200", "source": "CRM report", "owner": "Sales ops", "verified": "2026-06-15", "valid_days": 90}],
 "rules": {"TONE-1": "Tone Guide s2: friendly, never pushy", "TERM-1": "Glossary: say 'affordable', not 'cheap'", "MSG-1": "Messaging s4: fitness content needs the disclaimer",
           "FACT-1": "Fact Ledger: starting price", "FACT-2": "Fact Ledger: active members", "FACT-3": "Fact Ledger: facts must be re-verified within their window",
           "CLAIM-1": "Claims Policy s3: rankings and guarantees need approved evidence", "VIS-1": "WCAG 2.1 AA: text contrast at least 4.5:1", "VIS-2": "Brand Palette: use approved colours", "ACC-1": "WCAG 2.1: images need alt text"}}
def age(f): return (TODAY - dt.date.fromisoformat(f["verified"])).days
def F(rule, judge, cls, sev, quote, reason, fix=""):
    return {"rule": rule, "source": BRAND["rules"][rule], "judge": judge, "cls": cls, "sev": sev, "quote": quote, "reason": reason, "fix": fix, "decision": None}
def mask(t):
    m = []
    for name, pat in (("EMAIL", r"[\w.+-]+@[\w-]+\.[\w.]+"), ("PHONE", r"\+?\d[\d\s-]{8,}\d")):
        for x in re.findall(pat, t): m.append(name)
        t = re.sub(pat, f"[{name}]", t)
    return t, m
def voice(t):
    o = []
    for p, fix in ((r"buy now or regret[^.!]*", "Start today and see what's possible."), (r"\b(hurry|act now|last chance|don't miss out)\b", "Join whenever you're ready.")):
        for m in re.finditer(p, t, re.I): o.append(F("TONE-1", "Voice and Messaging", "violation", "medium", m.group(0), "Pushy wording conflicts with the friendly tone guide.", fix))
    for m in re.finditer(r"\bcheap\b", t, re.I): o.append(F("TERM-1", "Voice and Messaging", "violation", "low", m.group(0), "Glossary prefers 'affordable'.", "affordable"))
    if re.search(r"result|lose|weight|transform|fitness|workout", t, re.I) and BRAND["disclaimer"].lower() not in t.lower():
        o.append(F("MSG-1", "Voice and Messaging", "violation", "medium", "(missing)", "Fitness content must carry the required disclaimer.", "Add: " + BRAND["disclaimer"]))
    return o
def facts(t):
    o = []; P, M = BRAND["facts"]
    for m in re.finditer(r"(?:rs\.?|inr|₹)\s?([\d,]+)", t, re.I):
        v = m.group(1).replace(",", "")
        if v != P["value"]: o.append(F("FACT-1", "Fact and Claims", "violation", "high", m.group(0), f"Ledger says {P['show']} (source: {P['source']}).", P["show"]))
        if age(P) > P["valid_days"]: o.append(F("FACT-3", "Fact and Claims", "inconsistency", "medium", m.group(0), f"Price last verified {age(P)} days ago (window {P['valid_days']}). Owner: {P['owner']}.", "Ask the owner to re-verify"))
    for m in re.finditer(r"([\d,]+)\+?\s*(members|users|customers)", t, re.I):
        v = int(m.group(1).replace(",", "") or 0)
        if v > int(M["value"]): o.append(F("FACT-2", "Fact and Claims", "inconsistency", "high", m.group(0), f"Ledger shows {M['show']} members, not {v:,}.", f"{M['show']}+ members"))
        if age(M) > M["valid_days"]: o.append(F("FACT-3", "Fact and Claims", "inconsistency", "medium", m.group(0), f"Member count last verified {age(M)} days ago (window {M['valid_days']}). Owner: {M['owner']}.", "Ask the owner to re-verify"))
    for m in re.finditer(r"(#\s?1\b|number (one|1)|\bbest\b|world'?s|guaranteed?|100%|no\.? ?1)[^.!,]{0,25}", t, re.I):
        o.append(F("CLAIM-1", "Fact and Claims", "unverifiable", "high", m.group(0).strip(), "No approved evidence on file. Not called false, only unverified.", "Remove, or attach evidence in the ledger"))
    return o
def lum(h):
    r, g, b = [int(h[i:i + 2], 16) / 255 for i in (1, 3, 5)]
    f = lambda c: c / 12.92 if c <= .03928 else ((c + .055) / 1.055) ** 2.4
    return .2126 * f(r) + .7152 * f(g) + .0722 * f(b)
def look(fg, bg, alt, has_img, used):
    o = []; ok = lambda h: re.fullmatch(r"#[0-9a-fA-F]{6}", h or "")
    if ok(fg) and ok(bg):
        a, b = sorted((lum(fg), lum(bg)), reverse=True); r = (a + .05) / (b + .05)
        if r < 4.5: o.append(F("VIS-1", "Look and Accessibility", "violation", "high", f"{fg} on {bg}", f"Contrast is {r:.1f}:1, below 4.5:1.", "Use a darker text colour or lighter background"))
    if has_img and not alt.strip(): o.append(F("ACC-1", "Look and Accessibility", "violation", "high", "(image)", "Image has no alt text.", "Describe the image in one sentence"))
    for h in used:
        if ok(h):
            d = min(sum(abs(int(h[i:i + 2], 16) - int(p[i:i + 2], 16)) for i in (1, 3, 5)) for p in BRAND["palette"])
            if d > 60: o.append(F("VIS-2", "Look and Accessibility", "inconsistency", "medium", h, "Colour is not close to any approved palette colour.", "Palette: " + ", ".join(BRAND["palette"])))
    return o
def ai_tone(masked):
    key = os.environ.get("ANTHROPIC_API_KEY")
    if not key: return [], "Rules only. No external AI used."
    try:
        import httpx
        r = httpx.post("https://api.anthropic.com/v1/messages", timeout=30, headers={"x-api-key": key, "anthropic-version": "2023-06-01"},
            json={"model": os.environ.get("MODEL", "claude-sonnet-5-5"), "max_tokens": 400, "messages": [{"role": "user", "content":
            "Brand tone: friendly, never pushy. Return ONLY JSON list of {quote,reason,fix} for sentences that break this tone. [] if none.\n" + masked}]})
        items = json.loads(re.search(r"\[.*\]", r.json()["content"][0]["text"], re.S).group(0))
        return [F("TONE-1", "Voice and Messaging (AI)", "inconsistency", "low", i["quote"], "AI-assisted: " + i["reason"], i["fix"]) for i in items], "Masked text sent to Anthropic API. AI-assisted, human review required."
    except Exception: return [], "AI call failed. Rules only."
def verdict(fs):
    live = fs  # judged on the ORIGINAL findings, so dismissing a flag cannot lower the result
    if any(f["cls"] == "unverifiable" or f["sev"] == "high" for f in live): return "Ask a human"
    return "Modify" if live else "Cleared"
def run(text, fg, bg, alt, has_img, used):
    masked, m = mask(text); ai, rec = ai_tone(masked)
    fs = voice(text) + facts(text) + look(fg, bg, alt, has_img, used) + ai
    seen = set(); fs = [f for f in fs if not ((f["rule"], f["quote"]) in seen or seen.add((f["rule"], f["quote"])))]
    return fs, {"masked": m, "receipt": rec}

# ---------- storage ----------
if os.environ.get("DATABASE_URL"):
    from sqlalchemy import create_engine, MetaData, Table, Column, Integer, JSON, select, insert, update
    ENGINE = create_engine(os.environ["DATABASE_URL"], future=True); META = MetaData()
    SUBS = Table("submissions", META, Column("id", Integer, primary_key=True), Column("data", JSON)); META.create_all(ENGINE)
    def load(i):
        with ENGINE.connect() as c: r = c.execute(select(SUBS.c.data).where(SUBS.c.id == i)).first()
        if not r: raise HTTPException(404, "Not found")
        return r[0]
    def save(i, d):
        with ENGINE.begin() as c: c.execute(update(SUBS).where(SUBS.c.id == i).values(data=d))
    def create(d):
        with ENGINE.begin() as c: return c.execute(insert(SUBS).values(data=d)).inserted_primary_key[0]
    def all_subs():
        with ENGINE.connect() as c: return [r[0] for r in c.execute(select(SUBS.c.data))]
else:
    MEM = {}
    def load(i):
        if i not in MEM: raise HTTPException(404, "Not found")
        return json.loads(json.dumps(MEM[i]))
    def save(i, d): MEM[i] = d
    def create(d): i = len(MEM) + 1; MEM[i] = d; return i
    def all_subs(): return list(MEM.values())
# ---------- API ----------
class Post(BaseModel):
    title: str = "Untitled"; text: str; fg: str = ""; bg: str = ""; alt: str = ""; has_img: bool = False; img_color: str = ""
class Decision(BaseModel): idx: int; action: str; reason: str = ""
class Approval(BaseModel): name: str; note: str = ""
def new_sub(title, text, fg="", bg="", alt="", has_img=False, img_color=""):
    fs, priv = run(text, fg, bg, alt, has_img, [img_color] if img_color else [])
    d = {"title": title, "text": text, "findings": fs, "verdict": verdict(fs), "privacy": priv, "approved_by": None, "approved_at": None, "approval_note": "", "log": ["Checked: " + verdict(fs)]}
    return {"id": create(d), **d}
@app.get("/api/brand")
def brand(): return {**BRAND, "facts": [{**f, "age": age(f), "stale": age(f) > f["valid_days"]} for f in BRAND["facts"]]}
@app.post("/api/check")
def check(p: Post): return new_sub(p.title, p.text, p.fg, p.bg, p.alt, p.has_img, p.img_color)
@app.post("/api/check-file")
async def check_file(file: UploadFile = File(...), alt: str = Form("")):
    from extract import extract
    text, color, is_img = extract(file.filename or "", await file.read())
    return new_sub(file.filename or "Upload", text, alt=alt, has_img=is_img, img_color=color)
@app.get("/api/subs/{i}")
def one(i: int): return {"id": i, **load(i)}
@app.post("/api/subs/{i}/finding")
def decide(i: int, b: Decision):
    d = load(i); f = d["findings"][b.idx]
    if b.action == "undo": f["decision"] = None; f["dismiss_reason"] = ""
    elif b.action == "accept": f["decision"] = "accepted"
    elif b.action == "dismiss":
        if (f["sev"] == "high" or f["cls"] == "unverifiable") and not b.reason.strip(): raise HTTPException(400, "A serious finding needs a written reason to dismiss.")
        f["decision"] = "dismissed"; f["dismiss_reason"] = b.reason.strip()
    else: raise HTTPException(400, "Bad action")
    d["log"].append(f"{b.action}: {f['rule']}"); save(i, d); return {"id": i, **d}
@app.post("/api/subs/{i}/approve")
def approve(i: int, b: Approval):
    d = load(i)
    if not b.name.strip(): raise HTTPException(400, "A named person must approve.")
    if any(f["decision"] is None for f in d["findings"]): raise HTTPException(400, "Accept or dismiss every finding first.")
    if d["verdict"] == "Ask a human" and not b.note.strip(): raise HTTPException(400, "Please write why it is OK to publish this.")
    d.update(approved_by=b.name.strip(), approved_at=str(dt.datetime.now())[11:16], approval_note=b.note.strip()); d["log"].append(f"{b.name.strip()} approved"); save(i, d); return {"id": i, **d}
@app.get("/api/insights")
def insights():
    by, vd = {}, {}
    for d in all_subs():
        vd[d["verdict"]] = vd.get(d["verdict"], 0) + 1
        for f in d["findings"]: by[f["rule"]] = by.get(f["rule"], 0) + 1
    return {"by_rule": by, "verdicts": vd}
for _p in (os.path.join(os.path.dirname(__file__), "frontend", "dist"), os.path.join(os.path.dirname(__file__), "..", "frontend", "dist")):
    if os.path.isdir(_p): app.mount("/", StaticFiles(directory=_p, html=True), name="web"); break
