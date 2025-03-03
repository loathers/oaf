import { loadQuickJs } from "@sebastianwessel/quickjs";
import { Events, Message, bold, quote } from "discord.js";

import { discordClient } from "../../clients/discord.js";

const EXECUTABLE = /^```[tj]sx\n(.*?)\n```$/s;

const { runSandboxed } = await loadQuickJs();

async function onMessage(message: Message) {
  if (message.author.bot) return;
  if (!message.channel.isSendable()) return;
  const member = message.member;
  if (!member) return;

  const code = message.content.match(EXECUTABLE)?.[1];
  if (!code) return;

  const reply = await message.reply(`Running your code...`);

  const result = await runSandboxed(async ({ evalCode }) => evalCode(code), {
    transformTypescript: true,
  });

  if (!result.ok) {
    return void (await reply.edit(
      `${bold(result.error.name)}: ${result.error.message}`,
    ));
  }

  await reply.edit(quote(JSON.stringify(result.data)));
}

export async function init() {
  discordClient.on(Events.MessageCreate, onMessage);
}
