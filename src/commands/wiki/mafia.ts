import axios from "axios";
import {
  AutocompleteInteraction,
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  codeBlock,
} from "discord.js";

type SearchResponse = {
  items: [{ link: string }];
};

export const data = new SlashCommandBuilder()
  .setName("mafia")
  .setDescription("Commands related to KoLmafia.")
  .addSubcommand((subcommand) =>
    subcommand
      .setName("wiki")
      .setDescription("Search the KoLmafia wiki")
      .addStringOption((option) =>
        option
          .setName("term")
          .setDescription("The term to search for in the mafia wiki.")
          .setRequired(true)
      )
  )
  .addSubcommand((subcommand) =>
    subcommand
      .setName("js")
      .setDescription("Look up a function in the JS standard library")
      .addStringOption((option) =>
        option
          .setName("function")
          .setDescription("The function to reference")
          .setAutocomplete(true)
          .setRequired(true)
      )
  );

let JS_FUNCTION_CACHE = new Map<string, string[]>();

async function getJsRef() {
  const { data } = await axios.get<string>("https://unpkg.com/kolmafia@latest/index.d.ts");
  const matches = data.matchAll(/export (function (.*?)\(.*)?$/gm);

  const functions = new Map<string, string[]>();
  for (const match of matches) {
    if (!functions.has(match[2])) functions.set(match[2], []);
    functions.get(match[2])!.push(match[1]);
  }
  return functions;
}

export async function execute(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply();

  const subcommand = interaction.options.getSubcommand() as "wiki" | "js";

  switch (subcommand) {
    case "wiki": {
      const item = interaction.options.getString("term", true);

      const googleSearchResponse = await axios.get<SearchResponse>(
        `https://www.googleapis.com/customsearch/v1`,
        {
          params: {
            key: process.env.GOOGLE_API_KEY || "",
            cx: process.env.MAFIA_CUSTOM_SEARCH || "",
            q: item,
          },
        }
      );

      if (!googleSearchResponse.data.items?.length) {
        return interaction.editReply({
          content: `"${item}" wasn't found. Please refine your search.`,
          allowedMentions: {
            parse: [],
          },
        });
      }

      return interaction.editReply({
        content: googleSearchResponse.data.items[0].link,
        embeds: [],
        allowedMentions: {
          parse: [],
        },
      });
    }
    case "js": {
      const func = interaction.options.getString("function", true);
      JS_FUNCTION_CACHE = await getJsRef();
      if (!JS_FUNCTION_CACHE.has(func)) {
        return interaction.editReply({
          content: `A function called "${func}" wasn't found in the latest mafia standard library.`,
          allowedMentions: {
            parse: [],
          },
        });
      }

      return interaction.editReply({
        content: codeBlock("ts", JS_FUNCTION_CACHE.get(func)!.join("\n")),
        allowedMentions: {
          parse: [],
        },
      });
    }
  }
}

export async function autocomplete(interaction: AutocompleteInteraction) {
  const focusedValue = interaction.options.getFocused();
  const filtered = [...JS_FUNCTION_CACHE.keys()]
    .filter((func) => func.toLowerCase().includes(focusedValue.toLowerCase()))
    .map((f) => ({ name: f, value: f }))
    .slice(0, 25);
  await interaction.respond(filtered);
}

export async function init() {
  JS_FUNCTION_CACHE = await getJsRef();
}
