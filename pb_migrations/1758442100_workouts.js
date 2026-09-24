/// <reference path="../pb_data/types.d.ts" />
// Итог тренировки за день: оценка усилия 1–5.
migrate((app) => {
  const users = app.findCollectionByNameOrId("users");
  const own = '@request.auth.id != "" && user = @request.auth.id';
  app.save(new Collection({
    type: "base", name: "workouts",
    listRule: own, viewRule: own, createRule: own, updateRule: own, deleteRule: own,
    fields: [
      { name: "user", type: "relation", collectionId: users.id, required: true, maxSelect: 1, cascadeDelete: true },
      { name: "date", type: "text", required: true, pattern: "^\\d{4}-\\d{2}-\\d{2}$" },
      { name: "effort", type: "number", required: true, min: 1, max: 5, onlyInt: true },
      { name: "created", type: "autodate", onCreate: true, onUpdate: false },
    ],
    indexes: ["CREATE UNIQUE INDEX idx_workouts_user_date ON workouts (user, date)"],
  }));
}, (app) => {
  app.delete(app.findCollectionByNameOrId("workouts"));
});
