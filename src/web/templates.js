import {COMMON, INDEX, CONTROL} from '#web/styles'
import { LOGS, PATHS } from "#consts";

export class Templates {
  static index(pcs, lastScanTime, isServerRunning) {
    const pcCards = pcs.length > 0 
      ? pcs.map(([ip, info]) => `
        <div class="pc-card" onclick="location.href='/control?ip=${ip}'">
            <div class="pc-info">
                <div class="pc-name">💻 ${info.hostname}</div>
                <div class="pc-ip">${ip}</div>
                ${info.currentUser ? `<div class="pc-user">👤 ${info.currentUser}</div>` : ""}
            </div>
            <span class="status-badge ${info.locked ? "status-locked" : "status-online"}">
                ${info.locked ? LOGS.user.lock : LOGS.user.online}
            </span>
        </div>
      `).join("")
      : `
        <div class="empty-state">
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
        <button id="refreshBtn" class="refresh-btn" onclick="refreshStatus()">${LOGS.user.refresh}</button>
        ${pcs.length > 0 ? `<h3 style="color: white; margin: 20px 0 10px;">${LOGS.user.available} ${pcs.length}</h3>` : ""}
        ${pcCards}
        <div class="footer">
            ${lastScanTime ? `${LOGS.user.last} ${lastScanTime.toLocaleTimeString()}` : LOGS.user.yet}
        </div>
    </div>
</body>
</html>`;
  }

  static control(ip, info) {
    const statusClass = info.locked ? "status-locked" : "status-unlocked";
    const statusText = info.locked ? LOGS.user.lock : LOGS.user.unlock;
    const lockTimesDisplay = info.lockTimes?.length > 0 
      ? info.lockTimes.join(", ") 
      : LOGS.user.absent;
    
    const timeRemainingDisplay = info.timeRemaining && info.timeRemaining !== LOGS.user.unlimit
      ? `<div class="info-row">
          <span class="info-label">${LOGS.user.timeRemaining}</span>
          <span class="info-value">${info.timeRemaining}</span>
        </div>`
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
        </div>
        <div class="card">
            <div class="card-title">${LOGS.user.settings}</div>
            <div class="info-row">
                <span class="info-label">${LOGS.user.dayLimit}</span>
                <span class="info-value">
                    ${info.usageLimit ? `${info.usageLimit} ${LOGS.base.minute} (${(info.usageLimit / 60).toFixed(1)} ${LOGS.base.hour})` : LOGS.user.notSet}
                </span>
            </div>
            ${timeRemainingDisplay}
            <div class="info-row">
                <span class="info-label">${LOGS.user.delayLocks}</span>
                <span class="info-value">${lockTimesDisplay}</span>
            </div>
            ${info.usageLimit || info.lockTimes?.length ? `
            <button onclick="clearAll()" class="btn btn-warning" style="margin-top: 10px;">${LOGS.user.resetLimits}</button>` : ""}
        </div>
        <div id="alert" class="alert"></div>
        ${this.actionButtons()}
        ${this.messageSection()}
        ${this.limitSection()}
        ${this.lockTimeSection()}
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
      function refreshStatus() {
        const btn = document.getElementById('refreshBtn');
        btn.disabled = true;
        btn.textContent = '${LOGS.user.update}';
        window.location.href = '/api/refresh';
      }
      let autoRefreshInterval = null;
      window.onload = function() {
        autoRefreshInterval = setInterval(() => {
          fetch('/api/status').then(r => r.json()).then(data => {
            if (data.pcs) location.reload();
          }).catch(() => {});
        }, 30000);
      };
    `;
  }

  static controlScripts(ip) {
    return `
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
            if (action === 'lock' || action === 'shutdown') {
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
      async function sendMessage() {
        const message = document.getElementById('messageInput').value;
        if (!message) {
          showAlert('${LOGS.user.mess}', 'error');
          return;
        }
        try {
          const response = await fetch('/api/action', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ip: '${ip}', action: 'message', message })
          });
          const data = await response.json();
          if (data.success) {
            showAlert('${LOGS.user.sent}', 'success');
            document.getElementById('messageInput').value = '';
          } else {
            showAlert('❌ ' + data.response, 'error');
          }
        } catch (err) {
          showAlert('${LOGS.user.error}' + err.message, 'error');
        }
      }
      function setQuickLimit(minutes) {
        document.getElementById('limitInput').value = minutes;
        setLimit();
      }
      async function setLimit() {
        const minutes = document.getElementById('limitInput').value;
        if (!minutes) {
          showAlert('${LOGS.user.minInput}', 'error');
          return;
        }
        try {
          const response = await fetch('/api/action', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ip: '${ip}', action: 'set_limit', minutes: parseInt(minutes) })
          });
          const data = await response.json();
          if (data.success) {
            showAlert('✅ ' + data.response, 'success');
            setTimeout(() => location.reload(), 1000);
          } else {
            showAlert('❌ ' + data.response, 'error');
          }
        } catch (err) {
          showAlert('${LOGS.user.error}' + err.message, 'error');
        }
      }
      async function addLockTime() {
        const time = document.getElementById('lockTimeInput').value;
        if (!time) {
          showAlert('${LOGS.user.timeSelect}', 'error');
          return;
        }
        try {
          const response = await fetch('/api/action', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ip: '${ip}', action: 'add_lock_time', time })
          });
          const data = await response.json();
          if (data.success) {
            showAlert('✅ ' + data.response, 'success');
            setTimeout(() => location.reload(), 1000);
          } else {
            showAlert('❌ ' + data.response, 'error');
          }
        } catch (err) {
          showAlert('${LOGS.user.error}' + err.message, 'error');
        }
      }
      async function clearAll() {
        if (!confirm('${LOGS.user.resAllConf}')) return;
        try {
          const response = await fetch('/api/action', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ip: '${ip}', action: 'clear_all' })
          });
          const data = await response.json();
          if (data.success) {
            showAlert('✅ ' + data.response, 'success');
            setTimeout(() => location.reload(), 1000);
          } else {
            showAlert('❌ ' + data.response, 'error');
          }
        } catch (err) {
          showAlert('${LOGS.user.error}' + err.message, 'error');
        }
      }
    `;
  }

  static actionButtons() {
    return `
      <div class="card">
        <div class="card-title">${LOGS.user.now}</div>
        <button onclick="doAction('lock')" class="btn btn-lock">${LOGS.user.lockNow}</button>
        <button onclick="confirmShutdown()" class="btn btn-shutdown">${LOGS.user.shutdown}</button>
      </div>
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

  static lockTimeSection() {
    return `
      <div class="card">
        <div class="card-title">${LOGS.user.delayLock}</div>
        <input type="time" id="lockTimeInput" value="21:00">
        <button onclick="addLockTime()" class="btn btn-primary">${LOGS.user.delayLockSave}</button>
      </div>
    `;
  }
}