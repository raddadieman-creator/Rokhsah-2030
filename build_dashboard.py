# يدمج قائمة التخصصات في لوحة Apps Script
import pathlib
root = pathlib.Path(__file__).parent
specs = (root / "js/specs.js").read_text(encoding="utf-8").replace("window.GENERAL", "const GENERAL").replace("window.SPECS", "const SPECS").replace("window.BANKS = window.BANKS || {};", "")
src = (root / "apps-script/Dashboard.src.html").read_text(encoding="utf-8")
(root / "apps-script/Dashboard.html").write_text(src.replace("/*SPECS*/", specs), encoding="utf-8")
print("ok")
