import { expand } from "greenbox-data";

import { prisma } from "../../../src/clients/database.js";

const compressed = await prisma.greenbox.findMany({
  where: { oldData: { not: null } },
});

for (const e of compressed) {
  console.log("Converting", e.id, "for player", e.playerId);
  await prisma.greenbox.update({
    where: { id: e.id },
    data: {
      data: { ...expand(e.oldData!) },
      oldData: null,
    },
  });
}
