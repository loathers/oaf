import { type Skill as DolSkill, SkillTag } from "data-of-loathing";
import { bold } from "discord.js";

import { kolClient } from "../clients/kol.js";
import { memoize } from "../utils/memoize.js";
import { Thing } from "./Thing.js";

const TAG_LABELS: Record<SkillTag, string> = {
  [SkillTag.Passive]: "Passive Skill",
  [SkillTag.Combat]: "Combat Skill",
  [SkillTag.NonCombat]: "Noncombat Skill",
  [SkillTag.Heal]: "Heal",
  [SkillTag.ItemSummon]: "Summon",
  [SkillTag.Effect]: "Buff",
  [SkillTag.Self]: "Self",
  [SkillTag.Other]: "Other Skill",
  [SkillTag.Song]: "Boris Song",
  [SkillTag.Expression]: "Expression",
  [SkillTag.Walk]: "Walk",
};

export class Skill extends Thing {
  #skill: DolSkill;

  static is(thing?: Thing | null): thing is Skill {
    return !!thing && thing instanceof Skill;
  }

  constructor(skill: DolSkill) {
    super(skill.id, skill.name, skill.image);
    this.#skill = skill;
  }

  block(): number {
    return Math.floor(this.#skill.id / 1000);
  }

  @memoize()
  async getDescription(): Promise<string> {
    const description: string[] = [];

    const tags = this.#skill.tags
      .map((tag) => TAG_LABELS[tag])
      .filter(Boolean)
      .join(", ");
    description.push(bold(tags));

    description.push(`(Skill ${this.id})`);
    if (!this.#skill.tags.includes(SkillTag.Passive)) {
      description.push(`Cost: ${this.#skill.mpCost}mp`);
    }

    const { blueText } = await kolClient.getSkillDescription(this.id);
    if (blueText) description.push("", blueText);

    return description.join("\n");
  }
}
