import React, { useState } from 'react';
import { Check, Copy, Eye, EyeOff, KeyRound, Sparkles } from 'lucide-react';
import { PlayerProfile } from '../game/types';

interface ReferralVipPanelProps {
  profile: PlayerProfile;
  onRedeemCode: (code: string) => { ok: boolean; message: string };
  onGenerateOwnCode: () => { ok: boolean; code: string };
  onContinue: () => void;
}

export function ReferralVipPanel({
  profile,
  onRedeemCode,
  onGenerateOwnCode,
  onContinue,
}: ReferralVipPanelProps) {
  const [codeInput, setCodeInput] = useState('');
  const [showTyped, setShowTyped] = useState(false);
  const [feedback, setFeedback] = useState<{ ok: boolean; text: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const handleRedeem = (e: React.FormEvent) => {
    e.preventDefault();
    const result = onRedeemCode(codeInput);
    setFeedback({ ok: result.ok, text: result.message });
    if (result.ok) {
      setCodeInput('');
    }
  };

  const handleGenerate = () => {
    const res = onGenerateOwnCode();
    if (res.ok) {
      setFeedback({
        ok: true,
        text: `¡Tu código personal ${res.code} fue creado! +5,000 monedas acreditadas.`,
      });
    }
  };

  const handleCopy = async () => {
    if (!profile.personalReferralCode) return;
    try {
      await navigator.clipboard.writeText(profile.personalReferralCode);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      // ignore clipboard errors
    }
  };

  return (
    <main
      className="min-h-screen w-full bg-[#080B12] flex items-center justify-center px-4 py-8"
      data-testid="referral-screen"
    >
      <div className="w-full max-w-xl rounded-2xl bg-[#101624] border border-slate-800 p-6 sm:p-8 shadow-2xl">
        <div className="flex items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <img
              src={profile.avatarDataUrl}
              alt={profile.username}
              className="h-12 w-12 rounded-full object-cover border border-sky-500/60"
            />
            <div>
              <h1 className="font-display text-3xl font-extrabold text-white leading-none">
                PANEL DE REFERIDO Y VIP
              </h1>
              <p className="mt-1 text-xs text-slate-400">
                Bienvenido, {profile.username} · Saldo actual:{' '}
                <span className="font-mono-num font-bold text-amber-400">
                  {profile.coins.toLocaleString('es-DO')} monedas
                </span>
              </p>
            </div>
          </div>
        </div>

        {/* Secret / Referral Code Input (masked by default so codes remain hidden) */}
        <form onSubmit={handleRedeem} className="rounded-xl bg-[#0B101B] border border-slate-800 p-5">
          <label
            htmlFor="secret-referral-input"
            className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2"
          >
            <KeyRound className="h-4 w-4 text-amber-400" />
            <span>Ingresa tu Código de Referido o Código VIP Secreto</span>
          </label>
          <p className="text-xs text-slate-400 mb-3">
            Por seguridad, el código ingresado permanece oculto. Si tienes un código especial o de
            invitación, escríbelo aquí para reclamar tus monedas.
          </p>

          <div className="flex flex-col sm:flex-row gap-2.5">
            <div className="relative flex-1">
              <input
                id="secret-referral-input"
                type={showTyped ? 'text' : 'password'}
                value={codeInput}
                onChange={(e) => setCodeInput(e.target.value)}
                autoComplete="off"
                placeholder="••••••"
                className="w-full rounded-xl bg-[#12192A] border border-slate-700 pl-4 pr-10 py-3 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-amber-400"
              />
              <button
                type="button"
                onClick={() => setShowTyped((v) => !v)}
                aria-label={showTyped ? 'Ocultar código' : 'Mostrar código escrito'}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 cursor-pointer"
              >
                {showTyped ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <button
              type="submit"
              className="px-5 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm transition-colors whitespace-nowrap cursor-pointer"
            >
              Canjear Código
            </button>
          </div>
        </form>

        {feedback && (
          <div
            className={`mt-4 rounded-xl px-4 py-3 text-xs font-medium border ${
              feedback.ok
                ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                : 'bg-red-500/15 border-red-500/40 text-red-300'
            }`}
          >
            {feedback.text}
          </div>
        )}

        {/* Generate own referral code if user doesn't have one */}
        <div className="mt-5 rounded-xl bg-[#0B101B] border border-slate-800 p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-sky-400" />
                <span>¿No tienes código? Crea uno solo para ti</span>
              </h2>
              <p className="mt-1 text-xs text-slate-400">
                Genera tu propio código único de Chipeo Cibaeño para invitar amigos y recibe +5,000
                monedas de bono inicial.
              </p>
            </div>

            {!profile.personalReferralCode ? (
              <button
                type="button"
                onClick={handleGenerate}
                className="px-4 py-2.5 rounded-xl bg-sky-500/20 hover:bg-sky-500/30 border border-sky-500/50 text-sky-300 text-xs font-bold whitespace-nowrap cursor-pointer"
              >
                Crear Mi Código
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <span className="font-mono-num font-bold text-sm text-sky-300 bg-slate-900 border border-slate-700 px-3 py-2 rounded-lg">
                  {profile.personalReferralCode}
                </span>
                <button
                  type="button"
                  onClick={handleCopy}
                  aria-label="Copiar mi código personal"
                  className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 cursor-pointer"
                >
                  {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="mt-6 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onContinue}
            className="w-full sm:w-auto px-7 py-3.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-sm transition-colors cursor-pointer"
          >
            Entrar al Estudio de Chipeo
          </button>
        </div>
      </div>
    </main>
  );
}
