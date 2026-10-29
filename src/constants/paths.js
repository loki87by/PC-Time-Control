export const PATHS = {
  library: "node_modules/@qiudaomao/node-frp/src/cli.js",
  config: "frpc.yaml",
  localhost: "127.0.0.1",
  commands: {
    // Windows
    logon: 'tasklist /FI "IMAGENAME eq LogonUI.exe" /NH',
    lock: 'powershell -NoProfile -Command "& {$u=((qwinsta | Select-String -Pattern \'Àêòèâíî\' | Select-String -Pattern \'>\') -split \'\\s+\')[3]; if(!$u){$u=((qwinsta | Select-String -Pattern \'Active\' | Select-String -Pattern \'>\') -split \'\\s+\')[3]}; if($u){schtasks /create /tn \'_PCTempLock_\' /tr \'rundll32.exe user32.dll,LockWorkStation\' /sc once /st 23:59 /ru $u /f >$null 2>$null; schtasks /run /tn \'_PCTempLock_\' >$null 2>$null; Start-Sleep 2; schtasks /delete /tn \'_PCTempLock_\' /f >$null 2>$null}else{rundll32.exe user32.dll,LockWorkStation}}"',
    shutdownAbort: "shutdown /a",
    getPid: "netstat -ano | findstr",
    cleanPort: "taskkill /F /PID",
    qwinsta: "qwinsta",
    lockWorkStation: "rundll32.exe user32.dll,LockWorkStation",
    sendMess: (message, title, button) =>
      `powershell -Command "Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.MessageBox]::Show('${message}', '${title}', '${button}', 'Warning')"`,
    shutdownWin: (seconds, mess = false) =>
      `shutdown /s /t ${seconds} ${mess ? `/c "${LOGS.base.shutdownTimeout} ${logWithTime(seconds)}"` : ""}`,
    shutdown: (timeout) => `shutdown -h +${timeout}`,
    lockRemoteWin: (lockUser) =>
      `powershell -NoProfile -Command "schtasks /create /tn '_PCTempLock_' /tr 'rundll32.exe user32.dll,LockWorkStation' /sc once /st 23:59 /ru ${lockUser} /f *>$null; schtasks /run /tn '_PCTempLock_' *>$null; Start-Sleep 2; schtasks /delete /tn '_PCTempLock_' /f *>$null"`,
    showMessageWin: (message, title, lockUser) => {
      const escaped = message.replace(/'/g, "''");
      return `powershell -NoProfile -Command "schtasks /create /tn '_PCTempMsg_' /tr 'powershell -Command \"Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.MessageBox]::Show(''${escaped}'', ''${title}'', ''OK'', ''Warning'')\"' /sc once /st 23:59 /ru ${lockUser} /f *>$null; schtasks /run /tn '_PCTempMsg_' *>$null; Start-Sleep 3; schtasks /delete /tn '_PCTempMsg_' /f *>$null"`;
    },
    scQueryCandidates: (ip) => {
      const candidates = ["pctimecontrol.exe", "pctimecontrol", "PCTimeControl", "pc-time-control"];
      return candidates.map((n) => `sc \\\\${ip} query "${n}"`);
    },
    // Linux
    logonLinux: 'ps aux | grep -E "gnome-screensaver|kscreensaver|light-locker|xflock4" | grep -v grep',
    lockedCheckLinux: 'loginctl list-sessions 2>/dev/null | grep -E "seat|lock" || true',
    activeUserLinux: 'loginctl show-session $(loginctl list-sessions --no-legend 2>/dev/null | head -1 | awk \'{print $1}\') -p Name 2>/dev/null | cut -d= -f2',
    activeUserLinuxFallback: 'who -u | head -1 | awk \'{print $1}\'',
    lockLinux: 'loginctl lock-sessions',
    lockLinuxGnome: 'dbus-send --type=method_call --dest=org.gnome.ScreenSaver /org/gnome/ScreenSaver org.gnome.ScreenSaver.Lock 2>/dev/null || true',
    lockLinuxKde: 'qdbus org.freedesktop.ScreenSaver /ScreenSaver Lock 2>/dev/null || true',
    shutdownLinuxNow: "shutdown -h now",
    shutdownLinuxAbort: "shutdown -c",
    cancelShutdownLinux: "shutdown -c",
    listSessionsLinux: 'loginctl list-sessions --no-legend 2>/dev/null || true',
    systemctlDaemonReload: "systemctl daemon-reload",
    notifySend: (message, title) =>
      `notify-send "${title}" "${message}" -u critical -i dialog-warning -t 10000 2>/dev/null || true`,
    killPort: (port) => `lsof -ti :${port} 2>/dev/null | xargs -r kill -9`,
    shutdownLinux: (minutes) => `shutdown -h +${minutes}`,
    shutdownLinuxSeconds: (seconds) => `shutdown -h +${Math.ceil(seconds / 60)}`,
    killPortLinux: (port) => `lsof -ti :${port} 2>/dev/null | xargs -r kill -9 2>/dev/null || true`,
    systemctlEnable: (name) => `systemctl enable ${name}`,
    systemctlDisable: (name) => `systemctl disable ${name}`,
    systemctlStart: (name) => `systemctl start ${name}`,
    systemctlStop: (name) => `systemctl stop ${name}`,
    systemctlIsEnabled: (name) => `systemctl is-enabled ${name} 2>/dev/null || echo "not found"`,
    systemctlIsActive: (name) => `systemctl is-active ${name} 2>/dev/null || echo "inactive"`,
    systemctlStatus: (name) => `systemctl status ${name} 2>/dev/null | head -20`,
    chownRecursive: (user, dir) => `chown -R ${user}:${user} ${dir}`,
    sshMkdir: (keyOpt, userHost, dir) =>
      `ssh ${keyOpt} ${userHost} "mkdir -p ${dir}"`,
    rsyncCopy: (keyOpt, src, userHost, dest) =>
      `rsync -az --delete ${keyOpt} ${src}/ ${userHost}:${dest}/`,
    sshNpmInstall: (keyOpt, userHost, dir) =>
      `ssh ${keyOpt} ${userHost} "cd ${dir} && npm install --no-audit --no-fund"`,
    sshSystemctlStop: (keyOpt, userHost, name) =>
      `ssh ${keyOpt} ${userHost} "systemctl stop ${name}"`,
    sshSystemctlStart: (keyOpt, userHost, name) =>
      `ssh ${keyOpt} ${userHost} "systemctl start ${name}"`,
    sshBuildHost: (ip, user) =>
      user ? `${user}@${ip}` : `root@${ip}`,
    sshKeyFlag: (key) =>
      key ? `-e "ssh -i ${key}"` : "",
    sshKeyOpt: (key) =>
      key ? `-i ${key}` : "",
  },
};

