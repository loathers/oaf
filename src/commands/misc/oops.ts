import { SlashCommandBuilder } from "discord.js";

import { execute as purge } from "./purge.js";

export const data = new SlashCommandBuilder()
  .setName("oops")
  .setDescription("Purges OAF's last message in this channel.");

export const execute = purge;
