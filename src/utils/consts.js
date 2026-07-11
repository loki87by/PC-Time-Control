export const LOGS = {
  frp: {
    notExistConfig: "Нет конфига FRP - доступ только в локальной сети",
    start: "Запускаю FRP...",
    exit: "FRP-клиент отключился с кодом",
    fail: "Не удалось запустить FRP",
  },
  base: {
    start: "=== Запускаю родительский контроль ===",
    started: "=== Родительский контроль запущен ===",
    platform: "Платформа ОС",
    node: "Версия движка js",
    user: "Пользователь",
    webPortUsed: "Веб-сервер не может быть запущен!",
    remoteStarted: "Удаленный сервер запущен на порту: ",
    networkError: "Ошибка сети, проверьте подключение к интернету.",
    url: "Веб-интерфейс: http://",
    panel: "Удаленный контроль: telnet",
    uncaughtException: "Необработанное исключение",
    uncaughtError: "Необработанная ошибка",
    startupError: "Ошибка запуска",
    shutdown: "\n=== Выключение родительского контроля ===",
    shutdownEnd: "Родительский контроль деактивирован",
    fatal: "Глобальная ошибка",
    second: "секунд",
    minute: "минут",
    hour: "час",
    msgButtonText: "OK",
    client: "Клиент",
    shutdownTimeout: `Компьютер будет выключен через`,
    usedPort: (port) => `Порт ${port} занят!`,
    portLog: (start, port, end) => `${start} ${port} ${end}`,
  },
  control: {
    init: "Инициализация родительского контроля для",
    monit: "Ведется мониторинг пользователя",
    unmonit: "исключен из мониторинга",
    stateLoadError: "Ошибка загрузки состояния:",
    newDayReset: "Сброс таймеров по смене суток",
    stateLoaded: "Состояние загружено",
    stateSaved: "Состояние успешно сохранено",
    stateSavedError: "Ошибка сохранения состояния",
    getStateError: "Ошибка получения состояния блокировки",
    stateStats: "время блокировки, лимит использования:",
    lock: "ПК успешно заблокирован",
    noWinLock: "Блокировка ПК не поддерживается платформой",
    lockError: "Ошибка блокировки ПК:",
    shutdownTimeout: "Выключение запланировано через",
    shutdownError: "Ошибка отложенного выключения",
    shutdownAbort: "Выключение отменено",
    shutdownAbortError: "Ошибка отмены выключения",
    showMessageError: "Ошибка отображения сообщения:",
    badTime: "Неправильный формат времени",
    lockTimeout: "Добавлена отложенная блокировка",
    positiveTime: "Минуты должны быть положительными",
    limit: "Установлен дневной лимит",
    unlock: "ПК разблокирован",
    monitError: "Ошибка мониторинга:",
    monitStart: "Мониторинг запущен",
    remoteLock: "Достигнуто время отложенной блокировки",
    useLimit: "Достигнут дневной лимит в",
    sendWarn: "Отправлено предупреждение:",
    stop: "Родительский контроль остановлен.",
    remain: "Осталось",
    isOnBreak: "время еще не вышло",
    pauseNotEnd: "⛔ Перерыв еще не закончился!",
    accessDenied: "Доступ запрещен",
    tryBreakUnlock: "🚫 Попытка разблокировки во время перерыва (осталось",
    tryBreakUnlockFalse: "🚫 Попытка разблокировки заблокирована",
    newSession: "Новый сеанс начат",
    afterPause: "после перерыва",
    positiveSession: "Время сеанса должно быть положительным",
    setSessionLimit: "Лимит сеанса установлен:",
    positiveSleep: "Время перерыва не может быть отрицательным",
    setSleepTime: "Длительность перерыва установлена:",
    sleepEqualSession: "равна сеансу",
    sleep: "Перерыв",
    sessionEnd: "Сеанс завершен",
    pcWillLock:
      "ПК будет заблокирован. Разблокировка будет возможна после окончания перерыва.",
    handleEnd:
      "🔄 Перерыв завершен ручной разблокировкой, начинается новый сеанс",
    toSessionEnd: "до конца сеанса",
    warn: "Предупреждение",
    endSleepTime: "✅ Перерыв завершен, ожидается ручная разблокировка ПК",
    isOnBreakDebug: "⚠️ ПК разблокирован во время перерыва! Блокируем...",
    welcome: "Добро пожаловать",
    resetUsedTime: 'Время использования сброшено',
    lockMessageTimeout: (time) =>
      `⚠️ Компьютер будет заблокирован через ${time} минут!`,
  },
  remote: {
    connect: "Клиент подключен",
    wsErr: "Ошибка веб-сокет",
    disconnect: "отключился",
    command: "Команда от клиента",
    commandError: "Ошибка запуска команды",
    responseError: "Ошибка отправки ответа",
    disconnectError: "Ошибка разрыва соединения с клиентом",
    stop: "Удаленный сервер остановлен",
    unlimit: "Нет установленных лимитов",
    unset: "Не установлено",
    lock: "ПК заблокирован",
    shutdown: "ПК выключен",
    shutdownDelay: "ПК выключится в течении 10 секунд",
    shutdownAbort: "Выключение отменено",
    lock_m: "ЗАЛОЧЕН",
    unlock_m: "РАЗЛОЧЕН",
    resetBreak: "Перерыв завершен",
    lockTimes: "Нет",
    invalidLimit: "Некорректное значение лимита",
    setLimit: "Установлен дневной лимит",
    badTime: "Некорректный формат (используйте ЧЧ:ММ)",
    addLock: "Время блокировки добавлено",
    invalidTime: "Некорректный формат времени",
    noLimitExtend: "Не установлен лимит для продления",
    timeExtend: "Лимит увеличен до",
    clearLimit: "Дневной лимит очищен",
    clearLockTimes: "Отложенные блокировки очищены",
    clearAll: "Все лимиты и отложенные блокировки очищены",
    unknown: "Неизвестная команда (воспользуйтесь HELP)",
    undefined: "неизвестно",
    setSessionLimit: "Лимит сессии установлен на",
    isBreak: "Перерыв между сессиями",
    reason: "причина",
    state: "состояние",
    setBreakDuration: "Установлено время перерыва",
    setBreakDurationAuto: "равное времени сессии",
    endBreak: "Перерыв завершен, начата новая сессия.",
    notOnBreak: "ПК вне перерыва.",
    setBreakDurationError: "Ошибка установки времени перерыва.",
    setDelayedShutdown: "Установлено отложенное выключение ПК на",
    available: `Допустимые команды:
      END_BREAK               - Принудительно завершить перерыв
      SET_BREAK_DURATION      - Установить время отдыха между сессиями
      HANDLE_UNLOCK           - Разблокировать ПК (если не задан пароль)
      SET_SESSION_LIMIT       - Установить лимит сессии
      CAN_UNLOCK              - Проверка возможности разблокировки
      LOCK                    - Заблокировать ПК
      SHUTDOWN                - Выключить ПК через минуту
      SHUTDOWN_NOW            - Выключить ПК через 10 секунд
      CANCEL_SHUTDOWN         - Отмена отложенного выключения
      GET_NAME                - Получить имя ПК
      GET_SESSION_TIME        - Получить время использования в текущей сессии
      GET_USAGE_TIME          - Получить суточное время использования
      GET_CURRENT_USER        - Получить имя текущего пользователя
      GET_STATUS              - Проверка блокировки ПК
      GET_USAGE_LIMIT         - Получить текущий дневной лимит
      GET_SESSION_LIMIT       - Получить текущий лимит сессии
      GET_SESSION_BREAK       - Получить время отдыха между сессиями
      GET_LOCK_TIMES          - Получить время отложенной блокировки
      GET_TIME_REMAINING      - Получить время до блокировки
      GET_SHUTDOWN_TIME       - Получить время отложенного выключения
      GET_SHUTDOWN_ABORT      - Узнать было ли отменено запланированное отключение
      MESSAGE:<text>          - Отправить сообщение
      SET_LIMIT:<minutes>     - Установить дневной лимит
      ADD_LOCK_TIME:HH:MM     - Добавить отложенную блокировку
      EXTEND_TIME:<minutes>   - Увеличить время использования
      CLEAR_USAGE_LIMIT       - Удалить дневной лимит
      CLEAR_LOCK_TIMES        - Удалить отложенные блокировки
      CLEAR_ALL               - Удалить все лимиты и отложенные действия
      HELP                    - Получить список доступных команд`,
  },
  user: {
    firewall: "Проверьте свой брандмауэр или другие приложения.",
    lock: "🔒 ЗАБЛОКИРОВАН",
    unlock: "🟢 РАЗБЛОКИРОВАН",
    online: "🟢 ОНЛАЙН",
    emptyNetwork: "В сети нет обнаруженных ПК.",
    emptyNetworkHint:
      "Убедитесь, что агент PC Time Control запущен на других компьютерах.",
    title: "Родительский контроль ПК",
    agentsOn: "🟢 Удаленные ПК доступны",
    agentsOff: "⚠️ Удаленные ПК недоступны",
    find: "🔍 Поиск устройств",
    refresh: "🔁 Обновить",
    refreshStatus: "🔁 Обновить статус",
    available: "Доступные ПК:",
    last: "Последняя проверка:",
    yet: "Ещё не отсканировано",
    absent: "отсутствуют",
    unlimit: "Ограничения не установлены",
    timeRemaining: "Время до ближайшего напоминания",
    control: "Управление",
    back: "← Назад",
    settings: "📊 Текущие настройки",
    dayLimit: "Суточный лимит",
    sessionLimit: "Лимит сессии",
    sessionBreak: "Отдых между сессиями",
    notSet: "Не задан",
    delayLocks: "Отложенные блокировки",
    resetLimits: "🗑️ Убрать ограничения",
    scan: "🔍 Сканирую...",
    update: "🔄 Обновляю...",
    confirm: "⚠️ Точно выключаем?",
    mess: "Введите текст сообщения",
    sent: "✅ Сообщение отправлено",
    error: "❌ Ошибка: ",
    minInput: "Введите минуты",
    timeSelect: "Выберите время",
    resAllConf:
      "⚠️ Точно хотите сбросить все лимиты и удалить отложенные блокировки?",
    resSessionConf: "⚠️ Точно хотите сбросить время текущей сессии?",
    resUsageConf: "⚠️ Точно хотите сбросить время использования?",
    now: "🔒 Немедленные действия",
    lockNow: "🔒 Заблокировать",
    unlockNow: "🔓 Завершить перерыв",
    endBreak: "⏯️ Начать новую сессию",
    shutdown: "⏻ Выключить",
    killProcesses: "⏻ Экстренное отключение программы (до перезагрузки)",
    sendMsg: "💬 Отправить сообщение",
    messPlaceholder: "Введите текст...",
    send: "Отправить",
    setLimit: "⏱️ Установить дневное ограничение",
    setSession: "⏱️ Установить ограничение сессии",
    setBreak: "⏱️ Установить время отдыха между сессиями",
    halfHour: "30 минут",
    hour: "1 час",
    hours: " часа",
    timePlaceholder: "Или введите минуты...",
    saveLimit: "Задать ограничитель",
    delayLock: "🕐 Отложенная блокировка",
    delayShutdown: "Отложенное выключение",
    delayLockSave: "Утвердить время блокировки",
    delayShutdownSave: "Утвердить время выключения",
    delayShutdownAbort: "Отменить на сегодня",
    dailyUsage: 'Дневное использование',
    sessionUsage: 'Текущее использование',
    cancel: 'ОТМЕНЕНО',
    resetSessionTime: 'Сбросить время текущей сессии',
    resetUsageTime: 'Сбросить время дневного использования'
  },
  web: {
    started: "Веб-сервер запущен на порту",
    stopped: "Веб-сервер остановлен",
    httpErr: "Ошибка HTTP:",
    scan: "Начинаю сканирование сети",
    scanEnd: "Сканирование сети завершено, найдено ПК:",
    failCon: "Ошибка соединения",
    scanErr: "Ошибка сканирования",
    refreshErr: "Ошибка обновления",
  },
  setup: {
    init: "📦 Установка родительского контроля как службы Windows...",
    noRoot: "❌ Скрипт должен быть запущен от имени администратора",
    rootHint: '   Кликнуть правой кнопкой мыши по командной строке или PowerShell и выбрать "Запустить от имени администратора"',
    serviceDescription: "Kids-monitor - служба родительского контроля",
    success: "✅ Служба успешно установлена!",
    name: 'Имя',
    script: 'Путь к скрипту',
    startScript: '📝 Для запуска запустите команду:',
    stopScript: '📝 Для остановки запустите команду:',
    uninstall: '📝 Для удаления запустите команду:',
    already: "⚠️ Сервис уже установлен!",
    uninstallHint: '   Сначала удалите командой "node installer.js uninstall"',
    invalid: "❌ Обнаружена ошибочная установка.",
    invalidHint: "   Попробуйте сначала удалить: node installer.js uninstall",
    error: '❌ Ошибка установки',
    uninstalling: "🗑️ Удаление службы родительского контроля...",
    uninstallSuccess: "✅ Служба успешно удалена!",
    uninstallError: '❌ Ошибка удаления службы',
    startupInit: "📂 Добавление в автозагрузку...",
    startupSuccess: "✅ Добавлено в автозагрузку!",
    startupFailed: '⚠️ Не получилось добавить в автозагрузку',
    manually: "   Вы можете попробовать добавить в папку автозагрузки вручную",
    full: "=== Установка родительского контроля ===\n",
    complete: "\n✅ Установка завершена!",
    boot: "Сервис будет запускаться автоматически при загрузке системы."
  }
};

export function getWordsWithNumsCompletion(
  numeral,
  completions = ["а", "ы", ""],
) {
  if (!numeral || !isFinite(+numeral)) return "";
  const divisionRemainder =
    +numeral % 10 === 1 && +`${numeral}`.slice(`${numeral}`.length - 2) !== 11;
  const divisionRemainder2 =
    [2, 3, 4].includes(+numeral % 10) &&
    +`${numeral}`.slice(`${numeral}`.length - 2, `${numeral}`.length - 1) !== 1;
  return `${divisionRemainder ? completions[0] : divisionRemainder2 ? completions[1] : completions[2]}`;
}

  const logWithTime = (seconds) => {
    const rounded = Math.round(seconds);
    const secs = rounded % 60;
    const minutes = (rounded - secs) / 60;
    const mins = minutes % 60;
    const hrs = (minutes - mins) / 60;
    const hourLog = hrs > 0 ? `${hrs} ${LOGS.base.hour}${getWordsWithNumsCompletion(hrs, ["", "а", "ов"])} ` : ''
    const minsLog = mins > 0 || (hrs > 0 && secs > 0) ? `${mins} ${LOGS.base.minute}${getWordsWithNumsCompletion(mins)} ` : ''
    const secsLog = secs > 0 ? `${secs} ${LOGS.base.second}${getWordsWithNumsCompletion(secs)}` : ''

    return `${hourLog}${minsLog}${secsLog}`;
  }

export const PATHS = {
  library: "node_modules/@qiudaomao/node-frp/src/cli.js",
  config: "frpc.yaml",
  localhost: "127.0.0.1",
  commands: {
    logon: 'tasklist /FI "IMAGENAME eq LogonUI.exe" /NH',
    lock: "rundll32.exe user32.dll,LockWorkStation",
    shutdownAbort: "shutdown /a",
    getPid: "netstat -ano | findstr",
    cleanPort: "taskkill /F /PID",
    sendMess: (message, title, button) =>
      `powershell -Command "Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.MessageBox]::Show('${message}', '${title}', '${button}', 'Warning')"`,
    shutdownWin: (seconds, mess = false) =>
      `shutdown /s /t ${seconds} ${mess ? `/c "${LOGS.base.shutdownTimeout} ${logWithTime(seconds)}"` : ''}`,
    shutdown: (timeout) => `shutdown -h +${timeout}`,
  },
};
