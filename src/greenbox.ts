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

async function wipe(playerId: number) {
  await prisma.player.update({
    where: { playerId },
    data: { greenboxString: null, greenboxLastUpdate: null },
  });

  await kolClient.kmail(playerId, "At your request, your public Greenbox profile has been removed");
}
