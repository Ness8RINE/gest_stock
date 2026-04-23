"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const path_1 = __importDefault(require("path"));
const http_1 = require("http");
const url_1 = require("url");
const crypto_1 = require("crypto");
const fs_1 = __importDefault(require("fs"));
const license_checker_1 = require("./license-checker");
const isDev = !electron_1.app.isPackaged;
const PORT = process.env.PORT || 3000;
const child_process_1 = require("child_process");
let serverProcess = null;
/**
 * Initialise la base de données en production.
 * Si elle n'existe pas dans userData, on copie la base pré-générée (base.db).
 */
function initDatabase() {
    if (isDev)
        return;
    const dbPath = path_1.default.join(electron_1.app.getPath('userData'), 'geststock.db');
    const baseDbPath = path_1.default.join(process.resourcesPath, 'app-server', 'base.db');
    const shouldCopy = !fs_1.default.existsSync(dbPath) || (fs_1.default.existsSync(dbPath) && fs_1.default.statSync(dbPath).size === 0);
    if (shouldCopy) {
        console.log("Initialisation de la base de données (fichier manquant ou vide)...");
        try {
            if (fs_1.default.existsSync(baseDbPath)) {
                fs_1.default.copyFileSync(baseDbPath, dbPath);
                console.log("Base de données initialisée avec succès.");
            }
            else {
                console.error("ERREUR : base.db introuvable dans", baseDbPath);
            }
        }
        catch (error) {
            console.error("Erreur lors de la copie :", error);
        }
    }
    else {
        console.log("Base de données existante et non vide.");
    }
}
/**
 * Auth.js exige AUTH_SECRET en production. En app packagée, le .env n'est pas
 * chargé automatiquement pour le process forké : on persiste un secret stable
 * dans userData (ou on réutilise une variable d'environnement explicite).
 */
function resolveAuthSecretForPackagedApp() {
    var _a, _b;
    const fromEnv = ((_a = process.env.AUTH_SECRET) === null || _a === void 0 ? void 0 : _a.trim()) || ((_b = process.env.NEXTAUTH_SECRET) === null || _b === void 0 ? void 0 : _b.trim());
    if (fromEnv)
        return fromEnv;
    const secretPath = path_1.default.join(electron_1.app.getPath('userData'), '.auth-secret');
    try {
        if (fs_1.default.existsSync(secretPath)) {
            const existing = fs_1.default.readFileSync(secretPath, 'utf8').trim();
            if (existing.length >= 32)
                return existing;
        }
    }
    catch (_c) {
        // ignore read errors, regenerate below
    }
    const secret = (0, crypto_1.randomBytes)(32).toString('base64url');
    try {
        fs_1.default.writeFileSync(secretPath, secret, { mode: 0o600 });
    }
    catch (_d) {
        // fichier inaccessible : secret éphémère (sessions invalidées au redémarrage)
    }
    return secret;
}
function startNextServer() {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b;
        if (isDev) {
            const next = require('next');
            const nextApp = next({
                dev: true,
                dir: path_1.default.join(__dirname, '..')
            });
            const handle = nextApp.getRequestHandler();
            yield nextApp.prepare();
            return new Promise((resolve) => {
                (0, http_1.createServer)((req, res) => {
                    const parsedUrl = (0, url_1.parse)(req.url, true);
                    handle(req, res, parsedUrl);
                }).listen(PORT, () => {
                    console.log(`> Next.js server ready on http://localhost:${PORT}`);
                    resolve(true);
                });
            });
        }
        else {
            // MODE PRODUCTION : Utilisation du serveur hors ASAR
            const standaloneDir = path_1.default.join(process.resourcesPath, 'app-server');
            const serverPath = path_1.default.join(standaloneDir, 'server.js');
            const dbPath = path_1.default.join(electron_1.app.getPath('userData'), 'geststock.db');
            const logPath = path_1.default.join(electron_1.app.getPath('userData'), 'server-log.txt');
            const logStream = fs_1.default.createWriteStream(logPath, { flags: 'a' });
            logStream.write(`\n--- Démarrage le ${new Date().toISOString()} ---\n`);
            logStream.write(`Server Path: ${serverPath}\n`);
            logStream.write(`DB Path: ${dbPath}\n`);
            const authSecret = resolveAuthSecretForPackagedApp();
            serverProcess = (0, child_process_1.fork)(serverPath, [], {
                cwd: standaloneDir,
                env: Object.assign(Object.assign({}, process.env), { NODE_ENV: 'production', PORT: PORT.toString(), HOSTNAME: 'localhost', DATABASE_URL: `file:${dbPath}`, AUTH_URL: `http://localhost:${PORT}`, NEXTAUTH_URL: `http://localhost:${PORT}`, AUTH_SECRET: authSecret, NEXTAUTH_SECRET: authSecret }),
                stdio: 'pipe'
            });
            (_a = serverProcess.stdout) === null || _a === void 0 ? void 0 : _a.on('data', (data) => {
                logStream.write(`[STDOUT]: ${data}\n`);
                console.log(`[Next.js]: ${data}`);
            });
            (_b = serverProcess.stderr) === null || _b === void 0 ? void 0 : _b.on('data', (data) => {
                logStream.write(`[STDERR]: ${data}\n`);
                console.error(`[Next.js Error]: ${data}`);
            });
            return new Promise((resolve) => {
                // On attend que le serveur réponde sur le port
                const checkServer = setInterval(() => {
                    const http = require('http');
                    http.get(`http://localhost:${PORT}/api/auth/session`, (res) => {
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
    });
}
function createWindow() {
    // Configurer le chemin de la base de données en production
    if (!isDev) {
        const dbPath = path_1.default.join(electron_1.app.getPath('userData'), 'geststock.db');
        process.env.DATABASE_URL = `file:${dbPath}`;
    }
    const mainWindow = new electron_1.BrowserWindow({
        width: 1300,
        height: 900,
        minWidth: 1000,
        minHeight: 700,
        title: 'GestStock',
        icon: path_1.default.join(__dirname, '../public/favicon.ico'),
        webPreferences: {
            preload: path_1.default.join(__dirname, 'preload.js'),
            nodeIntegration: false,
            contextIsolation: true,
        },
    });
    // Gestion des IPC
    electron_1.ipcMain.handle('get-machine-id', () => (0, license_checker_1.getMachineId)());
    electron_1.ipcMain.handle('save-license', (event, data) => (0, license_checker_1.saveLicense)(data));
    const status = (0, license_checker_1.checkLicense)();
    if (status === 'VALID') {
        initDatabase(); // Copier la base de données modèle si nécessaire
        startNextServer().then(() => {
            mainWindow.loadURL(`http://localhost:${PORT}`);
        }).catch(err => {
            console.error('Failed to start server:', err);
            // Afficher l'erreur dans la fenêtre si possible
        });
    }
    else if (status === 'EXPIRED') {
        mainWindow.loadFile(path_1.default.join(__dirname, 'expired.html'));
    }
    else {
        mainWindow.loadFile(path_1.default.join(__dirname, 'activation.html'));
    }
    if (!isDev) {
        mainWindow.setMenuBarVisibility(false);
    }
}
electron_1.app.whenReady().then(createWindow);
electron_1.app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        serverProcess === null || serverProcess === void 0 ? void 0 : serverProcess.kill();
        electron_1.app.quit();
    }
});
electron_1.app.on('quit', () => {
    serverProcess === null || serverProcess === void 0 ? void 0 : serverProcess.kill();
});
electron_1.app.on('activate', () => {
    if (electron_1.BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});
