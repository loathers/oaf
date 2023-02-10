import { ApplicationCommandOptionType } from "discord-api-types/v9";
import { CommandInteraction } from "discord.js";

import { Command } from "../type";

const PROJECT_ALIASES: Map<string, string> = new Map([
  ["garbo", "garbage-collector"],
  ["freecandy", "freecandydotexe"],
  ["garfjalen", "kol-scripting-resources"],
  ["mafia", "kolmafia"],
  ["oaf", "oaf-js"],
]);

const PROJECT_CAPITALISATIONS: Map<string, string> = new Map([
  ["tourguide", "TourGuide"],
  ["chit", "ChIT"],
  ["kol-scripting-resources", "KoL-Scripting-Resources"],
  ["cagebot", "Cagebot"],
  ["uberpvpoptimizer", "UberPvPOptimizer"],
]);

const _projectOrgs: { [key: string]: string } = {
  kolmafia: "kolmafia",
};

async function guessOrg(project: string) {
  if (project in _projectOrgs) return _projectOrgs[project];
  const result = await fetch(`https://github.com/loathers/${project}`);
  _projectOrgs[project] = result.ok ? "loathers" : "Loathing-Associates-Scripting-Society";
  return _projectOrgs[project];
}

async function prsWelcomeCommand(interaction: CommandInteraction): Promise<void> {
  const repo = interaction.options.getString("repository", true);

  const project = PROJECT_ALIASES.get(repo.toLowerCase()) ?? repo.toLowerCase();

  const capitalizedProject = PROJECT_CAPITALISATIONS.get(project) ?? project;

  const org = await guessOrg(capitalizedProject);

  const url = `https://github.com/${org}/${capitalizedProject}/pulls`;

  interaction.reply({
    content: url,
    allowedMentions: {
      parse: [],
    },
  });
}

const command: Command = {
  attach: ({ discordClient }) =>
    discordClient.attachCommand(
      "prswelcome",
      [
        {
          name: "repository",
          description: "Name of the project to link",
          type: ApplicationCommandOptionType.String,
          required: true,
        },
      ],
      prsWelcomeCommand,
      "Links to the PRs and issues assigned to you for a given LASS project"
    ),
};

export default command;
