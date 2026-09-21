/// <reference path="../pb_data/types.d.ts" />
// Ежедневный бэкап в pb_data/backups в 03:30 UTC, хранить последние 14 копий.
migrate((app) => {
  const settings = app.settings();
  settings.backups.cron = "30 3 * * *";
  settings.backups.cronMaxKeep = 14;
  app.save(settings);
}, (app) => {
  const settings = app.settings();
  settings.backups.cron = "";
  app.save(settings);
});
