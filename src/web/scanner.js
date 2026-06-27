import { PCClient } from "#web/client";
import { logger } from "#utils/logger";
import { CONFIG } from "#config";
import { LOGS } from "#consts";

export class NetworkScanner {
  constructor(customNames = {}) {
    this.customNames = customNames;
  }

  async scan(networkPrefix) {
    const results = new Map();
    const promises = [];

    logger.info(LOGS.web.scan);

    for (let i = 1; i < 255; i++) {
      const ip = networkPrefix + i;
      promises.push(this.checkHost(ip, results));
    }

    await Promise.all(promises);
    
    logger.info(`${LOGS.web.scanEnd} ${results.size}`);
    return results;
  }

  async checkHost(ip, results) {
    const isOnline = await PCClient.ping(ip, CONFIG.serverPort, 500);
    if (!isOnline) return;

    const client = new PCClient(ip);
    let hostname = this.customNames[ip];

    if (!hostname) {
      try {
        hostname = await client.getPCName() || `PC at ${ip}`;
      } catch {
        hostname = `PC at ${ip}`;
      }
    }

    const status = await client.getStatus();
    const user = await client.getCurrentUser();
    const limit = await client.getUsageLimit();
    const lockTimes = await client.getLockTimes();
    const remaining = await client.getTimeRemaining();

    results.set(ip, {
      hostname,
      ip,
      status: "online",
      locked: status === "LOCKED",
      currentUser: user,
      usageLimit: limit,
      lockTimes,
      timeRemaining: remaining,
      lastSeen: new Date()
    });
  }

  async refreshPCs(pcs) {
    const results = new Map();
    
    for (const [ip, info] of pcs) {
      const client = new PCClient(ip);
      const status = await client.getStatus();
      const user = await client.getCurrentUser();
      
      results.set(ip, {
        ...info,
        locked: status === "LOCKED",
        currentUser: user || info.currentUser,
        lastSeen: new Date()
      });
    }
    
    return results;
  }
}