# يبني نسخة مستقلة لمشتركة واحدة في مجلد خارجي (مستودع منفصل)
# الاستخدام: python3 build_standalone.py amani /path/to/out
import pathlib, re, shutil, subprocess, sys, json
root = pathlib.Path(__file__).parent
tid, out = sys.argv[1], pathlib.Path(sys.argv[2])
out.mkdir(parents=True, exist_ok=True)
for p in out.iterdir():
    if p.name == ".git": continue
    shutil.rmtree(p) if p.is_dir() else p.unlink()
# البنوك المسموحة لمراحل المشتركة فقط، والاختبار العام دائمًا
js = subprocess.check_output(["node", "-e", """
global.window={CONFIG:{}};const fs=require('fs');
eval(fs.readFileSync('js/specs.js','utf8'));window.TENANT=process.argv[1];
eval(fs.readFileSync('js/tenants.js','utf8'));const st=window.TENANTS[process.argv[1]].STAGES||[];
const ids=['gen'];Object.values(window.SPECS).forEach(g=>g.items.forEach(i=>{if(!st.length||st.some(x=>i.stage.includes(x))||i.stage==='جميع المراحل')ids.push(i.id)}));
console.log(JSON.stringify(ids))""", tid], cwd=root)
ids = set(json.loads(js))
shutil.copytree(root / "css", out / "css")
shutil.copytree(root / "assets", out / "assets")
(out / "js/vault").mkdir(parents=True)
for f in ["config.js", "specs.js", "guide.js", "app.js"]:
    shutil.copy(root / "js" / f, out / "js" / f)
for v in (root / "js/vault").glob("*.json"):
    if v.stem in ids: shutil.copy(v, out / "js/vault" / v.name)
# ملف المشتركات: هذه المشتركة وحدها
t = (root / "js/tenants.js").read_text(encoding="utf-8")
m = re.search(r"^\s{2}%s:\s*\{.*?^\s{2}\}" % re.escape(tid), t, re.M | re.S)
t = re.sub(r"window\.TENANTS = \{.*?^\};", "window.TENANTS = {\n" + m.group(0) + "\n};", t, flags=re.M | re.S)
(out / "js/tenants.js").write_text(t, encoding="utf-8")
page = (root / "index.html").read_text(encoding="utf-8").replace(
    '<script src="js/config.js"></script>',
    '<script>window.TENANT = "%s"; window.ASSET_BASE = "";</script>\n<script src="js/config.js"></script>' % tid)
(out / "index.html").write_text(page, encoding="utf-8")
(out / ".nojekyll").write_text("")
print("banks:", sorted(ids))
