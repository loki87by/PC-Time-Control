# Устранение проблем

## Windows

### Служба не устанавливается

1. Запустите консоль от имени администратора.
2. Проверьте, что Node.js установлен и доступен в `PATH`:

   ```bash
   node -v
   where node
   ```

3. Временно отключите антивирус.

### Не работает удалённое управление (TCP 9999)

1. Проверьте брандмауэр Windows.
2. Добавьте исключение для порта 9999.
3. Проверьте:

   ```cmd
   netstat -an | find "9999"
   ```

### Не открывается веб-интерфейс (5000)

1. Убедитесь, что процесс запущен (`npm start` или служба).
2. Брандмауэр — исключение для порта 5000.
3. Проверьте `src/setup/config.js` — совпадает ли порт.

### SMB C$ не подключается

См. [06-smb-setup.md](./06-smb-setup.md). Частые причины:

- не перезагрузились после `LocalAccountTokenFilterPolicy`;
- пользователь не в группе администраторов;
- порт 445 закрыт брандмауэром;
- используется фильтрованный токен UAC (нужен встроенный Администратор или `LocalAccountTokenFilterPolicy=1`).

---

## Linux

### Сервис не запускается

Проверьте статус:

```bash
sudo systemctl status pc-time-control
sudo journalctl -u pc-time-control -n 50 --no-pager
```

Типичные причины:

- **Node.js не найден.** Убедитесь, что `node` доступен в `PATH`.
  Если установлен через `nvm` — укажите полный путь в `ExecStart` unit-файла.
- **Ошибка прав.** Сервис запускается от root. Если нужно от обычного пользователя —
  отредактируйте `User=` в `/etc/systemd/system/pc-time-control.service`.
- **Порт занят.** Проверьте: `sudo lsof -i :5000` и `sudo lsof -i :9999`.

### Не блокируется экран

Проверьте:

```bash
# Прямая блокировка через loginctl
loginctl lock-sessions

# Если не работает — попробуйте специфичную для DE команду:
# GNOME:
dbus-send --type=method_call --dest=org.gnome.ScreenSaver /org/gnome/ScreenSaver org.gnome.ScreenSaver.Lock
# KDE:
qdbus org.freedesktop.ScreenSaver /ScreenSaver Lock
```

### Не приходят уведомления

1. Установите `libnotify-bin`:

   ```bash
   sudo apt install libnotify-bin   # Debian/Ubuntu
   ```

2. Проверьте:

   ```bash
   notify-send "Тест" "Проверка" -u critical -i dialog-warning -t 10000
   ```

3. Уведомления НЕ показываются на заблокированном экране — это особенность Linux.

### Не выключается ПК

Проверьте:

```bash
# Ручное выключение
sudo shutdown -h +1
```

Если сервис запущен от root — выключение должно работать.
Если от обычного пользователя — настройте sudo без пароля для `shutdown`:

```bash
echo "%sudo ALL=(ALL) NOPASSWD: /sbin/shutdown" | sudo tee /etc/sudoers.d/shutdown
```

### Не работает удалённое обновление (SSH/rsync)

1. Проверьте SSH-доступ:

   ```bash
   ssh root@<IP>
   ```

2. Убедитесь, что `rsync` установлен на обоих хостах:

   ```bash
   which rsync
   ```

3. Если используется ключ — укажите `--ssh-key`:

   ```bash
   node scripts/update-agent.mjs --ip 192.168.1.100 --ssh-key ~/.ssh/id_ed25519
   ```

---

## Общее

### frp не восстанавливается после рестарта ВМ

См. [frp-auto-refresh.md](./frp-auto-refresh.md). Проверьте:

- `.env` заполнен;
- имена переменных не `USER`/`USERNAME`;
- API-роут доступен;
- служба frp запущена (`systemctl status frp-server`).

[← Назад: Linux Setup](./linux-setup.md) | [Оглавление](../README.md)
