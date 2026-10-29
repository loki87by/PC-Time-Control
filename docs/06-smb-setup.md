# Доступ к `C$` по SMB (для удалённого обновления Windows)

> **Только для Windows.** На Linux удалённое обновление работает через SSH/rsync —
> см. [Настройка Linux →](./06-linux-setup.md#обновление-агента-на-linux).

Нужно, чтобы с родительского ПК можно было писать файлы на целевой через админ-шару `C$`.
Все команды — **на целевом ПК** в PowerShell **от администратора**.

## 1. Порт 445 (SMB)

```powershell
Test-NetConnection -ComputerName localhost -Port 445
```

Должно быть `TcpTestSucceeded: True`. Если нет — включите общий доступ:

```powershell
Set-NetFirewallRule -DisplayGroup "Доступ к файлам и принтерам" -Enabled True
```

Или: Параметры → Сеть и Интернет → Центр управления сетями → Изменить дополнительные параметры общего доступа → включить сетевое обнаружение и общий доступ к файлам и принтерам.

## 2. Отключить UAC Remote Restrictions (главное)

Windows 10/11 фильтрует токен администратора при удалённом SMB-подключении.
Вариант A — реестр (рекомендуется):

```powershell
reg add HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\Policies\System /v LocalAccountTokenFilterPolicy /t REG_DWORD /d 1 /f
```

Перезагрузите ПК.

Вариант B — встроенный администратор (без фильтра токена):

```powershell
net user Администратор /active:yes
```

и подключайтесь как `.\Администратор`.

## 3. Админ-шара C$ существует

```powershell
net share C$
```

Должно вывести `C$ Default share`. Если нет:

```powershell
net share C$=C: /GRANT:Администраторы,FULL
```

## 4. Пользователь в группе администраторов

```powershell
net localgroup Администраторы
net localgroup Администраторы <USER> /add   # если нет в списке
```

## 5. Брандмауэр — явное правило для 445

```powershell
New-NetFirewallRule -DisplayName "SMB-In (C$ access)" -Direction Inbound -Protocol TCP -LocalPort 445 -Action Allow
```

или:

```powershell
netsh advfirewall firewall add rule name="SMB-In (C$ access)" dir=in action=allow protocol=TCP localport=445
```

## 6. Быстрый путь одной командой

```powershell
reg add HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\Policies\System /v LocalAccountTokenFilterPolicy /t REG_DWORD /d 1 /f & netsh advfirewall firewall set rule group="Доступ к файлам и принтерам" new enable=Yes & shutdown /r /t 10 /c "Перезагрузка для применения настроек удаленного доступа"
```

## 7. Проверка с родительского ПК

Из обычного cmd (не PowerShell):

```cmd
net use \\<TARGET_IP>\C$ /USER:.\<USER> <PASSWORD>
```

где `<USER>` — имя пользователя, `<PASSWORD>` — его пароль.

Если пароль не принимается — без пароля в команде (запросит интерактивно):

```cmd
net use \\<TARGET_IP>\C$ /USER:.\<USER> *
```

где `<USER>` — имя пользователя.

Если net use вручную работает — скрипт тоже заработает.

[← Назад: авто-восстановление](./05-frp-auto-refresh.md) | [Оглавление](../README.md) | [Далее: настройка Linux →](./06-linux-setup.md) | [Устранение проблем →](./07-troubleshooting.md)
