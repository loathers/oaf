import { EmbedBuilder } from "discord.js";
import { decode } from "html-entities";
import { resolveKoLImage } from "kol.js";

export class Thing {
  readonly id: number;
  readonly name: string;
  readonly imageUrl: string;

  constructor(id: number, name: string, image: string) {
    this.id = id;
    this.name = decode(name);
    this.imageUrl = image;
  }

  hashcode() {
    return `${this.constructor.name.replace(/^_*/, "")}:${this.id}`;
  }

  getDescription(): Promise<string> {
    throw new Error("Implement me");
  }

  getImagePath() {
    if (this.imageUrl.includes("/")) return `/${this.imageUrl}`;
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
    throw new Error("Implement me");
  }
}
