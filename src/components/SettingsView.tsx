import { useState, useEffect } from 'react';
import { Key, Keyboard, Eye, EyeOff, Save, RotateCcw, ChevronRight, Check, Trash } from 'lucide-react';


export default function SettingsView() {
  const [settings, setSettings] = useState<any>(null);
  
  // Local Config Form State
  const [provider, setProvider] = useState('gemini');
  const [keys, setKeys] = useState<Record<string, string>>({});
  const [models, setModels] = useState<Record<string, string>>({});
  const [temperature, setTemperature] = useState(0.7);
  const [autopaste, setAutopaste] = useState(true);
  const [launchOnStartup, setLaunchOnStartup] = useState(false);
  const [shortcut, setShortcut] = useState('CommandOrControl+Shift+P');

  // UI Utilities
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});
  const [savedStatus, setSavedStatus] = useState(false);
  const [recording, setRecording] = useState(false);

  // Model Recommendations
  const modelPresets: Record<string, string[]> = {
    openai: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'o1-mini'],
    anthropic: ['claude-3-5-sonnet-latest', 'claude-3-5-haiku-latest', 'claude-3-opus-latest'],
    gemini: ['gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-2.0-flash-exp'],
    groq: ['llama3-70b-8192', 'llama3-8b-8192', 'mixtral-8x7b-32768', 'gemma2-9b-it'],
    openrouter: ['google/gemini-2.5-flash', 'anthropic/claude-3.5-sonnet', 'openai/gpt-4o-mini', 'meta-llama/llama-3.1-70b-instruct']
  };

  useEffect(() => {
    // Read current settings from main process
    window.api.invoke('get-settings').then((config) => {
      if (config) {
        setSettings(config);
        setProvider(config.provider);
        setKeys(config.keys || {});
        setModels(config.models || {});
        setTemperature(config.temperature);
        setAutopaste(config.autopaste);
        setLaunchOnStartup(config.launchOnStartup);
        setShortcut(config.shortcut);
      }
    });
  }, []);

  const handleSave = () => {
    const updated = {
      provider,
      keys,
      models,
      temperature,
      autopaste,
      launchOnStartup,
      shortcut
    };
    
    // Save settings via IPC
    window.api.send('save-settings', updated);
    
    // Set visual confirmation
    setSavedStatus(true);
    setTimeout(() => setSavedStatus(false), 2000);
  };

  const handleReset = () => {
    if (confirm('Are you sure you want to restore default configurations?')) {
      const defaults = {
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
        shortcut: 'CommandOrControl+Shift+P'
      };
      
      setProvider(defaults.provider);
      setKeys(defaults.keys);
      setModels(defaults.models);
      setTemperature(defaults.temperature);
      setAutopaste(defaults.autopaste);
      setLaunchOnStartup(defaults.launchOnStartup);
      setShortcut(defaults.shortcut);
      
      window.api.send('save-settings', defaults);
      setSavedStatus(true);
      setTimeout(() => setSavedStatus(false), 2000);
    }
  };

  const handleKeyChange = (prov: string, val: string) => {
    setKeys(prev => ({ ...prev, [prov]: val }));
  };

  const handleModelChange = (prov: string, val: string) => {
    setModels(prev => ({ ...prev, [prov]: val }));
  };

  const toggleKeyVisibility = (prov: string) => {
    setShowKeys(prev => ({ ...prev, [prov]: !prev[prov] }));
  };

  const clearHistory = () => {
    if (confirm('Are you sure you want to clear recent prompt history?')) {
      localStorage.removeItem('spyhero_history');
      alert('Prompt history has been successfully cleared!');
    }
  };

  // Keyboard shortcut recording implementation
  const startRecording = () => {
    setRecording(true);
  };

  useEffect(() => {
    if (!recording) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();

      // We need standard Electron keystroke translations
      const keysPressed: string[] = [];

      // Modifiers
      if (e.ctrlKey) keysPressed.push('Control');
      if (e.shiftKey) keysPressed.push('Shift');
      if (e.altKey) keysPressed.push('Alt');
      if (e.metaKey) keysPressed.push('CommandOrControl'); // Meta key translates to Cmd on Mac, Ctrl on Win

      // Standard Keys
      const mainKey = e.key.toUpperCase();
      const forbiddenKeys = ['CONTROL', 'SHIFT', 'ALT', 'META'];

      if (mainKey && !forbiddenKeys.includes(mainKey)) {
        // Handle special key naming conventions in Electron
        if (mainKey === 'ARROWUP') keysPressed.push('Up');
        else if (mainKey === 'ARROWDOWN') keysPressed.push('Down');
        else if (mainKey === 'ARROWLEFT') keysPressed.push('Left');
        else if (mainKey === 'ARROWRIGHT') keysPressed.push('Right');
        else if (mainKey === ' ') keysPressed.push('Space');
        else keysPressed.push(mainKey);
        
        // Finalize key recording once a full combo is formed
        if (keysPressed.length > 1) {
          const formattedCombo = keysPressed.join('+');
          setShortcut(formattedCombo);
          setRecording(false);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [recording]);

  if (!settings) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-neutral-950 text-neutral-400 font-sans">
        <div className="text-sm font-mono animate-pulse">Loading configurations...</div>
      </div>
    );
  }

  return (
    <div className="w-full h-full bg-neutral-950 text-neutral-200 p-6 flex flex-col justify-between font-sans selection:bg-neutral-800 select-none">
      
      {/* Content wrapper */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/5 mb-5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shadow-[inset_1px_1px_rgba(255,255,255,0.05),0_4px_8px_rgba(0,0,0,0.3)]">
              <Key className="w-4 h-4 text-neutral-300" />
            </div>
            <div>
              <h1 className="text-base font-bold tracking-wide">SpyHero Configurations</h1>
              <p className="text-[11px] text-neutral-500 mt-0.5">Manage credentials, keys, models, and background behaviors</p>
            </div>
          </div>
          <span className="text-[10px] font-mono px-2 py-1 rounded bg-neutral-900 border border-white/5 text-neutral-400">
            BYOK Engine v1.0
          </span>
        </div>

        {/* Configurations Layout Columns */}
        <div className="flex-1 grid grid-cols-5 gap-6 overflow-hidden">
          
          {/* Left panel: Provider Choice & Preferences */}
          <div className="col-span-2 flex flex-col gap-4 overflow-y-auto pr-2 custom-scrollbar">
            
            {/* Box 1: Select LLM Provider */}
            <div className="p-4 rounded-2xl bg-neutral-900/40 border border-white/5 flex flex-col gap-3 shadow-[inset_1px_1px_rgba(255,255,255,0.02)]">
              <h2 className="text-xs font-bold text-neutral-400 uppercase tracking-wider flex items-center gap-1.5">
                <ChevronRight className="w-3.5 h-3.5 text-neutral-500" /> Active AI Provider
              </h2>
              
              <div className="flex flex-col gap-1.5">
                {['gemini', 'openai', 'anthropic', 'groq', 'openrouter'].map((p) => (
                  <button
                    key={p}
                    onClick={() => setProvider(p)}
                    className={`w-full h-10 px-3.5 rounded-xl border text-left text-xs font-semibold flex items-center justify-between transition duration-150 ${
                      provider === p
                        ? 'bg-white text-neutral-950 border-white shadow-[0_4px_12px_rgba(255,255,255,0.08),inset_1px_1px_rgba(255,255,255,0.4)]'
                        : 'bg-neutral-950/20 text-neutral-400 border-white/5 hover:border-white/10 hover:text-neutral-200'
                    }`}
                  >
                    <span>{p.toUpperCase()}</span>
                    {provider === p && <Check className="w-3.5 h-3.5 text-neutral-950" />}
                  </button>
                ))}
              </div>
            </div>

            {/* Box 2: System Shortcut & Behavior */}
            <div className="p-4 rounded-2xl bg-neutral-900/40 border border-white/5 flex flex-col gap-3 shadow-[inset_1px_1px_rgba(255,255,255,0.02)]">
              <h2 className="text-xs font-bold text-neutral-400 uppercase tracking-wider flex items-center gap-1.5">
                <Keyboard className="w-3.5 h-3.5 text-neutral-500" /> Trigger & Behavior
              </h2>

              {/* Shortcut recorder */}
              <div className="flex flex-col gap-1">
                <span className="text-[11px] text-neutral-500">Global Shortcut Trigger</span>
                <div className="flex gap-2 mt-1">
                  <div className="flex-1 h-9 px-3 rounded-lg bg-neutral-950 border border-white/5 text-xs text-neutral-400 font-mono flex items-center shadow-[inset_1px_1px_rgba(0,0,0,0.2)]">
                    {recording ? 'Recording keys...' : shortcut.replace('CommandOrControl', 'Ctrl')}
                  </div>
                  <button
                    onClick={startRecording}
                    className={`h-9 px-3 rounded-lg border text-xs font-semibold transition duration-150 ${
                      recording 
                        ? 'bg-neutral-200 text-neutral-950 border-neutral-200 animate-pulse'
                        : 'bg-neutral-900 border-white/10 text-neutral-300 hover:bg-neutral-800'
                    }`}
                  >
                    {recording ? 'Stop' : 'Record'}
                  </button>
                </div>
              </div>

              {/* Autopaste Toggle */}
              <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/5">
                <div>
                  <div className="text-xs font-semibold text-neutral-300">Auto-paste result</div>
                  <div className="text-[10px] text-neutral-500 mt-0.5">Auto paste enhanced text into target</div>
                </div>
                <input 
                  type="checkbox" 
                  checked={autopaste}
                  onChange={(e) => setAutopaste(e.target.checked)}
                  className="w-8 h-4 rounded bg-neutral-800 border-none text-white focus:ring-0 accent-neutral-300 cursor-pointer"
                />
              </div>

              {/* Startup Toggle */}
              <div className="flex items-center justify-between pt-1">
                <div>
                  <div className="text-xs font-semibold text-neutral-300">Launch on startup</div>
                  <div className="text-[10px] text-neutral-500 mt-0.5">Start silently in background on login</div>
                </div>
                <input 
                  type="checkbox" 
                  checked={launchOnStartup}
                  onChange={(e) => setLaunchOnStartup(e.target.checked)}
                  className="w-8 h-4 rounded bg-neutral-800 border-none text-white focus:ring-0 accent-neutral-300 cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* Right panel: Specific Provider Keys & Parameters */}
          <div className="col-span-3 p-5 rounded-3xl bg-neutral-900/20 border border-white/5 flex flex-col justify-between overflow-y-auto custom-scrollbar shadow-[inset_1px_1px_rgba(255,255,255,0.01)]">
            
            <div className="flex flex-col gap-5">
              <h2 className="text-xs font-bold text-neutral-400 uppercase tracking-wider flex items-center gap-1.5">
                <ChevronRight className="w-3.5 h-3.5 text-neutral-500" /> {provider.toUpperCase()} Settings
              </h2>

              {/* API Key Input */}
              <div className="flex flex-col gap-1.5">
                <span className="text-[11px] text-neutral-400 font-semibold flex items-center justify-between">
                  <span>API Access Key</span>
                  <span className="text-[10px] text-neutral-500 font-mono">Stored securely locally</span>
                </span>
                <div className="relative">
                  <input
                    type={showKeys[provider] ? 'text' : 'password'}
                    value={keys[provider] || ''}
                    onChange={(e) => handleKeyChange(provider, e.target.value)}
                    placeholder={`Paste your private ${provider} API key...`}
                    className="w-full h-10 pl-3.5 pr-10 rounded-xl bg-neutral-950 border border-white/5 text-xs text-neutral-200 outline-none focus:border-white/20 transition duration-150 placeholder-neutral-700 font-mono shadow-[inset_1px_1px_rgba(0,0,0,0.3)]"
                  />
                  <button
                    onClick={() => toggleKeyVisibility(provider)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-300 p-0.5"
                  >
                    {showKeys[provider] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Model Custom input or Presets list */}
              <div className="flex flex-col gap-1.5">
                <span className="text-[11px] text-neutral-400 font-semibold flex items-center justify-between">
                  <span>Model Selector</span>
                  <span className="text-[10px] text-neutral-500 font-mono">Select preset or enter custom</span>
                </span>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={models[provider] || ''}
                    onChange={(e) => handleModelChange(provider, e.target.value)}
                    placeholder={`e.g. ${modelPresets[provider]?.[0] || 'model-name'}`}
                    className="flex-1 h-10 px-3.5 rounded-xl bg-neutral-950 border border-white/5 text-xs text-neutral-200 outline-none focus:border-white/20 transition duration-150 font-mono shadow-[inset_1px_1px_rgba(0,0,0,0.3)]"
                  />
                  
                  {/* Quick Select Presets Select box */}
                  <select
                    onChange={(e) => {
                      if (e.target.value) handleModelChange(provider, e.target.value);
                    }}
                    value=""
                    className="w-32 h-10 px-2 rounded-xl bg-neutral-900 border border-white/10 text-xs text-neutral-400 outline-none focus:border-white/20 transition duration-150 cursor-pointer"
                  >
                    <option value="" disabled>Presets...</option>
                    {modelPresets[provider]?.map((mPreset) => (
                      <option key={mPreset} value={mPreset}>{mPreset}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Temperature Slider */}
              <div className="flex flex-col gap-2.5 pt-2">
                <div className="flex justify-between items-center text-[11px] text-neutral-400 font-semibold">
                  <span>Creativity Temperature</span>
                  <span className="font-mono text-neutral-300 bg-neutral-950 px-2 py-0.5 rounded border border-white/5">
                    {temperature.toFixed(1)}
                  </span>
                </div>
                <input
                  type="range"
                  min="0.0"
                  max="1.2"
                  step="0.1"
                  value={temperature}
                  onChange={(e) => setTemperature(parseFloat(e.target.value))}
                  className="w-full accent-white bg-neutral-950 h-1.5 rounded-lg appearance-none cursor-pointer border border-white/5"
                />
                <div className="flex justify-between text-[9px] text-neutral-600 font-mono">
                  <span>0.0 (Strict/Deterministic)</span>
                  <span>0.7 (Balanced)</span>
                  <span>1.2 (Highly Creative)</span>
                </div>
              </div>
            </div>

            {/* Clear Prompt history */}
            <div className="pt-4 border-t border-white/5 mt-6 flex justify-between items-center bg-neutral-900/10 p-3.5 rounded-2xl">
              <div>
                <span className="text-xs font-semibold text-neutral-400 block">Prompt History Data</span>
                <span className="text-[10px] text-neutral-500">Recent prompt cache stored locally</span>
              </div>
              <button
                onClick={clearHistory}
                className="h-8 px-3 rounded-lg border border-white/5 bg-neutral-950 text-neutral-400 hover:text-red-400 hover:border-red-500/20 transition duration-150 text-xs flex items-center gap-1 font-semibold"
              >
                <Trash className="w-3.5 h-3.5" /> Clear History
              </button>
            </div>

          </div>

        </div>
      </div>

      {/* Save Action Row */}
      <div className="h-14 mt-4 pt-4 border-t border-white/5 flex gap-3 items-center justify-between">
        <button
          onClick={handleReset}
          className="h-10 px-4 rounded-xl border border-white/5 bg-neutral-900 text-neutral-400 hover:text-neutral-200 transition duration-150 text-xs font-semibold flex items-center gap-1.5"
        >
          <RotateCcw className="w-3.5 h-3.5" /> Reset Defaults
        </button>

        <div className="flex gap-2">
          {savedStatus && (
            <div className="h-10 px-4 rounded-xl bg-neutral-900/60 border border-green-500/10 text-green-400 flex items-center justify-center gap-1.5 text-xs font-semibold font-mono animate-fade-in shadow-[inset_1px_1px_rgba(255,255,255,0.01)]">
              <Check className="w-4 h-4" /> Configs Saved
            </div>
          )}
          <button
            onClick={handleSave}
            className="h-10 px-6 rounded-xl bg-white text-neutral-950 hover:bg-neutral-200 transition duration-150 text-xs font-bold flex items-center gap-1.5 shadow-[0_4px_12px_rgba(255,255,255,0.1),inset_1px_1px_rgba(255,255,255,0.4)]"
          >
            <Save className="w-3.5 h-3.5" /> Save Configurations
          </button>
        </div>
      </div>

    </div>
  );
}
