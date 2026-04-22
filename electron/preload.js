"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
electron_1.contextBridge.exposeInMainWorld('electronAPI', {
    getMachineId: () => electron_1.ipcRenderer.invoke('get-machine-id'),
    saveLicense: (licenseData) => electron_1.ipcRenderer.invoke('save-license', licenseData),
});
