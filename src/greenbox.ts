import { PrismaClientKnownRequestError } from "@prisma/client/runtime/index.js";

import { prisma } from "./clients/database.js";
import { KoLMessage, kolClient } from "./clients/kol.js";

export async function handleGreenboxKmail(message: KoLMessage) {
  // Remove spaces - KoL adds weird spaces to long messages.
  const text = message.msg.replace(/ /g, "").slice(9);

  if (text === "WIPE") return await wipe(message.who.id);

  // If we don't recognise a command, this is a submission
  return await update(message.who.id, message.who.name, text);
}

async function update(playerId: number, playerName: string, greenboxString: string) {
  const greenboxLastUpdate = new Date();

  try {
    await prisma.player.upsert({
      where: { playerId },
      update: { greenboxString, greenboxLastUpdate },
      create: {
        playerId,
        playerName,
        greenboxString,
        greenboxLastUpdate,
      },
    });
  } catch (error) {
    await kolClient.kmail(playerId, "There was an error processing your greenbox submission");
  }
}

const PRISMA_RECORD_NOT_FOUND_ERROR = "P2025";

function isRecordNotFoundError(error: unknown): error is PrismaClientKnownRequestError & {
  code: typeof PRISMA_RECORD_NOT_FOUND_ERROR;
} {
  return (
    error instanceof PrismaClientKnownRequestError && error.code === PRISMA_RECORD_NOT_FOUND_ERROR
  );
}

async function wipe(playerId: number) {
  try {
    await prisma.player.update({
      where: { playerId },
      data: { greenboxString: null, greenboxLastUpdate: null },
    });
  } catch (error) {
    if (!isRecordNotFoundError(error)) {
      return await kolClient.kmail(
        playerId,
        "There was an error wiping your public greenbox profile"
      );
    }
  }

  await kolClient.kmail(
    playerId,
    "At your request, your public greenbox profile, if it existed, has been removed"
  );
}
