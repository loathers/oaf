import { type SkillTag } from "data-of-loathing";
import { bold } from "discord.js";
import { Memoize } from "typescript-memoize";

import { kolClient } from "../clients/kol.js";
import { Thing } from "./Thing.js";
import { TData } from "./query.js";

const TAG_LABELS: Record<SkillTag, string> = {
  COMBAT: "Combat Skill",
  EFFECT: "Buff",
  EXPRESSION: "Expression",
  PASSIVE: "Passive Skill",
  SONG: "Boris Song",
  HEAL: "Heal",
  ITEM: "Summon",
  NC: "Noncombat Skill",
  WALK: "Walk",
  OTHER: "Other Skill",
  SELF: "Self",
};

type TSkill = NonNullable<NonNullable<TData["allSkills"]>["nodes"][number]>;

export class Skill extends Thing {
  private skill: TSkill;

  static is(thing?: Thing | null): thing is Skill {
    return !!thing && thing instanceof Skill;
  }

  constructor(skill: TSkill) {
    super(skill.id, skill.name, skill.image);
    this.skill = skill;
  }

  block(): number {
    return Math.floor(this.skill.id / 1000);
  }

  getModifiers(): Record<string, string> {
    return (this.skill.skillModifierBySkill?.modifiers ?? {}) as Record<
      string,
      string
    >;
  }

  @Memoize()
  async getDescription(): Promise<string> {
    const description: string[] = [];

    const tags = (
      this.skill.tags
        ?.filter((t) => t !== null)
        .map((tag) => TAG_LABELS[tag!])
        .filter((t) => !!t) ?? []
    ).join(", ");
    description.push(bold(tags));

    description.push(`(Skill ${this.id})`);
    const showCost = !this.skill.tags?.includes("PASSIVE");
    if (showCost) description.push(`Cost: ${this.skill.mpCost}mp`);

    const { blueText } = await kolClient.getSkillDescription(this.id);

    if (blueText) description.push("", blueText);

    return description.join("\n");
  }
}
