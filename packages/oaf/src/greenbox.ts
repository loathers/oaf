import { KoLMessage } from "kol.js";

import { isRecordNotFoundError, prisma } from "./clients/database.js";
import { kolClient } from "./clients/kol.js";

export async function handleGreenboxKmail(message: KoLMessage) {
  // Remove spaces - KoL adds weird spaces to long messages.
  const text = message.msg.replace(/ /g, "").slice(9);

  if (text === "WIPE") return await wipe(message.who.id);

  // If we don't recognise a command, this is a submission
  return await update(message.who.id, message.who.name, text);
}

async function update(
  playerId: number,
  playerName: string,
  greenboxString: string,
) {
  try {
    // If the player isn't already in the database, add them
    const player = await prisma.player.upsert({
      where: { playerId },
      update: {},
      create: { playerId, playerName },
      include: { greenbox: { orderBy: { id: "desc" }, take: 1 } },
    });

    // Only add a new entry if something has changed
    if (player.greenbox.at(0)?.data !== greenboxString) {
      await prisma.greenbox.create({
        data: {
          playerId,
          data: greenboxString,
        },
      });
    }
  } catch (error) {
    await kolClient.kmail(
      playerId,
      "There was an error processing your greenbox submission",
    );
  }
}

async function wipe(playerId: number) {
  try {
    await prisma.player.update({
      where: { playerId },
      data: {
        greenboxString: null,
        greenboxLastUpdate: null,
        greenbox: { deleteMany: {} },
      },
    });
  } catch (error) {
    if (!isRecordNotFoundError(error)) {
      return await kolClient.kmail(
        playerId,
        "There was an error wiping your public greenbox profile",
      );
    }
  }

  await kolClient.kmail(
    playerId,
    "At your request, your public greenbox profile, if it existed, has been removed",
  );
}
