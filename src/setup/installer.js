#!/usr/bin/env node

import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import { fileURLToPath } from "url";
import { Service } from "node-windows";
import {LOGS} from '../utils/consts'

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SERVICE_NAME = "PCTimeControl";
const PROJECT_ROOT = path.resolve(__dirname, "../..");
const SCRIPT_PATH = path.join(PROJECT_ROOT, "index.js");
const CONFIG_PATH = path.join(__dirname, "config.js");

function installService() {
  console.log(LOGS.setup.init);

  try {
    // Проверяем права администратора
    try {
      execSync("net session", { stdio: "ignore" });
    } catch (err) {
      console.log(LOGS.setup.noRoot);
      console.log(LOGS.setup.rootHint);
      process.exit(1);
    }

    // Создаем сервис
    const svc = new Service({
      name: SERVICE_NAME,
      description: LOGS.setup.serviceDescription,
      script: SCRIPT_PATH,
      nodeOptions: [`--import=${CONFIG_PATH}`, "--max-old-space-size=512"],
      env: [
        {
          name: "NODE_ENV",
          value: "production",
        },
        {
          name: "PROJECT_ROOT",
          value: PROJECT_ROOT,
        },
      ],
      logOnAsUser: true,
      logOnAsUserAccount: process.env.USERNAME,
      logOnAsUserPassword: null, // Использует текущую сессию
      workingDirectory: PROJECT_ROOT,
    });

    // События установки
    svc.on("install", () => {
      console.log(LOGS.setup.success);
      console.log(`   ${LOGS.setup.name}: ${SERVICE_NAME}`);
      console.log(`   ${LOGS.setup.script}: ${SCRIPT_PATH}`);
      console.log(`\n${LOGS.setup.startScript}`);
      console.log(`   net start ${SERVICE_NAME}`);
      console.log(`\n${LOGS.setup.stopScript}`);
      console.log(`   net stop ${SERVICE_NAME}`);
      console.log(`\n${LOGS.setup.uninstall}`);
      console.log(`   node installer.js uninstall`);
    });

    svc.on("alreadyinstalled", () => {
      console.log(LOGS.setup.uninstall);
      console.log(LOGS.setup.uninstallHint);
    });

    svc.on("invalidinstallation", () => {
      console.log(LOGS.setup.invalid);
      console.log(LOGS.setup.invalidHint);
    });

    svc.on("error", (err) => {
      console.log(`${LOGS.setup.error}: ${err.message}`);
      process.exit(1);
    });

    svc.install();
  } catch (err) {
    console.log(`${LOGS.setup.error}: ${err.message}`);
    process.exit(1);
  }
}

function uninstallService() {
  console.log(LOGS.setup.uninstalling);

  try {
    execSync("net stop PCTimeControl", { stdio: "ignore" });
  } catch (err) {
    // Сервис может быть уже остановлен
  }

  try {
    const svc = new Service({
      name: SERVICE_NAME,
      script: SCRIPT_PATH,
    });

    svc.on("uninstall", () => {
      console.log(LOGS.setup.uninstallSuccess);
    });

    svc.on("error", (err) => {
      console.log(`${LOGS.setup.uninstallError}: ${err.message}`);
      process.exit(1);
    });

    svc.uninstall();
  } catch (err) {
    console.log(`${LOGS.setup.uninstallError}: ${err.message}`);
    process.exit(1);
  }
}

// Автоустановка в автозагрузку для текущего пользователя
function installStartupShortcut() {
  console.log(LOGS.setup.startupInit);

  try {
    const startupFolder = path.join(
      process.env.APPDATA,
      "Microsoft",
      "Windows",
      "Start Menu",
      "Programs",
      "Startup",
    );

    const shortcutPath = path.join(startupFolder, "PC Time Control.lnk");

    // Используем PowerShell для создания ярлыка
    const psScript = `
$WshShell = New-Object -comObject WScript.Shell
$Shortcut = $WshShell.CreateShortcut("${shortcutPath}")
$Shortcut.TargetPath = "${process.execPath}"
$Shortcut.Arguments = "${SCRIPT_PATH}"
$Shortcut.WorkingDirectory = "${PROJECT_ROOT}"
$Shortcut.WindowStyle = 7
$Shortcut.IconLocation = "${process.execPath}, 0"
$Shortcut.Save()
`;

    execSync(`powershell -Command "${psScript.replace(/"/g, '`"')}"`, {
      stdio: "ignore",
    });
    console.log(LOGS.setup.startupSuccess);
  } catch (err) {
    console.log(`${LOGS.setup.startupFailed}: ${err.message}`);
    console.log(LOGS.setup.manually);
  }
}

// Основная функция
async function main() {
  const args = process.argv.slice(2);

  if (args.includes("uninstall")) {
    uninstallService();
    return;
  }

  if (args.includes("startup")) {
    installStartupShortcut();
    return;
  }

  // По умолчанию - полная установка
  console.log(LOGS.setup.full);

  // Устанавливаем сервис
  installService();

  // Добавляем в автозагрузку (как запасной вариант)
  setTimeout(() => {
    installStartupShortcut();
  }, 2000);

  console.log(LOGS.setup.complete);
  console.log(LOGS.setup.boot);
}

main().catch((err) => {
  console.error(`Error: ${err.message}`);
  process.exit(1);
});
