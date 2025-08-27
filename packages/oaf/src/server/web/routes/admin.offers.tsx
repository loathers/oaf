import {
  Table,
  TableContainer,
  Tbody,
  Td,
  Th,
  Thead,
  Tr,
} from "@chakra-ui/react";
import { useLoaderData } from "react-router";
import { LoaderFunctionArgs, data } from "react-router";
import React from "react";

import { prisma } from "../../../clients/database.js";

export async function loader({ context }: LoaderFunctionArgs) {
  const offers = await prisma.standingOffer.findMany({
    select: {
      itemId: true,
      price: true,
      buyer: {
        select: {
          playerId: true,
          playerName: true,
        },
      },
    },
  });

  return data({
    offers: offers.map((o) => ({
      ...o,
      price: Number(o.price),
      itemName:
        context.wikiClient.items.find((i) => i.id === o.itemId)?.name ??
        "Unknown",
    })),
  });
}

export default function Offers() {
  const { offers } = useLoaderData<typeof loader>();

  return (
    <TableContainer>
      <Table>
        <Thead>
          <Tr>
            <Th>Buyer</Th>
            <Th>Item</Th>
            <Th isNumeric>Price</Th>
          </Tr>
        </Thead>
        <Tbody>
          {offers.map((o) => (
            <Tr key={`${o.buyer.playerId}-${o.itemId}`}>
              <Td>
                {o.buyer.playerName} (#{o.buyer.playerId})
              </Td>
              <Td title={o.itemId.toString()}>{o.itemName}</Td>
              <Td isNumeric>{o.price.toLocaleString()}</Td>
            </Tr>
          ))}
        </Tbody>
      </Table>
    </TableContainer>
  );
}
