import { useEffect, useState } from 'react';
import { GAME_ICON_PATH } from '../game/catalog';

interface BootSplashProps {
  onComplete: () => void;
}

const BOOT_STEPS = [
  { threshold: 25, label: 'Cargando recursos de audio y guaguas...' },
  { threshold: 58, label: 'Verificando bóveda cifrada AES-256-GCM...' },
  { threshold: 85, label: 'Sincronizando panel Pioneer y datos locales...' },
  { threshold: 100, label: 'Listo para el chipeo cibaeño' },
];

export function BootSplash({ onComplete }: BootSplashProps) {
  const [progress, setProgress] = useState(8);

  useEffect(() => {
    const start = performance.now();
    const duration = 1250;
    let rafId = 0;

    const tick = (now: number) => {
      const elapsed = Math.max(0, now - start);
      const pct = Math.max(8, Math.min(100, Math.round((elapsed / duration) * 100)));
      setProgress(pct);
      if (pct < 100) {
        rafId = requestAnimationFrame(tick);
      } else {
        window.setTimeout(onComplete, 180);
      }
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [onComplete]);

  const currentStep =
    BOOT_STEPS.find((s) => progress <= s.threshold) ?? BOOT_STEPS[BOOT_STEPS.length - 1];

  return (
    <main
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#060910] px-6 text-slate-100"
      data-testid="boot-screen"
    >
      <div className="w-full max-w-md flex flex-col items-center text-center">
        <div className="relative mb-6 h-44 w-44 sm:h-52 sm:w-52 rounded-full overflow-hidden border-2 border-sky-500/40 shadow-[0_0_50px_rgba(14,165,233,0.22)]">
          <img
            src={GAME_ICON_PATH}
            alt="Logo oficial de Chipeo Cibaeño"
            referrerPolicy="no-referrer"
            className="h-full w-full object-cover"
          />
        </div>

        <h1 className="font-display text-4xl sm:text-5xl font-extrabold tracking-tight text-white">
          CHIPEO CIBAEÑO
        </h1>
        <p className="mt-1 text-sm text-slate-400">
          Música · Chipeo · Pasión
        </p>

        <div className="mt-8 w-full">
          <div className="flex items-center justify-between text-xs text-slate-300 mb-2">
            <span>{currentStep.label}</span>
            <span className="font-mono-num font-bold text-sky-400">{progress}%</span>
          </div>
          <div
            className="h-2.5 w-full overflow-hidden rounded-full bg-slate-800/90 border border-slate-700/70"
            role="progressbar"
            aria-valuenow={progress}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Progreso de carga"
          >
            <div
              className="h-full bg-sky-500 transition-transform duration-75 origin-left"
              style={{ transform: `scaleX(${progress / 100})` }}
            />
          </div>
        </div>
      </div>
    </main>
  );
}
