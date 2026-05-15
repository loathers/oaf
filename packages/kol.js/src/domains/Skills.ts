import { Skill } from "data-of-loathing";
import createDebug from "debug";

import type { Client, Result } from "../Client.js";
import { DailyFlag } from "../flags/registry.js";
import { registerInterceptor } from "../proxy/registry.js";
import type { CachedFn } from "../utils/cached.js";
import type { SkillPerm } from "./CharSheet.js";
import { resolveEntityId } from "../utils/utils.js";

export type CastOptions = {
  target?: string | number;
  count?: number;
};

export type SkillBehavior = {
  /** Full override of the cast mechanism. When present, detectSuccess is not called. */
  cast?: (client: Client, skillId: number, options?: CastOptions) => Promise<Result>;
  /** Override success detection on the default runskillz.php path. */
  detectSuccess?: (html: string) => boolean;
  /** Maximum casts allowed per day. */
  dailyLimit?: (client: Client) => Promise<number>;
  /** Returns how many times this skill has been cast today, for state recovery. */
  currentUses?: (client: Client) => Promise<number>;
};

const registry = new Map<number, SkillBehavior>();

export function registerSkillBehavior(id: number, behavior: SkillBehavior): void {
  registry.set(id, behavior);
}

const debug = createDebug("kol.js:skills");

export function defaultDetectSuccess(html: string): boolean {
  return !html.includes("You don't have that skill");
}

export function recordSkillCast(client: Client, skillId: number): void {
  const casts = client.flags.get(DailyFlag.skillCasts);
  const newCount = (casts[skillId] ?? 0) + 1;
  client.flags.set(DailyFlag.skillCasts, { ...casts, [skillId]: newCount });
  debug("recorded cast of skill %d (total today: %d)", skillId, newCount);
}

registerInterceptor({
  path: "runskillz.php",
  onResponse(client, req, res) {
    if (typeof res.body !== "string") return;
    if (!defaultDetectSuccess(res.body)) return;
    const skillId = Number(req.params.get("whichskill"));
    if (skillId) recordSkillCast(client, skillId);
  },
});

export class Skills {
  #client: Client;
  get: CachedFn<Map<Skill, SkillPerm>>;

  constructor(client: Client) {
    this.#client = client;
    this.get = client.charSheet.getSkills;
  }

  castsToday(skill: Skill | number): number {
    const skillId = resolveEntityId(skill);
    return this.#client.flags.get(DailyFlag.skillCasts)[skillId] ?? 0;
  }

  async cast(skill: Skill | number, options?: CastOptions): Promise<Result> {
    const skillId = resolveEntityId(skill);
    const behavior = registry.get(skillId);

    if (behavior?.cast) {
      return behavior.cast(this.#client, skillId, options);
    }

    const form: Record<string, string | number | boolean> = {
      action: "Skillz",
      whichskill: skillId,
      ajax: 1,
    };
    if (options?.count !== undefined) form.quantity = options.count;
    if (options?.target !== undefined) form.targetplayer = options.target;

    const html = await this.#client.fetchText("runskillz.php", {
      method: "POST",
      form,
    });

    const success = behavior?.detectSuccess
      ? behavior.detectSuccess(html)
      : defaultDetectSuccess(html);

    if (!success) return { success: false, reason: "Cast failed" };
    return { success: true };
  }
}
