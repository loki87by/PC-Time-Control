import http from "http";
import os from "os";
import path from "path";
import { fileURLToPath } from "url";
import { exec } from "child_process";

import { Routes } from "#web/routes";
import { NetworkScanner } from "#web/scanner";
import { PCClient } from "#web/client";
import { CONFIG } from "#config";
import { LOGS, PATHS } from "#consts";
import { logger } from "#utils/logger";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class WebServer {
  constructor(pcControl, gracefulShutdown) {
    this.pcControl = pcControl;
    this.port = CONFIG.webPort;
    this.server = null;
    this.discoveredPCs = new Map();
    this.lastScanTime = null;
    this.scanning = false;
    this.routes = new Routes(this);
    this.scanner = new NetworkScanner({
      // '192.168.1.105': 'Tommy\'s Laptop',
      // '192.168.1.112': 'Sarah\'s Desktop',
    });
    this.gracefulShutdown = gracefulShutdown
  }

  async start() {
    this.server = http.createServer((req, res) => {
      this.handleRequest(req, res);
    });

    return new Promise((resolve, reject) => {
      this.server.listen(this.port, "0.0.0.0", () => {
        logger.info(`${LOGS.web.started} ${this.port}`);
        const check = http.get(`http://127.0.0.1:${this.port}`, (res) => {
          logger.info(`✅ Сервер отвечает на 127.0.0.1:${this.port}`);
        });
        check.on("error", (err) => {
          logger.error(`❌ Сервер НЕ отвечает: ${err.message}`);
        });
        setTimeout(() => this.scanNetwork(), 1000);
        resolve();
      });

      this.server.on("error", (err) => {
        if (err.code === "EADDRINUSE") {
          const log = LOGS.base.usedPort(this.port);
          logger.error(log);
          reject(new Error(log));
        } else {
          reject(err);
        }
      });
    });
  }

  async handleRequest(req, res) {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const pathname = url.pathname;
    const method = req.method;

    try {
      const routeHandlers = {
        "/": () => this.routes.index(req, res),
        "/index.html": () => this.routes.index(req, res),
        "/control": () => this.routes.control(req, res),
        "/scan": () => this.routes.scan(req, res),
        "/api/status": () => this.routes.status(req, res),
        "/api/refresh": () => this.routes.refresh(req, res),
        "/admin/exit": () => this.gracefulShutdown(),
      };

      // GET запросы
      if (routeHandlers[pathname]) {
        await routeHandlers[pathname]();
        return;
      }

      // POST запросы
      if (pathname === "/api/action" && method === "POST") {
        await this.routes.action(req, res);
        return;
      }

      this.routes.notFound(res);
    } catch (err) {
      logger.error(`${LOGS.web.httpErr} ${err.message}`);
      this.routes.error(res);
    }
  }

  async scanNetwork() {
    if (this.scanning) return;

    this.scanning = true;
    const localIP = this.getLocalIP();
    const network = localIP.substring(0, localIP.lastIndexOf(".")) + ".";

    try {
      this.discoveredPCs = await this.scanner.scan(network);
      this.lastScanTime = new Date();
    } catch (err) {
      logger.error(`${LOGS.web.scanErr}: ${err.message}`);
      this.discoveredPCs = new Map();
    } finally {
      this.scanning = false;
    }
  }

  async refreshPCs() {
    try {
      this.discoveredPCs = await this.scanner.refreshPCs(this.discoveredPCs);
    } catch (err) {
      logger.error(`${LOGS.web.refreshErr}: ${err.message}`);
    }
  }

  getLocalIP() {
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

  async checkServerRunning() {
    return PCClient.ping(PATHS.localhost, CONFIG.serverPort, 1000);
  }

  stop() {
    if (this.server) {
      this.server.closeAllConnections?.();
      this.server.close();
      this.server = null;
      logger.info(LOGS.web.stopped);
    }
    this.server = null;

    if (process.platform === "win32") {
      exec(`${PATHS.commands.getPid} :${CONFIG.webPort}`, (err, stdout) => {
        if (!err && stdout) {
          const lines = stdout.split("\n");
          for (const line of lines) {
            const parts = line.trim().split(/\s+/);
            if (parts.length > 4) {
              const pid = parts[parts.length - 1];
              exec(`${PATHS.commands.cleanPort} ${pid}`);
            }
          }
        }
      });
    }
  }
}
