import {
  Avatar,
  HStack,
  SkeletonCircle,
  SkeletonText,
  Stack,
  Text,
} from "@chakra-ui/react";
import React from "react";

const formatDate = (d: Date) => {
  const days = Math.ceil(
    ((new Date().getTime() - d.getTime()) / 1000) * 60 * 60 * 24,
  );
  return `${
    days === 0 ? "Today" : days === 1 ? "Yesterday" : d.toLocaleDateString()
  } ${d.toLocaleTimeString(undefined, { timeStyle: "short" })}`;
};

type Props = {
  message: {
    authorAvatar: string;
    authorName: string;
    createdAt: Date;
    content: string;
  } | null;
};

export default function DiscordMessage({ message }: Props) {
  return (
    <HStack
      bg="#32353b"
      color="#dcddde"
      fontSize="0.9em"
      p={2}
      borderRadius={10}
      whiteSpace="normal"
      alignItems="start"
    >
      {message ? (
        <Avatar src={message.authorAvatar} size="md" />
      ) : (
        <SkeletonCircle size="10" />
      )}
      <Stack>
        <HStack>
          {message ? (
            <Text color="#ffffff">{message.authorName}</Text>
          ) : (
            <SkeletonText startColor="#ffffff" noOfLines={1} minWidth="100px" />
          )}
          {message ? (
            <Text color="#72767d" fontSize="12px">
              {formatDate(message.createdAt)}
            </Text>
          ) : (
            <SkeletonText
              startColor="#72767d"
              noOfLines={1}
              minWidth="30px"
              fontSize="12px"
            />
          )}
        </HStack>
        {message ? (
          <Text color="#dcddde">{message.content}</Text>
        ) : (
          <SkeletonText startColor="#dcddde" noOfLines={3} />
        )}
      </Stack>
    </HStack>
  );
}
