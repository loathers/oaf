import {
  Code,
  Table,
  TableContainer,
  Tbody,
  Td,
  Th,
  Thead,
  Tr,
} from "@chakra-ui/react";
import React from "react";
import { useLoaderData } from "react-router";

import { prisma } from "../../../clients/database.js";
import { DynamicDiscordMessage } from "./resources.message.js";
import { DiscordUser } from "./resources.user.js";

export async function loader() {
  const tags = await prisma.tag.findMany({});

  return {
    tags,
  };
}

export default function Tags() {
  const { tags } = useLoaderData<typeof loader>();

  return (
    <TableContainer>
      <Table>
        <Thead>
          <Tr>
            <Th>Tag</Th>
            <Th>Content</Th>
            <Th>At</Th>
            <Th>By</Th>
          </Tr>
        </Thead>
        <Tbody>
          {tags.map((t) => (
            <Tr key={t.tag}>
              <Td>
                <Code>{t.tag}</Code>
              </Td>
              <Td>
                <DynamicDiscordMessage
                  guildId={t.guildId}
                  channelId={t.channelId}
                  messageId={t.messageId}
                />
              </Td>
              <Td>{new Date(t.createdAt).toLocaleString()}</Td>
              <Td>
                <DiscordUser id={t.createdBy} />
              </Td>
            </Tr>
          ))}
        </Tbody>
      </Table>
    </TableContainer>
  );
}
