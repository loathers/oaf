import { EmbedBuilder } from "discord.js";

export class Thing {
  readonly id: number;
  readonly name: string;
  readonly imageUrl: string;

  constructor(id: number, name: string, imageUrl: string) {
    this.id = id;
    this.name = name;
    this.imageUrl = imageUrl;
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
    embed.setThumbnail(`http://images.kingdomofloathing.com${this.getImagePath()}`);
  }

  async addToEmbed(embed: EmbedBuilder): Promise<void> {
    this.addImageToEmbed(embed);
    embed.setDescription(await this.getDescription());
  }
}
