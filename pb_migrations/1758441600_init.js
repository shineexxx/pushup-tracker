/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const users = app.findCollectionByNameOrId("users");

  // Публичная регистрация выключена: пользователь создаётся вручную через админку.
  users.createRule = null;
  // Долгая сессия (1 год), фронт продлевает токен при каждом открытии.
  users.authToken.duration = 31536000;
  app.save(users);

  const own = '@request.auth.id != "" && user = @request.auth.id';
  const rules = { listRule: own, viewRule: own, createRule: own, updateRule: own, deleteRule: own };

  const userField = {
    name: "user", type: "relation", collectionId: users.id,
    required: true, maxSelect: 1, cascadeDelete: true,
  };
  const dateField = { name: "date", type: "text", required: true, pattern: "^\\d{4}-\\d{2}-\\d{2}$" };
  const created = { name: "created", type: "autodate", onCreate: true, onUpdate: false };

  app.save(new Collection({
    type: "base", name: "sets", ...rules,
    fields: [
      userField,
      dateField,
      { name: "reps", type: "number", required: true, min: 1, onlyInt: true },
      {
        name: "type", type: "select", required: true, maxSelect: 1,
        values: ["classic", "weighted", "decline", "diamond", "wide", "slow"],
      },
      { name: "weight_kg", type: "number", min: 0 },
      created,
    ],
    indexes: ["CREATE INDEX idx_sets_user_date ON sets (user, date)"],
  }));

  app.save(new Collection({
    type: "base", name: "max_tests", ...rules,
    fields: [
      userField,
      dateField,
      { name: "reps", type: "number", required: true, min: 1, onlyInt: true },
      created,
    ],
    indexes: ["CREATE INDEX idx_max_tests_user_date ON max_tests (user, date)"],
  }));

  app.save(new Collection({
    type: "base", name: "settings", ...rules,
    fields: [
      userField,
      { name: "start_date", type: "text", required: true, pattern: "^\\d{4}-\\d{2}-\\d{2}$" },
      { name: "current_max", type: "number", required: true, min: 1, onlyInt: true },
      { name: "backpack_kg", type: "number", min: 0 },
    ],
    indexes: ["CREATE UNIQUE INDEX idx_settings_user ON settings (user)"],
  }));
}, (app) => {
  for (const name of ["sets", "max_tests", "settings"]) {
    app.delete(app.findCollectionByNameOrId(name));
  }
});
