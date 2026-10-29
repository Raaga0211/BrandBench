import os, sys, pathlib
os.environ.pop("DATABASE_URL", None)  # in-memory store, no database needed for tests
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1]))
from fastapi.testclient import TestClient
import main
c = TestClient(main.app)
BAD = dict(title="A", text="India's #1 fitness app! Plans from just ₹499/month. Join 10,000+ members. BUY NOW or regret it!", fg="#FFA500", bg="#FFFFFF", has_img=True, img_color="#FFA500")
GOOD = dict(title="B", text="Start your fitness journey with FitNest. Plans from Rs 599/month. Results vary by individual.", fg="#1B1B1E", bg="#F4F1DE")
def test_bad_post_goes_to_human():
    r = c.post("/api/check", json=BAD).json(); rules = {f["rule"] for f in r["findings"]}
    assert r["verdict"] == "Ask a human" and {"CLAIM-1", "FACT-1", "TONE-1", "VIS-1", "ACC-1"} <= rules
def test_clean_post_cleared():
    assert c.post("/api/check", json=GOOD).json()["verdict"] == "Cleared"
def test_dismissing_serious_needs_reason_and_does_not_lower_result():
    r = c.post("/api/check", json=BAD).json(); i = r["id"]; k = next(n for n, f in enumerate(r["findings"]) if f["rule"] == "CLAIM-1")
    assert c.post(f"/api/subs/{i}/finding", json={"idx": k, "action": "dismiss"}).status_code == 400
    out = c.post(f"/api/subs/{i}/finding", json={"idx": k, "action": "dismiss", "reason": "evidence attached"}).json()
    assert out["verdict"] == "Ask a human"
def test_approval_rules():
    r = c.post("/api/check", json=BAD).json(); i = r["id"]
    assert c.post(f"/api/subs/{i}/approve", json={"name": "Raaga"}).status_code == 400
    for k in range(len(r["findings"])): c.post(f"/api/subs/{i}/finding", json={"idx": k, "action": "accept"})
    assert c.post(f"/api/subs/{i}/approve", json={"name": "Raaga"}).status_code == 400
    assert c.post(f"/api/subs/{i}/approve", json={"name": "Raaga", "note": "claim removed"}).json()["approved_by"] == "Raaga"
