import { EmbedBuilder } from "discord.js";
import { resolveKoLImage } from "kol.js";

export class Thing {
  readonly id: number;
  readonly name: string;
  readonly imageUrl: string;

  constructor(id: number, name: string, image: string) {
    this.id = id;
    this.name = name;
    this.imageUrl = image;
  }

  hashcode() {
    return `${this.constructor.name.replace(/^_*/, "")}:${this.id}`;
  }

  async getDescription(): Promise<string> {
    throw "Implement me";
  }

  getImagePath() {
    return `/itemimages/${this.imageUrl}`;
  }

  addImageToEmbed(embed: EmbedBuilder) {
    return embed.setThumbnail(resolveKoLImage(this.getImagePath()));
  }

  async addToEmbed(embed: EmbedBuilder): Promise<EmbedBuilder> {
    return this.addImageToEmbed(embed).setDescription(
      await this.getDescription(),
    );
  }

  getModifiers(): Record<string, string> | null {
    throw "Implement me";
  }
}
