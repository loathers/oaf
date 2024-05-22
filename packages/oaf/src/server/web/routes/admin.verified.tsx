/// <reference types="../../../../remix.env.d.ts" />
import {
  Table,
  TableContainer,
  Tbody,
  Td,
  Th,
  Thead,
  Tr,
} from "@chakra-ui/react";
import { useLoaderData } from "@remix-run/react";
import { json } from "@remix-run/server-runtime";
import React from "react";

import { prisma } from "../../../clients/database.js";
import { DiscordUser } from "./resources.user.js";

export async function loader() {
  const players = await prisma.player.findMany({
    where: { discordId: { not: null } },
  });

  return json({ players });
}

export default function Verified() {
  const { players } = useLoaderData<typeof loader>();

  return (
    <TableContainer>
      <Table>
        <Thead>
          <Tr>
            <Th>Player</Th>
            <Th>Discord User</Th>
          </Tr>
        </Thead>
        <Tbody>
          {players.map((p) => (
            <Tr key={`${p.playerId}`}>
              <Td>
                {p.playerName} (#{p.playerId})
              </Td>
              <Td>
                <DiscordUser id={p.discordId!} />
              </Td>
            </Tr>
          ))}
        </Tbody>
      </Table>
    </TableContainer>
  );
}
