import { useEffect } from 'react';
import { ArrowRight, Radio, ShieldCheck, UserPlus } from 'lucide-react';
import { GAME_ICON_PATH } from '../game/catalog';

interface WelcomeScreenProps {
  hasExistingAccount: boolean;
  savedUsername?: string;
  savedAvatarUrl?: string;
  onStart: () => void;
  onOpenAuth: () => void;
}

export function WelcomeScreen({
  hasExistingAccount,
  savedUsername,
  savedAvatarUrl,
  onStart,
  onOpenAuth,
}: WelcomeScreenProps) {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onStart();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onStart]);

  return (
    <main
      className="min-h-screen w-full grid grid-cols-1 lg:grid-cols-12 bg-[#060B16] text-slate-100"
      data-testid="welcome-screen"
    >
      {/* Left Deep Studio Stripes Column matching reference URL */}
      <aside
        className="lg:col-span-5 relative flex flex-col justify-center px-8 py-12 sm:px-14 lg:px-16 overflow-hidden"
        style={{
          backgroundImage:
            'repeating-linear-gradient(90deg, #091B40 0px, #0C2352 135px, #08183A 270px)',
        }}
      >
        <div className="relative z-10 max-w-md space-y-5">
          <div className="inline-flex items-center gap-2.5 text-xs font-semibold tracking-widest uppercase text-sky-300/80">
            <Radio className="h-4 w-4 text-[#3B82F6]" />
            <span>Flow Dominicano · Santiago &amp; El Cibao</span>
          </div>

          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-white leading-[1.08]">
            Tu sonido,
            <br />
            en tu cuenta.
          </h1>

          <p className="text-sm sm:text-base text-slate-300/90 leading-relaxed max-w-sm">
            Guarda tus guaguas, tus ecualizadores ATEQ, tu clan y tus batallas online con cifrado
            local en tu dispositivo.
          </p>
        </div>
      </aside>

      {/* Right Clean Account Welcome Column */}
      <section className="lg:col-span-7 flex flex-col items-center justify-center px-6 py-10 sm:px-12 bg-[#060B16]">
        <div className="w-full max-w-[400px]">
          <div className="flex items-center gap-3 mb-7">
            <div className="h-9 w-9 rounded-lg bg-[#2F6BFF] flex items-center justify-center shadow-[0_6px_20px_rgba(47,107,255,0.4)] overflow-hidden">
              <img
                src={GAME_ICON_PATH}
                alt="Chipeo Cibaeño"
                referrerPolicy="no-referrer"
                className="h-full w-full object-cover"
              />
            </div>
            <span className="text-xs font-bold tracking-[0.22em] text-slate-200 uppercase">
              CHIPEO CIBAEÑO
            </span>
          </div>

          <h2 className="text-2xl sm:text-[28px] font-extrabold text-white tracking-tight leading-tight">
            {hasExistingAccount ? 'Bienvenido de vuelta' : 'Trae tu sonido'}
          </h2>
          <p className="mt-1 text-xs sm:text-sm text-slate-400">
            {hasExistingAccount
              ? 'Entra para cargar tu equipo, tus carpetas y tus ajustes.'
              : 'Crea tu cuenta con tu foto o entra con tu usuario cifrado.'}
          </p>

          {hasExistingAccount && savedUsername && (
            <div className="mt-6 flex items-center gap-3.5 rounded-xl bg-[#0A111F] border border-slate-800 p-3.5">
              {savedAvatarUrl && (
                <img
                  src={savedAvatarUrl}
                  alt={savedUsername}
                  className="h-12 w-12 rounded-full object-cover border border-[#3B82F6]/60"
                />
              )}
              <div className="min-w-0 flex-1">
                <p className="text-[11px] text-slate-400">Cuenta lista en este dispositivo</p>
                <p className="text-sm font-bold text-white truncate">{savedUsername}</p>
              </div>
            </div>
          )}

          <div className="mt-6 space-y-3">
            <button
              type="button"
              data-start="true"
              onClick={onStart}
              className="w-full flex items-center justify-center gap-2 rounded-lg bg-[#2F6BFF] hover:bg-[#3B76FF] active:scale-[0.99] py-3 px-5 text-white font-bold text-sm transition-colors cursor-pointer shadow-[0_8px_24px_rgba(47,107,255,0.3)]"
            >
              <span>
                {hasExistingAccount && savedUsername
                  ? `Entrar como ${savedUsername}`
                  : hasExistingAccount
                    ? 'Entrar a mi Cuenta'
                    : 'Crear Cuenta o Entrar'}
              </span>
              <ArrowRight className="h-4 w-4" />
            </button>

            {hasExistingAccount && (
              <button
                type="button"
                onClick={onOpenAuth}
                className="w-full flex items-center justify-center gap-2 rounded-lg bg-[#0A111F] hover:bg-[#0F192E] border border-slate-800 py-2.5 px-5 text-slate-200 font-semibold text-xs transition-colors cursor-pointer"
              >
                <UserPlus className="h-4 w-4 text-[#3B82F6]" />
                <span>Usar otra cuenta o registrarme</span>
              </button>
            )}
          </div>

          <div className="mt-7 pt-4 border-t border-slate-800/80 flex items-center justify-between gap-2 text-[11px] text-slate-400">
            <span className="inline-flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
              <span>Conexión cifrada · Bóveda AES-256-GCM</span>
            </span>
            <span className="text-slate-500 hidden sm:inline">Enter para entrar</span>
          </div>
        </div>
      </section>
    </main>
  );
}
