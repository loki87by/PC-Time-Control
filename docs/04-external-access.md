# Внешний доступ через frp

Нужен публичный сервер (VPS) с белым IP.

## 1. Пакет на сервере

```bash
npm install -g @qiudaomao/node-frp
```

## 2. Конфиг сервера frps.yaml

```yaml
bindPort: 7000
databasePath: ./frp.db
trafficFlushInterval: 30
webUI:
  enabled: true
  port: 8080
  host: "0.0.0.0"
  username: <FRP_ADMIN>
  password: <FRP_PASSWORD>
```

## 3. Порты

```bash
# iptables
sudo iptables -A INPUT -p tcp --dport 7000 -j ACCEPT
sudo iptables -A INPUT -p tcp --dport 8080 -j ACCEPT
sudo netfilter-persistent save          # Ubuntu/Debian
sudo service iptables save              # CentOS/RHEL
# ufw
sudo ufw allow 7000/tcp
sudo ufw allow 8080/tcp
# firewalld
sudo firewall-cmd --add-port=7000/tcp --permanent
sudo firewall-cmd --add-port=8080/tcp --permanent
sudo firewall-cmd --reload
```

## 4. Systemd-сервис

`/etc/systemd/system/frp-server.service`:

```ini
[Unit]
Description=FRP Server (Node.js)
After=network.target
[Service]
Type=simple
User=root
WorkingDirectory=<ПУТЬ_К_КОНФИГУ>
ExecStart=/usr/bin/node-frp server <ПУТЬ_К_КОНФИГУ>/frps.yaml
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal
SyslogIdentifier=frp-server
[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl start frp-server
sudo systemctl enable frp-server
sudo systemctl status frp-server
```

## 5. Клиент

- Откройте веб-интерфейс `http://<SERVER_IP>:8080`.
- Clients → Add Client → имя (например, `home-pc`) → Save.
- Скопируйте токен.

frpc.yaml на локальном ПК:

```yaml
serverAddr: "<SERVER_IP>"
serverPort: 7000
token: "<ТОКЕН_ИЗ_ВЕБ-ИНТЕРФЕЙСА>"
```

## 6. Проброс порта

В веб-интерфейсе сервера: Port Forwards → Add Port Forward:

- Client: `home-pc`
- Name: `web-panel`
- Remote Port: 5555
- Local IP: 127.0.0.1
- Local Port: 5000
- **Save**

Статус `Active` (зелёный) = проброс работает.

Доступ из любой точки:
`http://<SERVER_IP>:5555`

[← Назад: удалённое управление](./03-remote-control.md) | [Оглавление](../README.md) | [Далее: авто-восстановление →](./05-frp-auto-refresh.md)
