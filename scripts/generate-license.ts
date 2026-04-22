import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

const SECRET_KEY = 'geststock-secret-key-system-emed-2026';

function encrypt(text: string, key: string): string {
  const iv = crypto.randomBytes(16);
  const keyBuffer = crypto.scryptSync(key, 'geststock-salt', 32);
  const cipher = crypto.createCipheriv('aes-256-cbc', keyBuffer, iv);
  const encrypted = cipher.update(text, 'utf8', 'hex') + cipher.final('hex');
  return `${iv.toString('hex')}:${encrypted}`;
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

async function run() {
    const readline = require('readline').createInterface({
        input: process.stdin,
        output: process.stdout
    });

    const question = (query: string) => new Promise<string>(resolve => readline.question(query, resolve));

    console.log('--- GÉNÉRATEUR DE LICENCE GESTSTOCK ---');
    const clientName = await question('Nom du client : ');
    const machineId = await question('ID Machine du client : ');
    const duration = await question('Durée (en jours, laissez vide pour à VIE) : ');

    readline.close();

    const issuedAt = new Date().toISOString();
    let expiresAt = null;
    if (duration) {
        const d = new Date();
        d.setDate(d.getDate() + parseInt(duration));
        expiresAt = d.toISOString();
    }

    const licenseData: any = {
        clientName,
        machineId,
        issuedAt,
        expiresAt
    };

    licenseData.signature = generateSignature(licenseData, SECRET_KEY);

    const encrypted = encrypt(JSON.stringify(licenseData), SECRET_KEY);
    const filename = `${clientName.replace(/\s+/g, '_')}_license.txt`;
    
    fs.writeFileSync(filename, encrypted);
    console.log(`\n✅ Licence générée avec succès : ${filename}`);
    console.log('Envoyez ce fichier au client.');
}

run();
