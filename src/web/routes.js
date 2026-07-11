import { Templates } from "#web/templates";
import { PCClient } from "#web/client";
import { logger } from "#utils/logger";
import { LOGS } from "#consts";

export class Routes {
  constructor(webServer) {
    this.webServer = webServer;
  }

  async index(req, res) {
    const pcs = Array.from(this.webServer.discoveredPCs.entries());
    const isServerRunning = await this.webServer.checkServerRunning();
    const html = Templates.index(pcs, this.webServer.lastScanTime, isServerRunning);
    this.sendHTML(res, html);
  }

  async control(req, res) {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const ip = url.searchParams.get("ip");
    
    if (!ip) {
      this.redirect(res, "/");
      return;
    }

    const info = this.webServer.discoveredPCs.get(ip);
    if (!info) {
      this.redirect(res, "/");
      return;
    }

    const client = new PCClient(ip);
    info.locked = (await client.getStatus()) === LOGS.remote.lock_m;
    info.currentUser = await client.getCurrentUser() || info.currentUser;
    info.usageLimit = await client.getUsageLimit();
    info.sessionLimit = await client.getSessionLimit();
    info.sessionBreak = await client.getSessionBreak();
    info.lockTimes = await client.getLockTimes();
    info.timeRemaining = await client.getTimeRemaining();
    info.canUnlock = await client.canUnlock();
    info.usageTime = await client.getUsageTime();
    info.sessionTime = await client.getSessionTime();
    info.shutdownTime = await client.getShutdownTime();
    info.shutdownAbort = await client.getShutdownAbort();

    const html = Templates.control(ip, info);
    this.sendHTML(res, html);
  }

  async scan(req, res) {
    await this.webServer.scanNetwork();
    this.redirect(res, "/");
  }

  async status(req, res) {
    const pcs = Array.from(this.webServer.discoveredPCs.entries()).map(([ip, info]) => ({
      ip,
      ...info,
      locked: info.locked || false
    }));

    this.sendJSON(res, {
      pcs,
      lastScan: this.webServer.lastScanTime,
      scanning: this.webServer.scanning
    });
  }

  async refresh(req, res) {
    await this.webServer.refreshPCs();
    this.redirect(res, "/");
  }

  async action(req, res) {
    let body = "";
    req.on("data", chunk => body += chunk);
    req.on("end", async () => {
      try {
        const data = JSON.parse(body);
        const client = new PCClient(data.ip, 5000);
        const result = await this.executeAction(client, data);
        
        if (result.success && data.action === "lock" && this.webServer.discoveredPCs.has(data.ip)) {
          this.webServer.discoveredPCs.get(data.ip).locked = true;
        }
        
        this.sendJSON(res, result);
      } catch (err) {
        this.sendJSON(res, { success: false, response: err.message }, 500);
      }
    });
  }

  async executeAction(client, data) {
    const actionMap = {
      lock: () => client.lock(),
      shutdown: () => client.shutdown(),
      shutdown_abort: () => client.shutdownAbort(),
      unlock: () => client.unlock(),
      end_break: () => client.endBreak(),
      message: () => client.sendMessage(data.message),
      set_limit: () => client.setLimit(data.minutes),
      set_session_limit: () => client.setSessionLimit(data.minutes),
      add_lock_time: () => client.addLockTime(data.time),
      set_break_duration: () => client.setBreakDuration(data.minutes),
      delayed_shutdown: () => client.delayedShutdown(data.seconds),
      reset_usage_time: () => client.resetUsageTime(),
      clear_usage_limit: () => client.clearUsageLimit(),
      clear_lock_times: () => client.clearLockTimes(),
      clear_all: () => client.clearAll()
    };

    const action = actionMap[data.action];
    if (!action) {
      return { success: false, response: "Unknown action" };
    }

    logger.info(`Action request: ${data.action} for ${data.ip}`);
    return await action();
  }

  sendHTML(res, html) {
    res.writeHead(200, { "Content-Type": "text/html" });
    res.end(html);
  }

  sendJSON(res, data, status = 200) {
    res.writeHead(status, { "Content-Type": "application/json" });
    res.end(JSON.stringify(data));
  }

  redirect(res, location) {
    res.writeHead(302, { Location: location });
    res.end();
  }

  notFound(res) {
    res.writeHead(404);
    res.end("Not found");
  }

  error(res, message) {
    res.writeHead(500);
    res.end(message || "Internal server error");
  }
}