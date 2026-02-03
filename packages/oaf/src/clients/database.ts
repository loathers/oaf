import { Prisma, PrismaClient } from "@prisma/client";

import { config } from "../config.js";

function getDatasourceUrl() {
  if (!config.DATABASE_URL) return undefined;

  const url = new URL(config.DATABASE_URL);

  // Add connection retry/timeout params if not already set
  if (!url.searchParams.has("connect_timeout")) {
    url.searchParams.set("connect_timeout", "30");
  }
  if (!url.searchParams.has("pool_timeout")) {
    url.searchParams.set("pool_timeout", "30");
  }

  return url.toString();
}

export const prisma = new PrismaClient({
  datasourceUrl: getDatasourceUrl(),
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
