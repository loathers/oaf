import { SlashCommandIntegerOption } from "discord.js";

import { mafiaClient } from "../clients/mafia.js";

export const itemOption =
  (required = true) =>
  (option: SlashCommandIntegerOption) =>
    option
      .setName("item")
      .setDescription(
        "Select an item from the autocomplete or supply an item id",
      )
      .setAutocomplete(true)
      .setRequired(required);

export const itemAutocomplete = (value: string) =>
  mafiaClient.items
    .map(({ name, id }) => ({ name, value: id }))
    .filter(({ name }) => name.toLowerCase().includes(value.toLowerCase()))
    .toSorted((a, b) =>
      a.name.toLowerCase() === value.toLowerCase()
        ? -1
        : b.name.toLowerCase() === value.toLowerCase()
          ? 1
          : 0,
    )
    .slice(0, 25);
