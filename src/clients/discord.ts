import {
  AutocompleteInteraction,
  ChatInputCommandInteraction,
  Client,
  Collection,
  EmbedBuilder,
  GatewayIntentBits,
  Interaction,
  Partials,
  REST,
  RESTPostAPIApplicationCommandsJSONBody,
  Routes,
  SlashCommandBuilder,
} from "discord.js";

export type Command = {
  data: SlashCommandBuilder;
  execute: (interaction: ChatInputCommandInteraction) => void;
  autocomplete?: (interaction: AutocompleteInteraction) => void;
  init?: () => void;
};

export class DiscordClient extends Client {
  private clientId: string;
  commands = new Collection<string, Command>();

  constructor(clientId: string, token: string) {
    super({
      partials: [Partials.Message, Partials.Reaction, Partials.User],
      intents: [
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMessageReactions,
        GatewayIntentBits.DirectMessages,
      ],
    });

    this.clientId = clientId;
    this.token = token;

    this.on("ready", () => {
      console.log(`Logged in as ${this.user?.tag}!`);
    });

    this.on("interactionCreate", async (interaction) => this.handleInteraction(interaction));
  }

  async registerApplicationCommands(commands: RESTPostAPIApplicationCommandsJSONBody[]) {
    const rest = new REST({ version: "10" }).setToken(this.token || "");
    await rest.put(Routes.applicationCommands(this.clientId), {
      body: commands,
    });
  }

  async handleInteraction(interaction: Interaction) {
    if (interaction.isChatInputCommand()) {
      const command = this.commands.get(interaction.commandName);

      if (!command) {
        console.error(`No command matching ${interaction.commandName} found`);
        await interaction.reply(`Command not recognised. Something has gone wrong here.`);
        return;
      }

      try {
        await command.execute(interaction);
      } catch (error) {
        console.error(error);
        const message =
          "OAF recovered from a crash trying to process that command. Please tell Captain Scotch or report to #mafia-and-scripting";
        if (interaction.deferred) {
          await interaction.editReply(message);
        } else if (interaction.replied) {
          await interaction.followUp(message);
        } else {
          await interaction.reply(message);
        }
      }
    } else if (interaction.isAutocomplete()) {
      const command = this.commands.get(interaction.commandName);

      if (!command) {
        console.error(`No command matching ${interaction.commandName} found`);
        return;
      }

      try {
        await command.autocomplete?.(interaction);
      } catch (error) {
        console.error(error);
      }
    }
  }

  start(): void {
    this.login(this.token || "");
  }
}

export const createEmbed = () =>
  new EmbedBuilder().setFooter({
    text: "Problems? Message DocRostov#7004 on discord.",
    iconURL: "http://images.kingdomofloathing.com/itemimages/oaf.gif",
  });

export const discordClient = new DiscordClient(
  process.env.CLIENT_ID || "",
  process.env.DISCORD_TOKEN || ""
);
