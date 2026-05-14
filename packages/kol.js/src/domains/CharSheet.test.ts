import { describe, expect, test } from "vitest";
import { loadFixture } from "../testUtils.js";
import { CharSheet } from "./CharSheet.js";

describe("parseSkills", () => {
  test("parses skill ids and names with no perms", async () => {
    const html = await loadFixture(__dirname, "charsheet_no_perms.html");
    const skills = CharSheet.parseSkills(html);
    expect(skills.length).toBeGreaterThan(0);
    expect(skills.every((s) => s.perm === "none")).toBe(true);
    expect(skills.find((s) => s.id === 1)).toMatchObject({ id: 1, name: "Liver of Steel", perm: "none" });
    expect(skills.find((s) => s.id === 4006)).toMatchObject({ id: 4006, name: "Advanced Saucecrafting", perm: "none" });
  });

  test("parses softcore permed skills — (P) marker", async () => {
    const html = await loadFixture(__dirname, "charsheet_permed_skills.html");
    const skills = CharSheet.parseSkills(html);
    const permed = skills.filter((s) => s.perm === "softcore");
    expect(permed.length).toBeGreaterThan(0);
    expect(permed.every((s) => s.perm === "softcore")).toBe(true);
  });

  test("parses hardcore permed skills — (<b>HP</b>) marker", async () => {
    const html = await loadFixture(__dirname, "charsheet_normal.html");
    const skills = CharSheet.parseSkills(html);
    const hc = skills.filter((s) => s.perm === "hardcore");
    expect(hc.length).toBeGreaterThan(0);
    // Verify a known HC skill from KoLmafia test expectations
    expect(skills.find((s) => s.id === 1005)).toMatchObject({ id: 1005, perm: "hardcore" });
  });

  test("non-permed skills remain none alongside permed ones", async () => {
    const html = await loadFixture(__dirname, "charsheet_normal.html");
    const skills = CharSheet.parseSkills(html);
    expect(skills.filter((s) => s.perm === "none").length).toBeGreaterThan(0);
    // skill 15 (CLEESH) is NONE per KoLmafia test expectations
    expect(skills.find((s) => s.id === 15)).toMatchObject({ id: 15, perm: "none" });
  });
});
