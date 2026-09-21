# Трекер отжиманий

PocketBase + один `pb_public/index.html` без сборки. Концепт: [pushup-tracker-concept.md](pushup-tracker-concept.md).

## Структура

- `pb_public/` — фронт (index.html, SDK, манифест, иконки, service worker). План тренировок — объект `PLAN` в начале скрипта в `index.html`
- `pb_migrations/` — коллекции `sets`, `max_tests`, `settings`, `push_subs`, правила доступа, выключенная регистрация, сессия на год, бэкапы
- `pb_hooks/` — напоминания: раз в минуту PocketBase проверяет, кому пора напомнить (`remind_time` — если за день нет подходов, `remind_late` — если день не засчитан в цепочку)
- `notifier/` — маленький Node-сервис на `127.0.0.1:8092`: шифрует и отправляет web push (пакет `web-push`). Ключи VAPID лежат в `notifier/vapid.json`, в репозиторий не попадают
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
- Уведомления: `/opt/pushups/notifier`, юнит [deploy/pushups-notifier.service](deploy/pushups-notifier.service). `vapid.json` при переезде нужно перенести, иначе все подписки придётся включать заново
- Бэкапы: `/opt/pushups/pb_data/backups`, ежедневно 03:30 UTC, 14 копий (миграция `1758441700_backups.js`)

Обновить фронт (перезапуск не нужен):

```bash
COPYFILE_DISABLE=1 tar -czf - pb_public | ssh USER@SERVER 'sudo tar -xzf - -C /opt/pushups && sudo chown -R pushups:pushups /opt/pushups/pb_public'
```

Новые миграции и хуки: так же скопировать `pb_migrations` и `pb_hooks`, затем `sudo systemctl restart pushups`.

На iPhone уведомления работают только из приложения на экране «Домой» (iOS 16.4+): открыть оттуда → Настройки → «Включить напоминания». Переезд на другой сервер: бинарник, `/opt/pushups/pb_data`, Caddyfile, юнит.
