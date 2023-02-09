import { ApplicationCommandOptionType } from "discord-api-types/v9";
import { CommandInteraction } from "discord.js";

import { Command } from "../type";

export const ORB_RESPONSES: string[] = [
  "It is certain.",
  "It is decidedly so.",
  "Without a doubt.",
  "Yes - definitely.",
  "You may rely on it.",
  "As I see it, yes.",
  "Most likely.",
  "Outlook good.",
  "Yes.",
  "Signs point to yes.",
  "Reply hazy, try again.",
  "Ask again later.",
  "Better not tell you now.",
  "Cannot predict now.",
  "Concentrate and ask again.",
  "Don't count on it.",
  "My reply is no.",
  "My sources say no.",
  "Outlook not so good.",
  "Very doubtful.",
  "If CDM has a free moment, sure.",
  "Why not?",
  "How am I meant to know?",
  "I guess???",
  "...you realise that this is just a random choice from a list of strings, right?",
  "I have literally no way to tell.",
  "Ping Bobson, he probably knows",
  "Check the wiki, answer's probably in there somewhere.",
  "The wiki has the answer.",
  "The wiki has the answer, but it's wrong.",
  "I've not finished spading the answer to that question yet.",
  "The devs know, go pester them instead of me.",
  "INSUFFICIENT DATA FOR MEANINGFUL ANSWER",
  "THERE IS AS YET INSUFFICIENT DATA FOR A MEANINGFUL ANSWER",
];

function orb(interaction: CommandInteraction): void {
  const question = interaction.options.getString("asktheorb");
  interaction.reply({
    content: `${
      question ? `"${question}", you ask.\n` : ""
    }O.A.F. gazes into the mini crystal ball. "${
      ORB_RESPONSES[Math.floor(Math.random() * ORB_RESPONSES.length)]
    }", they report.`,
    allowedMentions: {
      parse: [],
    },
  });
}

const command: Command = {
  attach: ({ discordClient }) =>
    discordClient.attachCommand(
      "orb",
      [
        {
          name: "asktheorb",
          description: "THE ORB KNOWS ALL",
          type: ApplicationCommandOptionType.String,
          required: false,
        },
      ],
      orb,
      "Consult OAF's miniature crystal ball."
    ),
};

export default command;
