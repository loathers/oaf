import { bold } from "discord.js";
import { memoizeAsync } from "utils-decorators";

import { kolClient } from "../clients/kol";
import { cleanString } from "../utils";
import { Thing } from "./Thing";

export class Skill extends Thing {
  static from(line: string): Skill {
    const parts = line.split(/\t/);
    if (parts.length < 6) throw "Invalid data";

    return new Skill(
      parseInt(parts[0]),
      cleanString(parts[1]),
      parts[2],
      parseInt(parts[3]),
      parseInt(parts[4]),
      parseInt(parts[5]),
      parts[6] ? parseInt(parts[6]) : undefined,
    );
  }
 
  readonly type: number;
  readonly manaCost: number;
  readonly duration: number;
  readonly level?: number;

  constructor(
    id: number,
    name: string,
    imageUrl: string,
    type: number,
    manaCost: number,
    duration: number,
    level?: number,
  ) {
    super(id, name, imageUrl);
    this.type = type;
    this.manaCost = manaCost;
    this.duration = duration;
    this.level = level;
  }

  block(): number {
    return Math.floor(this.id / 1000);
  }

  @memoizeAsync()
  async getDescription(): Promise<string> {
    const description = [`(Skill ${this.id})`];
    switch (this.type) {
      case 0:
        description.push(bold("Passive Skill"));
        break;
      case 1:
      case 2:
      case 3:
      case 4:
        description.push(`${bold("Skill")}\nCost: ${this.manaCost}mp`);
        break;
      case 5:
        description.push(`${bold("Combat Skill")}\nCost: ${this.manaCost}mp`);
        break;
      case 6:
        description.push(`${bold("Skill (Boris Song)")}\nCost: ${this.manaCost}mp`);
        break;
      case 7:
        description.push(`${bold("Combat/Noncombat Skill")}\nCost: ${this.manaCost}mp`);
        break;
      case 8:
        description.push(bold("Combat Passive Skill"));
        break;
      case 9:
        description.push(`${bold("Skill (Expression)")}\nCost: ${this.manaCost}mp`);
        break;
      case 10:
        description.push(`${bold("Skill (Walk)")}\nCost: ${this.manaCost}mp`);
        break;
      default:
        description.push(bold("Skill"));
        break;
    }
    description.push("");
    description.push(await kolClient.getSkillDescription(this.id));
    
    return description.join("\n");
  }
}
