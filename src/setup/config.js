export const CONFIG = {
  // Имеется ли Api для обновления конфигурации frpc

  // !!!ЕСЛИ НЕТ СОБСТВЕННОГО API, ВО ИЗБЕЖАНИЕ ОШИБОК
  // НЕОБХОДИМО УДАЛИТЬ СЛЕДУЮЩУЮ СТРОКУ, ИЛИ УСТАНОВИТЬ ЗНАЧЕНИЕ: false
  hasFrpcApi: true,
  // Хранилище архива изменений frpc-конфигурации
  frpcArchive: "frpcHistory",
  // Роут на личном апи-сервере возвращающий время работы сервера-frpc
  frpcGetTimeRoute: "/get_frp_start_time",
  // Роут на личном апи-сервере вызывающий перезапуск сервера-frpc
  frpcRestartRoute: "/restart_frp_service",
  // порт распределения мастера frpc
  discoveryPort: 19999,
  // заголовок сообщения распределителя мастера frpc
  discoveryTitle: "KIDS_MONITOR_DISCOVER",
  // интервал проверки мастера frpc
  heartbeatInterval: 5000,
  // интервал очистки неиспользуемых узлов подключенных к frpc
  nodeTimeout: 15000,
  // Период объявление FRP-мастера
  masterAnnounceInterval: 10000,
  /////////////////////////////////////////////////////////////////////////////////////////////////////////////
  /////////////////////////////////////////////////////////////////////////////////////////////////////////////
  /////////////////////////////////////////////////////////////////////////////////////////////////////////////
  /////////////////////////////////////////////////////////////////////////////////////////////////////////////
  /////////////////////////////////////////////////////////////////////////////////////////////////////////////
  // Список пользователей для мониторинга (пустой = все)
  monitoredUsers: [],
  // Исключенные пользователи (родители/админы)
  exemptUsers: [],
  // Порт для удаленного управления
  serverPort: 9999,
  // Порт для веб-сервера
  webPort: 5000,
  // Порт на сервере по которому будет доступ к веб-интерфейсу
  interfacePort: 5555,
  // Интервалы предупреждений (в минутах до блокировки)
  warningIntervals: [15, 5, 1],
  // Файлы состояния
  stateFile: "static/pc_control_state.json",
  logFile: "static/pc_control.log",
  debugFile: "debug-startup.log",
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
  timeShift: 3,
  // имя службы (Windows: PCTimeControl, Linux: pc-time-control)
  serviceName: "PCTimeControl",
  serviceNameLinux: "pc-time-control",
  // имя пользователя Windows для блокировки (если не указано — определяется автоматически)
  // Можно задать через .env: LOCK_USER_ID=Username или LOCK_USERS=User1,User2,User3
  lockUserId: process.env.LOCK_USER_ID || (process.env.LOCK_USERS ? process.env.LOCK_USERS.split(",")[0].trim() : null),
  // список пользователей для блокировки (из .env LOCK_USERS=User1,User2,User3)
  lockUserIds: process.env.LOCK_USERS ? process.env.LOCK_USERS.split(",").map((u) => u.trim()).filter(Boolean) : [],
  // таймаут на поиск каждого из доступных устройств
  scanTimeout: 500,
  // таймаут на установку зависимостей
  depsTimeout: 120000,
};
