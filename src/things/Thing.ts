import { EmbedBuilder } from "discord.js";

import { wikiClient } from "../clients/wiki";

export class Thing {
  readonly id: number;
  readonly name: string;
  readonly imageUrl: string;

  constructor(id: number, name: string, imageUrl: string) {
    this.id = id;
    this.name = name;
    this.imageUrl = imageUrl;
  }

  async getWikiLink() {
    return wikiClient.getWikiLink(this);
  }

  async getDescription(): Promise<string> {
    throw "Implement me";
  }

  getImagePath() {
    return `/itemimages/${this.imageUrl}`;
  }

  async addToEmbed(embed: EmbedBuilder): Promise<void> {
    embed.setThumbnail(`http://images.kingdomofloathing.com${this.getImagePath()}`);
    embed.setDescription(await this.getDescription());
  }
}
