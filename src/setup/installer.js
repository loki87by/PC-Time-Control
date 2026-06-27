#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SERVICE_NAME = 'PCTimeControl';
const SCRIPT_PATH = path.join(__dirname, 'index.js');

function installService() {
    console.log('📦 Installing PC Time Control as Windows Service...');
    
    try {
        // Проверяем права администратора
        try {
            execSync('net session', { stdio: 'ignore' });
        } catch (err) {
            console.log('❌ This script must be run as Administrator!');
            console.log('   Right-click on Command Prompt and select "Run as administrator"');
            process.exit(1);
        }
        
        // Проверяем наличие node-windows
        try {
            await import('node-windows');
        } catch (err) {
            console.log('📦 Installing required package: node-windows...');
            execSync('npm install node-windows', { stdio: 'inherit' });
        }
        
        const { Service } = await import('node-windows');
        
        // Создаем сервис
        const svc = new Service({
            name: SERVICE_NAME,
            description: 'PC Time Control - Manage computer usage time',
            script: SCRIPT_PATH,
            nodeOptions: [
                '--import=./config.js',
                '--max-old-space-size=512'
            ],
            env: [
                {
                    name: 'NODE_ENV',
                    value: 'production'
                }
            ],
            logOnAsUser: true,
            logOnAsUserAccount: process.env.USERNAME,
            logOnAsUserPassword: null, // Использует текущую сессию
            workingDirectory: __dirname
        });
        
        // События установки
        svc.on('install', () => {
            console.log('✅ Service installed successfully!');
            console.log(`   Name: ${SERVICE_NAME}`);
            console.log(`   Script: ${SCRIPT_PATH}`);
            console.log('\n📝 To start the service:');
            console.log(`   net start ${SERVICE_NAME}`);
            console.log('\n📝 To stop the service:');
            console.log(`   net stop ${SERVICE_NAME}`);
            console.log('\n📝 To uninstall:');
            console.log(`   node installer.js uninstall`);
        });
        
        svc.on('alreadyinstalled', () => {
            console.log('⚠️ Service is already installed!');
            console.log('   Use "node installer.js uninstall" to remove it first');
        });
        
        svc.on('invalidinstallation', () => {
            console.log('❌ Invalid installation detected.');
            console.log('   Try uninstalling first: node installer.js uninstall');
        });
        
        svc.on('error', (err) => {
            console.log(`❌ Error installing service: ${err.message}`);
            process.exit(1);
        });
        
        svc.install();
        
    } catch (err) {
        console.log(`❌ Installation failed: ${err.message}`);
        process.exit(1);
    }
}

function uninstallService() {
    console.log('🗑️ Uninstalling PC Time Control service...');
    
    try {
        execSync('net stop PCTimeControl', { stdio: 'ignore' });
    } catch (err) {
        // Сервис может быть уже остановлен
    }
    
    try {
        const { Service } = await import('node-windows');
        
        const svc = new Service({
            name: SERVICE_NAME,
            script: SCRIPT_PATH
        });
        
        svc.on('uninstall', () => {
            console.log('✅ Service uninstalled successfully!');
        });
        
        svc.on('error', (err) => {
            console.log(`❌ Error uninstalling service: ${err.message}`);
            process.exit(1);
        });
        
        svc.uninstall();
        
    } catch (err) {
        console.log(`❌ Uninstall failed: ${err.message}`);
        process.exit(1);
    }
}

// Автоустановка в автозагрузку для текущего пользователя
function installStartupShortcut() {
    console.log('📂 Adding to Startup folder...');
    
    try {
        const startupFolder = path.join(
            process.env.APPDATA,
            'Microsoft', 'Windows', 'Start Menu', 'Programs', 'Startup'
        );
        
        const shortcutPath = path.join(startupFolder, 'PC Time Control.lnk');
        
        // Используем PowerShell для создания ярлыка
        const psScript = `
$WshShell = New-Object -comObject WScript.Shell
$Shortcut = $WshShell.CreateShortcut("${shortcutPath}")
$Shortcut.TargetPath = "${process.execPath}"
$Shortcut.Arguments = "${SCRIPT_PATH}"
$Shortcut.WorkingDirectory = "${__dirname}"
$Shortcut.WindowStyle = 7
$Shortcut.IconLocation = "${process.execPath}, 0"
$Shortcut.Save()
`;
        
        execSync(`powershell -Command "${psScript.replace(/"/g, '`"')}"`, { stdio: 'ignore' });
        console.log('✅ Startup shortcut created!');
        
    } catch (err) {
        console.log(`⚠️ Could not create startup shortcut: ${err.message}`);
        console.log('   You can add it manually to Startup folder');
    }
}

// Основная функция
async function main() {
    const args = process.argv.slice(2);
    
    if (args.includes('uninstall')) {
        uninstallService();
        return;
    }
    
    if (args.includes('startup')) {
        installStartupShortcut();
        return;
    }
    
    // По умолчанию - полная установка
    console.log('=== PC Time Control Installer ===\n');
    
    // Устанавливаем сервис
    installService();
    
    // Добавляем в автозагрузку (как запасной вариант)
    setTimeout(() => {
        installStartupShortcut();
    }, 2000);
    
    console.log('\n✅ Installation complete!');
    console.log('The service will start automatically on system boot.');
}

main().catch((err) => {
    console.error(`Error: ${err.message}`);
    process.exit(1);
});