import type { Role } from '@prisma/client';

import { prisma } from '../../shared/db/prisma.client.js';

export const userPublicSelect = {
  id: true,
  email: true,
  full_name: true,
  role: true,
  created_at: true,
} as const;

export const authRepository = {
  findUserByEmail(email: string) {
    return prisma.user.findUnique({
      where: { email },
      select: {
        ...userPublicSelect,
        password_hash: true,
      },
    });
  },

  findUserById(id: number) {
    return prisma.user.findUnique({
      where: { id },
      select: userPublicSelect,
    });
  },

  createUser(data: { email: string; password_hash: string; full_name: string; role: Role }) {
    return prisma.user.create({
      data,
      select: userPublicSelect,
    });
  },

  createRefreshToken(data: { user_id: number; token_hash: string; expires_at: Date }) {
    return prisma.refreshToken.create({ data });
  },

  findRefreshTokenByHash(token_hash: string) {
    return prisma.refreshToken.findUnique({
      where: { token_hash },
      include: {
        user: {
          select: userPublicSelect,
        },
      },
    });
  },

  revokeRefreshToken(id: number, revoked_at: Date) {
    return prisma.refreshToken.update({
      where: { id },
      data: { revoked_at },
    });
  },

  revokeAllUserRefreshTokens(user_id: number, revoked_at: Date) {
    return prisma.refreshToken.updateMany({
      where: { user_id, revoked_at: null },
      data: { revoked_at },
    });
  },

  rotateRefreshToken(params: {
    oldTokenId: number;
    userId: number;
    newTokenHash: string;
    expiresAt: Date;
    now: Date;
  }) {
    return prisma.$transaction(async (tx) => {
      await tx.refreshToken.update({
        where: { id: params.oldTokenId },
        data: { revoked_at: params.now },
      });

      return tx.refreshToken.create({
        data: {
          user_id: params.userId,
          token_hash: params.newTokenHash,
          expires_at: params.expiresAt,
        },
      });
    });
  },
};
