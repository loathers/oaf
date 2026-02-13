import {
  ChatInputCommandInteraction,
  EmbedBuilder,
  SlashCommandBuilder,
  bold,
  hyperlink,
  inlineCode,
  italic,
  time,
  underscore,
  userMention,
} from "discord.js";
import { dedent } from "ts-dedent";

import {
  findPlayerByDiscordId,
  updatePlayersByDiscordId,
} from "../../clients/database.js";

export const data = new SlashCommandBuilder()
  .setName("thicc")
  .setDescription(
    "Get involved in the Traditional Holiday Intergifting: Covert Crimbo!",
  )
  .addSubcommand((subcommand) =>
    subcommand.setName("about").setDescription("Learn more about THICC"),
  )
  .addSubcommand((subcommand) =>
    subcommand.setName("enter").setDescription("Enter to participate in THICC"),
  )
  .addSubcommand((subcommand) =>
    subcommand.setName("withdraw").setDescription("Withdraw from THICC"),
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  const subcommand = interaction.options.getSubcommand();

  await interaction.deferReply({ ephemeral: true });

  switch (subcommand) {
    case "about":
      return void (await about(interaction));
    case "enter":
      return void (await enter(interaction));
    case "withdraw":
      return void (await withdraw(interaction));
  }
}

const ENTRY_DEADLINE = new Date(2023, 10, 5);
const GAUSIE = userMention("263438077865754644");
const ABOUT_EMBED = new EmbedBuilder().setTitle("THICC 2023")
  .setDescription(dedent`
        Welcome to Traditional Holiday Intergifting: Covert Crimbo! To celebrate the holiday season, ${GAUSIE} is holding an international "${hyperlink(
          "secret santa",
          "https://en.wikipedia.org/wiki/Secret_Santa",
        )}" (or covert crimbo).

        The plan is as follows:

        1. Enter by ${time(
          ENTRY_DEADLINE,
        )} (note: your Discord account must be linked to your KoL account, run ${inlineCode(
          "/claim",
        )} to do so)
        2. OAF will draw the lots to see who is sending a gift to whom. If there is anyone you would not like to be paired with, please let ${GAUSIE} know and he can try to accommodate within reason.
        3. OAF will then ask you for your postal address, which will be sent directly to the necessary person, without being stored in our database.
        4. You will in turn receive your giftee's Discord username, IGN and address.
        5. Go out and get or make your gift, and send it so that it arrives before Crimbo!
        6. ${GAUSIE} will send you one million meat for participation, because he loves you.

        ${bold(underscore("F.A.Q."))}
        * ${italic(
          "What if I don't want to send someone my address?",
        )} Everyone has their own acceptable risk level. ${hyperlink(
          "Huge secret santa events",
          "https://www.reddit.com/r/secretsanta/",
        )} take place every year between total strangers, without any issue. If you really want to enter but cannot share your shipping address you could use your mailroom at work or school. If that doesn't work, a temporary PO Box can be surprisingly cheap depending on your location. If it isn't for you this year, hopefully you'll feel more comfortable in future years! Note, this is not an official ASS event and, more broadly, none of the organisers are accepting liability for anything. This is a self-organised fun activity between friends.
        * ${italic(
          "How much should I spend?",
        )} Obviously you may be as generous as you like but the target is $50 or less including shipping.
        * ${italic(
          "But I can't afford that!",
        )} This is a gifting event, so please still join as long as you are able to send something. Why not make something yourself? Remember, the joy is in the giving not the receiving!
        * ${italic(
          "What if I entered but have to pull out?",
        )} Please let ${GAUSIE} know ASAP so he can remove you from the chain and make sure everyone gets a gift.
        * ${italic(
          "What if I never receive a gift?",
        )} This should be rare, but if it does happen inform ${GAUSIE} and he will try to sort something out. If all fails, remember the joy is in the giving not the receiving.
    `);

async function about(interaction: ChatInputCommandInteraction) {
  return await interaction.editReply({
    embeds: [ABOUT_EMBED],
  });
}

async function enter(interaction: ChatInputCommandInteraction) {
  const discordId = interaction.user.id;
  const player = await findPlayerByDiscordId(discordId);

  if (!player) {
    return void (await interaction.editReply(
      `Your account must be verified to enter. Please follow the ${inlineCode(
        "/claim",
      )} process and try again.`,
    ));
  }

  if (player.thiccEntered) {
    return void (await interaction.editReply(
      "You have already entered THICC!",
    ));
  }

  await updatePlayersByDiscordId(discordId, { thiccEntered: true });

  return void (await interaction.editReply(
    "You have entered THICC! Thanks for gifting!",
  ));
}

async function withdraw(interaction: ChatInputCommandInteraction) {
  const discordId = interaction.user.id;
  const player = await findPlayerByDiscordId(discordId);

  if (!player?.thiccEntered) {
    return void (await interaction.editReply(
      `You have not entered so this doesn't make sense. The withdrawal method has failed again.`,
    ));
  }

  if (Date.now() > ENTRY_DEADLINE.getTime()) {
    return void (await interaction.editReply(
      `It is too late to withdraw automatically, please get in contact with ${GAUSIE}.`,
    ));
  }

  await updatePlayersByDiscordId(discordId, { thiccEntered: false });

  return void (await interaction.editReply(
    "You have withdrawn from THICC! Sorry to see you go.",
  ));
}
