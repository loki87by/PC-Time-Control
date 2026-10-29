# PC Time Control

Управление временем использования компьютера с удалённым контролем.
За основу взят код из [репозитория](https://github.com/rookie7799/kid-pc-monitor/tree/main).

## Документация

| Раздел | Описание |
| --- | --- |
| [Обзор и изменения](docs/overview.md) | Что нового, ключевые возможности |
| [Установка](docs/install.md) | Node.js, зависимости, служба Windows |
| [Настройка](docs/config.md) | `config.js`, пользователи, лимиты |
| [Удалённое управление](docs/remote-control.md) | TCP-порт 9999 и веб-интерфейс |
| [Внешний доступ (frp)](docs/external-access.md) | Проброс через публичный сервер |
| [Авто-восстановление проброса](docs/frp-auto-refresh.md) | Обновление frp при рестартах ВМ |
| [Доступ к C$ по SMB](docs/smb-setup.md) | Настройка целевого ПК для удалённого обновления (Windows) |
| [Настройка Linux](docs/linux-setup.md) | Linux: зависимости, firewall, обновление через SSH |
| [Устранение проблем](docs/troubleshooting.md) | Частые ошибки (Windows + Linux) |

## Установка зависимостей

```bash
npm install
```

## Быстрый старт

```bash
npm start
```

## Установка как службы (автозагрузка)

**Windows:**

```bash
npm run install-service
```

**Linux (systemd):**

```bash
npm run install-service-linux
```

Подробности — в [docs/install.md](docs/install.md).
