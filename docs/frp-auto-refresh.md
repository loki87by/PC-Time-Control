# Авто-восстановление проброса при рестартах ВМ

Конфигурация frp может затираться при перезапуске виртуальной машины.
Решение — API-роут на той же ВМ, который проверяет аптайм службы frp и умеет её перезапускать.

## Код

Готовый пример — в `apiExample.js`. Если своего API нет — используйте его как основу.

## `.env` в корне проекта

```text
BASE="https://my-api"
NAME="test"
FRP_ADMIN="<FRP_ADMIN>"
PASS="<FRP_PASSWORD>"
IP="http://<SERVER_IP>:8080"
```

Данные подставьте свои. `.env` добавьте в `.gitignore`.

> **ВАЖНО!** Не используйте для `FRP_ADMIN` переменные с именами `USER` или `USERNAME` —
> они конфликтуют с системным именем пользователя и могут перезаписываться,
> что ломает работу системы.

## `.env.example` (можно коммитить)

```text
BASE="https://my-api"
NAME="test"
FRP_ADMIN="your-frp-admin"
PASS="your-strong-password"
IP="http://your-server-ip:8080"
```

[← Назад: внешний доступ](./external-access.md) | [Оглавление](../README.md) | [Далее: SMB/C$ →](./smb-setup.md)
