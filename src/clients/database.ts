import { PrismaClient } from "@prisma/client";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library.js";

export const prisma = new PrismaClient();

const PRISMA_RECORD_NOT_FOUND_ERROR = "P2025";

export function isRecordNotFoundError(error: unknown): error is PrismaClientKnownRequestError & {
  code: typeof PRISMA_RECORD_NOT_FOUND_ERROR;
} {
  return (
    error instanceof PrismaClientKnownRequestError && error.code === PRISMA_RECORD_NOT_FOUND_ERROR
  );
}
