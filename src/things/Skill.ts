import { EmbedBuilder, bold } from "discord.js";

import { kolClient } from "../clients/kol";
import { cleanString } from "../utils";
import { Thing } from "./Thing";

export type SkillData = {
  id: number;
  name: string;
  imageUrl: string;
  type: number;
  manaCost: number;
  duration: number;
  level?: number;
};

export class Skill implements Thing {
  _skill: SkillData;
  _name: string;
  _description: string = "";

  constructor(data: string) {
    this._skill = this.parseSkillData(data);
    this._name = this._skill.name.toLowerCase();
  }

  get(): SkillData {
    return this._skill;
  }

  name(): string {
    return this._name;
  }

  block(): number {
    return Math.floor(this._skill.id / 1000);
  }

  async buildDescription(): Promise<string> {
    let description = `(Skill ${this._skill.id})\n`;
    switch (this._skill.type) {
      case 0:
        description += bold("Passive Skill");
        break;
      case 1:
      case 2:
      case 3:
      case 4:
        description += `${bold("Skill")}\nCost: ${this._skill.manaCost}mp`;
        break;
      case 5:
        description += `${bold("Combat Skill")}\nCost: ${this._skill.manaCost}mp`;
        break;
      case 6:
        description += `${bold("Skill (Boris Song)")}\nCost: ${this._skill.manaCost}mp`;
        break;
      case 7:
        description += `${bold("Combat/Noncombat Skill")}\nCost: ${this._skill.manaCost}mp`;
        break;
      case 8:
        description += bold("Combat Passive Skill");
        break;
      case 9:
        description += `${bold("Skill (Expression)")}\nCost: ${this._skill.manaCost}mp`;
        break;
      case 10:
        description += `${bold("Skill (Walk)")}\nCost: ${this._skill.manaCost}mp`;
        break;
      default:
        description += bold("Skill");
        break;
    }
    description += "\n\n";
    description += await kolClient.getSkillDescription(this._skill.id);
    return description;
  }

  async addToEmbed(embed: EmbedBuilder): Promise<void> {
    embed.setThumbnail(`http://images.kingdomofloathing.com/itemimages/${this._skill.imageUrl}`);
    if (!this._description) this._description = await this.buildDescription();
    embed.setDescription(this._description);
  }

  parseSkillData(skillData: string): SkillData {
    const data = skillData.split(/\t/);
    if (data.length < 6) throw "Invalid data";
    return {
      id: parseInt(data[0]),
      name: cleanString(data[1]),
      imageUrl: data[2],
      type: parseInt(data[3]),
      manaCost: parseInt(data[4]),
      duration: parseInt(data[5]),
      level: data[6] ? parseInt(data[6]) : undefined,
    };
  }
}
