"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMachineId = getMachineId;
exports.getLicensePath = getLicensePath;
exports.checkLicense = checkLicense;
exports.saveLicense = saveLicense;
const node_machine_id_1 = require("node-machine-id");
const crypto = __importStar(require("crypto"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const electron_1 = require("electron");
// Clé secrète pour le chiffrement/déchantement (À GARDER PRIVÉE)
const SECRET_KEY = 'geststock-secret-key-system-emed-2026';
function getMachineId() {
    return (0, node_machine_id_1.machineIdSync)(true);
}
function getLicensePath() {
    // Chemin dans AppData/Roaming/GestStock
    return path.join(electron_1.app.getPath('userData'), 'geststock.license');
}
function generateSignature(data, key) {
    const payload = JSON.stringify({
        clientName: data.clientName,
        machineId: data.machineId,
        issuedAt: data.issuedAt,
        expiresAt: data.expiresAt
    });
    return crypto.createHmac('sha256', key).update(payload).digest('hex');
}
function decrypt(encrypted, key) {
    try {
        const [ivHex, encryptedHex] = encrypted.split(':');
        const iv = Buffer.from(ivHex, 'hex');
        const keyBuffer = crypto.scryptSync(key, 'geststock-salt', 32);
        const decipher = crypto.createDecipheriv('aes-256-cbc', keyBuffer, iv);
        return decipher.update(encryptedHex, 'hex', 'utf8') + decipher.final('utf8');
    }
    catch (e) {
        throw new Error('Decryption failed');
    }
}
function checkLicense() {
    const licensePath = getLicensePath();
    if (!fs.existsSync(licensePath))
        return 'MISSING';
    try {
        const encrypted = fs.readFileSync(licensePath, 'utf8');
        const decrypted = decrypt(encrypted, SECRET_KEY);
        const license = JSON.parse(decrypted);
        // 1. Vérifier la signature
        const expectedSig = generateSignature(license, SECRET_KEY);
        if (license.signature !== expectedSig)
            return 'INVALID';
        // 2. Vérifier la machine
        if (license.machineId !== getMachineId())
            return 'WRONG_MACHINE';
        // 3. Vérifier l'expiration
        if (license.expiresAt) {
            if (new Date() > new Date(license.expiresAt))
                return 'EXPIRED';
        }
        return 'VALID';
    }
    catch (error) {
        return 'INVALID';
    }
}
function saveLicense(licenseContent) {
    try {
        // Vérifier si la licence est valide avant de sauvegarder
        const decrypted = decrypt(licenseContent, SECRET_KEY);
        const license = JSON.parse(decrypted);
        if (license.machineId !== getMachineId())
            return false;
        const expectedSig = generateSignature(license, SECRET_KEY);
        if (license.signature !== expectedSig)
            return false;
        fs.writeFileSync(getLicensePath(), licenseContent);
        return true;
    }
    catch (e) {
        return false;
    }
}
