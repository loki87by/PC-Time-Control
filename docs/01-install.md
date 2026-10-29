# Установка

## Требования

- Node.js 16+
- **Windows** (для службы и автозагрузки) или **Linux** (systemd)

## Windows

1. Клонируйте репозиторий:

   ```bash
   git clone <URL_РЕПОЗИТОРИЯ>
   cd pc-time-control
   ```

2. Установите зависимости:

   ```bash
   npm install
   ```

3. Ручной запуск:

   ```bash
   npm start
   ```

4. Установка как службы Windows (запускать **от администратора**):

   ```bash
   npm run install-service
   ```

5. Управление службой

   ```bash
   net start PCTimeControl   # запуск
   net stop  PCTimeControl   # остановка
   npm run uninstall-service # удаление
   ```

6. **Автозагрузка (резервная).** Поместите ярлык на `start-service.bat`
   (или на `npm start`) в папку Startup: `Win+R` → `shell:startup`.

---

## Linux (systemd)

1. Клонируйте репозиторий:

   ```bash
   git clone <URL_РЕПОЗИТОРИЯ>
   cd pc-time-control
   ```

2. Установите зависимости:

   ```bash
   npm install
   ```

3. Ручной запуск (для теста):

   ```bash
   npm start
   ```

4. Установка как systemd-сервиса (автозагрузка + фоновый режим):

   ```bash
   npm run install-service-linux
   ```

   Скрипт автоматически:
   - Скопирует `pc-time-control.service` в `/etc/systemd/system/`
   - Создаст лог-директорию `/var/log/pc-time-control/`
   - Включит автозагрузку (`systemctl enable`)
   - Запустит сервис (`systemctl start`)

5. Управление сервисом:

   ```bash
   sudo systemctl status pc-time-control    # статус
   sudo systemctl stop pc-time-control      # остановить
   sudo systemctl start pc-time-control     # запустить
   sudo systemctl restart pc-time-control   # перезапустить
   sudo journalctl -u pc-time-control -f    # логи в реальном времени
   npm run uninstall-service-linux       # удалить сервис
   npm run service-status-linux          # статус без sudo
   ```

6. **Зависимости для работы на Linux:**

   - `libnotify-bin` — для графических уведомлений (`notify-send`):

      ```bash
      sudo apt install libnotify-bin   # Debian/Ubuntu
      sudo dnf install libnotify       # Fedora
      ```

   - `loginctl` (входит в `systemd`) — для блокировки экрана и определения пользователя.
   - `lsof` — для освобождения портов при перезапуске.

   Подробнее: [Настройка Linux →](./06-linux-setup.md)

[← Назад к оглавлению](../README.md) | [Далее: настройка →](./02-config.md)
