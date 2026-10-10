import { AdminRole, AdminUser } from '../types';

const PASSWORD_ITERATIONS = 180000;

const bytesToHex = (bytes: Uint8Array) =>
  Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');

const hexToBytes = (hex: string): Uint8Array<ArrayBuffer> =>
  new Uint8Array(hex.match(/.{1,2}/g)?.map((pair) => Number.parseInt(pair, 16)) || []);

const derivePasswordHash = async (password: string, salt: Uint8Array<ArrayBuffer>) => {
  const key = await window.crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits']
  );
  const hash = await window.crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: PASSWORD_ITERATIONS, hash: 'SHA-256' },
    key,
    256
  );
  return bytesToHex(new Uint8Array(hash));
};

export const createAdminUser = async (
  email: string,
  password: string,
  role: AdminRole
): Promise<AdminUser> => {
  const salt = window.crypto.getRandomValues(new Uint8Array(16));
  return {
    id: `admin-${window.crypto.randomUUID()}`,
    email: email.trim().toLowerCase(),
    role,
    passwordSalt: bytesToHex(salt),
    passwordHash: await derivePasswordHash(password, salt),
  };
};

export const verifyAdminPassword = async (user: AdminUser, password: string) => {
  const actual = await derivePasswordHash(password, hexToBytes(user.passwordSalt));
  if (actual.length !== user.passwordHash.length) return false;
  let difference = 0;
  for (let index = 0; index < actual.length; index += 1) {
    difference |= actual.charCodeAt(index) ^ user.passwordHash.charCodeAt(index);
  }
  return difference === 0;
};
