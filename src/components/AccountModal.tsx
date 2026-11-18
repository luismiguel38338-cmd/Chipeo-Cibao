import React, { useState } from 'react';
import {
  Camera,
  Eye,
  EyeOff,
  Lock,
  Radio,
  ShieldCheck,
  User,
  UserCheck,
} from 'lucide-react';
import {
  GAME_ICON_PATH,
  makeAvatarSvgDataUrl,
  PRESET_AVATARS,
} from '../game/catalog';

interface AccountModalProps {
  initialMode: 'create' | 'login';
  savedUsernames: string[];
  hasLegacyVault: boolean;
  onCreateAccount: (params: {
    username: string;
    avatarDataUrl: string;
    password: string;
  }) => Promise<void>;
  onLoginAccount: (params: { username: string; password: string }) => Promise<boolean>;
  onResetVault: () => void;
}

async function compressImageToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('No se pudo leer la imagen.'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Formato de imagen inválido.'));
      img.onload = () => {
        const size = 160;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(String(reader.result));
          return;
        }
        const minSide = Math.min(img.width, img.height);
        const sx = (img.width - minSide) / 2;
        const sy = (img.height - minSide) / 2;
        ctx.drawImage(img, sx, sy, minSide, minSide, 0, 0, size, size);
        resolve(canvas.toDataURL('image/jpeg', 0.84));
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

function getPasswordStrengthBars(pwd: string): number {
  if (!pwd) return 0;
  let score = 1;
  if (pwd.length >= 4) score++;
  if (pwd.length >= 7) score++;
  if (/[A-Z0-9]/.test(pwd)) score++;
  if (pwd.length >= 10 || /[^A-Za-z0-9]/.test(pwd)) score++;
  return Math.min(5, score);
}

export function AccountModal({
  initialMode,
  savedUsernames,
  hasLegacyVault,
  onCreateAccount,
  onLoginAccount,
  onResetVault,
}: AccountModalProps) {
  const [tab, setTab] = useState<'login' | 'create'>(
    initialMode === 'login' && (savedUsernames.length > 0 || hasLegacyVault)
      ? 'login'
      : 'create'
  );
  const [username, setUsername] = useState(savedUsernames[0] ?? '');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string>(makeAvatarSvgDataUrl('RD', '#2F6BFF'));
  const [hasCustomPhoto, setHasCustomPhoto] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const strength = getPasswordStrengthBars(password);

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await compressImageToDataUrl(file);
      setAvatarUrl(dataUrl);
      setHasCustomPhoto(true);
      setError('');
    } catch {
      setError('No se pudo procesar la foto seleccionada.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (tab === 'login') {
      const cleanUser = username.trim();
      if (!hasLegacyVault && cleanUser.length < 3) {
        setError('Escribe tu usuario de chipero para entrar.');
        return;
      }
      setSubmitting(true);
      const ok = await onLoginAccount({ username: cleanUser, password: password.trim() });
      setSubmitting(false);
      if (!ok) {
        setError('Usuario o contraseña incorrecta. Verifica tus datos cifrados.');
      }
      return;
    }

    const cleanName = username.trim();
    if (cleanName.length < 3) {
      setError('Escribe un usuario o apodo de al menos 3 caracteres.');
      return;
    }
    if (password.trim().length > 0 && password.trim().length < 4) {
      setError('La contraseña debe tener mínimo 4 caracteres (o déjala vacía para llave automática).');
      return;
    }
    if (password.trim() !== confirmPassword.trim()) {
      setError('Las contraseñas no coinciden. Verifica ambos campos.');
      return;
    }

    setSubmitting(true);
    try {
      await onCreateAccount({
        username: cleanName,
        avatarDataUrl: avatarUrl,
        password: password.trim(),
      });
    } catch {
      setError('No se pudo crear la bóveda cifrada local.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main
      className="min-h-screen w-full grid grid-cols-1 lg:grid-cols-12 bg-[#060B16] text-slate-100"
      data-testid="auth-screen"
    >
      {/* Left Studio Navy Split Column matching reference URL */}
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
            <span>Cultura Sound Car · República Dominicana</span>
          </div>

          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-white leading-[1.08]">
            Tu sonido,
            <br />
            en tu cuenta.
          </h1>

          <p className="text-sm sm:text-base text-slate-300/90 leading-relaxed max-w-sm">
            Guarda tu perfil, tus 18 guaguas, tus ecualizadores ATEQ y tus seteos. Entra seguro con
            bóveda cifrada en tu dispositivo.
          </p>
        </div>
      </aside>

      {/* Right Clean Form Column */}
      <section className="lg:col-span-7 flex flex-col items-center justify-center px-6 py-10 sm:px-12 bg-[#060B16]">
        <div className="w-full max-w-[400px]">
          {/* Brand Emblem + Title */}
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
            {tab === 'login' ? 'Bienvenido de vuelta' : 'Crea tu cuenta'}
          </h2>
          <p className="mt-1 text-xs sm:text-sm text-slate-400">
            {tab === 'login'
              ? 'Entra para cargar tus guaguas, VIP y tus ajustes.'
              : 'Guarda tu progreso, tu clan y tus configuraciones en tu cuenta.'}
          </p>

          {/* Underline Tabs: Entrar | Registrarme */}
          <div
            role="tablist"
            aria-label="Modo de cuenta"
            className="mt-6 flex items-center gap-6 border-b border-slate-800/90"
          >
            <button
              type="button"
              role="tab"
              aria-selected={tab === 'login'}
              onClick={() => {
                setTab('login');
                setError('');
              }}
              className={`pb-2.5 text-xs sm:text-sm font-bold transition-colors border-b-2 -mb-px cursor-pointer ${
                tab === 'login'
                  ? 'border-[#3B82F6] text-white'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              Entrar
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={tab === 'create'}
              onClick={() => {
                setTab('create');
                setError('');
              }}
              className={`pb-2.5 text-xs sm:text-sm font-bold transition-colors border-b-2 -mb-px cursor-pointer ${
                tab === 'create'
                  ? 'border-[#3B82F6] text-white'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              Registrarme
            </button>
          </div>

          <form onSubmit={handleSubmit} className="mt-5 space-y-4">
            {/* Saved accounts quick chips when logging in */}
            {tab === 'login' && savedUsernames.length > 0 && (
              <div>
                <p className="text-[11px] font-medium text-slate-400 mb-1.5">
                  Cuentas guardadas en este dispositivo
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {savedUsernames.map((name) => (
                    <button
                      key={name}
                      type="button"
                      onClick={() => setUsername(name)}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border cursor-pointer ${
                        username.trim().toLowerCase() === name.toLowerCase()
                          ? 'bg-[#2F6BFF]/20 border-[#3B82F6] text-sky-200'
                          : 'bg-[#0B1220] border-slate-800 text-slate-300 hover:border-slate-600'
                      }`}
                    >
                      <UserCheck className="h-3 w-3" />
                      <span>{name}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Compact Photo Upload Row when registering */}
            {tab === 'create' && (
              <div className="flex items-center gap-3.5 rounded-xl bg-[#0A111F] border border-slate-800/90 p-3">
                <img
                  src={avatarUrl}
                  alt="Foto de perfil del jugador"
                  className="h-12 w-12 shrink-0 rounded-full object-cover border border-[#3B82F6]/60 bg-slate-900"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <label
                      htmlFor="avatar-upload-input"
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#2F6BFF]/15 hover:bg-[#2F6BFF]/25 border border-[#3B82F6]/40 text-sky-300 text-[11px] font-semibold cursor-pointer"
                    >
                      <Camera className="h-3.5 w-3.5" />
                      <span>{hasCustomPhoto ? 'Cambiar foto' : 'Subir tu foto'}</span>
                    </label>
                    <input
                      id="avatar-upload-input"
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoChange}
                      className="sr-only"
                    />
                    {PRESET_AVATARS.slice(0, 3).map((preset) => (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => {
                          setAvatarUrl(makeAvatarSvgDataUrl(preset.initials, preset.bg));
                          setHasCustomPhoto(false);
                        }}
                        className="px-2 py-1 rounded-md bg-slate-800/90 hover:bg-slate-700 text-[10px] text-slate-300 cursor-pointer"
                      >
                        {preset.initials}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Usuario */}
            <div>
              <label
                htmlFor="username-input"
                className="block text-xs font-medium text-slate-300 mb-1.5"
              >
                Usuario
              </label>
              <div className="relative">
                <User className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                <input
                  id="username-input"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Tu apodo de chipero"
                  maxLength={24}
                  required={tab === 'create' || savedUsernames.length > 0 || !hasLegacyVault}
                  className="w-full rounded-lg bg-[#080F1D] border border-slate-700/80 pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-[#3B82F6]"
                />
              </div>
            </div>

            {/* Contraseña */}
            <div>
              <label
                htmlFor="pin-input"
                className="block text-xs font-medium text-slate-300 mb-1.5"
              >
                Contraseña
              </label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                <input
                  id="pin-input"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={
                    tab === 'create'
                      ? 'Mín. 4 caracteres (o vacío para llave automática)'
                      : 'Ingresa tu contraseña o PIN'
                  }
                  maxLength={32}
                  className="w-full rounded-lg bg-[#080F1D] border border-slate-700/80 pl-10 pr-10 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-[#3B82F6]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white cursor-pointer"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>

              {/* 5-segment strength bar matching reference register screen */}
              {tab === 'create' && (
                <div className="mt-2 grid grid-cols-5 gap-1.5" aria-hidden="true">
                  {[1, 2, 3, 4, 5].map((seg) => (
                    <div
                      key={seg}
                      className={`h-1 rounded-full transition-colors ${
                        strength >= seg
                          ? strength >= 4
                            ? 'bg-emerald-400'
                            : 'bg-[#3B82F6]'
                          : 'bg-slate-800'
                      }`}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Repite la contraseña */}
            {tab === 'create' && (
              <div>
                <label
                  htmlFor="confirm-pin-input"
                  className="block text-xs font-medium text-slate-300 mb-1.5"
                >
                  Repite la contraseña
                </label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                  <input
                    id="confirm-pin-input"
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repite tu contraseña"
                    maxLength={32}
                    className="w-full rounded-lg bg-[#080F1D] border border-slate-700/80 pl-10 pr-10 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-[#3B82F6]"
                  />
                </div>
              </div>
            )}

            {error && (
              <p className="rounded-lg bg-red-500/15 border border-red-500/40 px-3.5 py-2 text-xs text-red-300">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-lg bg-[#2F6BFF] hover:bg-[#3B76FF] disabled:opacity-50 py-2.5 px-5 text-white font-bold text-sm transition-colors cursor-pointer shadow-[0_8px_24px_rgba(47,107,255,0.3)]"
            >
              {submitting
                ? 'Cifrando y verificando...'
                : tab === 'login'
                  ? 'Entrar'
                  : 'Crear cuenta'}
            </button>

            {tab === 'login' && (savedUsernames.length > 0 || hasLegacyVault) && (
              <button
                type="button"
                onClick={onResetVault}
                className="w-full text-center text-[11px] text-slate-500 hover:text-red-400 pt-1 cursor-pointer"
              >
                Borrar bóveda local y crear una cuenta nueva
              </button>
            )}
          </form>

          <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-center gap-2 text-[11px] text-slate-400">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
            <span>Conexión cifrada · Tus datos se guardan con AES-256-GCM en tu dispositivo</span>
          </div>
        </div>
      </section>
    </main>
  );
}
