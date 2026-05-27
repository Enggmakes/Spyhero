import { useState, useEffect, useRef } from 'react';
import { Cpu, Copy, RefreshCw, Settings, X, ArrowLeft, Check, History, Zap } from 'lucide-react';
import { enhancePrompt, ENHANCEMENT_MODES } from '../utils/llm';
import type { EnhancementModeKey } from '../utils/llm';


// Setup type safety for Electron's secure IPC bridge
declare global {
  interface Window {
    api: {
      send: (channel: string, data?: any) => void;
      receive: (channel: string, func: (...args: any[]) => void) => void;
      invoke: (channel: string, data?: any) => Promise<any>;
    };
  }
}

export default function OverlayView() {
  const [settings, setSettings] = useState<any>(null);
  const [inputPrompt, setInputPrompt] = useState('');
  const [enhancedPrompt, setEnhancedPrompt] = useState('');
  const [activeMode, setActiveMode] = useState<EnhancementModeKey>('general');
  
  const [status, setStatus] = useState<'input' | 'loading' | 'success' | 'error'>('input');
  const [errorMessage, setErrorMessage] = useState('');
  const [copied, setCopied] = useState(false);
  const [recentPrompts, setRecentPrompts] = useState<{ id: string; original: string; enhanced: string; mode: string }[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Load Settings and Listeners
  useEffect(() => {
    // 1. Fetch persistent BYOK settings from Electron
    window.api.invoke('get-settings').then((res) => {
      setSettings(res);
    });

    // 2. Load recent prompts from localStorage
    try {
      const historyData = localStorage.getItem('spyhero_history');
      if (historyData) {
        setRecentPrompts(JSON.parse(historyData));
      }
    } catch (e) {
      console.error(e);
    }

    // 3. Listen for text captured from active screen selection
    window.api.receive('enhance-text', (data: any) => {
      const capturedText = data.text || '';
      
      if (capturedText.trim()) {
        setInputPrompt(capturedText);
        setStatus('loading');
        // Instantly trigger auto-enhancement if text was captured
        runEnhancement(capturedText, activeMode);
      } else {
        // Fallback: If no selection, show input form and pre-fill with clipboard if it has text
        setStatus('input');
        if (data.originalClipboard && data.originalClipboard.length < 500) {
          setInputPrompt(data.originalClipboard);
        }
        setTimeout(() => textareaRef.current?.focus(), 150);
      }
    });

    // Listen for setting updates
    window.api.receive('settings-updated', (updatedSettings: any) => {
      setSettings(updatedSettings);
    });

    // Listen for Escape key to close window
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeOverlay();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeMode]);

  // Core Prompt Enhancement Engine Caller
  const runEnhancement = async (textToEnhance: string, modeToUse: EnhancementModeKey) => {
    if (!textToEnhance.trim()) return;
    
    setStatus('loading');
    setErrorMessage('');
    
    try {
      // Fetch latest settings dynamically
      const currentSettings = await window.api.invoke('get-settings');
      
      const result = await enhancePrompt(textToEnhance, modeToUse, currentSettings);
      setEnhancedPrompt(result);
      setStatus('success');

      // Auto-copy back to clipboard
      window.api.send('copy-clipboard', result);
      
      // Auto-paste back if toggled on in settings (defaults to true)
      if (currentSettings.autopaste !== false) {
        window.api.send('auto-paste', result);
      }



      // Add to history
      const newHistoryItem = {
        id: Date.now().toString(),
        original: textToEnhance,
        enhanced: result,
        mode: modeToUse
      };
      const updatedHistory = [newHistoryItem, ...recentPrompts.slice(0, 19)];
      setRecentPrompts(updatedHistory);
      localStorage.setItem('spyhero_history', JSON.stringify(updatedHistory));

    } catch (error: any) {
      console.error(error);
      setStatus('error');
      setErrorMessage(error?.message || 'An unexpected error occurred while refining your prompt.');
    }
  };

  const handleManualEnhance = () => {
    runEnhancement(inputPrompt, activeMode);
  };

  const handleModeChange = (mode: EnhancementModeKey) => {
    setActiveMode(mode);
    if (status === 'success' || status === 'error') {
      // Re-trigger if already completed or failed
      runEnhancement(inputPrompt, mode);
    }
  };

  const handleCopy = () => {
    window.api.send('copy-clipboard', enhancedPrompt);
    window.api.send('auto-paste', enhancedPrompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const closeOverlay = () => {
    window.api.send('hide-overlay');
    // Clean states slightly
    setTimeout(() => {
      setStatus('input');
      setEnhancedPrompt('');
      setErrorMessage('');
    }, 300);
  };

  const openSettings = () => {
    window.api.send('open-settings');
  };

  const selectHistoryItem = (item: any) => {
    setInputPrompt(item.original);
    setEnhancedPrompt(item.enhanced);
    setActiveMode(item.mode as EnhancementModeKey);
    setStatus('success');
    setShowHistory(false);
  };

  return (
    <div className="w-full h-full p-4 flex flex-col items-center justify-center select-none font-sans">
      {/* Sleek Frameless Claymorphic Backdrop Layer */}
      <div className="w-[590px] h-[410px] bg-neutral-900/90 backdrop-blur-md rounded-3xl border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.5),inset_1px_1px_rgba(255,255,255,0.06)] flex flex-col overflow-hidden text-neutral-200">
        
        {/* Claymorphic Header */}
        <div className="h-14 px-5 border-b border-white/5 flex items-center justify-between bg-neutral-950/20">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-white/5 flex items-center justify-center shadow-[inset_1px_1px_rgba(255,255,255,0.05),0_2px_4px_rgba(0,0,0,0.3)]">
              <Zap className="w-3.5 h-3.5 text-neutral-400" />
            </div>
            <span className="font-semibold text-sm tracking-wide bg-gradient-to-r from-neutral-200 to-neutral-400 bg-clip-text text-transparent">
              SPYHERO
            </span>
            <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-neutral-400">
              Utility
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button 
              onClick={() => setShowHistory(!showHistory)}
              className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-200 hover:bg-white/5 transition duration-200"
              title="Recent Prompts"
            >
              <History className="w-4 h-4" />
            </button>
            <button 
              onClick={openSettings}
              className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-200 hover:bg-white/5 transition duration-200"
              title="Settings"
            >
              <Settings className="w-4 h-4" />
            </button>
            <button 
              onClick={closeOverlay}
              className="p-1.5 rounded-lg text-neutral-500 hover:text-neutral-200 hover:bg-white/5 transition duration-200"
              title="Close (Esc)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* History Slide Panel */}
        {showHistory ? (
          <div className="flex-1 p-4 flex flex-col bg-neutral-950/40">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-400 flex items-center gap-1.5">
                <History className="w-3.5 h-3.5" /> Recent Enhancements
              </h3>
              <button 
                onClick={() => setShowHistory(false)}
                className="text-xs text-neutral-500 hover:text-neutral-300 flex items-center gap-1"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Back
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
              {recentPrompts.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-4">
                  <p className="text-sm text-neutral-500">No prompt history found yet.</p>
                  <p className="text-[11px] text-neutral-600 mt-1">Refined prompts will save locally here.</p>
                </div>
              ) : (
                recentPrompts.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => selectHistoryItem(item)}
                    className="w-full text-left p-3 rounded-xl bg-white/5 border border-white/5 hover:border-white/10 hover:bg-white/10 transition duration-150 flex flex-col gap-1.5 shadow-[inset_1px_1px_rgba(255,255,255,0.02)]"
                  >
                    <div className="flex justify-between items-center text-[10px]">
                      <span className="text-neutral-500 font-mono">Original:</span>
                      <span className="px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-400 font-mono text-[9px]">
                        {item.mode}
                      </span>
                    </div>
                    <p className="text-xs text-neutral-300 truncate w-full">{item.original}</p>
                    <div className="text-[10px] text-neutral-500 font-mono mt-0.5">Enhanced:</div>
                    <p className="text-xs text-neutral-400 truncate w-full italic">{item.enhanced}</p>
                  </button>
                ))
              )}
            </div>
          </div>
        ) : (
          /* Main Workspace Container */
          <div className="flex-1 flex flex-col overflow-hidden relative">

            {/* View State 1: Input / Manual Form */}
            {status === 'input' && (
              <div className="flex-1 p-4 flex flex-col gap-3 justify-between overflow-hidden">
                <div className="flex-1 flex flex-col bg-neutral-950/20 rounded-2xl border border-white/5 shadow-[inset_1px_1px_rgba(0,0,0,0.2)] overflow-hidden">
                  <textarea
                    ref={textareaRef}
                    value={inputPrompt}
                    onChange={(e) => setInputPrompt(e.target.value)}
                    placeholder="No text was selected. Type a rough prompt or paste clipboard text here..."
                    className="flex-1 w-full bg-transparent resize-none p-3.5 text-sm text-neutral-200 outline-none placeholder-neutral-600 border-none font-sans"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && e.ctrlKey) {
                        e.preventDefault();
                        handleManualEnhance();
                      }
                    }}
                  />
                  <div className="h-9 px-3 flex items-center justify-between border-t border-white/5 bg-neutral-950/10 text-[10px] text-neutral-500 font-mono">
                    <span>Press <kbd className="bg-neutral-800 px-1 py-0.5 rounded text-neutral-400">Ctrl + Enter</kbd> to enhance</span>
                    {inputPrompt.trim() && <span>{inputPrompt.length} chars</span>}
                  </div>
                </div>

                {/* Mode Selector Row */}
                <div className="flex flex-col gap-2">
                  <span className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wider pl-1">
                    Select Enhancement Style
                  </span>
                  <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                    {Object.keys(ENHANCEMENT_MODES).map((modeKey) => (
                      <button
                        key={modeKey}
                        onClick={() => setActiveMode(modeKey as EnhancementModeKey)}
                        className={`text-xs px-3 py-1.5 rounded-xl border whitespace-nowrap transition duration-200 font-medium ${
                          activeMode === modeKey
                            ? 'bg-white text-neutral-950 border-white shadow-[0_4px_12px_rgba(255,255,255,0.15),inset_1px_1px_rgba(255,255,255,0.4)]'
                            : 'bg-neutral-950/30 text-neutral-400 border-white/5 hover:border-white/10 hover:text-neutral-200'
                        }`}
                      >
                        {modeKey.charAt(0).toUpperCase() + modeKey.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Enhance Action Row */}
                <div className="flex gap-2.5">
                  <button
                    onClick={handleManualEnhance}
                    disabled={!inputPrompt.trim()}
                    className="flex-1 h-11 rounded-2xl bg-white text-neutral-950 hover:bg-neutral-200 transition duration-200 font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-50 disabled:pointer-events-none shadow-[0_8px_20px_rgba(255,255,255,0.1),inset_1px_1px_rgba(255,255,255,0.4)]"
                  >
                    <Cpu className="w-4 h-4" /> Enhance Prompt
                  </button>
                </div>
              </div>
            )}

            {/* View State 2: Loading State */}
            {status === 'loading' && (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-neutral-950/15">
                <div className="relative mb-6">
                  {/* Rotating Outer Ring */}
                  <div className="w-16 h-16 rounded-full border border-neutral-800 border-t-neutral-400 animate-spin"></div>
                  {/* Sleek Central Icon */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Cpu className="w-6 h-6 text-neutral-400 animate-pulse" />
                  </div>
                </div>

                <h3 className="text-base font-semibold tracking-wide text-neutral-200">
                  Refining with AI...
                </h3>
                <p className="text-xs text-neutral-500 mt-2 max-w-[320px] font-mono leading-relaxed">
                  Optimizing your instructions, improving clarity, and preparing optimized prompt output.
                </p>
                
                {/* Visual loading bar indicator */}
                <div className="w-[180px] h-1.5 bg-neutral-950/60 rounded-full border border-white/5 overflow-hidden mt-6 shadow-[inset_1px_1px_rgba(0,0,0,0.2)]">
                  <div className="h-full bg-gradient-to-r from-neutral-600 to-neutral-200 rounded-full animate-loading-bar w-1/2"></div>
                </div>
              </div>
            )}

            {/* View State 3: Success Result */}
            {status === 'success' && (
              <div className="flex-1 p-4 flex flex-col gap-3 justify-between overflow-hidden">
                <div className="flex-1 flex flex-col bg-neutral-950/20 rounded-2xl border border-white/5 overflow-hidden shadow-[inset_1px_1px_rgba(0,0,0,0.3)]">
                  <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-white/5 bg-neutral-950/10 text-xs">
                    <div className="flex items-center gap-1.5 text-neutral-400 font-medium">
                      <Cpu className="w-3.5 h-3.5 text-neutral-400" />
                      <span>Optimized Prompt ({activeMode})</span>
                    </div>
                    {settings?.autopaste !== false && (
                      <span className="flex items-center gap-1 text-[10px] font-mono text-neutral-500 py-0.5 px-1.5 rounded bg-neutral-800/40">
                        <Check className="w-2.5 h-2.5 text-neutral-400" /> Auto-pasted
                      </span>
                    )}
                  </div>
                  <div className="flex-1 p-3.5 overflow-y-auto text-sm text-neutral-300 font-sans select-text select-all leading-relaxed custom-scrollbar selection:bg-neutral-800">
                    {enhancedPrompt}
                  </div>
                  <div className="h-9 px-3.5 flex items-center justify-between border-t border-white/5 bg-neutral-950/10 text-[10px] text-neutral-500 font-mono">
                    <span>Press <kbd className="bg-neutral-800 px-1 py-0.5 rounded text-neutral-400">Esc</kbd> to exit</span>
                    <span>{enhancedPrompt.length} chars</span>
                  </div>
                </div>

                {/* Sub-modes inline switcher */}
                <div className="flex items-center gap-1.5 justify-between">
                  <div className="flex gap-1 overflow-x-auto scrollbar-none py-1">
                    {Object.keys(ENHANCEMENT_MODES).map((modeKey) => (
                      <button
                        key={modeKey}
                        onClick={() => handleModeChange(modeKey as EnhancementModeKey)}
                        className={`text-[10px] px-2.5 py-1.5 rounded-lg border whitespace-nowrap transition duration-200 ${
                          activeMode === modeKey
                            ? 'bg-neutral-800 text-neutral-200 border-white/20'
                            : 'bg-transparent text-neutral-500 border-transparent hover:text-neutral-300'
                        }`}
                      >
                        {modeKey.charAt(0).toUpperCase() + modeKey.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Actions row */}
                <div className="flex gap-2">
                  <button
                    onClick={() => setStatus('input')}
                    className="h-11 px-4 rounded-xl border border-white/5 bg-neutral-950/30 text-neutral-300 hover:bg-neutral-950/50 hover:border-white/10 transition duration-200 text-xs font-semibold flex items-center gap-1.5"
                  >
                    <ArrowLeft className="w-4 h-4" /> Edit
                  </button>
                  <button
                    onClick={() => runEnhancement(inputPrompt, activeMode)}
                    className="h-11 px-4 rounded-xl border border-white/5 bg-neutral-950/30 text-neutral-300 hover:bg-neutral-950/50 hover:border-white/10 transition duration-200 text-xs font-semibold flex items-center gap-1.5"
                  >
                    <RefreshCw className="w-4 h-4" /> Re-run
                  </button>
                  <button
                    onClick={handleCopy}
                    className="flex-1 h-11 rounded-xl bg-white text-neutral-950 hover:bg-neutral-200 transition duration-200 font-semibold text-sm flex items-center justify-center gap-2 shadow-[0_6px_16px_rgba(255,255,255,0.1)]"
                  >
                    {copied ? (
                      <>
                        <Check className="w-4 h-4" /> Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" /> Copy & Done
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* View State 4: Error State */}
            {status === 'error' && (
              <div className="flex-1 p-4 flex flex-col gap-3 justify-between overflow-hidden">
                <div className="flex-1 flex flex-col bg-red-950/10 border border-red-500/20 rounded-2xl p-5 items-center justify-center text-center overflow-y-auto">
                  <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-4">
                    <X className="w-5 h-5 text-red-400" />
                  </div>
                  <h3 className="text-sm font-semibold text-red-200 tracking-wide">
                    Refinement Failed
                  </h3>
                  <p className="text-xs text-neutral-400 mt-2 max-w-[340px] leading-relaxed font-mono">
                    {errorMessage}
                  </p>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => setStatus('input')}
                    className="h-11 px-5 rounded-xl bg-neutral-900 border border-white/5 hover:border-white/10 text-neutral-300 transition duration-200 text-xs font-semibold flex items-center gap-1.5"
                  >
                    <ArrowLeft className="w-4 h-4" /> Back
                  </button>
                  <button
                    onClick={openSettings}
                    className="flex-1 h-11 rounded-xl bg-white text-neutral-950 hover:bg-neutral-200 transition duration-200 font-semibold text-sm flex items-center justify-center gap-2"
                  >
                    <Settings className="w-4 h-4" /> Configure API Keys
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
