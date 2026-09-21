/// <reference path="../pb_data/types.d.ts" />
// Отдельное расписание напоминаний для выходных (сб, вс). Пустое время = напоминание выключено.
migrate((app) => {
  const settings = app.findCollectionByNameOrId("settings");
  const hhmm = "^([01]\\d|2[0-3]):[0-5]\\d$";
  settings.fields.add(new TextField({ name: "remind_time_we", pattern: hhmm }));
  settings.fields.add(new TextField({ name: "remind_late_we", pattern: hhmm }));
  app.save(settings);

  // У кого напоминания уже настроены — выходные стартуют с тех же значений, что и будни
  const recs = app.findRecordsByFilter("settings", "remind_time != '' || remind_late != ''", "", 0, 0);
  for (const r of recs) {
    r.set("remind_time_we", r.getString("remind_time"));
    r.set("remind_late_we", r.getString("remind_late"));
    app.save(r);
  }
}, (app) => {
  const settings = app.findCollectionByNameOrId("settings");
  settings.fields.removeByName("remind_time_we");
  settings.fields.removeByName("remind_late_we");
  app.save(settings);
});
