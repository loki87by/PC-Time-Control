import net from "net";

import { CONFIG } from "#config";
import { LOGS } from "#consts";
import { logger } from "#utils/logger";

export class PCClient {
  constructor(ip, timeout = 2000) {
    this.ip = ip;
    this.timeout = timeout;
  }

  async send(command, parseResponse = true) {
    return new Promise((resolve) => {
      const socket = new net.Socket();
      let responseData = "";
      let resolved = false;

      socket.setTimeout(this.timeout);

      const cleanup = () => {
        if (!resolved) {
          resolved = true;
          socket.removeAllListeners();
          socket.destroy();
        }
      };

      socket.on("connect", () => {
        socket.write(command + "\n");
      });

      socket.on("data", (data) => {
        responseData += data.toString();
        if (responseData.endsWith("\n")) {
          cleanup();
          const trimmed = responseData.trim();
          resolve(
            parseResponse
              ? this.parseResponse(trimmed)
              : {
                  success: trimmed.startsWith("OK:"),
                  response: trimmed.startsWith("OK:")
                    ? trimmed.substring(3).trim()
                    : trimmed,
                },
          );
        }
      });

      socket.on("error", (err) => {
        cleanup();
        resolve({ success: false, response: err.message });
      });

      socket.on("timeout", () => {
        cleanup();
        resolve({ success: false, response: "Timeout" });
      });

      socket.connect(CONFIG.serverPort, this.ip);
    });
  }

  parseResponse(data) {
    if (!data.startsWith("OK:")) {
      return { success: false, response: data };
    }
    const value = data.substring(3).trim();
    return { success: true, response: value };
  }

  async getPCName() {
    const result = await this.send("GET_NAME");
    return result.success ? result.response : null;
  }

  async getStatus() {
    const result = await this.send("GET_STATUS");
    return result.success ? result.response : "UNKNOWN";
  }

  async getCurrentUser() {
    const result = await this.send("GET_CURRENT_USER");
    return result.success ? result.response : null;
  }

  async getUsageLimit() {
    const result = await this.send("GET_USAGE_LIMIT");
    return result.success ? parseInt(result.response) || null : null;
  }

  async getLockTimes() {
    const result = await this.send("GET_LOCK_TIMES");
    if (!result.success || result.response === "None") return null;
    return result.response.split(",").map((s) => s.trim());
  }

  async getTimeRemaining() {
    const result = await this.send("GET_TIME_REMAINING");
    return result.success ? result.response : null;
  }

  async lock() {
    return this.send("LOCK", false);
  }

  async shutdown() {
    return this.send("SHUTDOWN", false);
  }

  async sendMessage(message) {
    return this.send(`MESSAGE:${message || ""}`, false);
  }

  async setLimit(minutes) {
    return this.send(`SET_LIMIT:${minutes || 120}`, false);
  }

  async addLockTime(time) {
    return this.send(`ADD_LOCK_TIME:${time || "21:00"}`, false);
  }

  async clearUsageLimit() {
    return this.send("CLEAR_USAGE_LIMIT", false);
  }

  async clearLockTimes() {
    return this.send("CLEAR_LOCK_TIMES", false);
  }

  async clearAll() {
    return this.send("CLEAR_ALL", false);
  }

  static async ping(ip, port, timeout = 500) {
    return new Promise((resolve) => {
      const socket = new net.Socket();
      socket.setTimeout(timeout);
      socket.on("connect", () => {
        socket.destroy();
        resolve(true);
      });
      socket.on("error", () => resolve(false));
      socket.on("timeout", () => {
        socket.destroy();
        resolve(false);
      });
      socket.connect(port, ip);
    });
  }
}
