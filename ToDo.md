# ToDo: NEED CREATE APP IN SERVER-SIDE

    APP WILL CHECKED:

        root@cv5461109:~# systemctl status frp-server

        good
        ● frp-server.service - FRP Server (Node.js)
            Loaded: loaded (/etc/systemd/system/frp-server.service; enabled; preset: e>
            Active: active (running) since Sat 2026-09-26 15:43:18 MSK; 2h 0min ago
        Main PID: 8766 (node)
            Tasks: 11 (limit: 2329)
            Memory: 17.5M (peak: 18.1M)
                CPU: 521ms
            CGroup: /system.slice/frp-server.service
                    └─8766 node /usr/bin/node-frp server /etc/frp/frps.yaml

        bad
        ● frp-server.service - FRP Server (Node.js)
            Loaded: loaded (/etc/systemd/system/frp-server.service; enabled; preset: enabled)
            Active: activating (auto-restart) (Result: exit-code) since Sat 2026-09-26 15:19:54 MSK; 3s ago
            Process: 8195 ExecStart=/usr/bin/node-frp server /run/frp/frps.yaml (code=exited, status=200/CHDIR)

    AND SEND RESULT BY HTTPS TO REQUEST GETTER

#######################################################################################################################

## ToDo2: NEED CREATE MODULE IN PC-TIME-CONTROL APP

    IF ERROR CONNECTED TO FRPC, SEND REQUEST TO PREV SERVER-APP
        IF TIME NOT OLD THAN UPDATE FRPC SETTINGS:

            post: http://79.174.77.192:8080/login
            payload: {
                "username": 'admin',
                "password": 'admin'
                }
            #############################################################
              may be need get connect.sid from cookies for next requests
            #############################################################
_______________________________________________________________________________________________________________________
            post: http://79.174.77.192:8080/clients/new
            payload: {
                "name": 'test',
                "description": ''
                }
_______________________________________________________________________________________________________________________
            get: http://79.174.77.192:8080/clients
            response: ```html
            ...
                <tbody>
            ...
                <td>test</td>
            ...
                <a href="/clients/2" class="btn btn-sm">View</a>
            ```
            #############################################################
                        "/clients/2" <- SAVE THIS ID!
            #############################################################
_______________________________________________________________________________________________________________________
            get http://79.174.77.192:8080/clients/2 <- USE SAVED ID!
            response: ```html
            ...
                <tbody>
            ...
                <dl class="detail-list">
            ...
                <code id="token">73207218afedfe07cc6586f7eafb8f3f5f899335ad6130597dec1651652818a2</code>
            ```
            #############################################################
                  !THIS TOKEN NEED UPDATE IN LOCAL FILE 'frpc.yaml'!
            #############################################################
_______________________________________________________________________________________________________________________
            post http://79.174.77.192:8080/port-forwards/new
            payload: {
                "name": 'web-panel' <- variable name
                "client_id": '2' <- USE SAVED ID!
                "direction": 'forward' <- NOT CHANGE!
                "remote_port": '5555' <- port for web-control
                "remote_ip": '127.0.0.1' <- NOT CHANGE!
                "local_ip": '127.0.0.1' <- NOT CHANGE!
                "local_port": '5000' < - app web-port
                "proxy_type": 'tcp' <- NOT CHANGE!
                }
_______________________________________________________________________________________________________________________
