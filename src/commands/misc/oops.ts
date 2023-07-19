import { SlashCommandBuilder } from "discord.js";

import { execute as purge } from "./purge.js";

export const data = new SlashCommandBuilder()
  .setName("oops")
  .setDescription("Purges my last message in this channel.");

export const execute = purge;
