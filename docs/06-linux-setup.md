# Настройка Linux

## Установка зависимостей

### Необходимые пакеты

```bash
# Debian / Ubuntu / Mint
sudo apt update
sudo apt install -y nodejs npm libnotify-bin lsof

# Fedora / RHEL / CentOS
sudo dnf install -y nodejs npm libnotify lsof

# Arch Linux
sudo pacman -S nodejs npm libnotify lsof
```

### Проверка

```bash
node -v              # >= 16
npm -v
notify-send --help   # графические уведомления
loginctl --version   # блокировка сессий (входит в systemd)
lsof -v              # освобождение портов
```

## Установка сервиса

```bash
npm run install-service-linux
```

Скрипт запросит пароль через `sudo`. Он:

1. Копирует `pc-time-control.service` в `/etc/systemd/system/`
2. Создаёт `/var/log/pc-time-control/` для логов
3. Включает автозагрузку (`systemctl enable`)
4. Запускает сервис (`systemctl start`)

## Блокировка экрана

Блокировка работает через `loginctl lock-sessions` — поддерживается всеми
современными DE (GNOME, KDE, Xfce, Cinnamon, Budgie).

Если блокировка не срабатывает — проверьте:

```bash
# Ручная блокировка
loginctl lock-sessions

# Если не работает — возможно, используется другой дисплейный менеджер
# Для GNOME:
dbus-send --type=method_call --dest=org.gnome.ScreenSaver /org/gnome/ScreenSaver org.gnome.ScreenSaver.Lock
# Для KDE:
qdbus org.freedesktop.ScreenSaver /ScreenSaver Lock
```

## Уведомления (showMessage)

Уведомления работают через `notify-send` (пакет `libnotify-bin`).

Проверка:

```bash
notify-send "Тест" "Проверка уведомления" -u critical -i dialog-warning -t 10000
```

Если не отображается — проверьте:

- Установлен ли пакет `libnotify-bin`
- Запущен ли D-Bus (обычно есть в любом DE)
- Не заблокирован ли экран (уведомления не показываются на locked screen)

## Выключение ПК

Используется стандартная команда `shutdown -h +N`.

Для выключения без пароля (для работы из сервиса от root) — никаких
дополнительных настроек не требуется.

Для выключения от обычного пользователя — добавьте в `/etc/sudoers.d/shutdown`:

```text
%sudo ALL=(ALL) NOPASSWD: /sbin/shutdown
```

## Firewall

Если нужно открыть порты для удалённого управления:

```bash
# Веб-интерфейс (порт 5000)
sudo ufw allow 5000/tcp

# Удалённое управление (порт 9999)
sudo ufw allow 9999/tcp

# Discovery (порт 19999, UDP)
sudo ufw allow 19999/udp
```

## Логи

Сервис пишет логи в `/var/log/pc-time-control/service.log`.

Просмотр в реальном времени:

```bash
sudo journalctl -u pc-time-control -f
```

Последние N строк:

```bash
sudo journalctl -u pc-time-control -n 100 --no-pager
```

## Удаление сервиса

```bash
npm run uninstall-service-linux
```

Или вручную:

```bash
sudo systemctl stop pc-time-control
sudo systemctl disable pc-time-control
sudo rm /etc/systemd/system/pc-time-control.service
sudo systemctl daemon-reload
```

## Обновление агента на Linux

Для удалённого обновления Linux-агентов используется SSH/rsync:

```bash
# Сканирование сети и обновление всех Linux-хостов
node scripts/update-agent.mjs --scan --ssh-key ~/.ssh/id_ed25519

# Обновление конкретного хоста
node scripts/update-agent.mjs --ip 192.168.1.100 --user root

# С указанием SSH-ключа
node scripts/update-agent.mjs --ip 192.168.1.100 --ssh-key ~/.ssh/id_rsa
```

На целевом Linux-хосте должен быть:

- SSH-сервер (openssh-server)
- Пользователь с доступом по SSH (пароль или ключ)
- `sudo` для перезапуска сервиса (или запуск от root)

[← Назад: SMB/C$](./06-smb-setup.md) | [Оглавление](../README.md) | [Далее: устранение проблем →](./07-troubleshooting.md)