// Принимает от PocketBase {subscription, payload} на 127.0.0.1 и отправляет web push.
// Ключи VAPID лежат рядом в vapid.json (в репозиторий не попадают):
//   npx web-push generate-vapid-keys --json > vapid.json
const http = require('http');
const fs = require('fs');
const path = require('path');
const webpush = require('web-push');

const PORT = process.env.PORT || 8092;
const SUBJECT = process.env.VAPID_SUBJECT || 'https://pushups.shineexxx.xyz';
const vapid = JSON.parse(fs.readFileSync(path.join(__dirname, 'vapid.json'), 'utf8'));
webpush.setVapidDetails(SUBJECT, vapid.publicKey, vapid.privateKey);

http.createServer((req, res) => {
  const reply = (code, body) => { res.writeHead(code, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(body)); };
  if (req.method !== 'POST' || req.url !== '/send') return reply(404, { error: 'not found' });
  let raw = '';
  req.on('data', c => { raw += c; if (raw.length > 1e5) req.destroy(); });
  req.on('end', async () => {
    try {
      const { subscription, payload } = JSON.parse(raw);
      const r = await webpush.sendNotification(subscription, JSON.stringify(payload), { TTL: 3600, urgency: 'high' });
      console.log(`sent ${r.statusCode} ${payload.tag || ''} -> ${subscription.endpoint.slice(0, 40)}`);
      reply(200, { ok: true });
    } catch (err) {
      // 404/410 от push-сервиса = подписка больше не существует
      const gone = err.statusCode === 404 || err.statusCode === 410;
      console.log(`failed ${err.statusCode || ''} ${String(err.body || err.message).slice(0, 200)}`);
      reply(gone ? 410 : 502, { error: String(err.body || err.message) });
    }
  });
}).listen(PORT, '127.0.0.1', () => console.log(`notifier on 127.0.0.1:${PORT}`));
