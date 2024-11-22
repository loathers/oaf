import { expand } from "greenbox-data";

import { prisma } from "../../../src/clients/database.js";

const compressed = await prisma.greenbox.findMany({
  where: { oldData: { not: null } },
});

await prisma.$transaction(
  compressed.map((e) =>
    prisma.greenbox.update({
      where: { id: e.id },
      data: {
        data: { ...expand(e.oldData!) },
        oldData: null,
      },
    }),
  ),
);
