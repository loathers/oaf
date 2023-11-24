import { prisma } from "./src/clients/database.js";

export async function makeGreenboxes() {
  try {
    const playersWithGreenbox = await prisma.player.findMany({
      where: {
        greenboxString: { not: null },
        greenboxLastUpdate: { not: null },
      },
      select: {
        playerId: true,
        greenboxString: true,
        greenboxLastUpdate: true,
      },
      orderBy: { playerId: "asc" },
    });
    await prisma.greenbox.createMany({
      data: playersWithGreenbox.map((data) => {
        return {
          playerId: data.playerId,
          data: data.greenboxString,
          time: data.greenboxLastUpdate,
        };
      }),
    });
  } catch (error) {
    console.log(error);
  }
}

makeGreenboxes();
