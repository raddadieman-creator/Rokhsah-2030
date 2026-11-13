// يشفّر بنوك الأسئلة (AES-256-GCM) في js/vault، ويحفظ المفتاح في question-server/key.txt (لا يُرفع)
const fs = require('fs'), crypto = require('crypto'), path = require('path');
const root = __dirname;
global.window = { BANKS: {} };
for (const f of fs.readdirSync(path.join(root, 'js/banks'))) require(path.join(root, 'js/banks', f));
const keyFile = path.join(root, 'question-server/key.txt');
let key;
if (fs.existsSync(keyFile)) key = Buffer.from(fs.readFileSync(keyFile, 'utf8').trim(), 'base64');
else { key = crypto.randomBytes(32); fs.mkdirSync(path.dirname(keyFile), { recursive: true }); fs.writeFileSync(keyFile, key.toString('base64')); }
const out = path.join(root, 'js/vault');
for (const f of fs.readdirSync(out)) fs.unlinkSync(path.join(out, f));
let n = 0;
for (const [id, items] of Object.entries(window.BANKS)) {
  const iv = crypto.randomBytes(12);
  const c = crypto.createCipheriv('aes-256-gcm', key, iv);
  const enc = Buffer.concat([c.update(JSON.stringify(items), 'utf8'), c.final(), c.getAuthTag()]);
  fs.writeFileSync(path.join(out, id + '.json'), JSON.stringify({ iv: iv.toString('base64'), data: enc.toString('base64') }));
  n += items.length;
}
console.log('encrypted banks:', Object.keys(window.BANKS).length, 'questions:', n);
