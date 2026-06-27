import fs from "fs/promises";
import { exec } from "child_process";
import { promisify } from "util";
import os from "os";

import { logger } from "#utils/logger";
import { CONFIG } from "#config";
import { LOGS, PATHS } from "#consts";

const execPromise = promisify(exec);

export class PCTimeControl {
  constructor() {
    this.lockTimes = [];
    this.usageLimit = null;
    this.startTime = new Date();
    this.isLocked = false;
    this.currentUser = os.userInfo().username;
    this.warningsSent = new Set();
    this.monitorInterval = null;
    this.stateLoaded = false;
    this.isShuttingDown = false;

    logger.info(`${LOGS.control.init}: ${this.currentUser}`);

    if (this.shouldMonitorUser()) {
      logger.info(`${LOGS.control.monit}: ${this.currentUser}`);
    } else {
      logger.info(
        `${LOGS.base.user} ${this.currentUser} ${LOGS.control.unmonit}`,
      );
    }

    this.loadState()
      .then(() => {
        this.stateLoaded = true;
        this.startMonitoring();
      })
      .catch((err) => {
        logger.error(`${LOGS.control.stateLoadError} ${err.message}`);
        this.startMonitoring();
      });
  }

  shouldMonitorUser() {
    if (CONFIG.monitoredUsers.length > 0) {
      return CONFIG.monitoredUsers.includes(this.currentUser);
    }
    if (CONFIG.exemptUsers.length > 0) {
      return !CONFIG.exemptUsers.includes(this.currentUser);
    }
    return true;
  }

  async loadState() {
    try {
      const data = await fs.readFile(CONFIG.stateFile, "utf-8");
      const state = JSON.parse(data);

      if (state.lockTimes) {
        this.lockTimes = state.lockTimes.map((t) => {
          const [h, m] = t.split(":").map(Number);
          return { hour: h, minute: m };
        });
      }

      if (state.usageLimit !== undefined) {
        this.usageLimit = state.usageLimit;
      }

      if (state.startTime) {
        const savedStart = new Date(state.startTime);
        const currentDate = new Date();
        if (
          savedStart.getDate() === currentDate.getDate() &&
          savedStart.getMonth() === currentDate.getMonth() &&
          savedStart.getFullYear() === currentDate.getFullYear()
        ) {
          this.startTime = savedStart;
        } else {
          this.startTime = new Date();
          logger.info(LOGS.control.newDayReset);
        }
      }

      logger.info(
        `${LOGS.control.stateLoaded}: ${this.lockTimes.length} ${LOGS.control.stateStats} ${this.usageLimit}`,
      );
    } catch (err) {
      if (err.code !== "ENOENT") {
        logger.error(`${LOGS.control.stateLoadError}: ${err.message}`);
      }
    }
  }

  async saveState() {
    try {
      const state = {
        lockTimes: this.lockTimes.map(
          (t) => `${t.hour}:${String(t.minute).padStart(2, "0")}`,
        ),
        usageLimit: this.usageLimit,
        startTime: this.startTime.toISOString(),
        currentUser: this.currentUser,
      };

      await fs.writeFile(CONFIG.stateFile, JSON.stringify(state, null, 2));
      logger.info(LOGS.control.stateSaved);
    } catch (err) {
      logger.error(`${LOGS.control.stateSavedError}: ${err.message}`);
    }
  }

  async checkIfLocked() {
    try {
      if (process.platform === "win32") {
        const { stdout } = await execPromise(PATHS.commands.logon);
        return stdout.includes("LogonUI.exe");
      }
      // Для Linux/macOS можно реализовать через другие команды
      return false;
    } catch (err) {
      logger.error(`${LOGS.control.getStateError}: ${err.message}`);
      return false;
    }
  }

  async lockPC() {
    try {
      if (process.platform === "win32") {
        this.isLocked = true;
        exec(PATHS.commands.lock);
        logger.info(LOGS.control.lock);
      } else {
        logger.warn(LOGS.control.noWinLock);
      }
    } catch (err) {
      logger.error(`${LOGS.control.lockError} ${err.message}`);
    }
  }

  async shutdownPC(seconds = 60) {
    try {
      if (this.isShuttingDown) return;
      this.isShuttingDown = true;

      if (process.platform === "win32") {
        exec(PATHS.commands.shutdownWin(seconds));
        logger.info(
          `${LOGS.control.shutdownTimeout} (${seconds}${LOGS.control.shutdownTimeout})`,
        );
      } else {
        exec(PATHS.commands.shutdown(Math.ceil(seconds / 60)));
        logger.info(
          `${LOGS.control.shutdownTimeout} (${seconds}${LOGS.control.shutdownTimeout})`,
        );
      }
    } catch (err) {
      logger.error(`${LOGS.control.shutdownError}: ${err.message}`);
      this.isShuttingDown = false;
    }
  }

  cancelShutdown() {
    try {
      if (process.platform === "win32") {
        exec(PATHS.commands.shutdownAbort);
        this.isShuttingDown = false;
        logger.info(LOGS.control.shutdownAbort);
      }
    } catch (err) {
      logger.error(`${LOGS.control.shutdownAbortError}: ${err.message}`);
    }
  }

  showMessage(message, title = CONFIG.msgTitle) {
    try {
      if (process.platform === "win32") {
        const escapedMessage = message.replace(/"/g, '`"');
        const cmd = PATHS.commands.sendMess(
          escapedMessage,
          title,
          LOGS.base.msgButtonText,
        );
        exec(cmd, { windowsHide: true });
      } else {
        console.log(`\n${"=".repeat(50)}`);
        console.log(`⚠️ ${title}: ${message}`);
        console.log(`${"=".repeat(50)}\n`);
      }
    } catch (err) {
      logger.error(`${LOGS.control.showMessageError} ${err.message}`);
    }
  }

  addScheduledLock(hour, minute) {
    if (hour < 0 || hour > 23 || minute < 0 || minute > 59) {
      throw new Error(LOGS.control.badTime);
    }
    this.lockTimes.push({ hour, minute });
    this.lockTimes.sort((a, b) => a.hour - b.hour || a.minute - b.minute);
    this.saveState();
    logger.info(
      `${LOGS.control.lockTimeout}: ${hour}:${String(minute).padStart(2, "0")}`,
    );
  }

  setUsageLimit(minutes) {
    if (minutes <= 0) throw new Error(LOGS.control.positiveTime);

    this.usageLimit = minutes;
    this.startTime = new Date();
    this.warningsSent.clear();
    this.saveState();
    logger.info(`${LOGS.control.limit}: ${minutes} ${LOGS.base.minute}`);
  }

  getTimeRemaining() {
    if (!this.shouldMonitorUser()) return null;

    const now = new Date();
    let minRemaining = null;
    const nowMinutes = now.getHours() * 60 + now.getMinutes();

    for (const lock of this.lockTimes) {
      const lockMinutes = lock.hour * 60 + lock.minute;
      let diff = lockMinutes - nowMinutes;
      if (diff <= 0) diff += 1440;

      if (minRemaining === null || diff < minRemaining) {
        minRemaining = diff;
      }
    }

    if (this.usageLimit) {
      const usageMinutes = (now - this.startTime) / 60000;
      const diff = this.usageLimit - usageMinutes;

      if (minRemaining === null || diff < minRemaining) {
        minRemaining = diff;
      }
    }
    return minRemaining;
  }

  startMonitoring() {
    if (this.monitorInterval) {
      clearInterval(this.monitorInterval);
    }

    this.monitorInterval = setInterval(async () => {
      try {
        const actualLocked = await this.checkIfLocked();

        if (this.isLocked && !actualLocked) {
          this.isLocked = false;
          logger.info(LOGS.control.unlock);
        } else if (!this.isLocked && actualLocked) {
          this.isLocked = true;
          logger.info(LOGS.control.lock);
        }
        await this.checkLimitsAndWarnings();
      } catch (err) {
        logger.error(`${LOGS.control.monitError} ${err.message}`);
      }
    }, CONFIG.checkInterval * 1000);

    logger.info(LOGS.control.monitStart);
  }

  async checkLimitsAndWarnings() {
    if (!this.shouldMonitorUser() || this.isLocked) return;

    const now = new Date();

    for (const lock of this.lockTimes) {
      if (
        now.getHours() === lock.hour &&
        now.getMinutes() === lock.minute &&
        now.getSeconds() < 2
      ) {
        logger.info(
          `${LOGS.control.remoteLock}: ${lock.hour}:${String(lock.minute).padStart(2, "0")}`,
        );
        await this.lockPC();
        return;
      }
    }

    if (this.usageLimit) {
      const usageMinutes = (now - this.startTime) / 60000;
      if (usageMinutes >= this.usageLimit) {
        logger.info(
          `${LOGS.control.useLimit} ${this.usageLimit} ${LOGS.base.minute}`,
        );
        this.showMessage(
          `${LOGS.control.useLimit} ${this.usageLimit} ${LOGS.base.minute}`,
        );
        await this.lockPC();
        return;
      }
    }
    const timeRemaining = this.getTimeRemaining();

    if (timeRemaining !== null && timeRemaining > 0) {
      for (const interval of CONFIG.warningIntervals) {
        const usageMinutes = (now - this.startTime) / 60000;

        if (this.usageLimit < interval) continue;
        const key = `${interval}min`;

        if (timeRemaining <= interval && !this.warningsSent.has(key)) {
          this.warningsSent.add(key);
          const msg = LOGS.control.lockMessageTimeout(interval);
          this.showMessage(msg, "Warning");
          logger.info(
            `${LOGS.control.sendWarn} ${LOGS.control.lockMessageTimeout(interval)}`,
          );
        }
      }
    }
  }

  stop() {
    if (this.monitorInterval) {
      clearInterval(this.monitorInterval);
      this.monitorInterval = null;
    }
    logger.info(LOGS.control.stop);
  }
}
