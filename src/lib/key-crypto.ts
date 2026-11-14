import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';

export type EncryptedKeyRecord = {
  ciphertext: string;
  iv: string;
  tag: string;
  last4: string;
  keyId: string;
};

const gCrypto = globalThis as unknown as { __lottoDevFallbackSecret?: string };

function resolveSecretMap(env: NodeJS.ProcessEnv = process.env): {
  activeKeyId: string;
  secrets: Record<string, Buffer>;
} {
  const secrets: Record<string, Buffer> = {};
  const activeKeyId = (env.KEY_ENCRYPTION_KEY_ID || 'v1').trim() || 'v1';

  const toKey = (raw: string): Buffer => {
    const trimmed = raw.trim();
    if (/^[0-9a-fA-F]{64}$/.test(trimmed)) {
      return Buffer.from(trimmed, 'hex');
    }
    return createHash('sha256').update(trimmed, 'utf8').digest();
  };

  if (env.KEY_ENCRYPTION_SECRETS?.trim()) {
    const raw = env.KEY_ENCRYPTION_SECRETS.trim();
    if (raw.startsWith('{')) {
      try {
        const parsed = JSON.parse(raw) as Record<string, unknown>;
        for (const [k, v] of Object.entries(parsed)) {
          if (typeof v === 'string' && v.trim()) {
            secrets[k.trim()] = toKey(v);
          }
        }
      } catch {
        /* ignore malformed JSON and fall back */
      }
    } else {
      for (const pair of raw.split(',')) {
        const idx = pair.indexOf(':');
        if (idx > 0) {
          const k = pair.slice(0, idx).trim();
          const v = pair.slice(idx + 1).trim();
          if (k && v) secrets[k] = toKey(v);
        }
      }
    }
  }

  if (env.KEY_ENCRYPTION_SECRET?.trim()) {
    secrets[activeKeyId] = toKey(env.KEY_ENCRYPTION_SECRET);
  }

  if (!secrets[activeKeyId]) {
    if (env.NODE_ENV === 'production') {
      throw new Error(
        'KEY_ENCRYPTION_SECRET is required in production to encrypt or decrypt user API keys.',
      );
    }
    if (!gCrypto.__lottoDevFallbackSecret) {
      gCrypto.__lottoDevFallbackSecret = randomBytes(32).toString('hex');
    }
    secrets[activeKeyId] = toKey(gCrypto.__lottoDevFallbackSecret);
  }

  return { activeKeyId, secrets };
}

export function isEncryptionSecretConfigured(env: NodeJS.ProcessEnv = process.env): boolean {
  return Boolean(env.KEY_ENCRYPTION_SECRET?.trim() || env.KEY_ENCRYPTION_SECRETS?.trim());
}

export function maskLast4(plaintext: string): string {
  const clean = plaintext.trim();
  if (!clean) return '';
  if (clean.length <= 4) return '••••';
  return clean.slice(-4);
}

/**
 * Encrypts a plaintext API key using AES-256-GCM bound to `userId` via Additional Authenticated Data (AAD),
 * preventing ciphertext replay under another user's row.
 */
export function encryptUserApiKey(
  userId: string,
  plaintextKey: string,
  env: NodeJS.ProcessEnv = process.env,
): EncryptedKeyRecord {
  const cleanUser = userId.trim();
  const cleanKey = plaintextKey.trim();
  if (!cleanUser) throw new Error('userId is required to encrypt API key');
  if (!cleanKey) throw new Error('API key cannot be empty');

  const { activeKeyId, secrets } = resolveSecretMap(env);
  const key = secrets[activeKeyId];
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  cipher.setAAD(Buffer.from(cleanUser, 'utf8'));

  const encrypted = Buffer.concat([cipher.update(cleanKey, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();

  return {
    ciphertext: encrypted.toString('base64'),
    iv: iv.toString('base64'),
    tag: tag.toString('base64'),
    last4: maskLast4(cleanKey),
    keyId: activeKeyId,
  };
}

/**
 * Decrypts a stored API key record using `userId` as AAD and supporting `keyId` secret rotation.
 */
export function decryptUserApiKey(
  userId: string,
  record: Pick<EncryptedKeyRecord, 'ciphertext' | 'iv' | 'tag' | 'keyId'>,
  env: NodeJS.ProcessEnv = process.env,
): string {
  const cleanUser = userId.trim();
  if (!cleanUser) throw new Error('userId is required to decrypt API key');

  const { activeKeyId, secrets } = resolveSecretMap(env);
  const key = secrets[record.keyId] ?? secrets[activeKeyId];
  if (!key) {
    throw new Error(`No encryption secret available for keyId "${record.keyId}"`);
  }

  const decipher = createDecipheriv(
    'aes-256-gcm',
    key,
    Buffer.from(record.iv, 'base64'),
  );
  decipher.setAAD(Buffer.from(cleanUser, 'utf8'));
  decipher.setAuthTag(Buffer.from(record.tag, 'base64'));

  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(record.ciphertext, 'base64')),
    decipher.final(),
  ]);
  return decrypted.toString('utf8');
}
