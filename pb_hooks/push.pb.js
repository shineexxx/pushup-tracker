/// <reference path="../pb_data/types.d.ts" />
// Напоминания через web push. Шифрование и отправку делает локальный сервис notifier/.

routerAdd("GET", "/api/push/key", (e) => {
  const lib = require(`${__hooks}/push_lib.js`);
  return e.json(200, { publicKey: lib.publicKey() });
});

routerAdd("POST", "/api/push/test", (e) => {
  const lib = require(`${__hooks}/push_lib.js`);
  const res = lib.sendToUser(e.auth.id, {
    title: "Уведомления работают", body: "Так будут выглядеть напоминания.", tag: "test", url: "/",
  });
  return e.json(200, res);
}, $apis.requireAuth("users"));

cronAdd("push_reminders", "* * * * *", () => {
  require(`${__hooks}/push_lib.js`).runReminders();
});
