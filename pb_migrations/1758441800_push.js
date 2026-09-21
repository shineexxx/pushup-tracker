/// <reference path="../pb_data/types.d.ts" />
// Web push: подписки устройств и настройки напоминаний.
migrate((app) => {
  const users = app.findCollectionByNameOrId("users");
  const own = '@request.auth.id != "" && user = @request.auth.id';

  app.save(new Collection({
    type: "base", name: "push_subs",
    listRule: own, viewRule: own, createRule: own, updateRule: own, deleteRule: own,
    fields: [
      { name: "user", type: "relation", collectionId: users.id, required: true, maxSelect: 1, cascadeDelete: true },
      { name: "endpoint", type: "text", required: true, max: 2000 },
      { name: "p256dh", type: "text", required: true, max: 300 },
      { name: "auth", type: "text", required: true, max: 100 },
      { name: "device", type: "text", max: 200 },
      { name: "created", type: "autodate", onCreate: true, onUpdate: false },
    ],
    indexes: ["CREATE UNIQUE INDEX idx_push_subs_endpoint ON push_subs (endpoint)"],
  }));

  const settings = app.findCollectionByNameOrId("settings");
  settings.fields.add(new BoolField({ name: "remind_enabled" }));
  // Основное напоминание: приходит, если за сегодня ещё нет ни одного подхода
  settings.fields.add(new TextField({ name: "remind_time", pattern: "^([01]\\d|2[0-3]):[0-5]\\d$" }));
  // «Последний шанс»: приходит, если день всё ещё не засчитан в цепочку
  settings.fields.add(new TextField({ name: "remind_late", pattern: "^([01]\\d|2[0-3]):[0-5]\\d$" }));
  // Смещение устройства от UTC в минутах (Москва = 180), чтобы считать локальное время и дату
  settings.fields.add(new NumberField({ name: "tz_offset_min", onlyInt: true }));
  app.save(settings);
}, (app) => {
  app.delete(app.findCollectionByNameOrId("push_subs"));
  const settings = app.findCollectionByNameOrId("settings");
  for (const f of ["remind_enabled", "remind_time", "remind_late", "tz_offset_min"]) settings.fields.removeByName(f);
  app.save(settings);
});
