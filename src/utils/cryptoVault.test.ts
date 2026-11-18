import test from 'node:test';
import assert from 'node:assert/strict';
import {
  clearEncryptedVault,
  decryptVaultData,
  encryptVaultData,
  listSavedAccountNames,
  loginEncryptedAccount,
  saveEncryptedAccount,
} from './cryptoVault';

test('AES-256-GCM E2E vault encrypts and decrypts user data securely', async () => {
  const secretData = {
    username: 'ElPatronCibao',
    coins: 112000,
    redeemedVipCode: true,
    clan: { name: 'Cibao Flow', tag: 'CBF' },
  };

  const envelope = await encryptVaultData(secretData, 'mi-pin-seguro-2026');
  assert.equal(envelope.alg, 'AES-256-GCM');
  assert.equal(envelope.kdf, 'PBKDF2-SHA256');
  assert.ok(!envelope.ciphertext.includes('ElPatronCibao'));
  assert.ok(!envelope.ciphertext.includes('112000'));

  const decrypted = await decryptVaultData<typeof secretData>(envelope, 'mi-pin-seguro-2026');
  assert.deepEqual(decrypted, secretData);
});

test('AES-256-GCM rejects wrong passphrase or tampered ciphertext', async () => {
  const envelope = await encryptVaultData({ coins: 50000 }, 'correct-pin');

  await assert.rejects(async () => {
    await decryptVaultData(envelope, 'wrong-pin');
  });

  const tampered = {
    ...envelope,
    ciphertext: envelope.ciphertext.slice(0, -4) + 'AAAA',
  };
  await assert.rejects(async () => {
    await decryptVaultData(tampered, 'correct-pin');
  });
});

test('multi-account AES-256-GCM register and login enforces per-user password', async () => {
  clearEncryptedVault();
  await saveEncryptedAccount('CibaoUser1', 'clave-cibao-1', { username: 'CibaoUser1', coins: 99000 });
  await saveEncryptedAccount('SantiagoPro', 'otra-clave-2', { username: 'SantiagoPro', coins: 45000 });

  const names = listSavedAccountNames();
  assert.ok(names.includes('CibaoUser1'));
  assert.ok(names.includes('SantiagoPro'));

  const okUser = await loginEncryptedAccount<{ username: string; coins: number }>(
    'CibaoUser1',
    'clave-cibao-1'
  );
  assert.equal(okUser?.coins, 99000);

  await assert.rejects(async () => {
    await loginEncryptedAccount('CibaoUser1', 'clave-incorrecta');
  });
  clearEncryptedVault();
});
