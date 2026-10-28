#!/usr/bin/env node

/**
 * Автономный скрипт удаленного обновления агента родительского контроля. *
 * НЕ требует запущенного приложения на родительском ПК.
 * Работает напрямую через SMB (административный доступ) и sc (управление службами).
 * Использование:
 *   node scripts/update-agent.mjs [опции]
 * Опции:
 *   --ip <адрес>       Обновить конкретный ПК (можно несколько: --ip 1.1.1.1 --ip 2.2.2.2)
 *   --scan             Сканировать локальную сеть в поиске ПК с приложением
 *   --dry-run          Показать, что будет сделано, без реальных действий
 *   --no-restart       Не перезапускать службу после обновления
 *   --no-deps          Не устанавливать зависимости (npm install)
 *   --user <домен\пользователь>  Имя пользователя для SMB-доступа (пароль из SMB_PASSWORD env)
 *   --fix-remote-uac  Отключить UAC remote restrictions на целевом ПК (требуется админ-доступ)
 *   --help             Показать справку
 * Примеры:
 *   node scripts/update-agent.mjs --scan
 *   node scripts/update-agent.mjs --ip 192.168.1.105
 *   node scripts/update-agent.mjs --scan --dry-run
 *   node scripts/update-agent.mjs --ip 192.168.1.105 --no-restart
 *   node scripts/update-agent.mjs --ip 192.168.1.106 --user SON
 */

import net from "net";
import fs from "fs";
import path from "path";
import os from "os";
import { execSync } from "child_process";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import { CONFIG } from "#config";
import { LOGS, EXCLUDE_PATTERNS, UPDATE_HELPER, logWithTime } from "#consts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, "..");

dotenv.config({ path: path.join(PROJECT_ROOT, ".env") });

const SERVER_PORT = CONFIG.serverPort;
// Сначала пробуем имя из конфига, но на целевом ПК служба может называться иначе
const SERVICE_NAME = CONFIG.serviceName;
const SERVICE_NAME_FALLBACK = "pctimecontrol.exe";
const SCAN_TIMEOUT = CONFIG.scanTimeout;

function printUsage() {
  console.log(UPDATE_HELPER);
}

function parseArgs() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes("--help")) {
    printUsage();
    process.exit(0);
  }
  const ips = [];
  let scan = false,
    dryRun = false,
    restart = true,
    deps = true,
    smbUser = null,
    fixRemoteUac = false;

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case "--ip":
        if (args[i + 1] && !args[i + 1].startsWith("--")) ips.push(args[++i]);
        break;
      case "--scan":
        scan = true;
        break;
      case "--dry-run":
        dryRun = true;
        break;
      case "--no-restart":
        restart = false;
        break;
      case "--no-deps":
        deps = false;
        break;
      case "--user":
        if (args[i + 1] && !args[i + 1].startsWith("--")) smbUser = args[++i];
        break;
      case "--fix-remote-uac":
        fixRemoteUac = true;
        break;
    }
  }

  if (!scan && ips.length === 0) {
    console.error(
      `${LOGS.update.error}${LOGS.update.noIndicate}${LOGS.update.end}`,
    );
    process.exit(1);
  }
  return { ips, scan, dryRun, restart, deps, smbUser, fixRemoteUac };
}

function log(msg, type) {
  const pre = LOGS.update[type] ? LOGS.update[type] : LOGS.update.text;
  console.log(`${pre} ${msg}${LOGS.update.end}`);
}

function getLocalNetworkPrefix() {
  const ifs = os.networkInterfaces();
  for (const name of Object.keys(ifs)) {
    for (const iface of ifs[name]) {
      if (iface.family === "IPv4" && !iface.internal) {
        return iface.address.substring(0, iface.address.lastIndexOf(".")) + ".";
      }
    }
  }
  return null;
}

function tcpPing(ip, port, timeout) {
  return new Promise((resolve) => {
    const s = new net.Socket();
    s.setTimeout(timeout);
    s.on("connect", () => {
      s.destroy();
      resolve(true);
    });
    s.on("error", () => resolve(false));
    s.on("timeout", () => {
      s.destroy();
      resolve(false);
    });
    s.connect(port, ip);
  });
}

async function scanNetwork() {
  const prefix = getLocalNetworkPrefix();

  if (!prefix) {
    log(LOGS.update.noLocal, "error");
    return [];
  }
  log(`${LOGS.web.scan} ${prefix}0/24 (::${SERVER_PORT})...`);
  log(
    `${LOGS.update.processTimeEdge}${logWithTime(Math.ceil((254 * (SCAN_TIMEOUT + 50)) / 1000))}`,
  );
  const found = [];
  const promises = [];
  for (let i = 1; i < 255; i++) {
    const ip = prefix + i;
    promises.push(
      tcpPing(ip, SERVER_PORT, SCAN_TIMEOUT).then((online) => {
        if (online) {
          found.push(ip);
          log(`${LOGS.update.findPC}${ip}`, "ok");
        }
      }),
    );
  }
  await Promise.all(promises);
  return found;
}

function netUseConnect(ip, smbUser) {
  const smbPass = process.env.SMB_PASSWORD || "";

  // Сначала удаляем все предыдущие подключения к этому IP
  try {
    execSync(`net use \\\\${ip}\\C$ /DELETE /Y 2>nul`, {
      stdio: "ignore",
      timeout: 5000,
    });
  } catch {
    /* ignore */
  }

  let cmd = `net use \\\\${ip}\\C$ /PERSISTENT:NO`;

  if (smbUser) {
    const user = smbUser.includes("\\") ? smbUser : `.\\${smbUser}`;
    cmd += ` /USER:${user}`;
    if (smbPass) cmd += ` ${smbPass}`;
  }
  try {
    execSync(cmd, { stdio: "ignore", timeout: 10000 });
    return true;
  } catch (err) {
    log(`net use error: ${err.message}`, "error");
    return false;
  }
}

function fixRemoteUac(ip) {
  log("Отключаю UAC remote restrictions...");
  try {
    execSync(
      `reg add \\\\${ip}\\HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Policies\\System /v LocalAccountTokenFilterPolicy /t REG_DWORD /d 1 /f`,
      { stdio: "ignore", timeout: 10000 },
    );
    log("UAC remote restrictions отключены (требуется перезагрузка)", "ok");
    log(
      "  После перезагрузки целевого ПК net use C$ будет работать",
      "text",
    );
    return true;
  } catch (err) {
    log(`Не удалось отключить UAC remote restrictions: ${err.message}`, "error");
    return false;
  }
}

function toSmbPath(ip, localPath) {
  // C:\foo\bar -> \\ip\C$\foo\bar
  const driveLetter = localPath[0].toUpperCase();
  const rest = localPath.slice(2).replace(/\//g, "\\");
  return `\\\\${ip}\\${driveLetter}$${rest}`;
}

function getRemoteAppPath(ip) {
  return new Promise((resolve) => {
    const s = new net.Socket();
    let data = "";
    s.setTimeout(5000);
    s.on("connect", () => s.write("GET_APP_PATH\n"));
    s.on("data", (chunk) => {
      data += chunk.toString();
      if (data.endsWith("\n")) {
        s.destroy();
        const m = data.trim().match(/^OK:\s*(.+)$/);
        resolve(m ? m[1] : null);
      }
    });
    s.on("error", () => resolve(null));
    s.on("timeout", () => {
      s.destroy();
      resolve(null);
    });
    s.connect(SERVER_PORT, ip);
  });
}

function shouldExclude(rel) {
  for (const p of EXCLUDE_PATTERNS) {
    if (p === "*.log" && rel.endsWith(".log")) return true;
    if (rel === p || rel.startsWith(p + path.sep) || rel.startsWith(p + "/"))
      return true;
  }
  return false;
}

function collectFiles(dir) {
  const files = [];
  try {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const fp = path.join(dir, entry.name);
      const rel = path.relative(PROJECT_ROOT, fp);
      if (shouldExclude(rel)) continue;
      if (entry.isDirectory()) files.push(...collectFiles(fp));
      else files.push(fp);
    }
  } catch {
    /* skip */
  }
  return files;
}

function copyToSmb(ip, remoteRoot, dryRun) {
  const files = collectFiles(PROJECT_ROOT);
  log(
    `${LOGS.update.copy}${files.length}${LOGS.update.filesTo}${remoteRoot}...`,
  );
  if (dryRun) {
    log(`${LOGS.update.wasScan}${files.length}${LOGS.update.files}:`);
    for (const f of files.slice(0, 10))
      log(`  ${path.relative(PROJECT_ROOT, f)}`);
    if (files.length > 10)
      log(`${LOGS.update.more}${files.length - 10}${LOGS.update.files}`);
    return true;
  }
  netUseConnect(ip, null);
  try {
    execSync(`if not exist "${remoteRoot}" mkdir "${remoteRoot}"`, {
      shell: "cmd",
      stdio: "ignore",
      timeout: 5000,
    });
  } catch (err) {
    log(`${LOGS.update.mkDirErr}${remoteRoot}: ${err.message}`, "error");
    log(LOGS.update.checkPerms, "warn");
    return false;
  }
  let copied = 0,
    errors = 0;
  for (const file of files) {
    const rel = path.relative(PROJECT_ROOT, file);
    const dest = path.join(remoteRoot, rel);
    const destDir = path.dirname(dest);
    try {
      execSync(`if not exist "${destDir}" mkdir "${destDir}"`, {
        shell: "cmd",
        stdio: "ignore",
        timeout: 5000,
      });
      fs.copyFileSync(file, dest);
      copied++;
    } catch (err) {
      errors++;
      if (errors <= 3)
        log(`${LOGS.update.copyErr}${rel}: ${err.message}`, "warn");
    }
  }
  log(
    `${LOGS.update.copied}${copied}${LOGS.update.files}`,
    errors ? "warn" : "ok",
  );
  if (errors > 0) log(`${LOGS.update.errors}${errors}`, "warn");
  return errors === 0;
}

function installDepsRemote(ip, remoteRoot, dryRun) {
  if (dryRun) {
    log(`${LOGS.update.npmI}${remoteRoot}`);
    return true;
  }
  log(`${LOGS.update.npmInstall}${ip}...`);
  try {
    execSync(
      `powershell -Command "& {cd '${remoteRoot}'; npm install --no-audit --no-fund}"`,
      { timeout: CONFIG.depsTimeout, stdio: "pipe" },
    );
    log(LOGS.update.npmBeenInstall, "ok");
    return true;
  } catch (err) {
    log(`${LOGS.update.npmInstallErr}${err.message}`, "error");
    return false;
  }
}

function getRemoteServiceName(ip) {
  // Пробуем найти службу на удалённом ПК по известным именам
  const candidates = ["pctimecontrol.exe", "pctimecontrol", "PCTimeControl", "KMonitor", "kids-monitor"];
  for (const name of candidates) {
    try {
      const out = execSync(`sc \\\\${ip} query "${name}"`, {
        timeout: 10000,
        encoding: "utf8",
      });
      if (out.includes("SERVICE_NAME")) return name;
    } catch {
      // не найдена, пробуем следующую
    }
  }
  return SERVICE_NAME_FALLBACK;
}

function restartServiceRemote(ip, dryRun) {
  if (dryRun) {
    log(`${LOGS.update.serviceRestart}${SERVICE_NAME}${LOGS.update.on}${ip}`);
    return true;
  }

  // Сначала находим реальное имя службы на удалённом ПК
  const remoteServiceName = getRemoteServiceName(ip);
  if (!remoteServiceName) {
    log(
      `Не удалось найти службу на ${ip}. Перезапустите службу вручную: net stop PCTimeControl && net start PCTimeControl`,
      "warn",
    );
    return false;
  }

  if (remoteServiceName !== SERVICE_NAME) {
    log(
      `Найдена служба с именем "${remoteServiceName}" (ожидалось "${SERVICE_NAME}")`,
      "text",
    );
  }

  log(`${LOGS.update.serviceStop}${remoteServiceName}${LOGS.update.on}${ip}...`);

  let stopped = false;
  try {
    execSync(`sc \\\\${ip} stop "${remoteServiceName}"`, { timeout: 60000 });
    log(LOGS.update.serviceStopped, "ok");
    stopped = true;
  } catch (err) {
    const msg = err.message || "";
    if (msg.includes("1062") || msg.includes("1058")) {
      log(LOGS.update.serviceStopped, "ok");
      stopped = true;
    } else {
      log(`${LOGS.update.serviceStopErr}${msg.slice(0, 200)}`, "warn");
    }
  }

  log(`${LOGS.update.serviceStart}${remoteServiceName}${LOGS.update.on}${ip}...`);
  try {
    execSync(`sc \\\\${ip} start "${remoteServiceName}"`, { timeout: 120000 });
    log(LOGS.update.serviceStarted, "ok");
    return true;
  } catch (err) {
    log(`${LOGS.update.serviceStartErr}${(err.message || "").slice(0, 200)}`, "error");
    return false;
  }
}

async function updatePC(ip, options) {
  const { dryRun, restart, deps, smbUser, fixRemoteUac } = options;
  console.log(`\n${"=".repeat(50)}`);
  log(`${LOGS.update.pcUpd}${ip}`);
  console.log("=".repeat(50));
  log(LOGS.update.ping);

  if (!(await tcpPing(ip, SERVER_PORT, 2000))) {
    log(`${ip}${LOGS.update.noPing}${SERVER_PORT}`, "error");
    log(LOGS.update.noPingHint);
    return false;
  }
  log(`${ip}${LOGS.update.pingOk}`, "ok");
  log(LOGS.update.hasAdmin);

  let connected = netUseConnect(ip, smbUser);

  if (!connected && fixRemoteUac) {
    log(
      `Не удалось подключиться, пробую отключить UAC remote restrictions...`,
      "warn",
    );
    fixRemoteUac(ip);
    connected = netUseConnect(ip, smbUser);
  }

  if (!connected) {
    log(`${LOGS.update.hasNtAccess}${ip}\\C$`, "error");
    log(LOGS.update.checkPermsAndAccess);
    if (!smbUser) {
      log(
        `  Подсказка: попробуйте указать учётные данные: --user домен\\администратор`,
        "warn",
      );
    }
    if (smbUser && !process.env.SMB_PASSWORD) {
      log(
        `  Подсказка: установите переменную SMB_PASSWORD с паролем пользователя`,
        "warn",
      );
    }
    return false;
  }
  log(`${LOGS.update.hasAccess}${ip}`, "ok");
  log(LOGS.update.pathRequest);
  const appPath = await getRemoteAppPath(ip);

  if (!appPath) {
    log(`${LOGS.update.pathReject}${ip}`, "error");
    log(LOGS.update.isTargetActual, "warn");
    return false;
  }
  log(`${LOGS.update.appPath}${appPath}`, "ok");
  const remoteRoot = toSmbPath(ip, appPath);
  log(`${LOGS.update.smbPath}${remoteRoot}`);
  log(`${LOGS.update.copy}${LOGS.update.files}...`);

  if (!copyToSmb(ip, remoteRoot, dryRun)) {
    log(`${LOGS.update.files}${LOGS.update.withErrors}`, "error");
    return false;
  }

  if (deps) {
    if (!installDepsRemote(ip, remoteRoot, dryRun))
      log(LOGS.update.npmNotInstall, "warn");
  } else log(LOGS.update.npmInstallSkipped);

  if (restart) {
    if (!restartServiceRemote(ip, dryRun)) {
      log(LOGS.update.serviceRestartErr, "error");
      return false;
    }
  } else log(LOGS.update.serviceRestartSkipped);

  log(`${LOGS.update.pcUpd}${ip}${LOGS.update.end}`, "ok");
  return true;
}

async function main() {
  const options = parseArgs();
  const { ips, scan, dryRun } = options;
  console.log(`${LOGS.update.title}${LOGS.update.end}`);

  if (dryRun) {
    log(LOGS.update.simulate, "warn");
  }
  let targets = [...ips];

  if (scan) {
    log(LOGS.update.scanMode);
    const found = await scanNetwork();

    if (found.length === 0) {
      log(LOGS.update.scanNull, "error");
      process.exit(1);
    }

    for (const ip of found) {
      if (!targets.includes(ip)) targets.push(ip);
    }
  }

  if (targets.length === 0) {
    log(LOGS.update.noTargets, "error");
    process.exit(1);
  }
  log(`${LOGS.update.targets}${targets.join(", ")}`);
  let ok = 0,
    fail = 0;

  for (const ip of targets) {
    (await updatePC(ip, options)) ? ok++ : fail++;
  }
  console.log(`\n${"=".repeat(50)}`);
  log(
    `${LOGS.update.success}${ok}${fail > 0 ? `, ${LOGS.update.withErrors} ${fail}` : ""}`,
  );
  console.log("=".repeat(50));
  process.exit(fail > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error(`${LOGS.update.error} ${err.message}${LOGS.update.end}`);
  process.exit(1);
});
