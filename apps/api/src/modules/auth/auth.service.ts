import crypto from 'node:crypto';

import { Role } from '@prisma/client';
import argon2 from 'argon2';
import jwt, { type SignOptions } from 'jsonwebtoken';

import { env } from '../../shared/config/env.js';
import {
  ConflictError,
  NotFoundError,
  PROBLEM_TYPES,
  UnauthorizedError,
} from '../../shared/errors/problem.js';
import { authRepository } from './auth.repository.js';
import type { LoginInput, RegisterInput } from './auth.schema.js';

// Валідний Argon2id-хеш для захисту від timing-атак при вході з неіснуючим email
const DUMMY_PASSWORD_HASH =
  '$argon2id$v=19$m=65536,t=3,p=4$9JjEnVpUczJVcoodz5nHoA$liUPcZ7MDcVJUYSLyocYsI2J+fj7wAFYyrBOdN07F7Q';

export interface PublicUser {
  id: number;
  email: string;
  full_name: string;
  role: Role;
  created_at: Date;
}

export interface AuthResponseBody {
  access_token: string;
  token_type: 'Bearer';
  expires_in: number;
  user: PublicUser;
}

export interface AuthSessionResult {
  authResponse: AuthResponseBody;
  refreshToken: string;
  refreshMaxAgeMs: number;
}

function parseDurationSeconds(ttl: string): number {
  const match = /^(\d+)([smhd])$/i.exec(ttl.trim());
  if (!match) {
    throw new Error(`Unsupported TTL format: ${ttl}`);
  }
  const value = Number(match[1]);
  const unit = match[2]!.toLowerCase();
  const multipliers: Record<string, number> = {
    s: 1,
    m: 60,
    h: 3600,
    d: 86400,
  };
  return value * multipliers[unit]!;
}

export async function hashPassword(password: string): Promise<string> {
  return argon2.hash(password, { type: argon2.argon2id });
}

export async function verifyPassword(hash: string, password: string): Promise<boolean> {
  try {
    return await argon2.verify(hash, password);
  } catch {
    return false;
  }
}

function generateRefreshToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

function hashRefreshToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function signAccessToken(user: { id: number; role: Role }): {
  accessToken: string;
  expiresIn: number;
} {
  const expiresIn = parseDurationSeconds(env.JWT_ACCESS_TTL);
  const options: SignOptions = {
    algorithm: 'HS256',
    subject: String(user.id),
    expiresIn,
  };
  const accessToken = jwt.sign({ role: user.role }, env.JWT_ACCESS_SECRET, options);
  return { accessToken, expiresIn };
}

function buildSessionPayload(user: PublicUser, refreshToken: string): AuthSessionResult {
  const { accessToken, expiresIn } = signAccessToken(user);
  const refreshSeconds = parseDurationSeconds(env.JWT_REFRESH_TTL);

  return {
    authResponse: {
      access_token: accessToken,
      token_type: 'Bearer',
      expires_in: expiresIn,
      user,
    },
    refreshToken,
    refreshMaxAgeMs: refreshSeconds * 1000,
  };
}

function getRefreshExpiresAt(): Date {
  const refreshSeconds = parseDurationSeconds(env.JWT_REFRESH_TTL);
  return new Date(Date.now() + refreshSeconds * 1000);
}

export const authService = {
  async register(input: RegisterInput): Promise<AuthSessionResult> {
    const normalizedEmail = input.email.trim().toLowerCase();
    const existing = await authRepository.findUserByEmail(normalizedEmail);
    if (existing) {
      throw new ConflictError(
        'Користувач із таким email вже існує',
        PROBLEM_TYPES.DUPLICATE_RESOURCE,
      );
    }

    const passwordHash = await hashPassword(input.password);
    const user = await authRepository.createUser({
      email: normalizedEmail,
      password_hash: passwordHash,
      full_name: input.full_name.trim(),
      role: Role.EMPLOYEE,
    });

    const rawRefreshToken = generateRefreshToken();
    await authRepository.createRefreshToken({
      user_id: user.id,
      token_hash: hashRefreshToken(rawRefreshToken),
      expires_at: getRefreshExpiresAt(),
    });

    return buildSessionPayload(user, rawRefreshToken);
  },

  async login(input: LoginInput): Promise<AuthSessionResult> {
    const normalizedEmail = input.email.trim().toLowerCase();
    const userWithHash = await authRepository.findUserByEmail(normalizedEmail);

    const passwordValid = await verifyPassword(
      userWithHash?.password_hash ?? DUMMY_PASSWORD_HASH,
      input.password,
    );

    if (!userWithHash || !passwordValid) {
      throw new UnauthorizedError('Невірний логін або пароль');
    }

    const rawRefreshToken = generateRefreshToken();
    await authRepository.createRefreshToken({
      user_id: userWithHash.id,
      token_hash: hashRefreshToken(rawRefreshToken),
      expires_at: getRefreshExpiresAt(),
    });

    const user: PublicUser = {
      id: userWithHash.id,
      email: userWithHash.email,
      full_name: userWithHash.full_name,
      role: userWithHash.role,
      created_at: userWithHash.created_at,
    };

    return buildSessionPayload(user, rawRefreshToken);
  },

  async refresh(rawRefreshToken: string | undefined): Promise<AuthSessionResult> {
    if (!rawRefreshToken) {
      throw new UnauthorizedError('Відсутній refresh-токен');
    }

    const tokenHash = hashRefreshToken(rawRefreshToken);
    const stored = await authRepository.findRefreshTokenByHash(tokenHash);
    if (!stored) {
      throw new UnauthorizedError('Недійсний refresh-токен');
    }

    const now = new Date();

    // Reuse detection: повторне використання відкликаного токена анулює всі сесії користувача
    if (stored.revoked_at !== null) {
      await authRepository.revokeAllUserRefreshTokens(stored.user_id, now);
      throw new UnauthorizedError('Refresh-токен вже використано; усі сесії відкликано');
    }

    if (stored.expires_at <= now) {
      await authRepository.revokeRefreshToken(stored.id, now);
      throw new UnauthorizedError('Refresh-токен прострочений');
    }

    const newRawToken = generateRefreshToken();
    await authRepository.rotateRefreshToken({
      oldTokenId: stored.id,
      userId: stored.user_id,
      newTokenHash: hashRefreshToken(newRawToken),
      expiresAt: getRefreshExpiresAt(),
      now,
    });

    return buildSessionPayload(stored.user, newRawToken);
  },

  async logout(rawRefreshToken: string | undefined): Promise<void> {
    if (!rawRefreshToken) {
      return;
    }

    const tokenHash = hashRefreshToken(rawRefreshToken);
    const stored = await authRepository.findRefreshTokenByHash(tokenHash);
    if (stored && stored.revoked_at === null) {
      await authRepository.revokeRefreshToken(stored.id, new Date());
    }
  },

  async getMe(userId: number): Promise<PublicUser> {
    const user = await authRepository.findUserById(userId);
    if (!user) {
      throw new NotFoundError('Користувача не знайдено');
    }
    return user;
  },
};
