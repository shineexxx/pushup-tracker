/// <reference path="../pb_data/types.d.ts" />
// Какие напоминания уже ушли сегодня, например "2026-09-24:main,late". Нужно, чтобы окно повтора не слало дубли.
migrate((app) => {
  const settings = app.findCollectionByNameOrId("settings");
  settings.fields.add(new TextField({ name: "remind_log", max: 64 }));
  app.save(settings);
}, (app) => {
  const settings = app.findCollectionByNameOrId("settings");
  settings.fields.removeByName("remind_log");
  app.save(settings);
});
