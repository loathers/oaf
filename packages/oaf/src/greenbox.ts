import { deepEqual } from "fast-equals";
import { expand } from "greenbox-data";
import { type KoLMessage } from "kol.js";

import { isRecordNotFoundError, prisma } from "./clients/database.js";
import { discordClient } from "./clients/discord.js";
import { kolClient } from "./clients/kol.js";

export async function handleGreenboxKmail(message: KoLMessage) {
  if (message.type !== "kmail") return;

  // Remove spaces - KoL adds weird spaces to long messages.
  const text = message.msg.replace(/ /g, "").slice(9);

  switch (text) {
    case "WIPE":
      await wipe(message.who.id);
      break;
    default:
      await update(message.who.id, message.who.name, text);
      break;
  }
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

    const greenboxData = expand(greenboxString);

    // Only add a new entry if something has changed
    if (!deepEqual(player.greenbox.at(0)?.data, greenboxData)) {
      await prisma.greenbox.create({
        data: {
          playerId,
          data: { ...greenboxData },
        },
      });
    }
  } catch (error) {
    await discordClient.alert(
      "Error processing greenbox submission",
      undefined,
      error,
    );
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
      await discordClient.alert(
        "Error processing greenbox submission",
        undefined,
        error,
      );
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
