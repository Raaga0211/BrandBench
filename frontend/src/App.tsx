import { useEffect, useState } from "react";

type Finding = { rule: string; source: string; judge: string; cls: string; sev: string; quote: string; reason: string; fix: string; decision: string | null; dismiss_reason?: string };
type Sub = { id: number; findings: Finding[]; verdict: string; approved_by: string | null; approved_at: string | null; approval_note: string };
type Post = { n: string; t: string; fg: string; bg: string; img: { alt: string; c: string } | null };
type Fact = { label: string; show: string; source: string; owner: string; verified: string; age: number; stale: boolean };
type Brand = { palette: string[]; facts: Fact[]; rules: Record<string, string> };
type Insights = { by_rule: Record<string, number>; verdicts: Record<string, number> };

const AC = ["#5B8CFF", "#2DD4BF", "#F5B84B"];
const J = ["Voice and Messaging", "Fact and Claims", "Look and Accessibility"];
const JD = ["Does it sound like FitNest?", "Are the facts true and up to date?", "Does it look right, and can everyone read it?"];
const RN: Record<string, string> = { "TONE-1": "Pushy wording", "TERM-1": "Word to avoid", "MSG-1": "Missing disclaimer", "FACT-1": "Wrong price", "FACT-2": "Wrong member count", "FACT-3": "Out-of-date fact", "CLAIM-1": "Claim with no proof", "VIS-1": "Hard-to-read colours", "VIS-2": "Off-brand colour", "ACC-1": "Missing alt text" };
const GROUPS: [string, string[]][] = [["Voice and Messaging", ["TONE-1", "TERM-1", "MSG-1"]], ["Fact and Claims", ["FACT-1", "FACT-2", "FACT-3", "CLAIM-1"]], ["Look and Accessibility", ["VIS-1", "VIS-2", "ACC-1"]]];
const SEV: Record<string, string> = { high: "Serious", medium: "Moderate", low: "Minor" };
const LBL: Record<string, string> = { Cleared: "Looks good", Modify: "Needs changes", "Ask a human": "Needs a person’s decision" };
const STEPS = [["Reading the tone guide", "Scanning for pushy words and the disclaimer", "Matching the glossary"], ["Opening the approved facts", "Pulling out prices, numbers and claims", "Comparing with last-verified dates"], ["Loading the brand colours", "Measuring text contrast", "Checking the image and alt text"]];
const TABS = ["Pick a post", "Checkers", "Findings", "Review and publish", "Summary", "FitNest rulebook", "About"];
const POSTS: Post[] = [
  { n: "Post A: weekend offer", t: "India’s #1 fitness app! Plans from just ₹499/month. Join 10,000+ members. BUY NOW or regret it!", fg: "#FFA500", bg: "#FFFFFF", img: { alt: "", c: "#FFA500" } },
  { n: "Post B: clean launch", t: "Start your fitness journey with FitNest. Plans from Rs 599/month. Results vary by individual.", fg: "#1B1B1E", bg: "#F4F1DE", img: { alt: "A woman stretching in a FitNest studio", c: "#0B6E4F" } },
  { n: "Post C: city trainers", t: "Join FitNest this week! Plans from Rs 599/month, trusted by 8,200 members. Best trainers in the city. Results vary by individual.", fg: "#1B1B1E", bg: "#F4F1DE", img: { alt: "Trainer leading a class", c: "#0B6E4F" } },
];

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const judgeOf = (f: Finding) => Math.max(0, J.findIndex((j) => f.judge.startsWith(j)));
const serious = (f: Finding) => f.sev === "high" || f.cls === "unverifiable";
async function api<T>(url: string, body?: unknown): Promise<T> {
  const r = await fetch(url, body === undefined ? undefined : { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const j = await r.json();
  if (!r.ok) throw new Error(j.detail || "Something went wrong");
  return j as T;
}

function Preview({ p, fs }: { p: Post; fs?: Finding[] }) {
  let parts: (string | JSX.Element)[] = [p.t];
  [...(fs ?? [])].sort((a, b) => b.quote.length - a.quote.length).forEach((f, n) => {
    if (!f.quote || f.quote.startsWith("(")) return;
    const c = AC[judgeOf(f)];
    parts = parts.flatMap((x, k) => typeof x !== "string" ? [x] : x.split(f.quote).flatMap((s, j, arr) => j < arr.length - 1
      ? [s, <mark key={`${n}-${k}-${j}`} style={{ background: `color-mix(in srgb, ${c} 30%, transparent)`, borderBottom: `2px dotted ${c}` }}>{f.quote}</mark>] : [s]));
  });
  return (
    <div className="pvw">
      <div className="pvh">FitNest · sponsored post</div>
      {p.img && <div className="pvi" style={{ background: p.img.c }}>Image · alt text: {p.img.alt || <b>missing</b>}</div>}
      <div className="pvc" style={{ background: p.bg, color: p.fg }}>{parts}</div>
    </div>
  );
}

function Donut({ title, q, items, none }: { title: string; q: string; items: { name: string; v: number; c: string }[]; none: string }) {
  const tot = items.reduce((s, i) => s + i.v, 0);
  let a = -Math.PI / 2;
  const pt = (x: number): [number, number] => [100 + 90 * Math.cos(x), 100 + 90 * Math.sin(x)];
  const slices = items.filter((i) => i.v).map((i) => {
    const b = a + (i.v / tot) * 2 * Math.PI, [x1, y1] = pt(a), [x2, y2] = pt(b), big = b - a > Math.PI ? 1 : 0; a = b;
    return i.v === tot ? <circle key={i.name} cx="100" cy="100" r="90" fill={i.c} /> : <path key={i.name} d={`M100 100L${x1} ${y1}A90 90 0 ${big} 1 ${x2} ${y2}Z`} fill={i.c} />;
  });
  return (
    <div><h3>{title}</h3><p className="m">{q}</p>
      {!tot ? <p className="m">{none}</p> : <>
        <svg viewBox="0 0 200 200" style={{ maxWidth: 150, display: "block", margin: "auto" }}>{slices}<circle cx="100" cy="100" r="46" fill="var(--card)" /><text x="100" y="107" textAnchor="middle" style={{ fontSize: 24, fontWeight: 700 }}>{tot}</text></svg>
        {items.filter((i) => i.v).map((i) => <div key={i.name} className="m"><span style={{ color: i.c }}>●</span> {i.name}: {i.v}</div>)}</>}
    </div>
  );
}

function Bars({ title, q, rows, max, none }: { title: string; q: string; rows: { label: string; v: number; c: string; text: string }[]; max: number; none?: string }) {
  return (
    <div><h3>{title}</h3><p className="m">{q}</p>
      {rows.length === 0 && <p className="m">{none}</p>}
      {rows.map((r) => (
        <div key={r.label} style={{ display: "flex", alignItems: "center", gap: 8, margin: "7px 0" }}>
          <span style={{ width: 120, fontSize: 13 }}>{r.label}</span>
          <div style={{ height: 14, borderRadius: 4, background: r.c, width: `${Math.max(3, (r.v / max) * 55)}%` }} />
          <span className="m">{r.text}</span>
        </div>
      ))}
    </div>
  );
}

export default function App() {
  const [tab, setTab] = useState(0);
  const [sel, setSel] = useState(0);
  const [text, setText] = useState(POSTS[0].t);
  const [sub, setSub] = useState<Sub | null>(null);
  const [post, setPost] = useState<Post>(POSTS[0]);
  const [brand, setBrand] = useState<Brand | null>(null);
  const [ins, setIns] = useState<Insights | null>(null);
  const [step, setStep] = useState(0);
  const [running, setRunning] = useState(false);
  const [ask, setAsk] = useState<number | null>(null);
  const [why, setWhy] = useState("");
  const [name, setName] = useState("");
  const [note, setNote] = useState("");

  useEffect(() => { api<Brand>("/api/brand").then(setBrand).catch(() => undefined); }, []);
  useEffect(() => { if (tab === 4) api<Insights>("/api/insights").then(setIns).catch(() => undefined); }, [tab, sub]);

  const pick = (i: number) => { setSel(i); setText(i < 3 ? POSTS[i].t : ""); };
  const typed = (v: string) => { setText(v); if (sel < 3 && v.trim() !== POSTS[sel].t) setSel(3); };
  const chosen = (): Post => (sel < 3 && text.trim() === POSTS[sel].t ? POSTS[sel] : { n: "Your own post", t: text.trim(), fg: "#1B1B1E", bg: "#F4F1DE", img: null });

  async function run() {
    const p = chosen();
    if (!p.t) return alert("Choose a post or write one first.");
    setRunning(true); setTab(1); setStep(0); setPost(p); setAsk(null); setName(""); setNote("");
    const req = api<Sub>("/api/check", { title: p.n, text: p.t, fg: p.fg, bg: p.bg, alt: p.img?.alt ?? "", has_img: !!p.img, img_color: p.img?.c ?? "" });
    for (let k = 0; k < 3; k++) { setStep(k); await sleep(700); }
    try { setSub(await req); } catch (e) { alert((e as Error).message); }
    setRunning(false);
  }
  async function decide(idx: number, action: "accept" | "dismiss" | "undo", reason = "") {
    if (!sub) return;
    try { setSub(await api<Sub>(`/api/subs/${sub.id}/finding`, { idx, action, reason })); setAsk(null); setWhy(""); } catch (e) { alert((e as Error).message); }
  }
  async function publish() { if (sub) try { setSub(await api<Sub>(`/api/subs/${sub.id}/approve`, { name, note })); } catch (e) { alert((e as Error).message); } }

  const fs = sub?.findings ?? [];
  const open = fs.filter((f) => !f.decision).length;
  const risky = sub?.verdict === "Ask a human";
  const nSev = (k: string) => fs.filter((f) => f.sev === k).length;
  const empty = (msg: string) => <div className="card"><p className="m">{running ? "The checkers are still working…" : msg}</p><button className="b" onClick={() => setTab(0)}>Go to Pick a post</button></div>;
  const rules = brand?.rules ?? {};

  return (
    <>
      <header><h1>BrandBench</h1><p>Every post gets a verdict before it goes public.</p></header>
      <nav className="tabs">{TABS.map((t, i) => <button key={t} className={"tb" + (tab === i ? " on" : "")} onClick={() => setTab(i)}>{t}</button>)}</nav>
      <main>
        {tab === 0 && <>
          <div className="card"><h2>Check a post before it goes public</h2><p className="m">FitNest is a made-up fitness app used for this demo. Choose one of its posts below, or write your own. Three checkers compare the post with FitNest’s rulebook, then you decide what happens.</p></div>
          <div className="card"><h2>Choose or write a post</h2>
            <div className="grid">
              {POSTS.map((p, i) => <div key={p.n} className={"pc" + (sel === i ? " on" : "")} onClick={() => pick(i)}><b>{p.n}</b><Preview p={p} /></div>)}
              <div className={"pc" + (sel === 3 ? " on" : "")} onClick={() => pick(3)}><b>Write your own</b><p className="m">Type any FitNest post in the box below.</p></div>
            </div>
            <p style={{ marginTop: 14 }}><label htmlFor="tx">Post text (you can edit this or write your own)</label></p>
            <textarea id="tx" rows={4} placeholder="Type a FitNest post here…" value={text} onChange={(e) => typed(e.target.value)} />
            <button className="b" disabled={running} onClick={run}>Check this post</button></div></>}

        {tab === 1 && (running || sub ? <div className="card"><h2>Three checkers read the post</h2><p className="m">Each checker looks at a different part of the post and compares it with the FitNest rulebook.</p>
          <div className="lanes">{J.map((n, i) => {
            const mine = fs.filter((f) => judgeOf(f) === i);
            return <div key={n} className="lane" style={{ ["--a" as string]: AC[i] }}><h3>{n}</h3><div className="m">{JD[i]}</div>
              <div className="bar"><i style={{ width: running ? `${step * 33 + 20}%` : "100%" }} /></div>
              <div className="m">{running ? STEPS[i][step] + "…" : <b>{mine.length ? `${mine.length} problem(s) found` : "Nothing wrong"}</b>}</div></div>;
          })}</div>
          {!running && sub && <><div className="res"><b>Overall: {LBL[sub.verdict]}</b><div className="m">{sub.verdict === "Ask a human" ? "A serious or unproven problem was found, so a person must decide." : sub.verdict === "Modify" ? "A few things to fix. The suggestions are optional." : "No problems found."}</div></div>
            <p><button className="b" onClick={() => setTab(2)}>See what they found</button></p></>}</div>
          : empty("Pick a post and press “Check this post” first."))}

        {tab === 2 && (sub && !running ? <>
          <div className="card"><h2>What the checkers found</h2><p className="m">{fs.length ? "For each item, accept the suggested fix or say it is not a problem." : "Nothing was flagged for this post."}</p><Preview p={post} fs={fs} />
            <details className="key"><summary>What do these rule names mean?</summary>{Object.keys(RN).map((k) => <p key={k} className="m"><b>{RN[k]}:</b> {rules[k]}</p>)}</details></div>
          {fs.map((f, i) => <div key={i} className={"fc" + (f.decision ? " dim" : "")} style={{ ["--a" as string]: AC[judgeOf(f)] }}>
            <b>{RN[f.rule]}</b><span className={"pill " + f.sev}>{SEV[f.sev]}</span><span className="pill">{J[judgeOf(f)]}</span>
            <div className="q">“{f.quote}”</div><p>{f.reason}</p>
            <p className="m">Rule from the FitNest rulebook: <a href="#rulebook" onClick={(e) => { e.preventDefault(); setTab(5); setTimeout(() => document.getElementById("rule-" + f.rule)?.scrollIntoView({ block: "center" }), 50); }}>{f.source}</a><span className="code">{f.rule}</span></p>
            {f.fix && <p className="fx">Suggested fix: {f.fix}</p>}
            {f.decision ? <><span className="m">{f.decision === "accepted" ? "You accepted this fix." : `You said it is not a problem. Reason: ${f.dismiss_reason || "none needed"}`}</span> <button className="s" onClick={() => decide(i, "undo")}>Change my mind</button></>
              : ask === i ? <><input placeholder="Why is this not a problem? (required for serious items)" value={why} onChange={(e) => setWhy(e.target.value)} /><button className="s" onClick={() => decide(i, "dismiss", why)}>Confirm</button><button className="s" onClick={() => setAsk(null)}>Cancel</button></>
              : <><button className="s" onClick={() => decide(i, "accept")}>Accept fix</button><button className="s" onClick={() => (serious(f) ? setAsk(i) : decide(i, "dismiss"))}>Not a problem</button></>}</div>)}
          <p><button className="b" onClick={() => setTab(3)}>Next: review and publish</button></p></>
          : empty("Check a post first, then the findings appear here."))}

        {tab === 3 && (sub && !running ? <div className="card"><h2>Review and publish</h2><p>You are the person who decides whether this post goes live. The checkers only advise.</p><Preview p={post} />
          <div className="res"><b>Overall: {LBL[sub.verdict]}</b><div className="m">This result comes from the original findings. It does not change when a finding is dismissed.</div></div>
          {sub.approved_by ? <div className="res" style={{ borderColor: "var(--ok)" }}><b>Published</b><div className="m">Approved by {sub.approved_by} at {sub.approved_at}.{sub.approval_note && ` Reason: ${sub.approval_note}`}</div></div> : <>
            <h3 style={{ marginTop: 14 }}>Findings and your decisions</h3>
            {fs.length === 0 && <p className="m">No findings were raised.</p>}
            {fs.map((f, i) => <div key={i} className="ck"><span>{RN[f.rule]}: “{f.quote}”</span><span className={f.decision ? "ok" : "open"}>{f.decision === "accepted" ? "Fix accepted" : f.decision === "dismissed" ? "Dismissed" : "Still open"}</span></div>)}
            <p style={{ marginTop: 14 }}><label htmlFor="nm">Your name (required)</label><input id="nm" placeholder="Name of the person approving" value={name} onChange={(e) => setName(e.target.value)} /></p>
            {risky && <><label htmlFor="nt">Why is it OK to publish this? (required)</label><input id="nt" placeholder="Short reason" value={note} onChange={(e) => setNote(e.target.value)} /></>}
            <p><button className="b" disabled={open > 0} onClick={publish}>Approve and publish</button> <button className="s" onClick={() => setTab(2)}>Send back for changes</button></p>
            {open > 0 && <p className="m">{open} finding(s) still need a decision. Go to the Findings tab.</p>}</>}</div>
          : empty("Check a post first. This is where you decide whether it goes live."))}

        {tab === 4 && <><div className="card"><h2>Summary</h2><p>{sub ? <>The latest post had <b>{fs.length ? `${fs.length} problem(s)` : "no problems"}</b>{fs.length ? `: ${nSev("high")} serious, ${nSev("medium")} moderate, ${nSev("low")} minor` : ""}. Result: <b>{LBL[sub.verdict]}</b>.</> : "Check a post to see a summary here."}</p></div>
          <div className="ch">
            <Donut title="Which checker found the most?" q="Each checker looks at a different part of the post." none={sub ? "No problems were found in the latest post." : "Check a post to see results here."} items={J.map((n, i) => ({ name: n, v: fs.filter((f) => judgeOf(f) === i).length, c: AC[i] }))} />
            <Donut title="What kinds of problems were they?" q="Broken rules, facts that don’t match, or claims with no proof." none={sub ? "No problems were found in the latest post." : "Check a post to see results here."} items={[["Breaks a rule", "violation", "#D6475C"], ["Doesn’t match our facts", "inconsistency", "#F5B84B"], ["No proof on file", "unverifiable", "#8B7CFF"]].map(([name, k, c]) => ({ name, v: fs.filter((f) => f.cls === k).length, c }))} />
            <Donut title="How did all checked posts turn out?" q="Results of every post checked in this session." none="Check a post to see results here." items={["Cleared", "Modify", "Ask a human"].map((k, i) => ({ name: LBL[k], v: ins?.verdicts[k] ?? 0, c: ["#1FA971", "#F5B84B", "#D6475C"][i] }))} />
            <Bars title="Which rules are broken most often?" q="Counts across all posts checked." none="No rules have been broken yet." max={Math.max(1, ...Object.values(ins?.by_rule ?? {}))} rows={Object.entries(ins?.by_rule ?? {}).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([k, v]) => ({ label: RN[k], v, c: "#6C8CFF", text: String(v) }))} />
            <Bars title="Are our approved facts out of date?" q="Days since each fact was last checked. Facts older than 90 days need re-checking." max={150} rows={(brand?.facts ?? []).map((f) => ({ label: f.label, v: Math.min(f.age, 150), c: f.stale ? "#D6475C" : "#1FA971", text: `${f.age} days${f.stale ? " · needs re-checking" : " · OK"}` }))} />
          </div></>}

        {tab === 5 && <>
          <div className="card"><h2>FitNest rulebook</h2><p className="m">This is what the checkers compare each post with. A real company would upload its own guideline documents; here the rules are written into the demo. The app never changes them on its own.</p></div>
          {GROUPS.map(([g, ids], gi) => <div key={g}>
            <div className="card"><h2>{g}</h2>{ids.map((k) => <p key={k} id={"rule-" + k}><b>{RN[k]}</b><br /><span className="m">{rules[k]}</span></p>)}</div>
            {gi === 0 && <div className="card"><h2>Approved facts</h2><p className="m">Each fact has an owner and a date. If it hasn’t been re-checked in 90 days, posts using it are flagged.</p>
              <div style={{ overflowX: "auto" }}><table><thead><tr><th>Fact</th><th>Value</th><th>Source</th><th>Owner</th><th>Last checked</th><th>Status</th></tr></thead><tbody>
                {brand?.facts.map((f) => <tr key={f.label}><td>{f.label}</td><td>{f.show}</td><td>{f.source}</td><td>{f.owner}</td><td>{f.verified}</td><td className={f.stale ? "stale" : "cur"}>{f.stale ? `Needs re-checking (${f.age} days)` : "Current"}</td></tr>)}</tbody></table></div></div>}
            {gi === 1 && <div className="card"><h2>Brand colours</h2>{brand?.palette.map((c) => <span key={c} className="sw" style={{ background: c }} title={c} />)}<span className="m">{brand?.palette.join(", ")}</span></div>}</div>)}</>}

        {tab === 6 && <>
          <div className="card"><h2>About BrandBench</h2><p className="m">BrandBench checks content against a brand’s approved rules before it is published. The checkers advise, and a named person always decides.</p></div>
          <div className="steps">{[["Set up the rulebook", "Tone, glossary, approved facts with owners and dates, and colours."], ["Submit a post", "A creator picks or writes a post."], ["Three checkers read it", "Voice and Messaging, Fact and Claims, Look and Accessibility, side by side."], ["Findings with reasons", "The exact phrase, why it was flagged, the rule used and a suggested fix."], ["Creator decides on each fix", "Accept it, or say it is not a problem. Serious items need a reason."], ["A named person publishes", "The reviewer approves, or sends it back for changes."], ["Learn from the results", "The summary shows which rules break most often."]].map((s, i) => <div key={s[0]}><b><span className="n">{i + 1}</span>{s[0]}</b><p className="m">{s[1]}</p></div>)}</div>
          <div className="card" style={{ marginTop: 16 }}><h2>Tech stack</h2><p className="m">React and TypeScript frontend, Python FastAPI backend, PostgreSQL storage (in memory when no database is configured). PyMuPDF, python-docx, Pillow, OpenCV and Tesseract handle PDF, Word and image intake. Checks are rule-based code and no AI model is used yet.</p></div></>}
      </main>
    </>
  );
}
