import { Prisma, PrismaClient } from "@prisma/client";

import { config } from "../config.js";

export const prisma = new PrismaClient({
  datasourceUrl: config.DATABASE_URL,
});

const PRISMA_RECORD_NOT_FOUND_ERROR = "P2025";

export function isRecordNotFoundError(
  error: unknown,
): error is Prisma.PrismaClientKnownRequestError & {
  code: typeof PRISMA_RECORD_NOT_FOUND_ERROR;
} {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === PRISMA_RECORD_NOT_FOUND_ERROR
  );
}
