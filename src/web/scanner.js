import { PCClient } from "#web/client";
import { logger } from "#utils/logger";
import { CONFIG } from "#config";
import { LOGS } from "#consts";

export class NetworkScanner {
  constructor(customNames = {}) {
    this.customNames = customNames;
    this.discoveryNodes = null;
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

    if (this.discoveryNodes) {
      for (const node of this.discoveryNodes) {
        const ip = node.ip;

        if (results.has(ip)) continue;
        const isOnline = await PCClient.ping(ip, CONFIG.serverPort, 300);

        if (isOnline) {
          await this.checkHost(ip, results);
        } else {
          results.set(ip, {
            hostname: node.hostname || ip,
            ip,
            status: "offline",
            locked: false,
            currentUser: null,
            usageLimit: null,
            lockTimes: null,
            timeRemaining: null,
            lastSeen: new Date(node.lastSeen),
            frpMaster: node.frpMaster,
          });
        }
      }
    }
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
        hostname = (await client.getPCName()) || `PC at ${ip}`;
      } catch {
        hostname = `PC at ${ip}`;
      }
    }
    const status = await client.getStatus();
    const user = await client.getCurrentUser();
    const limit = await client.getUsageLimit();
    const lockTimes = await client.getLockTimes();
    const remaining = await client.getTimeRemaining();
    let frpMaster = false;

    if (this.discoveryNodes) {
      const discNode = this.discoveryNodes.find((n) => n.ip === ip);
      if (discNode) frpMaster = discNode.frpMaster;
    }
    results.set(ip, {
      hostname,
      ip,
      status: "online",
      locked: status === "LOCKED",
      currentUser: user,
      usageLimit: limit,
      lockTimes,
      timeRemaining: remaining,
      lastSeen: new Date(),
      frpMaster,
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
        lastSeen: new Date(),
      });
    }
    return results;
  }
}
