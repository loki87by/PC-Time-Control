#!/usr/bin/env node

/**
 * Автономный скрипт удаленного обновления агента родительского контроля.
 *
 * Windows: работает через SMB (административный доступ) и sc (управление службами).
 * Linux:   работает через SSH/rsync и systemctl.
 *
 * Использование:
 *   node scripts/update-agent.js [опции]
 * Опции:
 *   --ip <адрес>       Обновить конкретный ПК (можно несколько: --ip 1.1.1.1 --ip 2.2.2.2)
 *   --scan             Сканировать локальную сеть в поиске ПК с приложением
 *   --dry-run          Показать, что будет сделано, без реальных действий
 *   --no-restart       Не перезапускать службу после обновления
 *   --no-deps          Не устанавливать зависимости (npm install)
 *   --user <домен\пользователь>  Имя пользователя для SMB-доступа (Windows) или SSH user (Linux)
 *   --ssh-key <путь>   Путь к SSH-ключу для Linux-хостов (по умолчанию ~/.ssh/id_rsa)
 *   --fix-remote-uac  Отключить UAC remote restrictions на целевом ПК (требуется админ-доступ)
 *   --help             Показать справку
 * Примеры:
 *   node scripts/update-agent.js --scan
 *   node scripts/update-agent.js --ip 192.168.1.105
 *   node scripts/update-agent.js --scan --dry-run
 *   node scripts/update-agent.js --ip 192.168.1.105 --no-restart
 *   node scripts/update-agent.js --ip 192.168.1.106 --user SON
 *   node scripts/update-agent.js --ip 192.168.1.200 --ssh-key ~/.ssh/id_ed25519
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
import { updatePC } from "./update-win.js";
import { updatePCLinux } from "./update-linux.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
export const PROJECT_ROOT = path.resolve(__dirname, "..");

dotenv.config({ path: path.join(PROJECT_ROOT, ".env") });

const SERVER_PORT = CONFIG.serverPort;
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
    fixRemoteUac = false,
    sshKey = null;

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
      case "--ssh-key":
        if (args[i + 1] && !args[i + 1].startsWith("--")) sshKey = args[++i];
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
  return { ips, scan, dryRun, restart, deps, smbUser, fixRemoteUac, sshKey };
}

export function log(msg, type) {
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

export function getRemoteAppPath(ip) {
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

export function collectFiles(dir) {
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

export function toSmbPath(ip, localPath) {
  const driveLetter = localPath[0].toUpperCase();
  const rest = localPath.slice(2).replace(/\//g, "\\");
  return `\\\\${ip}\\${driveLetter}$${rest}`;
}

/**
 * Определяет, является ли целевой хост Linux, по ответу на GET_PLATFORM
 */
async function getRemotePlatform(ip) {
  return new Promise((resolve) => {
    const s = new net.Socket();
    let data = "";
    s.setTimeout(5000);
    s.on("connect", () => s.write("GET_PLATFORM\n"));
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

/**
 * Определяет платформу и делегирует обновление в соответствующий модуль
 */
async function updatePCOverall(ip, options) {
  console.log(`\n${LOGS.update.divider}`);
  log(`${LOGS.update.pcUpd}${ip}`);
  console.log(LOGS.update.divider);
  log(LOGS.update.ping);

  if (!(await tcpPing(ip, SERVER_PORT, 2000))) {
    log(`${ip}${LOGS.update.noPing}${SERVER_PORT}`, "error");
    log(LOGS.update.noPingHint);
    return false;
  }
  log(`${ip}${LOGS.update.pingOk}`, "ok");

  const platform = await getRemotePlatform(ip);
  const isLinux = platform === "linux" || platform === "darwin";

  if (isLinux) {
    log(`${LOGS.update.platformDetected}Linux`, "ok");
    return await updatePCLinux(ip, options);
  }

  return await updatePC(ip, options);
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
    (await updatePCOverall(ip, options)) ? ok++ : fail++;
  }
  console.log(`\n${LOGS.update.divider}`);
  log(
    `${LOGS.update.success}${ok}${fail > 0 ? `, ${LOGS.update.withErrors} ${fail}` : ""}`,
  );
  console.log(LOGS.update.divider);
  process.exit(fail > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error(`${LOGS.update.error} ${err.message}${LOGS.update.end}`);
  process.exit(1);
});