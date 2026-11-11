"""Run the frozen homepage candidate in isolated, read-only browser contexts."""
from pathlib import Path
from datetime import datetime, timezone
import hashlib
import json
import os
import subprocess
import sys

project = Path(__file__).resolve().parents[2]
os.chdir(project)
expected_main = "2ac23a5e2a2c2405633c94ae5f1b4394faf14553501a47a7b783373a707bb165"
digest = lambda path: hashlib.sha256(path.read_bytes()).hexdigest()
sources = lambda: {str(p.relative_to(project)): digest(p) for p in sorted((project / "src").rglob("*")) if p.is_file()}
build = lambda: {str(p.relative_to(project)): digest(p) for p in sorted((project / "dist").rglob("*")) if p.is_file() and p.suffix in (".html", ".js", ".css")}
assert digest(project / "src/main.ts") == expected_main, "Candidate source changed before QA"
assert (project / "dist/index.html").stat().st_mtime_ns >= max(p.stat().st_mtime_ns for p in (project / "src").rglob("*") if p.is_file()), "Build predates source; refusing stale QA"
started = datetime.now(timezone.utc)
results = project / "qa/homepage/results"
results.mkdir(parents=True, exist_ok=True)
receipt = results / ("candidate-suite-" + started.strftime("%Y%m%dT%H%M%SZ") + ".json")
report = {"startedAt": started.isoformat(), "source": sources(), "build": build(), "checks": [], "status": "running"}
def save():
    receipt.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n")
save()
for script in ("check-regressions.mjs", "check-state-regressions.mjs", "check-homepage.mjs"):
    before = set(results.glob("*/report.json"))
    task = {"script": script, "scriptSha256": digest(project / "qa/homepage" / script), "startedAt": datetime.now(timezone.utc).isoformat()}
    print(json.dumps({"suite": "start", **task}), flush=True)
    try:
        run = subprocess.run(["/opt/imon-runtime/node/bin/node", str(project / "qa/homepage" / script)], env={**os.environ, "QA_PHASE": "candidate", "QA_BROWSERS": "chromium,firefox,webkit"}, timeout=1500)
        task["exitCode"] = run.returncode
    except subprocess.TimeoutExpired:
        task["exitCode"] = 124
        task["error"] = "Timed out after 1500 seconds"
    task["finishedAt"] = datetime.now(timezone.utc).isoformat()
    task["reports"] = []
    for path in sorted(set(results.glob("*/report.json")) - before):
        details = json.loads(path.read_text())
        task["reports"].append({"path": str(path.relative_to(project)), "sha256": digest(path), "passed": details.get("passed"), "failed": details.get("failed")})
    report["checks"].append(task)
    save()
    print(json.dumps({"suite": "finish", **task}), flush=True)
report["sourceUnchanged"] = report["source"] == sources()
report["buildUnchanged"] = report["build"] == build()
report["finishedAt"] = datetime.now(timezone.utc).isoformat()
report["status"] = "pass" if all(x["exitCode"] == 0 and len(x["reports"]) == 1 for x in report["checks"]) and report["sourceUnchanged"] and report["buildUnchanged"] else "fail"
save()
print(json.dumps({"suite": report["status"], "receipt": str(receipt), "sourceUnchanged": report["sourceUnchanged"], "buildUnchanged": report["buildUnchanged"]}), flush=True)
sys.exit(0 if report["status"] == "pass" else 1)
