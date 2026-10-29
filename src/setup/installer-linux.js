#!/usr/bin/env node

import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { LOGS, PATHS } from "../constants/consts.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, "../..");

const SERVICE_NAME = "pc-time-control";
const SERVICE_FILE = `${SERVICE_NAME}.service`;
const SERVICE_SRC = path.join(__dirname, SERVICE_FILE);
const SERVICE_DST = `/etc/systemd/system/${SERVICE_FILE}`;
const LOG_DIR = "/var/log/pc-time-control";

function run(cmd, ignoreError = false) {
  try {
    return execSync(cmd, { encoding: "utf8", timeout: 30000 });
  } catch (err) {
    if (!ignoreError) throw err;
    return "";
  }
}

function checkRoot() {
  if (process.getuid && process.getuid() !== 0) {
    console.error(`❌ ${LOGS.setup.linuxNoRoot}`);
    console.error(`   ${LOGS.setup.linuxRootHint}`);
    process.exit(1);
  }
}

function checkOS() {
  if (process.platform === "win32") {
    console.error(`❌ ${LOGS.setup.linuxNotLinux}`);
    console.error(`   ${LOGS.setup.linuxNotLinuxHint}`);
    process.exit(1);
  }
}

function ensureServiceFile() {
  if (!fs.existsSync(SERVICE_SRC)) {
    console.error(`❌ ${LOGS.setup.linuxUnitNotFound} ${SERVICE_SRC}`);
    process.exit(1);
  }

  let content = fs.readFileSync(SERVICE_SRC, "utf8");
  content = content.replace(/\/opt\/pc-time-control/g, PROJECT_ROOT.replace(/\\/g, "/"));
  content = content.replace(
    /ExecStart=\/usr\/bin\/node/g,
    `ExecStart=${process.execPath.replace(/\\/g, "/")}`,
  );

  const user = process.env.SUDO_USER || process.env.USER || "root";
  if (user !== "root") {
    content = content.replace(/^User=root$/m, `User=${user}`);
    content = content.replace(/^ProtectHome=true$/m, "ProtectHome=read-only");
  }

  return content;
}

function ensureLogDir() {
  try {
    fs.mkdirSync(LOG_DIR, { recursive: true });
    const user = process.env.SUDO_USER || "root";
    run(PATHS.commands.chownRecursive(user, LOG_DIR));
    console.log(`${LOGS.setup.linuxLogDirCreated} ${LOG_DIR}`);
  } catch (err) {
    console.warn(`${LOGS.setup.linuxLogDirWarn} ${err.message}`);
  }
}

function installService() {
  checkOS();
  checkRoot();

  console.log(LOGS.setup.linuxInit);

  ensureLogDir();

  const unitContent = ensureServiceFile();
  fs.writeFileSync(SERVICE_DST, unitContent, "utf8");
  console.log(`${LOGS.setup.linuxUnitCopied} ${SERVICE_DST}`);

  run(PATHS.commands.systemctlDaemonReload);
  console.log(LOGS.setup.linuxDaemonReloaded);

  run(PATHS.commands.systemctlEnable(SERVICE_NAME));
  console.log(LOGS.setup.linuxEnabled);

  run(PATHS.commands.systemctlStart(SERVICE_NAME));
  console.log(LOGS.setup.linuxStarted);

  console.log(LOGS.setup.linuxManageTitle);
  console.log(LOGS.setup.linuxManageStatus);
  console.log(LOGS.setup.linuxManageStop);
  console.log(LOGS.setup.linuxManageStart);
  console.log(LOGS.setup.linuxManageRestart);
  console.log(LOGS.setup.linuxManageLogs);

  console.log(LOGS.setup.linuxInstallComplete);
}

function uninstallService() {
  checkOS();
  checkRoot();

  console.log(LOGS.setup.linuxUninstallTitle);

  try {
    run(PATHS.commands.systemctlStop(SERVICE_NAME), true);
    console.log(LOGS.setup.linuxStopped);
  } catch {
    console.log(`⚠️ ${LOGS.setup.linuxNotFound}`);
  }

  try {
    run(PATHS.commands.systemctlDisable(SERVICE_NAME), true);
    console.log(LOGS.setup.linuxDisabled);
  } catch {
    // ignore
  }

  try {
    fs.unlinkSync(SERVICE_DST);
    console.log(`${LOGS.setup.linuxUnitRemoved} ${SERVICE_DST}`);
  } catch {
    console.log(LOGS.setup.linuxUnitNotFoundWarn);
  }

  run(PATHS.commands.systemctlDaemonReload);
  console.log(LOGS.setup.linuxDaemonReloaded);

  console.log(LOGS.setup.linuxUninstallComplete);
}

function showStatus() {
  checkOS();

  console.log(LOGS.setup.linuxStatusTitle);

  try {
    const out = run(PATHS.commands.systemctlIsEnabled(SERVICE_NAME), true);
    console.log(`${LOGS.setup.linuxAutoStart} ${out.trim()}`);
  } catch {
    console.log(`${LOGS.setup.linuxAutoStart} ${LOGS.setup.linuxNotFound}`);
  }

  try {
    const out = run(PATHS.commands.systemctlIsActive(SERVICE_NAME), true);
    console.log(`${LOGS.setup.linuxState} ${out.trim()}`);
  } catch {
    console.log(`${LOGS.setup.linuxState} ${LOGS.setup.linuxNotFound}`);
  }

  try {
    const out = run(PATHS.commands.systemctlStatus(SERVICE_NAME), true);
    console.log(`\n${out}`);
  } catch {
    // ignore
  }
}

function main() {
  const args = process.argv.slice(2);

  if (args.includes("uninstall")) {
    uninstallService();
  } else if (args.includes("status")) {
    showStatus();
  } else {
    installService();
  }
}

main().catch((err) => {
  console.error(`❌ ${LOGS.setup.error}: ${err.message}`);
  process.exit(1);
});