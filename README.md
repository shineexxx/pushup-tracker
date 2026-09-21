# Трекер отжиманий

PocketBase + один `pb_public/index.html` без сборки. Концепт: [pushup-tracker-concept.md](pushup-tracker-concept.md).

## Структура

- `pb_public/` — фронт (index.html, SDK, манифест, иконки, service worker). План тренировок — объект `PLAN` в начале скрипта в `index.html`
- `pb_migrations/` — коллекции `sets`, `max_tests`, `settings`, правила доступа, выключенная регистрация, сессия на год
- `pocketbase` — бинарник (в .gitignore; v0.40.4, для сервера нужен linux-вариант)
- `pb_data/` — база (в .gitignore)

## Локальный запуск

```bash
./pocketbase superuser upsert ТВОЙ_EMAIL ТВОЙ_ПАРОЛЬ   # один раз: админ для /_/
./pocketbase serve                                       # http://127.0.0.1:8090
```

Миграции применяются сами при старте. Дальше в админке http://127.0.0.1:8090/_/ → коллекция `users` → New record: email и пароль для входа в трекер. Запись `settings` создаётся сама при первом входе.

Чтобы открыть с iPhone в той же Wi-Fi сети: `./pocketbase serve --http=0.0.0.0:8090` и зайти на `http://IP-мака:8090`. Без HTTPS service worker и офлайн-оболочка не работают — это появится после деплоя.

## Прод

https://pushups.shineexxx.xyz — личный VPS. На нём живут и другие сервисы: их конфиги и firewall не трогаем.

- PocketBase: `/opt/pushups`, пользователь `pushups`, юнит [deploy/pushups.service](deploy/pushups.service), слушает `127.0.0.1:8090`
- Caddy: `/etc/caddy/Caddyfile` = [deploy/Caddyfile](deploy/Caddyfile), исходный сохранён как `Caddyfile.orig`
- Бэкапы: `/opt/pushups/pb_data/backups`, ежедневно 03:30 UTC, 14 копий (миграция `1758441700_backups.js`)

Обновить фронт (перезапуск не нужен):

```bash
COPYFILE_DISABLE=1 tar -czf - pb_public | ssh USER@SERVER 'sudo tar -xzf - -C /opt/pushups && sudo chown -R pushups:pushups /opt/pushups/pb_public'
```

Новые миграции: так же скопировать `pb_migrations` и `sudo systemctl restart pushups`. Переезд на другой сервер: бинарник, `/opt/pushups/pb_data`, Caddyfile, юнит.
