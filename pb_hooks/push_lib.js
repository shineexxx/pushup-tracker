// Общие функции для push.pb.js (каждый хук PocketBase исполняется в изолированном контексте).
const NOTIFIER = "http://127.0.0.1:8092";
const MIN_REPS = 10;      // столько повторов достаточно, чтобы день попал в цепочку
const REST_WEEKDAY = 0;   // воскресенье: отдых разрешён, «последний шанс» не шлём

const pad = (n) => String(n).padStart(2, "0");

function publicKey() {
  try {
    return JSON.parse(toString($os.readFile(`${__hooks}/../notifier/vapid.json`))).publicKey;
  } catch (_) {
    return "";
  }
}

// Отправляет уведомление на все устройства пользователя, мёртвые подписки удаляет.
function sendToUser(userId, payload) {
  const subs = $app.findRecordsByFilter("push_subs", "user = {:u}", "", 0, 0, { u: userId });
  let sent = 0;
  for (const s of subs) {
    try {
      const res = $http.send({
        url: `${NOTIFIER}/send`, method: "POST", timeout: 20,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subscription: { endpoint: s.get("endpoint"), keys: { p256dh: s.get("p256dh"), auth: s.get("auth") } },
          payload,
        }),
      });
      if (res.statusCode === 200) sent++;
      else if (res.statusCode === 410) $app.delete(s); // подписка отозвана
      else $app.logger().warn("push failed", "status", res.statusCode, "body", toString(res.body));
    } catch (err) {
      $app.logger().error("push notifier unreachable", "error", String(err));
    }
  }
  return { sent, total: subs.length };
}

function runReminders() {
  const all = $app.findRecordsByFilter("settings", "remind_enabled = true", "", 0, 0);
  const now = Date.now();
  for (const st of all) {
    const local = new Date(now + (st.getInt("tz_offset_min") || 0) * 60000);
    const hhmm = `${pad(local.getUTCHours())}:${pad(local.getUTCMinutes())}`;
    const isMain = hhmm === st.getString("remind_time");
    const isLate = hhmm === st.getString("remind_late");
    if (!isMain && !isLate) continue;

    const date = `${local.getUTCFullYear()}-${pad(local.getUTCMonth() + 1)}-${pad(local.getUTCDate())}`;
    const sets = $app.findRecordsByFilter("sets", "user = {:u} && date = {:d}", "", 0, 0, { u: st.get("user"), d: date });
    let total = 0;
    for (const s of sets) total += s.getInt("reps");

    let payload = null;
    if (isLate && total < MIN_REPS && local.getUTCDay() !== REST_WEEKDAY) {
      payload = { title: "Цепочка под угрозой", body: `Сегодня ${total ? "только " + total : "ещё нет отжиманий"}. Хватит одного подхода из ${MIN_REPS}.` };
    } else if (isMain && total === 0) {
      payload = { title: "Пора отжиматься", body: "Сегодня ещё нет подходов. Открой трекер и запиши первый." };
    }
    if (payload) sendToUser(st.get("user"), { ...payload, tag: "reminder", url: "/" });
  }
}

module.exports = { publicKey, sendToUser, runReminders };
