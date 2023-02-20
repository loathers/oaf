import {
  AutocompleteInteraction,
  ChatInputCommandInteraction,
  Client,
  Collection,
  EmbedBuilder,
  GatewayIntentBits,
  Interaction,
  MessageReaction,
  PartialMessageReaction,
  PartialUser,
  Partials,
  REST,
  RESTPostAPIApplicationCommandsJSONBody,
  Routes,
  SlashCommandBuilder,
  User,
} from "discord.js";

const ROLEMAP: Map<string, string> = new Map([
  ["🇹", "741479573337800706"],
  ["♀️", "741479514902757416"],
  ["♂️", "741479366319538226"],
  ["👂", "466622497991688202"],
  ["🚫", "512522219574919179"],
  ["✅", "754473984661258391"],
]);

export type Command = {
  data: SlashCommandBuilder;
  execute: (interaction: ChatInputCommandInteraction) => void;
  autocomplete?: (interaction: AutocompleteInteraction) => void;
  sync?: () => void;
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

    this.on(
      "messageReactionAdd",
      async (reaction: MessageReaction | PartialMessageReaction, user: User | PartialUser) =>
        this.onReact(reaction, user)
    );

    this.on(
      "messageReactionRemove",
      async (reaction: MessageReaction | PartialMessageReaction, user: User | PartialUser) =>
        this.onReactRemove(reaction, user)
    );

    this.on("interactionCreate", async (interaction) => this.onInteractionCreate(interaction));
  }

  async registerApplicationCommands(commands: RESTPostAPIApplicationCommandsJSONBody[]) {
    const rest = new REST({ version: "10" }).setToken(this.token || "");
    await rest.put(Routes.applicationCommands(this.clientId), {
      body: commands,
    });
  }

  async onReact(
    reaction: MessageReaction | PartialMessageReaction,
    user: User | PartialUser
  ): Promise<void> {
    if (reaction.partial || user.partial) {
      try {
        await reaction.fetch();
        await user.fetch();
      } catch (error) {
        console.error("Something went wrong when fetching the message: ", error);
        return;
      }
    }
    if (!user.partial && reaction.message.channel.id === "741479910886866944") {
      console.log(`Adding role ${reaction.emoji.name} to user ${user.username}`);
      const role = (await reaction.message.guild?.roles.cache)?.get(
        ROLEMAP.get(reaction.emoji.name || "") || ""
      );
      const member = await reaction.message.guild?.members.cache.get(user.id);
      if (role && member) {
        await member?.roles.add(role);
      }
    }
  }

  async onReactRemove(
    reaction: MessageReaction | PartialMessageReaction,
    user: User | PartialUser
  ): Promise<void> {
    if (reaction.partial || user.partial) {
      try {
        await reaction.fetch();
        await user.fetch();
      } catch (error) {
        console.error("Something went wrong when fetching the message: ", error);
        return;
      }
    }
    if (!user.partial && reaction.message.channel.id === "741479910886866944") {
      console.log(`Removing role ${reaction.emoji.name} from user ${user.username}`);
      const role = (await reaction.message.guild?.roles.cache)?.get(
        ROLEMAP.get(reaction.emoji.name || "") || ""
      );
      const member = await reaction.message.guild?.members.cache.get(user.id);
      if (role && member) {
        await member?.roles.remove(role);
      }
    }
  }

  async onInteractionCreate(interaction: Interaction) {
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
        await (interaction.replied ? interaction.followUp : interaction.reply)(
          "OAF recovered from a crash trying to process that command. Please tell Captain Scotch or report to #mafia-and-scripting"
        );
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
