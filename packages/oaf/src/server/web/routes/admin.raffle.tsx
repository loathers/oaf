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
import React from "react";

import { prisma } from "../../../clients/database.js";
import { DiscordUser } from "./resources.user.js";

export async function loader() {
  const raffles = await prisma.raffle.findMany({
    include: {
      winners: {
        include: {
          player: true,
        },
      },
    },
  });

  return {
    raffles,
  };
}

function formatWinners(
  winners: {
    tickets;
    player: { playerName: string; playerId: number; discordId?: string | null };
  }[],
) {
  return (
    <>
      {winners.map((w) => (
        <div>
          {w.player.playerName} ({w.player.playerId})
          {w.player.discordId && <DiscordUser id={w.player.discordId} />},{" "}
          {w.tickets} tickets
        </div>
      ))}
    </>
  );
}

export default function Tags() {
  const { raffles } = useLoaderData<typeof loader>();

  return (
    <TableContainer>
      <Table>
        <Thead>
          <Tr>
            <Th>Gameday</Th>
            <Th>First Prize</Th>
            <Th>Winner</Th>
            <Th>Second Prize</Th>
            <Th>Winners</Th>
          </Tr>
        </Thead>
        <Tbody>
          {raffles.map((r) => (
            <Tr key={r.gameday}>
              <Td>{r.gameday}</Td>
              <Td>{r.firstPrize}</Td>
              <Td>{formatWinners(r.winners.slice(0, 1))}</Td>
              <Td>{r.secondPrize}</Td>
              <Td>{formatWinners(r.winners.slice(1))}</Td>
            </Tr>
          ))}
        </Tbody>
      </Table>
    </TableContainer>
  );
}
