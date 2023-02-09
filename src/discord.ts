import axios from "axios";
import {
  Client,
  Message,
  MessageReaction,
  PartialUser,
  User,
  Intents,
  PartialMessageReaction,
  Interaction,
  CommandInteraction,
} from "discord.js";
import { ITEMMATCHER, ROLEMAP } from "./constants";
import { WikiSearcher } from "./wikisearch";
import { SlashCommandBuilder } from "@discordjs/builders";
import { ApplicationCommandOptionType, Routes } from "discord-api-types/v9";
import { REST } from "@discordjs/rest";

type Command = {
  description: string;
  slashCommand: SlashCommandBuilder;
  execute: (interaction: CommandInteraction) => void;
};

type Option = {
  name: string;
  description: string;
  type: ApplicationCommandOptionType;
  required: boolean;
  choices?: { name: string; value: string }[];
};

export class DiscordClient {
  private _client: Client;
  private _wikiSearcher: WikiSearcher;
  private _discordToken: string;
  private _commands: Map<string, Command> = new Map();

  constructor(wikiSearcher: WikiSearcher) {
    this._client = new Client({
      partials: ["MESSAGE", "REACTION", "USER"],
      intents: [
        Intents.FLAGS.GUILDS,
        Intents.FLAGS.GUILD_MESSAGES,
        Intents.FLAGS.GUILD_MESSAGE_REACTIONS,
        Intents.FLAGS.DIRECT_MESSAGES,
      ],
    });
    this._wikiSearcher = wikiSearcher;
    this._discordToken = process.env.DISCORD_TOKEN || "";

    this._client.on("ready", () => {
      console.log(`Logged in as ${this._client?.user?.tag}!`);
    });
    this._client.on("messageCreate", async (message) => this.onMessage(message));
    this._client.on(
      "messageReactionAdd",
      async (reaction: MessageReaction | PartialMessageReaction, user: User | PartialUser) =>
        this.onReact(reaction, user)
    );
    this._client.on(
      "messageReactionRemove",
      async (reaction: MessageReaction | PartialMessageReaction, user: User | PartialUser) =>
        this.onReactRemove(reaction, user)
    );
    this._client.on("interactionCreate", async (interaction: Interaction) =>
      this.onCommand(interaction)
    );
  }

  async registerSlashCommands() {
    const rest = new REST({ version: "9" }).setToken(this._discordToken);
    const commandsToRegister = [];
    for (const command of this._commands) {
      commandsToRegister.push(command[1].slashCommand.toJSON());
    }
    const client_id = process.env.CLIENT_ID || "";
    await rest.put(Routes.applicationCommands(client_id), {
      body: commandsToRegister,
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

  async onMessage(message: Message): Promise<void> {
    console.log(
      `${new Date(message.createdTimestamp).toLocaleTimeString()} ${
        message.author.username
      } said "${message.content}" in channel ${message.channel}`
    );
    const content = message.content;
    if (content && !message.author.bot) {
      const matches = [...content.matchAll(ITEMMATCHER)];
      if (matches.length > 3) {
        message.channel.send(
          "Detected too many wiki invocations in one message. Returning first three invocations only."
        );
        matches.length = 3;
      }
      await Promise.all(matches.map((match) => this.inlineWikiSearch(match[1], message)));
    }
  }

  async onCommand(interaction: Interaction): Promise<void> {
    if (!interaction.isCommand()) return;
    const command = this._commands.get(interaction.commandName);
    try {
      if (command) await command.execute(interaction);
      else interaction.reply(`Command not recognised. Something has gone wrong here.`);
    } catch (error) {
      console.log(error);
      await (interaction.replied
        ? interaction.followUp(
            "OAF recovered from a crash trying to process that command. Please tell Scotch or Phill"
          )
        : interaction.reply(
            "OAF recovered from a crash trying to process that command. Please tell Scotch or Phill"
          ));
    }
  }

  client(): Client {
    return this._client;
  }

  attachCommand(
    command: string,
    args: Option[],
    functionToCall: (interaction: CommandInteraction) => void,
    description: string = ""
  ): void {
    const slashCommand = new SlashCommandBuilder().setName(command).setDescription(description);
    for (let arg of args) {
      const builder = (item: any) =>
        item
          .setName(arg.name)
          .setDescription(arg.description)
          .setRequired(arg.required)
          .addChoices(...(arg.choices || []));

      switch (arg.type) {
        case ApplicationCommandOptionType.String:
          slashCommand.addStringOption(builder);
          break;
        case ApplicationCommandOptionType.Integer:
          slashCommand.addIntegerOption(builder);
          break;
        case ApplicationCommandOptionType.User:
          slashCommand.addUserOption(builder);
          break;
        case ApplicationCommandOptionType.Channel:
          slashCommand.addChannelOption(builder);
          break;
        case ApplicationCommandOptionType.Role:
          slashCommand.addRoleOption(builder);
          break;
        case ApplicationCommandOptionType.Mentionable:
          slashCommand.addMentionableOption(builder);
          break;
        case ApplicationCommandOptionType.Integer:
          slashCommand.addIntegerOption(builder);
          break;
        case ApplicationCommandOptionType.Number:
          slashCommand.addNumberOption(builder);
          break;
        case ApplicationCommandOptionType.Attachment:
          slashCommand.addAttachmentOption(builder);
          break;
      }
    }
    this._commands.set(command.toLowerCase(), {
      description: description,
      slashCommand: slashCommand,
      execute: functionToCall,
    });
  }

  async inlineWikiSearch(item: string, message: Message): Promise<void> {
    const searchingMessage = await message.channel.send({
      content: `Searching for "${item}"...`,
      reply: { messageReference: message.id },
      allowedMentions: {
        parse: [],
        repliedUser: false,
      },
    });
    if (!item.length) {
      await searchingMessage.edit("Need something to search for.");
      return;
    }
    const embed = await this._wikiSearcher.getEmbed(item);
    if (embed) {
      searchingMessage.edit({
        content: null,
        embeds: [embed],
        allowedMentions: {
          parse: [],
          repliedUser: false,
        },
      });
    } else {
      searchingMessage.edit({
        content: `"${item}" wasn't found. Please refine your search.`,
        allowedMentions: {
          parse: [],
          repliedUser: false,
        },
      });
    }
  }

  start(): void {
    this._client.login(this._discordToken);
  }
}
