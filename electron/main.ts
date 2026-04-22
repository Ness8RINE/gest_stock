import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import { createServer } from 'http';
import { parse } from 'url';
import { randomBytes } from 'crypto';
import fs from 'fs';
import { checkLicense, getMachineId, saveLicense } from './license-checker';

const isDev = !app.isPackaged;
const PORT = process.env.PORT || 3000;

import { fork, ChildProcess, execSync } from 'child_process';

let serverProcess: ChildProcess | null = null;

/**
 * Initialise la base de données en production.
 * Si elle n'existe pas dans userData, on copie la base pré-générée (base.db).
 */
function initDatabase() {
  if (isDev) return;

  const dbPath = path.join(app.getPath('userData'), 'geststock.db');
  const baseDbPath = path.join(process.resourcesPath, 'app-server', 'base.db');

  const shouldCopy = !fs.existsSync(dbPath) || (fs.existsSync(dbPath) && fs.statSync(dbPath).size === 0);

  if (shouldCopy) {
    console.log("Initialisation de la base de données (fichier manquant ou vide)...");
    try {
      if (fs.existsSync(baseDbPath)) {
        fs.copyFileSync(baseDbPath, dbPath);
        console.log("Base de données initialisée avec succès.");
      } else {
        console.error("ERREUR : base.db introuvable dans", baseDbPath);
      }
    } catch (error) {
      console.error("Erreur lors de la copie :", error);
    }
  } else {
    console.log("Base de données existante et non vide.");
  }
}

/**
 * Auth.js exige AUTH_SECRET en production. En app packagée, le .env n'est pas
 * chargé automatiquement pour le process forké : on persiste un secret stable
 * dans userData (ou on réutilise une variable d'environnement explicite).
 */
function resolveAuthSecretForPackagedApp(): string {
  const fromEnv =
    process.env.AUTH_SECRET?.trim() || process.env.NEXTAUTH_SECRET?.trim();
  if (fromEnv) return fromEnv;

  const secretPath = path.join(app.getPath('userData'), '.auth-secret');
  try {
    if (fs.existsSync(secretPath)) {
      const existing = fs.readFileSync(secretPath, 'utf8').trim();
      if (existing.length >= 32) return existing;
    }
  } catch {
    // ignore read errors, regenerate below
  }

  const secret = randomBytes(32).toString('base64url');
  try {
    fs.writeFileSync(secretPath, secret, { mode: 0o600 });
  } catch {
    // fichier inaccessible : secret éphémère (sessions invalidées au redémarrage)
  }
  return secret;
}

async function startNextServer() {
  if (isDev) {
    const next = require('next');
    const nextApp = next({ 
      dev: true,
      dir: path.join(__dirname, '..')
    });
    const handle = nextApp.getRequestHandler();
    await nextApp.prepare();

    return new Promise((resolve) => {
      createServer((req, res) => {
        const parsedUrl = parse(req.url!, true);
        handle(req, res, parsedUrl);
      }).listen(PORT, () => {
        console.log(`> Next.js server ready on http://localhost:${PORT}`);
        resolve(true);
      });
    });
  } else {
    // MODE PRODUCTION : Utilisation du serveur hors ASAR
    const standaloneDir = path.join(process.resourcesPath, 'app-server');
    const serverPath = path.join(standaloneDir, 'server.js');
    
    const dbPath = path.join(app.getPath('userData'), 'geststock.db');
    const logPath = path.join(app.getPath('userData'), 'server-log.txt');

    const logStream = fs.createWriteStream(logPath, { flags: 'a' });
    
    logStream.write(`\n--- Démarrage le ${new Date().toISOString()} ---\n`);
    logStream.write(`Server Path: ${serverPath}\n`);
    logStream.write(`DB Path: ${dbPath}\n`);

    const authSecret = resolveAuthSecretForPackagedApp();

    serverProcess = fork(serverPath, [], {
      cwd: standaloneDir,
      env: {
        ...process.env,
        NODE_ENV: 'production',
        PORT: PORT.toString(),
        HOSTNAME: 'localhost',
        DATABASE_URL: `file:${dbPath}`,
        AUTH_URL: `http://localhost:${PORT}`,
        NEXTAUTH_URL: `http://localhost:${PORT}`,
        AUTH_SECRET: authSecret,
        NEXTAUTH_SECRET: authSecret,
      },
      stdio: 'pipe'
    });

    serverProcess.stdout?.on('data', (data) => {
      logStream.write(`[STDOUT]: ${data}\n`);
      console.log(`[Next.js]: ${data}`);
    });
    
    serverProcess.stderr?.on('data', (data) => {
      logStream.write(`[STDERR]: ${data}\n`);
      console.error(`[Next.js Error]: ${data}`);
    });

    return new Promise((resolve) => {
      // On attend que le serveur réponde sur le port
      const checkServer = setInterval(() => {
        const http = require('http');
        http.get(`http://localhost:${PORT}/api/auth/session`, (res: any) => {
          if (res.statusCode === 200 || res.statusCode === 404) {
            clearInterval(checkServer);
            resolve(true);
          }
        }).on('error', () => {
          // Serveur pas encore prêt
        });
      }, 500);
      
      // Timeout de sécurité après 10 secondes
      setTimeout(() => {
        clearInterval(checkServer);
        resolve(true);
      }, 10000);
    });
  }
}

function createWindow() {
  // Configurer le chemin de la base de données en production
  if (!isDev) {
    const dbPath = path.join(app.getPath('userData'), 'geststock.db');
    process.env.DATABASE_URL = `file:${dbPath}`;
  }

  const mainWindow = new BrowserWindow({
    width: 1300,
    height: 900,
    minWidth: 1000,
    minHeight: 700,
    title: 'GestStock',
    icon: path.join(__dirname, '../public/favicon.ico'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  // Gestion des IPC
  ipcMain.handle('get-machine-id', () => getMachineId());
  ipcMain.handle('save-license', (event, data) => saveLicense(data));

  const status = checkLicense();

  if (status === 'VALID') {
    initDatabase(); // Copier la base de données modèle si nécessaire
    startNextServer().then(() => {
      mainWindow.loadURL(`http://localhost:${PORT}`);
    }).catch(err => {
      console.error('Failed to start server:', err);
      // Afficher l'erreur dans la fenêtre si possible
    });
  } else if (status === 'EXPIRED') {
    mainWindow.loadFile(path.join(__dirname, 'expired.html'));
  } else {
    mainWindow.loadFile(path.join(__dirname, 'activation.html'));
  }

  // ON FORCE LES DEVTOOLS POUR DEBUGGER LA PAGE BLANCHE
  mainWindow.webContents.openDevTools();
  
  if (!isDev) {
    mainWindow.setMenuBarVisibility(false);
  }
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    serverProcess?.kill();
    app.quit();
  }
});

app.on('quit', () => {
  serverProcess?.kill();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
