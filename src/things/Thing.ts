import { EmbedBuilder } from "discord.js";

import { KoLClient } from "../clients/kol";

export abstract class Thing {
  abstract name(): string;
  abstract addToEmbed(embed: EmbedBuilder): Promise<void>;
}
