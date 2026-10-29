/**
 * Windows-specific функции для удалённого обновления агента.
 * SMB (C$), sc (управление службами), реестр (UAC).
 */

import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import { CONFIG } from "#config";
import { LOGS, PATHS, EXCLUDE_PATTERNS } from "#consts";
import { log, getRemoteAppPath, toSmbPath, collectFiles, PROJECT_ROOT } from "./update-agent.js";

const SERVICE_NAME_FALLBACK = "pctimecontrol.exe";

/**
 * Подключение к SMB-шаре целевого ПК
 */
export function netUseConnect(ip, smbUser) {
  const smbPass = process.env.SMB_PASSWORD || "";

  try {
    execSync(PATHS.commands.winNetUseDelete(ip), { stdio: "ignore", timeout: 5000 });
  } catch {
    /* ignore */
  }

  const cmd = PATHS.commands.winNetUseConnect(ip, smbUser, smbPass);
  try {
    execSync(cmd, { stdio: "ignore", timeout: 10000 });
    return true;
  } catch (err) {
    log(`${LOGS.update.netUseError}${err.message}`, "error");
    return false;
  }
}

/**
 * Отключение UAC Remote Restrictions на целевом ПК
 */
export function fixRemoteUac(ip) {
  log(LOGS.update.uacDisabling);
  try {
    execSync(PATHS.commands.winRegFixUac(ip), { stdio: "ignore", timeout: 10000 });
    log(LOGS.update.uacDisabled, "ok");
    log(LOGS.update.uacHint, "text");
    return true;
  } catch (err) {
    log(`${LOGS.update.uacFailed}${err.message}`, "error");
    return false;
  }
}

/**
 * Копирование файлов через SMB
 */
export function copyToSmb(ip, remoteRoot, dryRun) {
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
    execSync(PATHS.commands.winMkdir(remoteRoot), { shell: "cmd", stdio: "ignore", timeout: 5000 });
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
      execSync(PATHS.commands.winMkdir(destDir), { shell: "cmd", stdio: "ignore", timeout: 5000 });
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

/**
 * Установка зависимостей (npm install) на удалённом Windows-хосте
 */
export function installDepsRemote(ip, remoteRoot, dryRun) {
  if (dryRun) {
    log(`${LOGS.update.npmI}${remoteRoot}`);
    return true;
  }
  log(`${LOGS.update.npmInstall}${ip}...`);
  try {
    execSync(PATHS.commands.winPowershellNpmInstall(remoteRoot), { timeout: CONFIG.depsTimeout, stdio: "pipe" });
    log(LOGS.update.npmBeenInstall, "ok");
    return true;
  } catch (err) {
    log(`${LOGS.update.npmInstallErr}${err.message}`, "error");
    return false;
  }
}

/**
 * Определение имени службы на удалённом Windows-хосте
 */
export function getRemoteServiceName(ip) {
  const cmds = PATHS.commands.scQueryCandidates(ip);
  for (const cmd of cmds) {
    try {
      const out = execSync(cmd, { timeout: 10000, encoding: "utf8" });
      if (out.includes("SERVICE_NAME")) {
        const m = out.match(/SERVICE_NAME:\s*(\S+)/);
        if (m) return m[1];
      }
    } catch {
      // не найдена, пробуем следующую
    }
  }
  return SERVICE_NAME_FALLBACK;
}

/**
 * Перезапуск службы на удалённом Windows-хосте
 */
export function restartServiceRemote(ip, dryRun, SERVICE_NAME) {
  if (dryRun) {
    log(`${LOGS.update.serviceRestart}${SERVICE_NAME}${LOGS.update.on}${ip}`);
    return true;
  }

  const remoteServiceName = getRemoteServiceName(ip);
  if (!remoteServiceName) {
    log(LOGS.update.serviceNotFound(ip), "warn");
    return false;
  }

  if (remoteServiceName !== SERVICE_NAME) {
    log(LOGS.update.serviceNameMismatch(remoteServiceName, SERVICE_NAME), "text");
  }

  log(`${LOGS.update.serviceStop}${remoteServiceName}${LOGS.update.on}${ip}...`);

  let stopped = false;
  try {
    execSync(PATHS.commands.winScStop(ip, remoteServiceName), { timeout: 60000 });
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
    execSync(PATHS.commands.winScStart(ip, remoteServiceName), { timeout: 120000 });
    log(LOGS.update.serviceStarted, "ok");
    return true;
  } catch (err) {
    log(`${LOGS.update.serviceStartErr}${(err.message || "").slice(0, 200)}`, "error");
    return false;
  }
}

/**
 * Основной процесс обновления Windows-хоста
 */
export async function updatePC(ip, options) {
  const { dryRun, restart, deps, smbUser, fixRemoteUac: needsFixUac } = options;
  console.log(`\n${LOGS.update.divider}`);
  log(`${LOGS.update.pcUpd}${ip}`);
  console.log(LOGS.update.divider);
  log(LOGS.update.hasAdmin);

  let connected = netUseConnect(ip, smbUser);

  if (!connected && needsFixUac) {
    log(LOGS.update.smbConnectFailed(ip), "warn");
    fixRemoteUac(ip);
    connected = netUseConnect(ip, smbUser);
  }

  if (!connected) {
    log(`${LOGS.update.hasNtAccess}${ip}\\C$`, "error");
    log(LOGS.update.checkPermsAndAccess);
    if (!smbUser) {
      log(LOGS.update.smbHintNoUser, "warn");
    }
    if (smbUser && !process.env.SMB_PASSWORD) {
      log(LOGS.update.smbHintNoPass, "warn");
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
    if (!restartServiceRemote(ip, dryRun, CONFIG.serviceName)) {
      log(LOGS.update.serviceRestartErr, "error");
      return false;
    }
  } else log(LOGS.update.serviceRestartSkipped);

  log(`${LOGS.update.pcUpd}${ip}${LOGS.update.end}`, "ok");
  return true;
}