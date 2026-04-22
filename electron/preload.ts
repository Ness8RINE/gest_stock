import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  getMachineId: () => ipcRenderer.invoke('get-machine-id'),
  saveLicense: (licenseData: string) => ipcRenderer.invoke('save-license', licenseData),
});
