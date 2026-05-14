import {
  createClient,
  Effect,
  Familiar,
  Item,
  Monster,
  Skill,
} from "data-of-loathing";

export class GameData {
  #client = createClient();
  #loadPromise: Promise<void> | null = null;

  async load(): Promise<void> {
    this.#loadPromise ??= this.#client.load();
    await this.#loadPromise;
  }

  get query() {
    return this.#client.query;
  }

  async findItemsByIds(ids: number[]): Promise<Item[]> {
    await this.load();
    return this.#client.query.find(Item, { id: { $in: ids } });
  }

  async findItemByName(name: string): Promise<Item | null> {
    await this.load();
    return this.#client.query.findOne(Item, { name: name.trim() });
  }

  async findSkillByName(name: string): Promise<Skill | null> {
    await this.load();
    return this.#client.query.findOne(Skill, { name: name.trim() });
  }

  async findSkillsByIds(ids: number[]): Promise<Skill[]> {
    await this.load();
    return this.#client.query.find(Skill, { id: { $in: ids } });
  }

  async findEffectByName(name: string): Promise<Effect | null> {
    await this.load();
    return this.#client.query.findOne(Effect, { name: name.trim() });
  }

  async findFamiliarByName(name: string): Promise<Familiar | null> {
    await this.load();
    return this.#client.query.findOne(Familiar, { name: name.trim() });
  }

  async findMonsterByName(name: string): Promise<Monster | null> {
    await this.load();
    return this.#client.query.findOne(Monster, { name: name.trim() });
  }

  async findItemById(id: number): Promise<Item | null> {
    await this.load();
    return this.#client.query.findOne(Item, { id });
  }

  async findItemByDescId(descid: number): Promise<Item | null> {
    await this.load();
    return this.#client.query.findOne(Item, { descid });
  }

  async findMonsterById(id: number): Promise<Monster | null> {
    await this.load();
    return this.#client.query.findOne(Monster, { id });
  }
}

export const gameData = new GameData();
