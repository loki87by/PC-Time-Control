/**
 * Linux-specific функции для удалённого обновления агента.
 * SSH/rsync и systemctl.
 */

import path from "path";
import { execSync } from "child_process";
import { CONFIG } from "#config";
import { LOGS, PATHS } from "#consts";
import { log, getRemoteAppPath, collectFiles, PROJECT_ROOT } from "./update-agent.js";

/**
 * Копирование файлов через rsync по SSH
 */
export function copyViaRsync(ip, remoteRoot, sshUser, sshKey, dryRun) {
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

  const userHost = PATHS.commands.sshBuildHost(ip, sshUser);
  const keyOpt = PATHS.commands.sshKeyFlag(sshKey);

  try {
    execSync(PATHS.commands.sshMkdir(keyOpt, userHost, remoteRoot), { stdio: "ignore", timeout: 10000 });
    const rsyncCmd = PATHS.commands.rsyncCopy(keyOpt, PROJECT_ROOT, userHost, remoteRoot);
    execSync(rsyncCmd, { stdio: "pipe", timeout: 120000 });
    log(`${LOGS.update.copied}${files.length}${LOGS.update.files}`, "ok");
    return true;
  } catch (err) {
    log(`${LOGS.update.rsyncError}${err.message.slice(0, 200)}`, "error");
    return false;
  }
}

/**
 * Установка зависимостей через SSH
 */
export function installDepsViaSsh(ip, remoteRoot, sshUser, sshKey, dryRun) {
  if (dryRun) {
    log(`${LOGS.update.npmI}${remoteRoot}`);
    return true;
  }

  const userHost = PATHS.commands.sshBuildHost(ip, sshUser);
  const keyOpt = PATHS.commands.sshKeyOpt(sshKey);
  log(`${LOGS.update.npmInstall}${ip}...`);

  try {
    execSync(PATHS.commands.sshNpmInstall(keyOpt, userHost, remoteRoot), { timeout: CONFIG.depsTimeout, stdio: "pipe" });
    log(LOGS.update.npmBeenInstall, "ok");
    return true;
  } catch (err) {
    log(`${LOGS.update.npmInstallErr}${err.message.slice(0, 200)}`, "error");
    return false;
  }
}

/**
 * Перезапуск сервиса через SSH + systemctl
 */
export function restartServiceViaSsh(ip, sshUser, sshKey, dryRun) {
  const svcName = "pc-time-control";

  if (dryRun) {
    log(`${LOGS.update.serviceRestart}${svcName}${LOGS.update.on}${ip}`);
    return true;
  }

  const userHost = PATHS.commands.sshBuildHost(ip, sshUser);
  const keyOpt = PATHS.commands.sshKeyOpt(sshKey);

  log(`${LOGS.update.serviceStop}${svcName}${LOGS.update.on}${ip}...`);
  try {
    execSync(PATHS.commands.sshSystemctlStop(keyOpt, userHost, svcName), { timeout: 60000 });
    log(LOGS.update.serviceStopped, "ok");
  } catch (err) {
    log(`${LOGS.update.serviceStopErr}${(err.message || "").slice(0, 200)}`, "warn");
  }

  log(`${LOGS.update.serviceStart}${svcName}${LOGS.update.on}${ip}...`);
  try {
    execSync(PATHS.commands.sshSystemctlStart(keyOpt, userHost, svcName), { timeout: 120000 });
    log(LOGS.update.serviceStarted, "ok");
    return true;
  } catch (err) {
    log(`${LOGS.update.serviceStartErr}${(err.message || "").slice(0, 200)}`, "error");
    return false;
  }
}

/**
 * Основной процесс обновления Linux-хоста
 */
export async function updatePCLinux(ip, options) {
  const { dryRun, restart, deps, smbUser, sshKey } = options;
  const remoteRoot = "/opt/pc-time-control";
  const sshUser = smbUser || "root";

  log(LOGS.update.pathRequest);
  const appPath = await getRemoteAppPath(ip);
  const effectiveRoot = appPath || remoteRoot;
  log(`${LOGS.update.appPath}${effectiveRoot}`, "ok");

  log(`${LOGS.update.copy}${LOGS.update.files}...`);

  if (!copyViaRsync(ip, effectiveRoot, sshUser, sshKey, dryRun)) {
    log(`${LOGS.update.files}${LOGS.update.withErrors}`, "error");
    return false;
  }

  if (deps) {
    if (!installDepsViaSsh(ip, effectiveRoot, sshUser, sshKey, dryRun))
      log(LOGS.update.npmNotInstall, "warn");
  } else log(LOGS.update.npmInstallSkipped);

  if (restart) {
    if (!restartServiceViaSsh(ip, sshUser, sshKey, dryRun)) {
      log(LOGS.update.serviceRestartErr, "error");
      return false;
    }
  } else log(LOGS.update.serviceRestartSkipped);

  log(`${LOGS.update.pcUpd}${ip}${LOGS.update.end}`, "ok");
  return true;
}