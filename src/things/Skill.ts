import { bold } from "discord.js";
import { Memoize } from "typescript-memoize";

import { kolClient } from "../clients/kol.js";
import { cleanString } from "../utils/index.js";
import { Thing } from "./Thing.js";

export class Skill extends Thing {
  static is(thing?: Thing | null): thing is Skill {
    return !!thing && thing instanceof Skill;
  }

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
      parts[6] ? parseInt(parts[6]) : undefined
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
    level?: number
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

  @Memoize()
  async getDescription(): Promise<string> {
    const description: string[] = [];

    let showCost = false;

    switch (this.type) {
      case 0:
        description.push(bold("Passive Skill"));
        break;
      case 1:
      case 2:
      case 3:
      case 4:
        description.push(bold("Skill"));
        showCost = true;
        break;
      case 5:
        description.push(bold("Combat Skill"));
        showCost = true;
        break;
      case 6:
        description.push(bold("Skill (Boris Song)"));
        showCost = true;
        break;
      case 7:
        description.push(bold("Combat/Noncombat Skill"));
        showCost = true;
        break;
      case 8:
        description.push(bold("Combat Passive Skill"));
        break;
      case 9:
        description.push(bold("Skill (Expression)"));
        showCost = true;
        break;
      case 10:
        description.push(bold("Skill (Walk)"));
        showCost = true;
        break;
      default:
        description.push(bold("Skill"));
        break;
    }
    description.push(`(Skill ${this.id})`);
    if (showCost) description.push(`Cost: ${this.manaCost}mp`);

    const skillDescription = await kolClient.getSkillDescription(this.id);

    if (skillDescription) description.push("", skillDescription);

    return description.join("\n");
  }
}
