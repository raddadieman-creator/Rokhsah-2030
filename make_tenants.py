# يولّد مجلدًا لكل مشتركة في js/tenants.js، فيه صفحة تقرأ ملفات المنصة المشتركة
import pathlib, re
root = pathlib.Path(__file__).parent
ids = re.findall(r'^\s{2}([a-z0-9_-]+):\s*\{', (root / "js/tenants.js").read_text(encoding="utf-8"), re.M)
src = (root / "index.html").read_text(encoding="utf-8")
for t in ids:
    page = src.replace('href="css/', 'href="../css/').replace('src="js/', 'src="../js/')
    page = page.replace('<script src="../js/config.js"></script>',
                        '<script>window.TENANT = "%s"; window.ASSET_BASE = "../";</script>\n<script src="../js/config.js"></script>' % t)
    d = root / t; d.mkdir(exist_ok=True)
    (d / "index.html").write_text(page, encoding="utf-8")
    print("ok:", t)
