# Установка

## Требования

- Node.js 16+
- Windows (для службы и автозагрузки)

## Шаги

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

4. Установка как службы Windows

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

[← Назад к оглавлению](../README.md) | [Далее: настройка →](./02-config.md)
