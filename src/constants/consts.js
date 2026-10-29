import { CONFIG } from "#config";
import { LOGS } from "./logs.js";
import { PATHS } from "./paths.js";

export { LOGS, PATHS };

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

export const logWithTime = (seconds) => {
  const rounded = Math.round(seconds);
  const secs = rounded % 60;
  const minutes = (rounded - secs) / 60;
  const mins = minutes % 60;
  const hrs = (minutes - mins) / 60;
  const hourLog =
    hrs > 0
      ? `${hrs} ${LOGS.base.hour}${getWordsWithNumsCompletion(hrs, ["", "а", "ов"])} `
      : "";
  const minsLog =
    mins > 0 || (hrs > 0 && secs > 0)
      ? `${mins} ${LOGS.base.minute}${getWordsWithNumsCompletion(mins)} `
      : "";
  const secsLog =
    secs > 0
      ? `${secs} ${LOGS.base.second}${getWordsWithNumsCompletion(secs)}`
      : "";

  return `${hourLog}${minsLog}${secsLog}`;
};

const SECOND = 1000;
const MINUTE = SECOND * 60;
const HOUR = MINUTE * 60;
const DAY = HOUR * 24;

export const TIMES = { SECOND, MINUTE, HOUR, DAY };

export const TIMES_COMPLETIONS = {
  SECOND: { start: " секунд", end: ["ы", "", ""] },
  MINUTE: { start: " минут", end: ["ы", "", ""] },
  HOUR: { start: " час", end: ["а", "ов", "ов"] },
  DAY: { start: " д", end: ["ня", "ней", "ней"] },
};

export const FRP_NEED_RESTART_ERRORS = ["Не найдено строки об активности..."];

export const EXCLUDE_PATTERNS = [
  "node_modules",
  ".git",
  ".vscode",
  "static",
  "scripts",
  "frpcHistory",
  "frpc.yaml",
  ".env",
  "package-lock.json",
  "debug-startup.log",
  "service.log",
  "*.log",
  ".gitignore",
  "LICENSE",
  "apiExample.js",
  "toDo.md",
];

export const UPDATE_HELPER = `${LOGS.update.title}${LOGS.update.end}

Сканирует сеть, находит ПК с запущенным приложением (порт ${CONFIG.serverPort}),
копирует файлы и перезапускает службу.

\x1b[1mИспользование:\x1b[0m
  node scripts/update-agent.mjs [опции]

\x1b[1mОпции:\x1b[0m
  --ip <адрес>           Обновить конкретный ПК (можно несколько)
  --scan                 Сканировать локальную сеть
  --dry-run              Только показать, что будет сделано
  --no-restart           Не перезапускать службу
  --no-deps              Не устанавливать npm install
  --user <пользователь>  Имя пользователя для SMB (Windows) или SSH (Linux)
  --ssh-key <путь>       Путь к SSH-ключу для Linux-хостов
  --fix-remote-uac       Отключить UAC remote restrictions на целевом ПК (Windows)
  --help                 Показать справку

\x1b[1mПримеры:\x1b[0m
  node scripts/update-agent.mjs --scan
  node scripts/update-agent.mjs --ip 192.168.1.105
  node scripts/update-agent.mjs --scan --dry-run
  node scripts/update-agent.mjs --ip 192.168.1.105 --no-restart
  node scripts/update-agent.mjs --ip 192.168.1.106 --user SON
  node scripts/update-agent.mjs --ip 192.168.1.200 --ssh-key ~/.ssh/id_ed25519 (only Linux)
`;