import { useState, useEffect } from 'react';
import { Zap } from 'lucide-react';

const STEPS = [
  { label: 'Loading core engine...', progress: 15, delay: 0 },
  { label: 'Registering global shortcuts...', progress: 40, delay: 600 },
  { label: 'Initializing system tray...', progress: 65, delay: 1100 },
  { label: 'Configuring AI providers...', progress: 85, delay: 1600 },
  { label: 'Ready!', progress: 100, delay: 2100 },
];

export default function SplashView() {
  const [stepIndex, setStepIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];

    STEPS.forEach((step, i) => {
      const t = setTimeout(() => {
        setStepIndex(i);
        setProgress(step.progress);
      }, step.delay);
      timers.push(t);
    });

    // Tell main process we are ready to close splash
    const doneTimer = setTimeout(() => {
      setFadeOut(true);
      setTimeout(() => {
        if (window.api) {
          window.api.send('splash-ready');
        }
      }, 400);
    }, 2600);

    timers.push(doneTimer);
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <div
      className={`w-screen h-screen bg-neutral-950 flex flex-col items-center justify-center select-none font-sans transition-opacity duration-500 ${
        fadeOut ? 'opacity-0' : 'opacity-100'
      }`}
    >
      {/* Ambient glow */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-[400px] h-[400px] rounded-full bg-white/[0.025] blur-[80px]" />
      </div>

      {/* Logo block */}
      <div className="relative flex flex-col items-center gap-5 z-10">
        {/* Icon ring */}
        <div className="relative">
          <div className="w-20 h-20 rounded-3xl bg-white/5 border border-white/10 flex items-center justify-center shadow-[0_20px_50px_rgba(0,0,0,0.5),inset_1px_1px_rgba(255,255,255,0.08)]">
            <Zap className="w-9 h-9 text-neutral-200" />
          </div>
          {/* Rotating outer ring */}
          <div className="absolute -inset-1.5 rounded-[20px] border border-dashed border-white/10 animate-spin" style={{ animationDuration: '8s' }} />
        </div>

        {/* App name */}
        <div className="flex flex-col items-center gap-1">
          <h1 className="text-2xl font-bold tracking-[0.15em] bg-gradient-to-b from-neutral-100 to-neutral-400 bg-clip-text text-transparent uppercase">
            SpyHero
          </h1>
          <p className="text-[11px] font-mono text-neutral-600 tracking-widest uppercase">
            AI Prompt Enhancer
          </p>
        </div>

        {/* Progress section */}
        <div className="mt-4 flex flex-col items-center gap-3 w-[260px]">
          {/* Status label */}
          <div className="h-5 flex items-center">
            <span className="text-[11px] font-mono text-neutral-500 transition-all duration-300">
              {STEPS[stepIndex]?.label}
            </span>
          </div>

          {/* Progress bar track */}
          <div className="w-full h-[3px] bg-neutral-900 rounded-full border border-white/5 overflow-hidden shadow-[inset_0_1px_2px_rgba(0,0,0,0.4)]">
            <div
              className="h-full bg-gradient-to-r from-neutral-600 via-neutral-300 to-neutral-500 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>

          {/* Percentage */}
          <span className="text-[10px] font-mono text-neutral-700">
            {progress}%
          </span>
        </div>
      </div>

      {/* Bottom watermark */}
      <div className="absolute bottom-5 text-[10px] font-mono text-neutral-800 tracking-widest">
        v1.0.0 · WINDOWS x64
      </div>
    </div>
  );
}
