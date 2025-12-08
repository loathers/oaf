import {
  Table,
  TableContainer,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tr,
} from "@chakra-ui/react";
import React from "react";
import { useLoaderData } from "react-router";

import { prisma } from "../../../clients/database.js";

export async function loader() {
  const raffles = await prisma.raffle.findMany({
    orderBy: [{ gameday: "desc" }],
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
        <Text>
          {w.player.playerName} (#{w.player.playerId})
          {w.player.discordId && ` (verified) `}, {w.tickets} tickets
        </Text>
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
