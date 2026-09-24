// Общие функции для push.pb.js (каждый хук PocketBase исполняется в изолированном контексте).
const NOTIFIER = "http://127.0.0.1:8092";
const PUSHUPS = ["classic", "weighted", "decline", "diamond", "wide", "slow"]; // пресс в цепочку не идёт
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
      if (res.statusCode === 200) { sent++; $app.logger().info("push sent", "user", userId, "tag", payload.tag, "endpoint", String(s.get("endpoint")).slice(0, 40)); }
      else if (res.statusCode === 410) $app.delete(s); // подписка отозвана
      else $app.logger().warn("push failed", "status", res.statusCode, "body", toString(res.body));
    } catch (err) {
      $app.logger().error("push notifier unreachable", "error", String(err));
    }
  }
  return { sent, total: subs.length };
}

// Напоминание считается «в окне» 10 минут после назначенного времени: если минута пропущена
// (перезапуск, задержка), оно всё равно уйдёт. Что уже ушло сегодня — в settings.remind_log.
const WINDOW_MIN = 10;
const toMin = (hhmm) => { const m = /^(\d\d):(\d\d)$/.exec(hhmm || ""); return m ? +m[1] * 60 + +m[2] : -1; };

function runReminders() {
  const all = $app.findRecordsByFilter("settings", "remind_enabled = true", "", 0, 0);
  const now = Date.now();
  for (const st of all) {
    const local = new Date(now + (st.getInt("tz_offset_min") || 0) * 60000);
    const nowMin = local.getUTCHours() * 60 + local.getUTCMinutes();
    const date = `${local.getUTCFullYear()}-${pad(local.getUTCMonth() + 1)}-${pad(local.getUTCDate())}`;
    const weekend = local.getUTCDay() === 0 || local.getUTCDay() === 6;
    const inWindow = (hhmm) => { const t = toMin(hhmm); return t >= 0 && nowMin >= t && nowMin < t + WINDOW_MIN; };

    let log = st.getString("remind_log");
    if (!log.startsWith(date + ":")) log = date + ":";
    const already = (kind) => log.slice(date.length + 1).split(",").includes(kind);

    const kinds = [];
    if (inWindow(st.getString(weekend ? "remind_time_we" : "remind_time")) && !already("main")) kinds.push("main");
    if (inWindow(st.getString(weekend ? "remind_late_we" : "remind_late")) && !already("late")) kinds.push("late");
    if (!kinds.length) continue;

    const sets = $app.findRecordsByFilter("sets", "user = {:u} && date = {:d}", "", 0, 0, { u: st.get("user"), d: date });
    let total = 0;
    for (const s of sets) if (PUSHUPS.includes(s.getString("type"))) total += s.getInt("reps");

    for (const kind of kinds) {
      let payload = null;
      if (kind === "late" && total < MIN_REPS && local.getUTCDay() !== REST_WEEKDAY) {
        payload = { title: "Цепочка под угрозой", body: `Сегодня ${total ? "только " + total : "ещё нет отжиманий"}. Хватит одного подхода из ${MIN_REPS}.` };
      } else if (kind === "main" && total === 0) {
        payload = { title: "Пора отжиматься", body: "Сегодня ещё нет подходов. Открой трекер и запиши первый." };
      }
      $app.logger().info("reminder due", "user", st.get("user"), "kind", kind, "date", date, "total", total, "send", !!payload);
      if (payload) sendToUser(st.get("user"), { ...payload, tag: "reminder", url: "/" });
      // Помечаем и без отправки: условие уже проверено, повторять в окне не надо
      log += (log.endsWith(":") ? "" : ",") + kind;
    }
    st.set("remind_log", log);
    $app.save(st);
  }
}

module.exports = { publicKey, sendToUser, runReminders };
