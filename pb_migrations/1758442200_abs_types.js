/// <reference path="../pb_data/types.d.ts" />
// Программа на пресс: новые значения в sets.type.
const ABS = ["crunch", "legraise", "bicycle", "reverse", "twist", "climber"];
migrate((app) => {
  const sets = app.findCollectionByNameOrId("sets");
  const f = sets.fields.getByName("type");
  f.values = [...f.values.filter((v) => !ABS.includes(v)), ...ABS];
  app.save(sets);
}, (app) => {
  const sets = app.findCollectionByNameOrId("sets");
  const f = sets.fields.getByName("type");
  f.values = f.values.filter((v) => !ABS.includes(v));
  app.save(sets);
});
