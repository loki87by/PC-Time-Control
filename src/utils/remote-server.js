import net from "net";
import os from "os";

import { logger } from "#utils/logger";
import { CONFIG } from "#config";
import { LOGS, getWordsWithNumsCompletion } from "#consts";

export class RemoteControlServer {
  constructor(pcControl) {
    this.pcControl = pcControl;
    this.port = CONFIG.serverPort;
    this.timeout = CONFIG.socketTimeout;
    this.server = null;
    this.running = false;
    this.clients = new Map();
    this.clientIdCounter = 0;
  }

  logWithTime(minutes) {
    const rounded = Math.round(minutes);
    if (rounded < 60)
      return `${rounded} ${LOGS.base.minute}${getWordsWithNumsCompletion(rounded)}`;

    const mins = rounded % 60;
    const hrs = (rounded - mins) / 60;
    return `${hrs} ${LOGS.base.hour}${getWordsWithNumsCompletion(hrs, ["", "а", "ов"])} ${mins} ${LOGS.base.minute}${getWordsWithNumsCompletion(mins)}`;
  }

  start() {
    return new Promise((resolve, reject) => {
      try {
        this.server = net.createServer((socket) => {
          this.handleClient(socket);
        });

        this.server.on("error", (err) => {
          if (err.code === "EADDRINUSE") {
            const error = LOGS.base.usedPort(this.port);
            logger.error(error);
            reject(new Error(error));
          } else {
            reject(err);
          }
        });

        this.server.listen(this.port, "0.0.0.0", () => {
          this.running = true;
          logger.info(`${LOGS.base.remoteStarted} ${this.port}`);
          resolve();
        });
      } catch (err) {
        reject(err);
      }
    });
  }

  handleClient(socket) {
    const clientId = this.clientIdCounter++;
    const clientAddress = socket.remoteAddress;
    logger.info(`${LOGS.remote.connect}: ${clientAddress} (ID: ${clientId})`);
    socket.setTimeout(this.timeout * 1000);
    this.clients.set(clientId, { socket, address: clientAddress });

    let buffer = "";
    socket.on("data", (data) => {
      buffer += data.toString();
      const commands = buffer.split("\n");
      buffer = commands.pop() || ""; // Оставляем последнюю неполную команду

      for (const cmd of commands) {
        const trimmed = cmd.trim();
        if (trimmed) {
          this.processCommand(trimmed, socket, clientId);
        }
      }
    });

    socket.on("timeout", () => {
      try {
        socket.write("ALIVE\n");
      } catch (err) {
        // Игнорируем
      }
    });

    socket.on("error", (err) => {
      logger.error(`$${LOGS.remote.wsErr} (ID: ${clientId}): ${err.message}`);
    });

    socket.on("close", () => {
      this.clients.delete(clientId);
      logger.info(
        `${LOGS.base.client}: ${clientAddress} (ID: ${clientId}) ${LOGS.remote.disconnect}`,
      );
    });
  }

  async processCommand(command, socket, clientId) {
    logger.info(`${LOGS.remote.command} ${clientId}: ${command}`);
    let response = "";

    try {
      switch (command.toUpperCase()) {
        case "CAN_UNLOCK":
          const isBreak = this.pcControl.isBreak();
          const reason = this.pcControl.getUnlockBlockReason();
          response = `OK: ${LOGS.remote.isBreak}=${isBreak}, ${LOGS.remote.state}: ${reason || LOGS.remote.undefined}\n`;
          break;
        case "HANDLE_UNLOCK":
          await this.pcControl.handleUnlockAttempt();
          response = `OK: ${LOGS.remote.resetBreak}\n`;
          break;
        case "END_BREAK":
          if (this.pcControl.isOnBreak) {
            this.pcControl.endBreak();
            this.pcControl.isLocked = false;
            response = `OK: ${LOGS.remote.endBreak}\n`;
          } else {
            response = `ERROR: ${LOGS.remote.notOnBreak}\n`;
          }
          break;
        case "RESET_USAGE":
          this.pcControl.resetUsedTime();
          response = `OK: ${LOGS.control.resetUsedTime}\n`;
          break;
        case "RESET_SESSION":
          this.pcControl.resetSessionTime();
          response = `OK: ${LOGS.control.resetSessionTime}\n`;
          break;
        case "LOCK":
          this.pcControl.lockPC();
          response = `OK: ${LOGS.remote.lock}\n`;
          break;
        case "SHUTDOWN":
          this.pcControl.shutdownPC();
          response = `OK: ${LOGS.remote.shutdown}\n`;
          break;
        case "SHUTDOWN_NOW":
          this.pcControl.shutdownPC(10);
          response = `OK: ${LOGS.remote.shutdownDelay}\n`;
          break;
        case "CANCEL_SHUTDOWN":
          this.pcControl.cancelShutdown();
          response = `OK: ${LOGS.remote.shutdownAbort}\n`;
          break;
        case "GET_NAME":
          response = `OK: ${os.hostname()}\n`;
          break;
        case "GET_CURRENT_USER":
          response = `OK: ${this.pcControl.currentUser}\n`;
          break;
        case "GET_STATUS":
          const locked = this.pcControl.isLocked;
          response = `OK: ${locked ? LOGS.remote.lock_m : LOGS.remote.unlock_m}\n`;
          break;
        case "GET_USAGE_LIMIT":
          response = `OK: ${this.pcControl.usageLimit || LOGS.remote.unlimit}\n`;
          break;
        case "GET_SESSION_LIMIT":
          response = `OK: ${this.pcControl.sessionLimit || LOGS.remote.unlimit}\n`;
          break;
        case "GET_SESSION_BREAK":
          response = `OK: ${this.pcControl.breakDuration || LOGS.remote.unlimit}\n`;
          break;
        case "GET_LOCK_TIMES":
          const times = this.pcControl.lockTimes.map(
            (t) =>
              `${String(t.hour).padStart(2, "0")}:${String(t.minute).padStart(2, "0")}`,
          );
          response = `OK: ${times.join(",") || LOGS.remote.lockTimes}\n`;
          break;
        case "GET_TIME_REMAINING":
          const remaining = this.pcControl.getTimeRemaining();
          response = `OK: ${remaining !== null ? `${this.logWithTime(remaining)}` : LOGS.remote.unlimit}\n`;
          break;
        case "GET_USAGE_TIME":
          const usageMinutes = (new Date() - this.pcControl.startTime) / 60000;
          response = `OK: ${this.logWithTime(usageMinutes)}\n`;
          break;
        case "GET_SESSION_TIME":
          const sessionUsageMinutes = this.pcControl.sessionStartTime
            ? (new Date() - this.pcControl.sessionStartTime) / 60000
            : 0;
          const dailyUsageMinutes =
            (new Date() - this.pcControl.startTime) / 60000;
          response = `OK: ${this.logWithTime(sessionUsageMinutes < dailyUsageMinutes ? sessionUsageMinutes : dailyUsageMinutes)}\n`;
          break;
        case "GET_SHUTDOWN_TIME":
          response = `OK: ${this.pcControl.delayShutdownTime || LOGS.remote.unset}\n`;
          break;
        case "GET_SHUTDOWN_ABORT":
          response = `OK: ${this.pcControl.delayShutdownCancelled}\n`;
          break;
        default:
          if (command.startsWith("SET_SESSION_LIMIT")) {
            const sessionMinutes = parseInt(command.substring(18).trim());
            if (isNaN(sessionMinutes) || sessionMinutes <= 0) {
              response = `ERROR: ${LOGS.remote.invalidLimit}\n`;
            } else {
              this.pcControl.setSessionLimit(sessionMinutes);
              response = `OK: ${LOGS.remote.setSessionLimit} ${this.logWithTime(sessionMinutes)}\n`;
            }
          } else if (command.startsWith("DELAYED_SHUTDOWN")) {
            const delayedShutdown = parseInt(command.substring(17).trim());
            if (isNaN(delayedShutdown) || delayedShutdown <= 0) {
              response = `ERROR: ${LOGS.remote.invalidTime}\n`;
            } else {
              const seconds = delayedShutdown / 1000;
              this.pcControl.shutdownPC(seconds);
              const delayedShutdownTime = new Date(
                Date.now() + delayedShutdown,
              );
              let hrs = delayedShutdownTime.getHours();
              let mins = delayedShutdownTime.getMinutes();
              hrs = `${hrs}`.length === 1 ? `0${hrs}` : `${hrs}` || "00";
              mins = `${mins}`.length === 1 ? `0${mins}` : `${mins}` || "00";
              this.pcControl.setShutdownTime(`${hrs}:${mins}`);
              response = `OK: ${LOGS.remote.setDelayedShutdown} ${hrs}:${mins}\n`;
            }
          } else if (command.startsWith("SET_BREAK_DURATION")) {
            const breakMinutes = command.substring(19).trim();
            if (breakMinutes === "null" || breakMinutes === "") {
              this.pcControl.setBreakDuration(null);
              response = `OK: ${LOGS.remote.setBreakDuration} ${LOGS.remote.setBreakDurationAuto}\n`;
            } else {
              const minutes = parseInt(breakMinutes);
              if (isNaN(minutes) || minutes < 0) {
                response = `ERROR: ${LOGS.remote.setBreakDurationError}\n`;
              } else {
                this.pcControl.setBreakDuration(minutes);
                response = `OK: ${LOGS.remote.setBreakDuration} ${this.logWithTime(minutes)}\n`;
              }
            }
          } else if (command.startsWith("MESSAGE:")) {
            const msg = command.substring(8);
            this.pcControl.showMessage(msg);
            response = `OK: ${LOGS.user.sent.slice(2)}\n`;
          } else if (command.startsWith("SET_LIMIT:")) {
            const minutes = parseInt(command.substring(10));
            if (isNaN(minutes) || minutes <= 0) {
              response = `ERROR: ${LOGS.remote.invalidLimit}\n`;
            } else {
              this.pcControl.setUsageLimit(minutes);
              response = `OK: ${LOGS.remote.setLimit} ${this.logWithTime(minutes)}\n`;
            }
          } else if (command.startsWith("ADD_LOCK_TIME:")) {
            const timeStr = command.substring(14);
            const [hour, minute] = timeStr.split(":").map(Number);
            if (
              isNaN(hour) ||
              isNaN(minute) ||
              hour < 0 ||
              hour > 23 ||
              minute < 0 ||
              minute > 59
            ) {
              response = `ERROR: ${LOGS.remote.badTime}\n`;
            } else {
              this.pcControl.addScheduledLock(hour, minute);
              response = `OK: ${LOGS.remote.addLock}: ${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}\n`;
            }
          } else if (command.startsWith("EXTEND_TIME:")) {
            const minutes = parseInt(command.substring(12));
            if (isNaN(minutes) || minutes <= 0) {
              response = `ERROR: ${LOGS.remote.invalidTime}\n`;
            } else if (this.pcControl.usageLimit === null) {
              response = `ERROR: ${LOGS.remote.noLimitExtend}\n`;
            } else {
              this.pcControl.usageLimit += minutes;
              this.pcControl.saveState();
              response = `OK: ${LOGS.remote.timeExtend} ${this.logWithTime(minutes)}\n`;
            }
          } else if (command === "CLEAR_USAGE_LIMIT") {
            this.pcControl.usageLimit = null;
            this.pcControl.warningsSent.clear();
            this.pcControl.saveState();
            response = `OK: ${LOGS.remote.clearLimit}\n`;
          } else if (command === "CLEAR_LOCK_TIMES") {
            this.pcControl.lockTimes = [];
            this.pcControl.warningsSent.clear();
            this.pcControl.saveState();
            response = `OK: ${LOGS.remote.clearLockTimes}\n`;
          } else if (command === "CLEAR_ALL") {
            this.pcControl.usageLimit = null;
            this.pcControl.lockTimes = [];
            this.pcControl.sessionLimit = null;
            this.pcControl.breakDuration = null;
            this.pcControl.isOnBreak = false;
            this.pcControl.pendingUnlockAfterBreak = false;
            this.pcControl.sessionWarningsSent.clear();
            this.pcControl.warningsSent.clear();
            this.pcControl.delayShutdownTime = null;
            this.pcControl.delayShutdownCancelled = false;
            this.pcControl.saveState();
            response = `OK: ${LOGS.remote.clearAll}\n`;
          } else if (command === "HELP" || command === "?") {
            response = `${LOGS.remote.available}`;
          } else {
            response = `ERROR: ${LOGS.remote.unknown}\n`;
          }
      }
    } catch (err) {
      logger.error(`${LOGS.remote.commandError}: ${err.message}`);
      response = `ERROR: ${err.message}\n`;
    }

    try {
      socket.write(response);
    } catch (err) {
      logger.error(`${LOGS.remote.responseError}: ${err.message}`);
    }
  }

  stop() {
    this.running = false;
    for (const [id, client] of this.clients) {
      try {
        client.socket.destroy();
      } catch (err) {
        logger.error(`${LOGS.remote.disconnectError} ${id}: ${err.message}`);
      }
    }
    this.clients.clear();

    if (this.server) {
      this.server.close();
      this.server = null;
    }
    logger.info(LOGS.remote.stop);
  }
}
