import { EmbedBuilder } from "discord.js";
import { decodeHTML } from "entities";
import { resolveKoLImage } from "kol.js";

export abstract class Thing<
  T extends { id: number; name: string } = { id: number; name: string },
> {
  protected readonly dol: T;
  readonly imageUrl: string;
  readonly wiki: string;

  constructor(dol: T, image: string) {
    this.dol = dol;
    this.imageUrl = image;
    this.wiki = `${this.constructor.name.replace(/^_*/, "")}:${dol.id}`;
  }

  get id() {
    return this.dol.id;
  }

  get name() {
    return decodeHTML(this.dol.name);
  }

  hashcode() {
    return this.wiki;
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
}
