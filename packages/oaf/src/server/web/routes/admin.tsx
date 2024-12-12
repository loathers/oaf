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
import { LoaderFunctionArgs } from "@remix-run/node";
import { Link, Outlet, useLoaderData } from "@remix-run/react";
import React from "react";

import { authenticate } from "../auth.server";

export async function loader({ request }: LoaderFunctionArgs) {
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
