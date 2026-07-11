import fs from "fs/promises";
import { exec } from "child_process";
import { promisify } from "util";
import os from "os";

import { logger } from "#utils/logger";
import { CONFIG } from "#config";
import { LOGS, PATHS, getWordsWithNumsCompletion } from "#consts";

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
    this.sessionLimit = null;
    this.breakDuration = null;
    this.sessionStartTime = null;
    this.breakStartTime = null;
    this.delayShutdownTime = null;
    this.isOnBreak = false;
    this.delayShutdownCancelled = false;
    this.sessionWarningsSent = new Set();
    this.pendingUnlockAfterBreak = false;

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

  logWithTime(minutes) {
    const rounded = Math.round(minutes);
    if (rounded < 60)
      return `${rounded} ${LOGS.base.minute}${getWordsWithNumsCompletion(rounded)}`;

    const mins = rounded % 60;
    const hrs = (rounded - mins) / 60;
    return `${hrs} ${LOGS.base.hour}${getWordsWithNumsCompletion(hrs, ["", "а", "ов"])} ${mins} ${LOGS.base.minute}${getWordsWithNumsCompletion(mins)}`;
  }

  resetUsedTime() {
    this.startTime = new Date();
    this.isLocked = false;
    this.sessionStartTime = null;
    this.breakStartTime = null;
    this.isOnBreak = false;
    this.pendingUnlockAfterBreak = false;
    this.isLocked = false;
    this.saveState();
    logger.info(LOGS.control.resetStartTime);
  }

  timeHandler(time) {
    if (!time) return new Date();
    const savedTime = new Date(time);
    const currentDate = new Date();
    if (
      savedTime.getDate() === currentDate.getDate() &&
      savedTime.getMonth() === currentDate.getMonth() &&
      savedTime.getFullYear() === currentDate.getFullYear()
    ) {
      return savedTime;
    } else {
      return new Date();
    }
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
        this.startTime = this.timeHandler(state.startTime);
      }
      if (state.sessionLimit !== undefined) {
        this.sessionLimit = state.sessionLimit;
      }
      if (state.breakDuration !== undefined) {
        this.breakDuration = state.breakDuration;
      }
      if (state.sessionStartTime) {
        this.sessionStartTime = this.timeHandler(state.sessionStartTime);
      }
      if (state.breakStartTime) {
        this.breakStartTime = this.timeHandler(state.breakStartTime);
      }
      if (state.isOnBreak !== undefined) {
        this.isOnBreak = state.isOnBreak;
      }
      if (state.pendingUnlockAfterBreak !== undefined) {
        this.pendingUnlockAfterBreak = state.pendingUnlockAfterBreak;
      }
      if (state.delayShutdownTime !== undefined) {
        this.delayShutdownTime = state.delayShutdownTime;
        const times = state.delayShutdownTime.split(":");
        const delayShutdownTime = new Date();
        delayShutdownTime.setHours(+times[0], +times[1], 0, 0);
        const delay = delayShutdownTime - new Date();
        const seconds = delay / 1000;
        if (seconds > 0) this.shutdownPC(seconds, true);
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
        sessionLimit: this.sessionLimit,
        breakDuration: this.breakDuration,
        sessionStartTime: this.sessionStartTime?.toISOString(),
        breakStartTime: this.breakStartTime?.toISOString(),
        isOnBreak: this.isOnBreak,
        pendingUnlockAfterBreak: this.pendingUnlockAfterBreak,
        delayShutdownTime: this.delayShutdownTime,
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

  setShutdownTime(time) {
    this.delayShutdownTime = time;
    this.saveState();
  }

  async shutdownPC(seconds = 60, withoutReset = false) {
    try {
      if (seconds > 60) {
        if (!withoutReset) this.cancelShutdown(false);
        this.delayShutdownCancelled = false;
      }

      if (this.isShuttingDown) return;
      this.isShuttingDown = true;

      if (process.platform === "win32") {
        exec(PATHS.commands.shutdownWin(Math.round(seconds)));
        const logTime =
          seconds < 60
            ? `${seconds}${LOGS.base.second}${getWordsWithNumsCompletion(seconds)}`
            : this.logWithTime(seconds / 60);
        logger.info(`${LOGS.control.shutdownTimeout} ${logTime}`);
      } else {
        exec(PATHS.commands.shutdown(Math.ceil(seconds / 60)));
        logger.info(
          `${LOGS.control.shutdownTimeout} ${this.logWithTime(seconds / 60)}`,
        );
      }
    } catch (err) {
      logger.error(`${LOGS.control.shutdownError}: ${err.message}`);
      this.isShuttingDown = false;
    }
  }

  cancelShutdown(needLogs = true) {
    try {
      if (process.platform === "win32") {
        exec(PATHS.commands.shutdownAbort);
        this.isShuttingDown = false;

        if (this.delayShutdownTime) this.delayShutdownCancelled = true;
        if (needLogs) logger.info(LOGS.control.shutdownAbort);
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
    this.startTime = this.timeHandler(this.startTime);
    this.warningsSent.clear();
    this.saveState();
    logger.info(`${LOGS.control.limit}: ${this.logWithTime(minutes)}`);
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

      if ((minRemaining === null || diff < minRemaining) && diff >= 0) {
        minRemaining = diff;
      }
    }

    if (this.sessionLimit) {
      const usageMinutes = (now - this.sessionStartTime) / 60000;
      const diff = this.sessionLimit - usageMinutes;

      if ((minRemaining === null || diff < minRemaining) && diff >= 0) {
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

          if (this.isOnBreak && !this.pendingUnlockAfterBreak) {
            const breakRemaining = this.getBreakTimeRemaining();
            const remainingMsg =
              breakRemaining !== null
                ? `${LOGS.control.remain} ${this.logWithTime(breakRemaining)}`
                : LOGS.control.isOnBreak;
            this.showMessage(
              `${LOGS.control.pauseNotEnd} (${remainingMsg})`,
              LOGS.control.accessDenied,
            );
            logger.warn(
              `${LOGS.control.tryBreakUnlock} ${this.logWithTime(breakRemaining)})`,
            );
            await this.lockPC();
            return;
          }

          if (this.pendingUnlockAfterBreak) {
            this.endBreak();
            this.pendingUnlockAfterBreak = false;
            logger.info(
              `${LOGS.control.newSession} ${LOGS.control.afterPause}`,
            );
          }
        } else if (!this.isLocked && actualLocked) {
          logger.info(LOGS.control.lock);
          this.isLocked = true;
        }
        if (!this.isLocked) {
          await this.checkLimitsAndWarnings();
        }
        if (this.isLocked && this.isOnBreak) {
          await this.checkBreakEnd();
        }
      } catch (err) {
        logger.error(`${LOGS.control.monitError} ${err.message}`);
      }
    }, CONFIG.checkInterval * 1000);

    logger.info(LOGS.control.monitStart);
  }

  async checkLimitsAndWarnings() {
    if (!this.shouldMonitorUser() || this.isLocked) return;
    if (this.isOnBreak && this.pendingUnlockAfterBreak) return;

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
          `${LOGS.control.useLimit} ${this.logWithTime(this.usageLimit)}`,
        );
        this.showMessage(
          `${LOGS.control.useLimit} ${this.logWithTime(this.usageLimit)}`,
        );
        await this.lockPC();
        return;
      }
    }

    if (!this.isOnBreak) {
      const sessionBlocked = await this.checkSessionLimit();
      if (sessionBlocked) return;
    } else {
      await this.checkBreakEnd();
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

  setSessionLimit(minutes) {
    if (minutes <= 0) throw new Error(LOGS.control.positiveSession);

    this.sessionLimit = minutes;
    this.sessionStartTime = this.timeHandler(this.sessionStartTime);
    this.sessionWarningsSent.clear();
    this.isOnBreak = false;
    this.breakStartTime = null;
    this.pendingUnlockAfterBreak = false;
    this.saveState();
    logger.info(`${LOGS.control.setSessionLimit} ${this.logWithTime(minutes)}`);
  }

  setBreakDuration(minutes) {
    if (minutes !== null && minutes < 0) {
      throw new Error(LOGS.control.positiveSleep);
    }
    this.breakDuration = minutes;
    this.saveState();
    logger.info(
      `${LOGS.control.setSleepTime} ${minutes ? `${this.logWithTime(minutes)}` : LOGS.control.sleepEqualSession}`,
    );
  }

  getEffectiveBreakDuration() {
    return this.breakDuration !== null ? this.breakDuration : this.sessionLimit;
  }

  getSessionUsageMinutes() {
    if (!this.sessionStartTime) return 0;
    return (Date.now() - this.sessionStartTime.getTime()) / 60000;
  }

  getSessionTimeRemaining() {
    if (!this.sessionLimit || !this.sessionStartTime) return null;
    if (this.isOnBreak) return null;
    const used = this.getSessionUsageMinutes();
    const remaining = this.sessionLimit - used;
    return remaining > 0 ? remaining : 0;
  }

  getBreakTimeRemaining() {
    if (!this.isOnBreak || !this.breakStartTime) return null;

    const breakDuration = this.getEffectiveBreakDuration();
    if (!breakDuration) return null;

    const elapsed = (Date.now() - this.breakStartTime.getTime()) / 60000;
    const remaining = breakDuration - elapsed;
    return remaining > 0 ? remaining : 0;
  }

  startBreak() {
    const breakDuration = this.getEffectiveBreakDuration();
    const log = `${LOGS.control.sleep} ${this.logWithTime(breakDuration)}`;
    logger.info(log);
    /*  const msg = `⏸️ ${log}. ${LOGS.control.pcWillLock}`;
    this.showMessage(msg, LOGS.control.sleep); */
    this.isOnBreak = true;
    this.breakStartTime = new Date();
    this.pendingUnlockAfterBreak = false;
    this.saveState();
  }

  endBreak() {
    this.isOnBreak = false;
    this.breakStartTime = null;
    this.pendingUnlockAfterBreak = false;
    this.sessionStartTime = new Date();
    this.sessionWarningsSent.clear();
    logger.info(LOGS.control.handleEnd);
    this.saveState();
    this.showMessage(
      `🎯 ${LOGS.control.newSession}! ${this.logWithTime(this.sessionLimit)}.`,
      LOGS.control.newSession,
    );
  }

  async checkSessionLimit() {
    if (!this.sessionLimit || this.isOnBreak || this.isLocked) return false;

    if (!this.sessionStartTime) {
      this.sessionStartTime = new Date();
      this.saveState();
      return false;
    }
    const remaining = this.getSessionTimeRemaining();

    if (remaining !== null && remaining <= 0) {
      const breakDuration = this.getEffectiveBreakDuration();
      logger.info(
        `${LOGS.control.sessionEnd} (${this.logWithTime(this.sessionLimit)})`,
      );
      this.showMessage(
        `⏰ ${LOGS.control.sessionEnd}! ${LOGS.control.sleep} ${this.logWithTime(breakDuration)}.`,
      );
      this.startBreak();
      await this.lockPC();
      return true;
    }

    if (remaining !== null && remaining > 0) {
      const warningIntervals = CONFIG.warningIntervals.slice(1);
      for (const interval of warningIntervals) {
        const key = `session_${interval}`;
        if (remaining <= interval && !this.sessionWarningsSent.has(key)) {
          this.sessionWarningsSent.add(key);
          this.showMessage(
            `⚠️ ${LOGS.control.toSessionEnd} ${this.logWithTime(remaining)}`,
          );
          logger.info(
            `${LOGS.control.warn}: ${this.logWithTime(remaining)} ${LOGS.control.toSessionEnd}`,
          );
        }
      }
    }
    return false;
  }

  async checkBreakEnd() {
    if (!this.isOnBreak) return false;

    const remaining = this.getBreakTimeRemaining();

    if (remaining !== null && remaining <= 0) {
      if (!this.pendingUnlockAfterBreak) {
        this.pendingUnlockAfterBreak = true;
        logger.info(LOGS.control.endSleepTime);
      }
      return true;
    }

    if (!this.isLocked && this.v) {
      logger.warn(LOGS.control.isOnBreakDebug);
      this.showMessage(
        `${LOGS.control.pauseNotEnd} ${LOGS.control.remain} ${this.logWithTime(remaining)}.`,
        LOGS.control.accessDenied,
      );
      await this.lockPC();
    }
    return false;
  }

  canUnlock() {
    return this.isOnBreak && this.pendingUnlockAfterBreak;
  }

  isBreak() {
    return this.isOnBreak;
  }

  getUnlockBlockReason() {
    if (!this.isOnBreak) return null;
    if (this.pendingUnlockAfterBreak) return null;

    const remaining = this.getBreakTimeRemaining();
    if (remaining !== null && remaining > 0) {
      return `⛔ ${LOGS.control.sleep}! ${LOGS.control.remain} ${this.logWithTime(remaining)}.`;
    }
    return `⛔ ${LOGS.control.sleep}`;
  }

  async handleUnlockAttempt() {
    if (!this.isOnBreak) return false;

    this.isOnBreak = false;
    this.breakStartTime = null;
    this.pendingUnlockAfterBreak = false;
    this.sessionStartTime = null;
    this.saveState();
    this.sessionWarningsSent.clear();
    logger.info(LOGS.control.endSleepTime);
    return true;
  }

  stop() {
    if (this.monitorInterval) {
      clearInterval(this.monitorInterval);
      this.monitorInterval = null;
    }
    logger.info(LOGS.control.stop);
  }
}
