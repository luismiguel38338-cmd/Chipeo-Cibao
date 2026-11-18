import { EncryptedVaultEnvelope } from '../game/types';

const VAULT_STORAGE_KEY = 'chipeo_cibaeno_e2e_vault_v1';
const ACCOUNTS_INDEX_KEY = 'chipeo_cibaeno_accounts_v2';
const ACTIVE_ACCOUNT_KEY = 'chipeo_cibaeno_active_user_v2';
const DEVICE_SECRET_KEY = 'chipeo_cibaeno_device_key_v1';
const PBKDF2_ITERATIONS = 100000;

const memoryStorage = new Map<string, string>();

function storageGet(key: string): string | null {
  try {
    if (typeof localStorage !== 'undefined') {
      return localStorage.getItem(key);
    }
  } catch {
    // ignore
  }
  return memoryStorage.get(key) ?? null;
}

function storageSet(key: string, val: string): void {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(key, val);
      return;
    }
  } catch {
    // ignore
  }
  memoryStorage.set(key, val);
}

function storageRemove(key: string): void {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(key);
      return;
    }
  } catch {
    // ignore
  }
  memoryStorage.delete(key);
}

function getSubtleCrypto(): SubtleCrypto {
  const cryptoObj = globalThis.crypto;
  if (!cryptoObj || !cryptoObj.subtle) {
    throw new Error('Web Crypto API (AES-GCM) no está disponible en este entorno.');
  }
  return cryptoObj.subtle;
}

function bytesToBase64(bytes: Uint8Array): string {
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(bytes).toString('base64');
  }
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToBytes(b64: string): Uint8Array {
  if (typeof Buffer !== 'undefined') {
    return new Uint8Array(Buffer.from(b64, 'base64'));
  }
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}

async function deriveAesKey(passphrase: string, saltBytes: Uint8Array): Promise<CryptoKey> {
  const subtle = getSubtleCrypto();
  const encoder = new TextEncoder();
  const keyMaterial = await subtle.importKey(
    'raw',
    encoder.encode(passphrase),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  return subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: toArrayBuffer(saltBytes),
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

export async function encryptVaultData<T>(
  payload: T,
  passphrase: string
): Promise<EncryptedVaultEnvelope> {
  const subtle = getSubtleCrypto();
  const salt = globalThis.crypto.getRandomValues(new Uint8Array(16));
  const iv = globalThis.crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveAesKey(passphrase, salt);

  const plaintext = new TextEncoder().encode(JSON.stringify(payload));
  const encryptedBuffer = await subtle.encrypt(
    { name: 'AES-GCM', iv: toArrayBuffer(iv) },
    key,
    plaintext
  );

  return {
    version: 1,
    alg: 'AES-256-GCM',
    kdf: 'PBKDF2-SHA256',
    iterations: PBKDF2_ITERATIONS,
    salt: bytesToBase64(salt),
    iv: bytesToBase64(iv),
    ciphertext: bytesToBase64(new Uint8Array(encryptedBuffer)),
    updatedAt: Date.now(),
  };
}

export async function decryptVaultData<T>(
  envelope: EncryptedVaultEnvelope,
  passphrase: string
): Promise<T> {
  if (
    !envelope ||
    envelope.alg !== 'AES-256-GCM' ||
    envelope.kdf !== 'PBKDF2-SHA256' ||
    !envelope.salt ||
    !envelope.iv ||
    !envelope.ciphertext
  ) {
    throw new Error('Formato de bóveda cifrada inválido.');
  }

  const subtle = getSubtleCrypto();
  const salt = base64ToBytes(envelope.salt);
  const iv = base64ToBytes(envelope.iv);
  const ciphertext = base64ToBytes(envelope.ciphertext);

  const key = await deriveAesKey(passphrase, salt);
  const decryptedBuffer = await subtle.decrypt(
    { name: 'AES-GCM', iv: toArrayBuffer(iv) },
    key,
    toArrayBuffer(ciphertext)
  );

  const json = new TextDecoder().decode(decryptedBuffer);
  return JSON.parse(json) as T;
}

export function getOrCreateDeviceSecret(): string {
  const existing = storageGet(DEVICE_SECRET_KEY);
  if (existing && existing.length >= 32) {
    return existing;
  }
  const randomBytes = globalThis.crypto.getRandomValues(new Uint8Array(32));
  const secret = bytesToBase64(randomBytes);
  storageSet(DEVICE_SECRET_KEY, secret);
  return secret;
}

export function buildVaultPassphrase(userPin: string): string {
  const deviceSecret = getOrCreateDeviceSecret();
  const pinPart = userPin.trim() || 'device-default-pin';
  return `${deviceSecret}::${pinPart}`;
}

export function buildAccountPassphrase(username: string, password: string): string {
  const deviceSecret = getOrCreateDeviceSecret();
  const normalizedUser = username.trim().toLowerCase();
  const secretPart = password.trim() || 'device-default-pin';
  return `${deviceSecret}::${normalizedUser}::${secretPart}`;
}

interface StoredAccountEntry {
  username: string;
  envelope: EncryptedVaultEnvelope;
}

function readAccountsMap(): Record<string, StoredAccountEntry> {
  try {
    const raw = storageGet(ACCOUNTS_INDEX_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Record<string, StoredAccountEntry>;
  } catch {
    return {};
  }
}

function writeAccountsMap(map: Record<string, StoredAccountEntry>): void {
  storageSet(ACCOUNTS_INDEX_KEY, JSON.stringify(map));
}

export function listSavedAccountNames(): string[] {
  const map = readAccountsMap();
  return Object.values(map).map((entry) => entry.username);
}

export function getActiveAccountName(): string | null {
  return storageGet(ACTIVE_ACCOUNT_KEY);
}

export function setActiveAccountName(username: string | null): void {
  if (username) {
    storageSet(ACTIVE_ACCOUNT_KEY, username);
  } else {
    storageRemove(ACTIVE_ACCOUNT_KEY);
  }
}

export async function saveEncryptedAccount<T>(
  username: string,
  password: string,
  profile: T
): Promise<EncryptedVaultEnvelope> {
  const normalizedKey = username.trim().toLowerCase();
  const passphrase = buildAccountPassphrase(username, password);
  const envelope = await encryptVaultData(profile, passphrase);
  const map = readAccountsMap();
  map[normalizedKey] = {
    username: username.trim(),
    envelope,
  };
  writeAccountsMap(map);
  storageSet(ACTIVE_ACCOUNT_KEY, username.trim());
  storageSet(VAULT_STORAGE_KEY, JSON.stringify(envelope));
  return envelope;
}

export async function loginEncryptedAccount<T>(
  username: string,
  password: string
): Promise<T | null> {
  const normalizedKey = username.trim().toLowerCase();
  const map = readAccountsMap();
  const entry = map[normalizedKey];
  if (!entry) return null;
  const passphrase = buildAccountPassphrase(username, password);
  const profile = await decryptVaultData<T>(entry.envelope, passphrase);
  storageSet(ACTIVE_ACCOUNT_KEY, entry.username);
  return profile;
}

export function hasStoredVault(): boolean {
  return Boolean(storageGet(VAULT_STORAGE_KEY)) || listSavedAccountNames().length > 0;
}

export function getStoredVaultEnvelope(): EncryptedVaultEnvelope | null {
  try {
    const active = getActiveAccountName();
    if (active) {
      const map = readAccountsMap();
      const found = map[active.toLowerCase()];
      if (found) return found.envelope;
    }
    const raw = storageGet(VAULT_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as EncryptedVaultEnvelope;
  } catch {
    return null;
  }
}

export async function saveProfileToEncryptedVault<T>(
  profile: T,
  userPin: string
): Promise<EncryptedVaultEnvelope> {
  const activeName = getActiveAccountName();
  if (activeName) {
    return saveEncryptedAccount(activeName, userPin, profile);
  }
  const passphrase = buildVaultPassphrase(userPin);
  const envelope = await encryptVaultData(profile, passphrase);
  storageSet(VAULT_STORAGE_KEY, JSON.stringify(envelope));
  return envelope;
}

export async function loadProfileFromEncryptedVault<T>(userPin: string): Promise<T | null> {
  const activeName = getActiveAccountName();
  if (activeName) {
    const map = readAccountsMap();
    const entry = map[activeName.toLowerCase()];
    if (entry) {
      const passphrase = buildAccountPassphrase(activeName, userPin);
      return decryptVaultData<T>(entry.envelope, passphrase);
    }
  }
  const envelope = getStoredVaultEnvelope();
  if (!envelope) return null;
  const passphrase = buildVaultPassphrase(userPin);
  return decryptVaultData<T>(envelope, passphrase);
}

export function clearEncryptedVault(): void {
  storageRemove(VAULT_STORAGE_KEY);
  storageRemove(ACCOUNTS_INDEX_KEY);
  storageRemove(ACTIVE_ACCOUNT_KEY);
}
