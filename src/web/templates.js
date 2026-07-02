import { COMMON, INDEX, CONTROL } from "#web/styles";
import { LOGS, PATHS, getWordsWithNumsCompletion } from "#consts";

export class Templates {
  static logWithTime(minutes) {
    const rounded = Math.round(minutes);
    if (rounded < 60)
      return `${rounded} ${LOGS.base.minute}${getWordsWithNumsCompletion(rounded)}`;

    const mins = rounded % 60;
    const hrs = (rounded - mins) / 60;
    return `${hrs} ${LOGS.base.hour}${getWordsWithNumsCompletion(hrs, ["", "а", "ов"])} ${mins} ${LOGS.base.minute}${getWordsWithNumsCompletion(mins)}`;
  }

  static index(pcs, lastScanTime, isServerRunning) {
    const pcCards =
      pcs.length > 0
        ? pcs
            .map(
              ([ip, info]) => `
        <div class="pc-card" onclick="location.href='/control?ip=${ip}'">
            <div class="pc-info">
                <div class="pc-name">💻 ${info.hostname}</div>
                <div class="pc-ip">${ip}</div>
                ${info.currentUser ? `<div class="pc-user">👤 ${info.currentUser}</div>` : ""}
            </div>
            <span class="status-badge ${info.locked ? "status-locked" : "status-online"}">
                ${info.locked ? LOGS.user.lock : LOGS.user.online}
            </span>
        </div>`)
            .join("")
        : `<div class="empty-state">
            <span class="emoji">🔍</span>
            <p>${LOGS.user.emptyNetwork}</p>
            <p style="font-size: 14px; margin-top: 10px;">${LOGS.user.emptyNetworkHint}</p>
        </div>
      `;
    return `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${LOGS.user.title}</title>
    <style>
        ${COMMON}
        ${INDEX}
    </style>
    <script>
        ${this.commonScripts()}
        ${this.indexScripts()}
    </script>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>👨‍👩‍👧‍👦 ${LOGS.user.title}</h1>
            <p>${isServerRunning ? LOGS.user.agentsOn : LOGS.user.agentsOff}</p>
        </div>
        <button id="scanBtn" class="scan-btn" onclick="scanNetwork()">${LOGS.user.find}</button>
        <button id="refreshBtn" class="refresh-btn" onclick="refreshStatus()">${LOGS.user.refreshStatus}</button>
        ${pcs.length > 0 ? `<h3 style="color: white; margin: 20px 0 10px; text-align: center">${LOGS.user.available} ${pcs.length}</h3>` : ""}
        ${pcCards}
        <div class="footer">
            ${lastScanTime ? `${LOGS.user.last} ${lastScanTime.toLocaleTimeString()}` : LOGS.user.yet}
        </div>
    </div>
</body>
</html>`;
  }

  static control(ip, info) {
    console.log(info)
    const statusClass = info.locked ? "status-locked" : "status-unlocked";
    const statusText = info.locked ? LOGS.user.lock : LOGS.user.unlock;
    const shutdownAbort = JSON.parse(info.shutdownAbort)
    const lockTimesDisplay =
      info.lockTimes?.length > 0 ? info.lockTimes.join(", ") : LOGS.user.absent;
    const shutdownDisplay =
      info.shutdownTime ? `${info.shutdownTime}${shutdownAbort ? ` (${LOGS.user.cancel})` : ''}` : LOGS.remote.unset;
    const canUnlock = JSON.parse(info.canUnlock.split(',')[0].split('=')[1])
    const timeRemainingDisplay = info.timeRemaining && info.timeRemaining !== LOGS.user.unlimit
      ? `<div class="info-row">
        <span class="info-label">${LOGS.user.timeRemaining}</span>
        <span class="info-value">${info.timeRemaining}</span>
      </div>`
      : "";

    const actionButtons = ` <div class="card">
        <div class="card-title">${LOGS.user.now}</div>
        <button onclick="doAction('lock')" class="btn btn-lock">${LOGS.user.lockNow}</button>
        ${canUnlock ? `<button onclick="doAction('unlock')" class="btn btn-lock">${LOGS.user.unlockNow}</button>` : ""}
        ${canUnlock ? `<button onclick="doAction('end_break')" class="btn btn-lock">${LOGS.user.endBreak}</button>` : ""}
        <button onclick="confirmShutdown()" class="btn btn-shutdown">${LOGS.user.shutdown}</button>
      </div>
    `;

    const sessionBreak =
      info.sessionLimit && info.sessionLimit !== LOGS.user.unlimit
        ? ` <div class="card">
          <div class="card-title">${LOGS.user.setBreak}</div>
          <div class="quick-limits">
            <button class="quick-limit" onclick="setQuickBreak(${info.sessionLimit})">${this.logWithTime(info.sessionLimit)}</button>
            <button class="quick-limit" onclick="setQuickBreak(${info.sessionLimit * 2})">${this.logWithTime(info.sessionLimit * 2)}</button>
            <button class="quick-limit" onclick="setQuickBreak(${info.sessionLimit * 3})">${this.logWithTime(info.sessionLimit * 3)}</button>
            <button class="quick-limit" onclick="setQuickBreak(${info.sessionLimit * 4})">${this.logWithTime(info.sessionLimit * 4)}</button>
          </div>
          <input type="number" id="breakInput" placeholder='${LOGS.user.timePlaceholder}' min="1">
          <button onclick="setBreak()" class="btn btn-success">${LOGS.user.saveLimit}</button>
        </div>
      `
        : "";

    return `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${LOGS.user.control} ${info.hostname}</title>
    <style>
        ${COMMON}
        ${CONTROL}
    </style>
    <script>
        ${this.commonScripts()}
        ${this.controlScripts(ip)}
    </script>
</head>
<body>
    <div class="container">
        <a href="/" class="back-btn">${LOGS.user.back}</a>
        <div class="card pc-header">
            <h1>💻 ${info.hostname}</h1>
            <div class="ip">${ip}</div>
            ${info.currentUser ? `<div class="user">👤 ${info.currentUser}</div>` : ""}
            <span class="status-badge ${statusClass}">${statusText}</span>
            ${info.usageTime ? `<div style="margin-top: 5px;" class="ip">${LOGS.user.dailyUsage}: ${info.usageTime}</div>` : ''}
            ${info.sessionTime ? `<div class="ip">${LOGS.user.sessionUsage}: ${info.sessionTime}</div>` : ''}
            <button onclick="refresh()" class="btn btn-lock">${LOGS.user.refresh}</button>
        </div>
        ${this.messageSection()}
        <div class="card">
            <div class="card-title">${LOGS.user.settings}</div>
            <div class="info-row">
                <span class="info-label">${LOGS.user.dayLimit}</span>
                <span class="info-value">
                    ${info.usageLimit ? `${this.logWithTime(info.usageLimit)}` : LOGS.user.notSet}
                </span>
            </div>
            <div class="info-row">
                <span class="info-label">${LOGS.user.sessionLimit}</span>
                <span class="info-value">
                    ${info.sessionLimit ? `${this.logWithTime(info.sessionLimit)}` : LOGS.user.notSet}
                </span>
            </div>
            <div class="info-row">
                <span class="info-label">${LOGS.user.sessionBreak}</span>
                <span class="info-value">
                    ${info.sessionBreak ? `${this.logWithTime(info.sessionBreak)}` : LOGS.user.notSet}
                </span>
            </div>
            ${timeRemainingDisplay}
            <div class="info-row">
                <span class="info-label">${LOGS.user.delayLocks}</span>
                <span class="info-value">${lockTimesDisplay}</span>
            </div>
            <div class="info-row">
                <span class="info-label">${LOGS.user.delayShutdown}</span>
                <span class="info-value">${shutdownDisplay}</span>
            </div>
            ${
              info.usageLimit || info.lockTimes?.length
                ? `
            <button onclick="clearAll()" class="btn btn-warning">${LOGS.user.resetLimits}</button>`
                : ""
            }
        </div>
        <div id="alert" class="alert"></div>
        ${actionButtons}
        ${this.limitSection()}
        ${this.sessionSection()}
        ${sessionBreak}
        ${this.lockTimeSection()}
        ${this.delayShutdownSection(info.shutdownTime, shutdownAbort)}
        ${this.killProcesses()}
    </div>
</body>
</html>`;
  }

  static commonScripts() {
    return `
      function showAlert(message, type) {
        const alert = document.getElementById('alert');
        if (!alert) return;
        alert.textContent = message;
        alert.className = 'alert alert-' + type;
        setTimeout(() => { alert.className = 'alert'; }, 3000);
      }
    `;
  }

  static indexScripts() {
    return `
      function scanNetwork() {
        const btn = document.getElementById('scanBtn');
        btn.disabled = true;
        btn.textContent = '${LOGS.user.scan}';
        window.location.href = '/scan';
      }
      let autoRefreshInterval = null;
      window.onload = function() {
        autoRefreshInterval = setInterval(() => {
          fetch('/api/status').then(r => r.json()).then(data => {
            if (data.pcs) location.reload();
          }).catch(() => {});
        }, 30000);
      };
      function refreshStatus() {
        const btn = document.getElementById('refreshBtn');
        btn.disabled = true;
        btn.textContent = '${LOGS.user.update}';
        window.location.href = '/api/refresh';
      }
    `;
  }

  static controlScripts(ip) {
    return `
      function killProcesses() {
        window.location.href = '/admin/exit';
      }
      function refresh() {
        location.reload()
      }
      function cancelShutdown() {
        doAction('shutdown_abort').then(() => location.reload())
      }
      async function doAction(action) {
        try {
          const response = await fetch('/api/action', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ip: '${ip}', action })
          });
          const data = await response.json();
          if (data.success) {
            showAlert('✅ ' + data.response, 'success');
            if (['lock', 'shutdown', 'end_break', 'unlock'].includes(action)) {
              setTimeout(() => location.reload(), 2000);
            }
          } else {
            showAlert('❌ ' + data.response, 'error');
          }
        } catch (err) {
          showAlert('${LOGS.user.error}' + err.message, 'error');
        }
      }
      function confirmShutdown() {
        if (confirm('${LOGS.user.confirm}')) doAction('shutdown');
      }
      async function apiCaller(req, successMsg) {
        try {
          const response = await fetch('/api/action', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(req)
          });
          const data = await response.json();
          if (data.success) {
            showAlert(successMsg ? successMsg : '✅ ' + data.response, 'success');
            document.getElementById('messageInput').value = '';
            if(!['message'].includes(req.action)) {
              setTimeout(() => location.reload(), 2000);
            }
          } else {
            showAlert('❌ ' + data.response, 'error');
          }
        } catch (err) {
          showAlert('${LOGS.user.error}' + err.message, 'error');
        }
      }
      async function sendMessage() {
        const message = document.getElementById('messageInput').value;
        if (!message) {
          showAlert('${LOGS.user.mess}', 'error');
          return;
        }
        return await apiCaller({ ip: '${ip}', action: 'message', message }, '${LOGS.user.sent}')
      }
      function setQuickLimit(minutes) {
        document.getElementById('limitInput').value = minutes;
        setLimit();
      }
      function setQuickSession(minutes) {
        document.getElementById('sessionInput').value = minutes;
        setLimit(true);
      }
      function setQuickBreak(minutes) {
        document.getElementById('breakInput').value = minutes;
        setBreak();
      }
      async function setLimit(session = false) {
        const minutes = document.getElementById(session ? 'sessionInput' : 'limitInput').value;
        if (!minutes) {
          showAlert('${LOGS.user.minInput}', 'error');
          return;
        }
        return await apiCaller({ ip: '${ip}', action: session ? 'set_session_limit' : 'set_limit', minutes: parseInt(minutes) })
      }
      async function setBreak() {
        const minutes = document.getElementById('breakInput').value;
        if (!minutes) {
          showAlert('${LOGS.user.minInput}', 'error');
          return;
        }
        return await apiCaller({ ip: '${ip}', action: 'set_break_duration', minutes: parseInt(minutes) })
      }
      async function delayedShutdown() {
        const time = document.getElementById('shutdownTimeInput').value.split(':');
        const now = new Date()
        const dt = new Date()
        dt.setHours(+time[0])
        dt.setMinutes(+time[1])
        const seconds = dt - now

        if (!seconds) {
          showAlert('${LOGS.user.minInput}', 'error');
          return;
        }

        if (seconds < 0) {
          showAlert('${LOGS.control.positiveSession}', 'error');
          return;
        }
        return await apiCaller({ ip: '${ip}', action: 'delayed_shutdown', seconds: parseInt(seconds) })
      }
      async function addLockTime() {
        const time = document.getElementById('lockTimeInput').value;
        if (!time) {
          showAlert('${LOGS.user.timeSelect}', 'error');
          return;
        }
        return await apiCaller({ ip: '${ip}', action: 'add_lock_time', time })
      }
      async function clearAll() {
        if (!confirm('${LOGS.user.resAllConf}')) return;
        return await apiCaller({ ip: '${ip}', action: 'clear_all' })
      }
    `;
  }

  static messageSection() {
    return `
      <div class="card">
        <div class="card-title">${LOGS.user.sendMsg}</div>
        <input type="text" id="messageInput" placeholder='${LOGS.user.messPlaceholder}' onkeydown="if(event.key==='Enter') sendMessage()">
        <button onclick="sendMessage()" class="btn btn-primary">${LOGS.user.send}</button>
      </div>
    `;
  }

  static limitSection() {
    return `
      <div class="card">
        <div class="card-title">${LOGS.user.setLimit}</div>
        <div class="quick-limits">
          <button class="quick-limit" onclick="setQuickLimit(30)">${LOGS.user.halfHour}</button>
          <button class="quick-limit" onclick="setQuickLimit(60)">${LOGS.user.hour}</button>
          <button class="quick-limit" onclick="setQuickLimit(120)">2${LOGS.user.hours}</button>
          <button class="quick-limit" onclick="setQuickLimit(180)">3${LOGS.user.hours}</button>
        </div>
        <input type="number" id="limitInput" placeholder='${LOGS.user.timePlaceholder}' min="1">
        <button onclick="setLimit()" class="btn btn-success">${LOGS.user.saveLimit}</button>
      </div>
    `;
  }

  static sessionSection() {
    return `
      <div class="card">
        <div class="card-title">${LOGS.user.setSession}</div>
        <div class="quick-limits">
          <button class="quick-limit" onclick="setQuickSession(10)">10${LOGS.base.minute}</button>
          <button class="quick-limit" onclick="setQuickSession(20)">20${LOGS.base.minute}</button>
          <button class="quick-limit" onclick="setQuickSession(30)">${LOGS.user.halfHour}</button>
        </div>
        <input type="number" id="sessionInput" placeholder='${LOGS.user.timePlaceholder}' min="1">
        <button onclick="setLimit(true)" class="btn btn-success">${LOGS.user.saveLimit}</button>
      </div>
    `;
  }

  static lockTimeSection() {
    return `
      <div class="card">
        <div class="card-title">${LOGS.user.delayLock}</div>
        <input type="time" id="lockTimeInput" value="21:00">
        <button onclick="addLockTime()" class="btn btn-primary">${LOGS.user.delayLockSave}</button>
      </div>
    `;
  }

  static delayShutdownSection(time, abort) {
    const defVal = time && !abort ? time : '21:00'
    const cancelBtn = `<button onclick="cancelShutdown()" class="btn btn-lock">${LOGS.user.delayShutdownAbort}</button>`
    const condition = time && time !== LOGS.remote.unset && !abort
    return `
      <div class="card">
        <div class="card-title">🕐 ${LOGS.user.delayShutdown}</div>
        <input type="time" id="shutdownTimeInput" value=${defVal}>
        <button onclick="delayedShutdown()" class="btn btn-shutdown">${LOGS.user.delayShutdownSave}</button>
        ${condition ? cancelBtn : ''}        
      </div>
    `;
  }

  static killProcesses() {
    return `
      <button onclick="killProcesses()" class="card btn btn-shutdown">
        <h1>${LOGS.user.killProcesses}</h1>
      </button>
    `;
  }
}
