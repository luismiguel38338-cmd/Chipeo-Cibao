import {
  Download,
  KeyRound,
  Lock,
  Monitor,
  Palette,
  RotateCcw,
  ShieldCheck,
  Sliders,
  Trash2,
} from 'lucide-react';
import { RACK_FINISHES, RACK_SHAPES, RADIO_ACCENT_COLORS, STAGE_LOCATIONS } from '../game/catalog';
import { EncryptedVaultEnvelope, GameSettings, GraphicsQuality, PlayerProfile } from '../game/types';
import { getStoredVaultEnvelope } from '../utils/cryptoVault';

interface SettingsViewProps {
  profile: PlayerProfile;
  onUpdateSettings: (next: GameSettings) => void;
  onOpenReferralModal: () => void;
  onResetAccount: () => void;
}

const QUALITY_OPTIONS: { value: GraphicsQuality; label: string; desc: string }[] = [
  { value: 'low', label: 'Bajo', desc: 'Máximo rendimiento y menor consumo de batería' },
  { value: 'medium', label: 'Medio', desc: 'Ondas de bajo y vibración balanceada' },
  { value: 'high', label: 'Alto / Ultra', desc: 'Espectro completo, ondas, luces y partículas' },
];

export function SettingsView({
  profile,
  onUpdateSettings,
  onOpenReferralModal,
  onResetAccount,
}: SettingsViewProps) {
  const { settings } = profile;
  const vaultEnvelope: EncryptedVaultEnvelope | null = getStoredVaultEnvelope();

  const handleExportVault = () => {
    if (!vaultEnvelope) return;
    const blob = new Blob([JSON.stringify(vaultEnvelope, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chipeo-cibaeno-boveda-${profile.username.toLowerCase()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <section className="mx-auto w-full max-w-5xl space-y-6" data-testid="settings-view">
      <div>
        <h1 className="font-display text-4xl font-extrabold text-white leading-none">
          CONFIGURACIÓN Y SEGURIDAD E2E
        </h1>
        <p className="mt-1 text-sm text-slate-400">
          Ajusta la sensibilidad del radio Pioneer 3D, las luces ATEQ, el escenario y verifica el
          cifrado local de tus datos.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Sensitivity & Graphics */}
        <div className="lg:col-span-7 rounded-2xl bg-[#101624] border border-slate-800 p-6 space-y-6">
          <div>
            <div className="flex items-center justify-between mb-2">
              <label
                htmlFor="sensitivity-slider"
                className="text-sm font-bold text-white flex items-center gap-2"
              >
                <Sliders className="h-4 w-4 text-sky-400" />
                <span>Sensibilidad de Perillas y Controles 3D</span>
              </label>
              <span className="font-mono-num text-sm font-bold text-sky-400">
                {settings.sensitivity.toFixed(2)}x
              </span>
            </div>
            <input
              id="sensitivity-slider"
              type="range"
              min={0.25}
              max={2.0}
              step={0.05}
              value={settings.sensitivity}
              onChange={(e) =>
                onUpdateSettings({ ...settings, sensitivity: Number(e.target.value) })
              }
              className="w-full accent-sky-500 cursor-pointer"
            />
            <p className="mt-1 text-xs text-slate-400">
              Controla qué tan rápido responden el dial giratorio del Pioneer 3D y las perillas del
              ecualizador ATEQ.
            </p>
          </div>

          <div className="pt-4 border-t border-slate-800">
            <p className="text-sm font-bold text-white flex items-center gap-2 mb-3">
              <Monitor className="h-4 w-4 text-amber-400" />
              <span>Calidad de Gráficos y Animaciones</span>
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {QUALITY_OPTIONS.map((opt) => {
                const active = settings.graphicsQuality === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() =>
                      onUpdateSettings({ ...settings, graphicsQuality: opt.value })
                    }
                    className={`rounded-xl p-3.5 text-left border transition-colors cursor-pointer ${
                      active
                        ? 'bg-sky-500/15 border-sky-500 text-white'
                        : 'bg-[#0B101B] border-slate-800 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <p className="text-sm font-bold">{opt.label}</p>
                    <p className="mt-1 text-[11px] text-slate-400 leading-snug">{opt.desc}</p>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="pt-4 border-t border-slate-800 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-bold text-white flex items-center gap-2">
                <Palette className="h-4 w-4 text-sky-400" />
                <span>Iluminación, Rack 3D y Escenario</span>
              </p>
              <button
                type="button"
                onClick={() =>
                  onUpdateSettings({
                    ...settings,
                    radioAccentColor: '#0EA5E9',
                    rackFinish: 'brushed',
                    rackShape: 'rounded',
                  })
                }
                className="inline-flex items-center gap-1 text-xs font-semibold text-sky-400 hover:text-sky-300 cursor-pointer"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Restablecer colores</span>
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {RADIO_ACCENT_COLORS.map((c) => {
                const active = settings.radioAccentColor.toLowerCase() === c.hex.toLowerCase();
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => onUpdateSettings({ ...settings, radioAccentColor: c.hex })}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border cursor-pointer ${
                      active
                        ? 'border-white bg-slate-800 text-white'
                        : 'border-slate-800 bg-[#0B101B] text-slate-300'
                    }`}
                  >
                    <span className="h-3 w-3 rounded-full" style={{ backgroundColor: c.hex }} />
                    <span>{c.label}</span>
                  </button>
                );
              })}
            </div>
            <div className="grid grid-cols-3 gap-2 pt-1">
              {RACK_SHAPES.map((shape) => {
                const active = settings.rackShape === shape.id;
                return (
                  <button
                    key={shape.id}
                    type="button"
                    onClick={() => onUpdateSettings({ ...settings, rackShape: shape.id })}
                    className={`px-3 py-2 rounded-lg text-xs font-semibold border text-center cursor-pointer ${
                      active
                        ? 'border-sky-500 bg-sky-500/15 text-white'
                        : 'border-slate-800 bg-[#0B101B] text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    {shape.label}
                  </button>
                );
              })}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
              {RACK_FINISHES.map((fin) => {
                const active = settings.rackFinish === fin.id;
                return (
                  <button
                    key={fin.id}
                    type="button"
                    onClick={() => onUpdateSettings({ ...settings, rackFinish: fin.id })}
                    className={`px-3 py-2 rounded-lg text-xs font-semibold border text-left cursor-pointer ${
                      active
                        ? 'border-sky-500 bg-sky-500/15 text-white'
                        : 'border-slate-800 bg-[#0B101B] text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    {fin.label}
                  </button>
                );
              })}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1">
              {STAGE_LOCATIONS.map((loc) => {
                const active = settings.stageLocation === loc.id;
                return (
                  <button
                    key={loc.id}
                    type="button"
                    onClick={() => onUpdateSettings({ ...settings, stageLocation: loc.id })}
                    className={`px-3 py-2 rounded-lg text-xs font-semibold border text-left cursor-pointer ${
                      active
                        ? 'border-sky-500 bg-sky-500/15 text-white'
                        : 'border-slate-800 bg-[#0B101B] text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    {loc.name}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="pt-4 border-t border-slate-800 space-y-3">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="master-vol-slider" className="text-sm font-bold text-white">
                  Volumen Maestro del Juego
                </label>
                <span className="font-mono-num text-xs font-bold text-emerald-400">
                  {Math.round(settings.masterVolume * 100)}%
                </span>
              </div>
              <input
                id="master-vol-slider"
                type="range"
                min={0.1}
                max={1.0}
                step={0.05}
                value={settings.masterVolume}
                onChange={(e) =>
                  onUpdateSettings({ ...settings, masterVolume: Number(e.target.value) })
                }
                className="w-full accent-emerald-500 cursor-pointer"
              />
            </div>

            <label className="flex items-center justify-between gap-4 rounded-xl bg-[#0B101B] border border-slate-800 p-4 cursor-pointer">
              <div>
                <p className="text-sm font-bold text-white">Blur con Bajos</p>
                <p className="text-xs text-slate-400">
                  Efecto atmosférico de desenfoque del escenario al golpear los subwoofers.
                </p>
              </div>
              <input
                type="checkbox"
                checked={settings.bassBlurEnabled}
                onChange={(e) =>
                  onUpdateSettings({ ...settings, bassBlurEnabled: e.target.checked })
                }
                className="h-5 w-5 accent-sky-500 cursor-pointer"
              />
            </label>

            <div className="rounded-xl bg-[#0B101B] border border-slate-800 p-4 space-y-2.5">
              <div>
                <p className="text-sm font-bold text-white">Kitipo y Bajos Extra</p>
                <p className="text-xs text-slate-400">
                  Realce físico y sonoro en subgraves para golpear más duro.
                </p>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { value: 0, label: 'Normal' },
                  { value: 1, label: 'Kitipo +3 dB' },
                  { value: 2, label: 'Extremo +6 dB' },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => onUpdateSettings({ ...settings, kitipoBoost: opt.value })}
                    className={`px-3 py-2 rounded-lg text-xs font-bold border cursor-pointer ${
                      settings.kitipoBoost === opt.value
                        ? 'bg-amber-500/20 border-amber-400 text-amber-200'
                        : 'bg-[#101624] border-slate-800 text-slate-300'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <label className="flex items-center justify-between gap-4 rounded-xl bg-[#0B101B] border border-slate-800 p-4 cursor-pointer">
              <div>
                <p className="text-sm font-bold text-white">Movimiento Físico de Bocinas</p>
                <p className="text-xs text-slate-400">
                  Activa la excursión real de los conos y suspensión sobre el cajón.
                </p>
              </div>
              <input
                type="checkbox"
                checked={settings.showSpeakerZones}
                onChange={(e) =>
                  onUpdateSettings({ ...settings, showSpeakerZones: e.target.checked })
                }
                className="h-5 w-5 accent-emerald-500 cursor-pointer"
              />
            </label>

            <label className="flex items-center justify-between gap-4 rounded-xl bg-[#0B101B] border border-slate-800 p-4 cursor-pointer">
              <div>
                <p className="text-sm font-bold text-white">Protección Anti-Clip de Drivers</p>
                <p className="text-xs text-slate-400">
                  Reduce el desgaste por sobrecalentamiento en drivers y bocinas de voz.
                </p>
              </div>
              <input
                type="checkbox"
                checked={settings.clipProtection}
                onChange={(e) =>
                  onUpdateSettings({ ...settings, clipProtection: e.target.checked })
                }
                className="h-5 w-5 accent-sky-500 cursor-pointer"
              />
            </label>

            <label className="flex items-center justify-between gap-4 rounded-xl bg-[#0B101B] border border-slate-800 p-4 cursor-pointer">
              <div>
                <p className="text-sm font-bold text-white">Modo Streaming (Ocultar Seteo EQ)</p>
                <p className="text-xs text-slate-400">
                  Oculta los valores exactos en dB de tu ecualizador Pioneer mientras transmites en vivo.
                </p>
              </div>
              <input
                type="checkbox"
                checked={settings.streamingMode}
                onChange={(e) =>
                  onUpdateSettings({ ...settings, streamingMode: e.target.checked })
                }
                className="h-5 w-5 accent-amber-500 cursor-pointer"
              />
            </label>
          </div>
        </div>

        {/* E2E Encryption Security Card & Codes */}
        <div className="lg:col-span-5 space-y-5">
          <div className="rounded-2xl bg-[#101624] border border-slate-800 p-6 space-y-4">
            <div className="flex items-center gap-2 text-emerald-400">
              <ShieldCheck className="h-5 w-5" />
              <h2 className="font-display text-2xl font-extrabold text-white">
                BÓVEDA CIFRADA LOCAL
              </h2>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Tus monedas, cuenta, guaguas, foto y progreso se cifran localmente en tu dispositivo
              usando <span className="font-semibold text-white">AES-256-GCM</span> con derivación de
              llave <span className="font-semibold text-white">PBKDF2-SHA256</span> (100,000
              iteraciones).
            </p>

            {vaultEnvelope && (
              <div className="rounded-xl bg-[#070A10] border border-slate-800 p-3 text-[11px] font-mono-num text-slate-400 space-y-1">
                <p>
                  <span className="text-slate-500">Algoritmo:</span>{' '}
                  <span className="text-emerald-400">{vaultEnvelope.alg}</span>
                </p>
                <p>
                  <span className="text-slate-500">KDF:</span> {vaultEnvelope.kdf} (
                  {vaultEnvelope.iterations.toLocaleString('es-DO')})
                </p>
                <p className="truncate">
                  <span className="text-slate-500">Ciphertext:</span>{' '}
                  {vaultEnvelope.ciphertext.slice(0, 32)}...
                </p>
              </div>
            )}

            <div className="flex flex-col gap-2.5 pt-2">
              <button
                type="button"
                onClick={handleExportVault}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-white cursor-pointer"
              >
                <Download className="h-4 w-4 text-sky-400" />
                <span>Exportar Respaldo Cifrado (.json)</span>
              </button>

              <button
                type="button"
                onClick={onOpenReferralModal}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-xs font-bold text-amber-300 cursor-pointer"
              >
                <KeyRound className="h-4 w-4" />
                <span>Abrir Panel de Referido / Código VIP</span>
              </button>

              <button
                type="button"
                onClick={onResetAccount}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-xs font-bold text-red-300 cursor-pointer"
              >
                <Trash2 className="h-4 w-4" />
                <span>Borrar Datos Locales y Cambiar Cuenta</span>
              </button>
            </div>
          </div>

          <div className="rounded-2xl bg-[#101624] border border-slate-800 p-5 flex items-center gap-3 text-xs text-slate-400">
            <Lock className="h-4 w-4 text-sky-400 shrink-0" />
            <span>
              {profile.personalReferralCode
                ? `Tu código personal de referido: ${profile.personalReferralCode}`
                : 'Aún no has creado tu código de referido personal. Ábrelo desde el panel de códigos.'}
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
