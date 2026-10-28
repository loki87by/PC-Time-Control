# PC Time Control

Управление временем использования компьютера с удалённым контролем.
За основу взят код из [репозитория](https://github.com/rookie7799/kid-pc-monitor/tree/main).

## Документация

| Раздел | Описание |
| --- | --- |
| [Обзор и изменения](docs/00-overview.md) | Что нового, ключевые возможности |
| [Установка](docs/01-install.md) | Node.js, зависимости, служба Windows |
| [Настройка](docs/02-config.md) | `config.js`, пользователи, лимиты |
| [Удалённое управление](docs/03-remote-control.md) | TCP-порт 9999 и веб-интерфейс |
| [Внешний доступ (frp)](docs/04-external-access.md) | Проброс через публичный сервер |
| [Авто-восстановление проброса](docs/05-frp-auto-refresh.md) | Обновление frp при рестартах ВМ |
| [Доступ к C$ по SMB](docs/06-smb-setup.md) | Настройка целевого ПК для удалённого обновления |
| [Устранение проблем](docs/07-troubleshooting.md) | Частые ошибки |

## Установка зависимостей

```bash
npm install
```

## Быстрый старт

```bash
npm start
```

## Установка как службы Windows (автозагрузка)

```bash
npm run install-service
```

Подробности — в [docs/01-install.md](docs/01-install.md).
