import { Skill } from "data-of-loathing";

import type { Client } from "../Client.js";
import { gameData } from "../GameData.js";

export type SkillPerm = "none" | "softcore" | "hardcore";

export type CharSheetSkill = {
  id: number;
  name: string;
  perm: SkillPerm;
};

function parsePermStatus(afterLink: string): SkillPerm {
  if (afterLink.includes("(<b>HP</b>)")) return "hardcore";
  if (afterLink.includes("(P)")) return "softcore";
  return "none";
}

export class CharSheet {
  #client: Client;

  constructor(client: Client) {
    this.#client = client;
  }

  async getSkills(): Promise<Map<Skill, SkillPerm>> {
    const html = await this.#client.fetchText("charsheet.php");
    const parsed = CharSheet.parseSkills(html);
    const skills = await gameData.findSkillsByIds(parsed.map((s) => s.id));
    const byId = new Map(skills.map((s) => [s.id, s]));
    return new Map(
      parsed.flatMap(({ id, perm }) => {
        const skill = byId.get(id);
        return skill ? [[skill, perm]] : [];
      }),
    );
  }

  static parseSkills(html: string): CharSheetSkill[] {
    return [
      ...html.matchAll(
        /desc_skill\.php\?whichskill=(\d+)[^>]*>([^<]+)<\/a>(.*?)<br>/gs,
      ),
    ].map(([, id, name, afterLink]) => ({
      id: Number(id),
      name,
      perm: parsePermStatus(afterLink),
    }));
  }
}
