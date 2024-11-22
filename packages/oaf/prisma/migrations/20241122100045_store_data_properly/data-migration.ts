import { expand } from "greenbox-data";

import { prisma } from "../../../src/clients/database.js";

console.log("Migrating greenbox data");

while (true) {
  const e = await prisma.greenbox.findFirst({
    where: { oldData: { not: null } },
    take: 1,
  });

  if (!e) break;

  console.log(`Migrating ${e.id} for player ${e.playerId}`);

  await prisma.greenbox.update({
    where: { id: e.id },
    data: {
      data: { ...expand(e.oldData!) },
      oldData: null,
    },
  });
}

console.log("Done migrating greenbox data");
