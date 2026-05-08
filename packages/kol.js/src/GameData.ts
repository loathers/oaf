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

  get query() {
    return this.#client.query;
  }

  async load(): Promise<void> {
    await this.#client.load();
  }

  async findItemByName(name: string): Promise<Item | null> {
    return await this.#client.query.findOne(Item, { name: name.trim() });
  }

  async findSkillByName(name: string): Promise<Skill | null> {
    return await this.#client.query.findOne(Skill, { name: name.trim() });
  }

  async findEffectByName(name: string): Promise<Effect | null> {
    return await this.#client.query.findOne(Effect, { name: name.trim() });
  }

  async findFamiliarByName(name: string): Promise<Familiar | null> {
    return await this.#client.query.findOne(Familiar, { name: name.trim() });
  }

  async findMonsterByName(name: string): Promise<Monster | null> {
    return await this.#client.query.findOne(Monster, { name: name.trim() });
  }

  async findItemById(id: number): Promise<Item | null> {
    return await this.#client.query.findOne(Item, { id });
  }

  async findItemByDescId(descid: number): Promise<Item | null> {
    return await this.#client.query.findOne(Item, { descid });
  }

  async findMonsterById(id: number): Promise<Monster | null> {
    return await this.#client.query.findOne(Monster, { id });
  }
}

export const gameData = new GameData();
