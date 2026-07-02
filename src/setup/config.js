export const CONFIG = {
  // Список пользователей для мониторинга (пустой = все)
  monitoredUsers: [],
  // Исключенные пользователи (родители/админы)
  exemptUsers: [],
  // Порт для удаленного управления
  serverPort: 9999,
  // Порт для веб-сервера
  webPort: 5000,
  // Интервалы предупреждений (в минутах до блокировки)
  warningIntervals: [15, 5, 1],
  // Файлы состояния
  stateFile: "static/pc_control_state.json",
  logFile: "static/pc_control.log",
  // Интервал проверки состояния (в секундах)
  checkInterval: 3,
  // Таймаут для сокета (в секундах)
  socketTimeout: 60,
  // Формат времени в логах
  tsFormat: "YYYY-MM-DD HH:mm:ss",
  // максимальный размер логов
  maxsize: 5242880, // 5MB
  // максимум файлов логов
  maxFiles: 5,
  // заголовок в предупреждениях пользователю
  msgTitle: "РОДИТЕЛЬСКИЙ КОНТРОЛЬ",
  // часовой пояс относительно UTC
  timeShift: 3
};
