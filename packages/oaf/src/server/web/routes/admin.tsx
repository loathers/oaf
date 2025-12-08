import {
  Avatar,
  Box,
  Button,
  Divider,
  HStack,
  Heading,
  Menu,
  MenuButton,
  MenuDivider,
  MenuItem,
  MenuList,
  Stack,
  Text,
} from "@chakra-ui/react";
import React from "react";
import { Link, Outlet, useLoaderData } from "react-router";

import { authenticate } from "../auth.server.js";
import { Route } from "./+types/admin.js";

export async function loader({ request }: Route.LoaderArgs) {
  const user = await authenticate(request);

  return { user };
}

export default function Admin() {
  const { user } = useLoaderData<typeof loader>();

  return (
    <Stack>
      <HStack>
        <Heading>O.A.F. Admin Panel</Heading>
        <Box flex={1} />
        <Menu>
          <MenuButton as={Button} rightIcon={<>⌄</>}>
            <HStack>
              <Text>{user.name}</Text>
              <Avatar title={user.name} src={user.avatar} size="sm" />
            </HStack>
          </MenuButton>
          <MenuList>
            <MenuItem as={Link} to="./offers">
              Standing Offers
            </MenuItem>
            <MenuItem as={Link} to="./pilot">
              Pilot
            </MenuItem>
            <MenuItem as={Link} to="./tags">
              Tags
            </MenuItem>
            <MenuItem as={Link} to="./verified">
              Verified
            </MenuItem>
            <MenuItem as={Link} to="./raffle">
              Raffle
            </MenuItem>
            <MenuDivider />
            <MenuItem as={Link} to="/logout">
              Logout
            </MenuItem>
          </MenuList>
        </Menu>
      </HStack>
      <Divider />
      <Outlet />
    </Stack>
  );
}
