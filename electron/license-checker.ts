import { machineIdSync } from 'node-machine-id';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { app } from 'electron';

// Clé secrète pour le chiffrement/déchantement (À GARDER PRIVÉE)
const SECRET_KEY = 'geststock-secret-key-system-emed-2026';

export interface License {
  clientName: string;
  machineId: string;
  issuedAt: string;
  expiresAt: string | null;
  signature: string;
}

export type LicenseStatus = 'VALID' | 'MISSING' | 'INVALID' | 'EXPIRED' | 'WRONG_MACHINE';

export function getMachineId(): string {
  return machineIdSync(true);
}

export function getLicensePath(): string {
  // Chemin dans AppData/Roaming/GestStock
  return path.join(app.getPath('userData'), 'geststock.license');
}

function generateSignature(data: any, key: string): string {
  const payload = JSON.stringify({
    clientName: data.clientName,
    machineId: data.machineId,
    issuedAt: data.issuedAt,
    expiresAt: data.expiresAt
  });
  return crypto.createHmac('sha256', key).update(payload).digest('hex');
}

function decrypt(encrypted: string, key: string): string {
  try {
    const [ivHex, encryptedHex] = encrypted.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const keyBuffer = crypto.scryptSync(key, 'geststock-salt', 32);
    const decipher = crypto.createDecipheriv('aes-256-cbc', keyBuffer, iv);
    return decipher.update(encryptedHex, 'hex', 'utf8') + decipher.final('utf8');
  } catch (e) {
    throw new Error('Decryption failed');
  }
}

export function checkLicense(): LicenseStatus {
  const licensePath = getLicensePath();
  
  if (!fs.existsSync(licensePath)) return 'MISSING';

  try {
    const encrypted = fs.readFileSync(licensePath, 'utf8');
    const decrypted = decrypt(encrypted, SECRET_KEY);
    const license: License = JSON.parse(decrypted);

    // 1. Vérifier la signature
    const expectedSig = generateSignature(license, SECRET_KEY);
    if (license.signature !== expectedSig) return 'INVALID';

    // 2. Vérifier la machine
    if (license.machineId !== getMachineId()) return 'WRONG_MACHINE';

    // 3. Vérifier l'expiration
    if (license.expiresAt) {
      if (new Date() > new Date(license.expiresAt)) return 'EXPIRED';
    }

    return 'VALID';
  } catch (error) {
    return 'INVALID';
  }
}

export function saveLicense(licenseContent: string): boolean {
  try {
    // Vérifier si la licence est valide avant de sauvegarder
    const decrypted = decrypt(licenseContent, SECRET_KEY);
    const license: License = JSON.parse(decrypted);
    
    if (license.machineId !== getMachineId()) return false;
    
    const expectedSig = generateSignature(license, SECRET_KEY);
    if (license.signature !== expectedSig) return false;

    fs.writeFileSync(getLicensePath(), licenseContent);
    return true;
  } catch (e) {
    return false;
  }
}
