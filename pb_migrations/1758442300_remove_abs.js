/// <reference path="../pb_data/types.d.ts" />
// Программа на пресс убрана: возвращаем sets.type к типам отжиманий.
const ABS = ["crunch", "legraise", "bicycle", "reverse", "twist", "climber"];
migrate((app) => {
  const sets = app.findCollectionByNameOrId("sets");
  const f = sets.fields.getByName("type");
  f.values = f.values.filter((v) => !ABS.includes(v));
  app.save(sets);
}, (app) => {
  const sets = app.findCollectionByNameOrId("sets");
  const f = sets.fields.getByName("type");
  f.values = [...f.values, ...ABS];
  app.save(sets);
});
