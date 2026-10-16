import dgram from "dgram";
import os from "os";
import { CONFIG } from "#config";
import { logger } from "#utils/logger";
import { PATHS } from "#consts";

const DISCOVERY_PORT = CONFIG.discoveryPort;
const DISCOVERY_MSG = CONFIG.discoveryTitle;
const NODE_TIMEOUT = CONFIG.nodeTimeout;

/**
 * Распределенное обнаружение узлов в локальной сети + выбор FRP-мастера.
 * Каждый экземпляр приложения:
 * 1. Рассылает UDP broadcast "я здесь" (IP, hostname, статус FRP)
 * 2. Слушает broadcast-сообщения от других узлов
 * 3. Обменивается heartbeats для обнаружения отключений
 * 4. Выбирает FRP-мастера (первый узел в сети = мастер)
 * 5. При отключении мастера — автоматический failover
 */

export class NodeDiscovery {
  constructor() {
    this.nodes = new Map();
    this.isFrpMaster = false;
    this.frpMasterIp = null;
    this.onFrpMasterChange = null;
    this.onNodesChange = null;
    this._running = false;
    this._socket = null;
    this._heartbeatTimer = null;
    this._cleanupTimer = null;
    this._masterAnnounceTimer = null;
    this._myIp = this._getLocalIP();
    this._myHostname = os.hostname();
  }

  /**
   * Запустить discovery-сервис.
   * @param {object} options
   * @param {function(boolean)} options.onFrpMasterChange - вызывается при изменении статуса FRP-мастера
   * @param {function(Map)} options.onNodesChange - вызывается при изменении списка узлов
   */
  start(options = {}) {
    if (this._running) return;

    this._running = true;
    this.onFrpMasterChange = options.onFrpMasterChange || null;
    this.onNodesChange = options.onNodesChange || null;
    this._socket = dgram.createSocket({ type: "udp4", reuseAddr: true });
    this._socket.on("message", (msg, rinfo) => {
      try {
        const data = JSON.parse(msg.toString());

        if (data.type === DISCOVERY_MSG) {
          this._handleDiscoveryMessage(data, rinfo);
        }
      } catch {
        // игнорируем мусорные сообщения
      }
    });
    this._socket.on("error", (err) => {
      logger.error(`${LOGS.discovery.socketErr}${err.message}`);
    });
    this._socket.bind(DISCOVERY_PORT, () => {
      this._socket.setBroadcast(true);
      logger.info(`${LOGS.discovery.port}${DISCOVERY_PORT}`);
      this._broadcast();
      this._heartbeatTimer = setInterval(
        () => this._broadcast(),
        CONFIG.heartbeatInterval,
      );
      this._cleanupTimer = setInterval(
        () => this._cleanupNodes(),
        NODE_TIMEOUT,
      );
      this._masterAnnounceTimer = setInterval(
        () => this._announceMaster(),
        CONFIG.masterAnnounceInterval,
      );
    });
    return this;
  }

  stop() {
    this._running = false;

    if (this._heartbeatTimer) clearInterval(this._heartbeatTimer);
    if (this._cleanupTimer) clearInterval(this._cleanupTimer);
    if (this._masterAnnounceTimer) clearInterval(this._masterAnnounceTimer);
    if (this._socket) {
      try {
        this._socket.close();
      } catch {}
    }
    this._socket = null;
    this.nodes.clear();
  }

  getNodes() {
    const list = Array.from(this.nodes.values());
    list.sort((a, b) => {
      if (a.frpMaster) return -1;
      if (b.frpMaster) return 1;
      return a.hostname.localeCompare(b.hostname);
    });
    return list;
  }

  getFrpMasterIp() {
    return this.frpMasterIp;
  }

  getIsFrpMaster() {
    return this.isFrpMaster;
  }

  _broadcast() {
    if (!this._socket) return;

    const message = JSON.stringify({
      type: DISCOVERY_MSG,
      ip: this._myIp,
      hostname: this._myHostname,
      frpMaster: this.isFrpMaster,
      port: CONFIG.serverPort,
      timestamp: Date.now(),
    });
    const broadcastAddr = this._getBroadcastAddr();

    if (broadcastAddr) {
      try {
        this._socket.send(message, DISCOVERY_PORT, broadcastAddr);
      } catch {}
    }
  }

  _handleDiscoveryMessage(data, rinfo) {
    const ip = data.ip || rinfo.address;
    const now = Date.now();
    const existing = this.nodes.get(ip);
    this.nodes.set(ip, {
      hostname: data.hostname || ip,
      ip,
      frpMaster: !!data.frpMaster,
      lastSeen: now,
      port: data.port || CONFIG.serverPort,
    });

    if (data.frpMaster && ip !== this._myIp) {
      const oldMaster = this.frpMasterIp;
      this.frpMasterIp = ip;

      if (this.isFrpMaster && ip !== this._myIp) {
        this.isFrpMaster = false;
        logger.info(`${LOGS.discovery.findPriory}${ip} (${data.hostname})`);

        if (this.onFrpMasterChange) this.onFrpMasterChange(false);
      }

      if (oldMaster !== ip) {
        logger.info(`${LOGS.discovery.master}${ip} (${data.hostname})`);
      }
    }

    if (this.onNodesChange) {
      this.onNodesChange(new Map(this.nodes));
    }
  }

  _cleanupNodes() {
    const now = Date.now();
    let removed = false;
    let masterRemoved = false;

    for (const [ip, info] of this.nodes) {
      if (now - info.lastSeen > NODE_TIMEOUT) {
        if (info.frpMaster) {
          masterRemoved = true;
        }
        this.nodes.delete(ip);
        removed = true;
        logger.info(
          `${LOGS.discovery.node}${ip} (${info.hostname})${LOGS.discovery.offed}`,
        );
      }
    }

    if (masterRemoved) {
      logger.info(`${LOGS.discovery.findMaster}`);
      this._electMaster();
    }

    if (removed && this.onNodesChange) {
      this.onNodesChange(new Map(this.nodes));
    }
  }

  _announceMaster() {
    if (this.isFrpMaster) {
      this._broadcast();
    }
  }

  _electMaster() {
    if (this.nodes.size === 0) {
      this._becomeMaster();
      return;
    }
    const candidates = Array.from(this.nodes.keys());

    if (!candidates.includes(this._myIp)) {
      candidates.push(this._myIp);
    }
    candidates.sort();
    const electedIp = candidates[0];
    const iAmMaster = electedIp === this._myIp;

    if (iAmMaster !== this.isFrpMaster) {
      this.isFrpMaster = iAmMaster;
      this.frpMasterIp = iAmMaster ? this._myIp : electedIp;
      logger.info(
        iAmMaster
          ? LOGS.discovery.iAmMaster
          : `${LOGS.discovery.newMaster}${electedIp}`,
      );

      if (this.onFrpMasterChange) this.onFrpMasterChange(this.isFrpMaster);
      this._broadcast();
    }
  }

  _becomeMaster() {
    if (!this.isFrpMaster) {
      this.isFrpMaster = true;
      this.frpMasterIp = this._myIp;
      logger.info(`${LOGS.discovery.iFirst}`);

      if (this.onFrpMasterChange) this.onFrpMasterChange(true);
      this._broadcast();
    }
  }

  _getLocalIP() {
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

  _getBroadcastAddr() {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
      for (const iface of interfaces[name]) {
        if (iface.family === "IPv4" && !iface.internal) {
          const ipParts = iface.address.split(".").map(Number);
          const maskParts = iface.netmask.split(".").map(Number);
          const broadcast = ipParts.map(
            (octet, i) => octet | (~maskParts[i] & 255),
          );
          return broadcast.join(".");
        }
      }
    }
    return "255.255.255.255";
  }
}
