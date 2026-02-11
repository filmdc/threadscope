import { PrismaClient } from '@prisma/client';
import { mockDeep, mockReset, type DeepMockProxy } from 'vitest-mock-extended';
import { vi } from 'vitest';

export const prismaMock = mockDeep<PrismaClient>();

vi.mock('../../lib/db', () => ({
  prisma: prismaMock,
}));

export function resetPrismaMock() {
  mockReset(prismaMock);
}

export type { DeepMockProxy };
