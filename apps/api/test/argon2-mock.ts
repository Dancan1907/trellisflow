import * as crypto from 'crypto';

export const hash = async (password: string): Promise<string> => {
  const salt = crypto.randomBytes(16).toString('hex');
  const digest = crypto
    .createHash('sha256')
    .update(salt + password)
    .digest('hex');
  return `mock$${salt}$${digest}`;
};

export const verify = async (hashed: string, password: string): Promise<boolean> => {
  if (typeof hashed !== 'string' || !hashed.startsWith('mock$')) return false;
  const parts = hashed.split('$');
  if (parts.length !== 3) return false;
  const [, salt, expectedDigest] = parts;
  const actualDigest = crypto
    .createHash('sha256')
    .update(salt + password)
    .digest('hex');
  return actualDigest === expectedDigest;
};
