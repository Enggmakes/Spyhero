const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  send: (channel, data) => {
    const validSendChannels = [
      'hide-overlay', 
      'copy-clipboard', 
      'save-settings', 
      'open-settings', 
      'resize-window',
      'quit-app',
      'toggle-startup',
      'auto-paste',
      'splash-ready'
    ];
    if (validSendChannels.includes(channel)) {
      ipcRenderer.send(channel, data);
    }
  },
  receive: (channel, func) => {
    const validReceiveChannels = [
      'enhance-text', 
      'settings-updated', 
      'focus-input'
    ];
    if (validReceiveChannels.includes(channel)) {
      // Stripping event argument to prevent leaks
      ipcRenderer.on(channel, (event, ...args) => func(...args));
    }
  },
  invoke: async (channel, data) => {
    const validInvokeChannels = [
      'get-settings',
      'simulate-copy',
      'trigger-paste'
    ];
    if (validInvokeChannels.includes(channel)) {
      return await ipcRenderer.invoke(channel, data);
    }
  }
});
