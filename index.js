#!/usr/bin/env node
import net from "net";
import fs from "fs";
import os from "os";
import path from "path";
//import { createRequire } from "module";
import { spawn, execSync } from "child_process";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { TIMES } from "./src/utils/consts.js";
import FrpConnectManager from "./src/utils/frpConnectManager.js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = process.env.PROJECT_ROOT || __dirname;
process.chdir(PROJECT_ROOT);

const debugLog = path.join(
  process.env.PROJECT_ROOT || __dirname,
  "debug-startup.log",
);
fs.writeFileSync(debugLog, `[${new Date().toISOString()}] STARTING...\n`);
fs.appendFileSync(debugLog, `PROJECT_ROOT: ${process.env.PROJECT_ROOT}\n`);
fs.appendFileSync(debugLog, `__dirname: ${__dirname}\n`);
fs.appendFileSync(debugLog, `process.cwd(): ${process.cwd()}\n`);

import { WebServer } from "#web/server";
import { CONFIG } from "#config";
import { LOGS, PATHS } from "#consts";
import { logger } from "#utils/logger";
import { PCTimeControl } from "#utils/pc-control";
import { RemoteControlServer } from "#utils/remote-server";

fs.appendFileSync(debugLog, `Title: ${CONFIG.msgTitle}\n`);
fs.appendFileSync(debugLog, `Title: ${PATHS.config}\n`);

let control = null;
let remoteServer = null;
let webServer = null;
let frpProcess = null;

async function frpConnectUpdater() {
  const response = await fetch(`${process.env.BASE}/get_frp_start_time`, {
    method: "GET",
  });
  const res = await response.json();
  console.log("response: ", res);

  if (res.success && res.data && isFinite(+res.data)) {
    const { data } = res;
    const times = Object.entries(TIMES)
      .map(([k, v]) => {
        const val = Math.floor(+data / v);
        return { k, val };
      })
      .filter((i) => i.val > 0)
      .sort((a, b) => a.val - b.val);
    console.log(
      `frp-server started more than ${times[0].val} ${times[0].k.toLowerCase()}s ago...`,
    );
    const manager = new FrpConnectManager()
    const loginStatus = await manager.login()
    console.log('loginStatus', loginStatus)
    
    if (loginStatus !== 302) return setTimeout(startFRPClient, 5000);
    
    const token = await manager.getCurrentToken()
    console.log('token', token)
  }
}

function startFRPClient() {
  const frpConfigPath = path.join(PROJECT_ROOT, PATHS.config);
  if (!fs.existsSync(frpConfigPath)) {
    logger.warn(LOGS.frp.notExistConfig);
    return;
  }
  logger.info(LOGS.frp.start);
  const args = [PATHS.library, "client", frpConfigPath];
  frpProcess = spawn("node", args, {
    stdio: ["ignore", "pipe", "pipe"],
    detached: false,
    windowsHide: true,
    shell: true,
  });
  frpProcess.stdout.on("data", (data) => {
    logger.info(`FRP: ${data.toString().trim()}`);
  });
  frpProcess.stderr.on("data", async (data) => {
    logger.error(`FRP Error: ${data.toString().trim()}`);
    return await frpConnectUpdater();
  });
  frpProcess.on("close", (code) => {
    logger.info(`${LOGS.frp.exit} ${code}`);
    if (code !== 0) {
      setTimeout(startFRPClient, 5000);
    }
  });
  frpProcess.on("error", (err) => {
    logger.error(`${LOGS.frp.fail}: ${err.message}`);
  });
}

async function main() {
  try {
    logger.info(LOGS.base.start);
    logger.info(`${LOGS.base.platform}: ${process.platform}`);
    logger.info(`${LOGS.base.node}: ${process.version}`);
    control = new PCTimeControl();
    const isRemotePortAvailable = await checkPort(CONFIG.serverPort);

    if (!isRemotePortAvailable) {
      const log = LOGS.base.usedPort(CONFIG.serverPort);
      logger.error(log);
      control.showMessage(
        `${log}\n${LOGS.user.firewall}`,
        LOGS.base.networkError,
      );
      process.exit(1);
    }
    const isWebPortAvailable = await checkPort(CONFIG.webPort);

    if (!isWebPortAvailable) {
      const log = LOGS.base.usedPort(CONFIG.webPort);
      logger.warn(`${log} ${LOGS.base.webPortUsed}`);
    }

    remoteServer = new RemoteControlServer(control);
    await remoteServer.start();
    logger.info(LOGS.base.portLog(LOGS.base.remoteStarted, CONFIG.serverPort));

    webServer = new WebServer(control, gracefulShutdown);
    await webServer.start();
    startFRPClient();

    const localIP = getLocalIP();
    logger.info(LOGS.base.started);
    logger.info(
      LOGS.base.portLog(LOGS.base.url, localIP, `:${CONFIG.webPort}`),
    );
    logger.info(LOGS.base.portLog(LOGS.base.panel, localIP, CONFIG.serverPort));
    process.on("SIGINT", gracefulShutdown);
    process.on("SIGTERM", gracefulShutdown);
    process.on("SIGHUP", gracefulShutdown);
    process.on("uncaughtException", (err) => {
      logger.error(`${LOGS.base.uncaughtException}: ${err.message}`);
      logger.error(err.stack);
    });
    process.on("unhandledRejection", (reason) => {
      logger.error(`${LOGS.base.uncaughtError}: ${reason}`);
    });
    await new Promise(() => {});
  } catch (err) {
    logger.error(`${LOGS.base.startupError}: ${err.message}`);
    logger.error(err.stack);
    process.exit(1);
  }
}

function checkPort(port) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(1000);
    socket.on("connect", () => {
      socket.destroy();
      resolve(false);
    });
    socket.on("error", () => resolve(true));
    socket.on("timeout", () => {
      socket.destroy();
      resolve(true);
    });
    socket.connect(port, PATHS.localhost);
  });
}

function getLocalIP() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === "IPv4" && !iface.internal) {
        return iface.address;
      }
    }
  }
  return PATHS.localhost;
}

function gracefulShutdown() {
  logger.info(LOGS.base.shutdown);

  if (frpProcess) {
    frpProcess.kill();
  }
  if (webServer) {
    webServer.stop();
  }
  if (remoteServer) {
    remoteServer.stop();
  }
  if (control) {
    control.stop();
  }
  logger.info(LOGS.base.shutdownEnd);
  process.exit(0);
}

main().catch((err) => {
  logger.error(`${LOGS.base.fatal}: ${err.message}`);
  process.exit(1);
});
