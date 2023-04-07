import { EmbedBuilder, bold } from "discord.js";

import { kolClient } from "../clients/kol";
import { cleanString } from "../utils";
import { Thing } from "./Thing";

export type EffectData = {
  id: number;
  name: string;
  imageUrl: string;
  descId: string;
  quality: string;
  hookah: boolean;
};

export type PizzaData = {
  letters: string;
  options: number;
};

export class Effect implements Thing {
  _effect: EffectData;
  _name: string;
  _pizza?: PizzaData;

  constructor(data: string, avatarSet: Set<string>) {
    this._effect = this.parseEffectData(data, avatarSet);
    this._name = this._effect.name.toLowerCase();
  }

  get(): EffectData {
    return this._effect;
  }

  name(): string {
    return this._name;
  }

  async addToEmbed(embed: EmbedBuilder): Promise<void> {
    embed.setThumbnail(`http://images.kingdomofloathing.com/itemimages/${this._effect.imageUrl}`);
    let description = `${bold("Effect")}\n(Effect ${
      this.get().id
    })\n${await kolClient.getEffectDescription(this._effect.descId)}\n\n`;
    if (this._effect.hookah) {
      if (this._pizza) {
        description += `Pizza: ${this._pizza.letters.padEnd(4, "✱")} (${
          this._pizza.options === 1 ? "Uncontested" : `1 in ${this._pizza.options}`
        })`;
      } else {
        description +=
          "Pizza: If you are reading this, Captain 'Jalen' Scotch has hecked something up. Please ping him.";
      }
    } else {
      description += "ineligible for pizza, wishes, or hookahs.";
    }
    embed.setDescription(description);
  }

  parseEffectData(effectData: string, avatarPotionSet: Set<string>): EffectData {
    const data = effectData.split(/\t/);
    if (data.length < 6) throw "Invalid data";
    const potion = data.length >= 7 ? (data[6].startsWith("use 1") ? data[6].slice(6) : "") : "";
    const isAvatar = avatarPotionSet.has(potion.toLowerCase());
    if (isAvatar) avatarPotionSet.delete(potion.toLowerCase());
    return {
      id: parseInt(data[0]),
      name: cleanString(data[1]),
      imageUrl: data[2],
      descId: data[3],
      quality: data[4],
      hookah: !isAvatar && data[5].indexOf("nohookah") === -1 && data[4] !== "bad",
    };
  }
}
