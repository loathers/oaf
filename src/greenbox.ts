import { isRecordNotFoundError, prisma } from "./clients/database.js";
import { KoLMessage, kolClient } from "./clients/kol.js";

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
  const greenboxLastUpdate = new Date();

  try {
    // if the player isn't already in the database, add them
    const existingPlayer = await prisma.player.findUnique({
      where: { playerId },
    });
    if (!existingPlayer) {
      await prisma.player.create({
        data: {
          playerId,
          playerName,
        },
      });
    }
    // don't add a new entry if nothing has changed
    const existingGreenbox = await prisma.greenbox.findFirst({
      where: { playerId },
      orderBy: { id: "desc" },
      select: { data: true },
    });
    if (existingGreenbox?.data !== greenboxString) {
      await prisma.greenbox.create({
        data: {
          playerId,
          data: greenboxString,
          time: greenboxLastUpdate,
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
      data: { greenboxString: null, greenboxLastUpdate: null },
    });
    await prisma.greenbox.deleteMany({
      where: { playerId },
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
