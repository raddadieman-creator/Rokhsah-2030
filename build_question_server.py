# يجمع بنوك الأسئلة في ملف Banks.gs لخادم الأسئلة المركزي
import json, pathlib, subprocess
root = pathlib.Path(__file__).parent
js = """global.window={BANKS:{}};const fs=require('fs');const d=process.argv[1];
for(const f of fs.readdirSync(d+'/js/banks'))require(d+'/js/banks/'+f);
process.stdout.write(JSON.stringify(window.BANKS));"""
out = subprocess.run(["node", "-e", js, str(root.resolve())], capture_output=True, text=True, check=True).stdout
banks = json.loads(out)
(root / "question-server/Banks.gs").write_text("/* مولَّد آليًّا من js/banks — لا يُعدَّل يدويًّا */\nconst BANKS = " + json.dumps(banks, ensure_ascii=False) + ";\n", encoding="utf-8")
print("banks:", len(banks), "questions:", sum(len(v) for v in banks.values()))
