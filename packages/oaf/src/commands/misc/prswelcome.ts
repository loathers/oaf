import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";

const PROJECT_ALIASES = new Map<string, string>([
  ["garbo", "garbage-collector"],
  ["freecandy", "freecandydotexe"],
  ["garfjalen", "kol-scripting-resources"],
  ["mafia", "kolmafia"],
  ["chrono", "chrono-collector"],
]);

const PROJECT_CAPITALISATIONS = new Map<string, string>([
  ["tourguide", "TourGuide"],
  ["chit", "ChIT"],
  ["kol-scripting-resources", "KoL-Scripting-Resources"],
  ["cagebot", "Cagebot"],
  ["uberpvpoptimizer", "UberPvPOptimizer"],
]);

const _projectOrgs: Record<string, string> = {
  kolmafia: "kolmafia",
};

export const data = new SlashCommandBuilder()
  .setName("prswelcome")
  .setDescription(
    "Links to the PRs and issues assigned to you for a given LASS project",
  )
  .addStringOption((option) =>
    option
      .setName("repository")
      .setDescription("Name of the project to link")
      .setRequired(true),
  );

async function guessOrg(project: string) {
  if (project in _projectOrgs) return _projectOrgs[project];
  const result = await fetch(`https://github.com/loathers/${project}`);
  _projectOrgs[project] = result.ok
    ? "loathers"
    : "Loathing-Associates-Scripting-Society";
  return _projectOrgs[project];
}

export async function execute(interaction: ChatInputCommandInteraction) {
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
