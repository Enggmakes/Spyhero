import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// Graceful Web Browser Fallback (Mock API) if running outside of Electron
if (typeof window !== 'undefined' && !window.api) {
  console.warn("⚠️ SpyHero: running in browser demo mode. Electron APIs are mocked.");
  
  const defaultSettings = {
    provider: 'gemini',
    keys: { openai: '', anthropic: '', gemini: '', groq: '', openrouter: '' },
    models: {
      openai: 'gpt-4o',
      anthropic: 'claude-3-5-sonnet-latest',
      gemini: 'gemini-1.5-flash',
      groq: 'llama3-70b-8192',
      openrouter: 'google/gemini-2.5-flash'
    },
    temperature: 0.7,
    autopaste: true,
    launchOnStartup: false,
    shortcut: 'Ctrl+Shift+P'
  };

  const getLocalSettings = () => {
    try {
      const stored = localStorage.getItem('spyhero_mock_settings');
      return stored ? JSON.parse(stored) : defaultSettings;
    } catch {
      return defaultSettings;
    }
  };

  const saveLocalSettings = (data: any) => {
    try {
      localStorage.setItem('spyhero_mock_settings', JSON.stringify(data));
    } catch (e) {
      console.error(e);
    }
  };

  const listeners: Record<string, ((...args: any[]) => void)[]> = {};

  window.api = {
    isMock: true,
    invoke: async (channel: string, data?: any) => {
      console.log(`[Mock API invoke] Channel: ${channel}`, data);
      if (channel === 'get-settings') {
        return getLocalSettings();
      }
      return null;
    },
    send: (channel: string, data?: any) => {
      console.log(`[Mock API send] Channel: ${channel}`, data);
      if (channel === 'save-settings') {
        saveLocalSettings(data);
        // Trigger simulated update event
        if (listeners['settings-updated']) {
          listeners['settings-updated'].forEach(cb => cb(data));
        }
      } else if (channel === 'copy-clipboard') {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(data).then(() => {
            console.log("[Mock API] Successfully copied to browser clipboard:", data);
          }).catch(err => {
            console.error("[Mock API] Clipboard copy failed:", err);
          });
        }
      } else if (channel === 'close-window') {
        console.log("[Mock API] Overlay window closed.");
      }
    },
    receive: (channel: string, func: (...args: any[]) => void) => {
      if (!listeners[channel]) {
        listeners[channel] = [];
      }
      listeners[channel].push(func);
      
      // Expose a helper to let the user simulate highlighting text easily in their browser console!
      if (channel === 'enhance-text') {
        console.log(
          "%c🦸 SpyHero Browser Demo Mode Active!", 
          "color: #a96cff; font-weight: bold; font-size: 14px;"
        );
        console.log(
          "To simulate capturing highlighted text in browser demo mode, paste this into your console:\n" +
          "window.simulateTextCapture('Your prompt goes here');"
        );
        
        (window as any).simulateTextCapture = (text: string) => {
          func({ text, originalClipboard: '' });
        };
      }
    }
  };
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

