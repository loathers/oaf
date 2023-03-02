import {
  AutocompleteInteraction,
  Client,
  Collection,
  CommandInteraction,
  EmbedBuilder,
  Events,
  GatewayIntentBits,
  Interaction,
  ModalSubmitInteraction,
  Partials,
  REST,
  RESTPostAPIApplicationCommandsJSONBody,
  Routes,
  SlashCommandBuilder,
} from "discord.js";

export type ModalHandler = {
  customId: string;
  handle: (interaction: ModalSubmitInteraction) => Promise<void>;
};

export type CommandHandler = {
  data: SlashCommandBuilder;
  execute: (interaction: CommandInteraction) => Promise<void>;
  autocomplete?: (interaction: AutocompleteInteraction) => Promise<void>;
  init?: () => Promise<void>;
};

export class DiscordClient extends Client {
  private clientId: string;
  commands = new Collection<string, CommandHandler>();
  modals = new Collection<string, ModalHandler>();

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

    this.on(Events.InteractionCreate, async (interaction) => this.handleInteraction(interaction));
  }

  async registerApplicationCommands(commands: RESTPostAPIApplicationCommandsJSONBody[]) {
    const rest = new REST({ version: "10" }).setToken(this.token || "");
    await rest.put(Routes.applicationCommands(this.clientId), {
      body: commands,
    });
  }

  async handleInteraction(interaction: Interaction) {
    if ("commandName" in interaction) {
      const command = this.commands.get(interaction.commandName);

      if (!command) {
        console.error(`No command matching ${interaction.commandName} found`);
        if (interaction.isRepliable()) {
          await interaction.reply(`Command not recognised. Something has gone wrong here.`);
        }
        return;
      }

      if (interaction.isChatInputCommand() || interaction.isContextMenuCommand()) {
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
        return;
      }

      if (interaction.isAutocomplete()) {
        try {
          await command.autocomplete?.(interaction);
        } catch (error) {
          console.error(error);
        }
        return;
      }

      return;
    }
  }

  start(): void {
    this.login();
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
