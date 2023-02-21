import { EmbedBuilder } from "discord.js";

export abstract class Thing {
  abstract name(): string;
  abstract addToEmbed(embed: EmbedBuilder): Promise<void>;
}
