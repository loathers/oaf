import { EmbedBuilder, hyperlink } from "discord.js";

import { Effect, Thing } from "../things";
import { createEmbed } from "./discord";
import { wikiClient } from "./wiki";

export class PizzaNode {
  children: Map<string, PizzaNode> = new Map();
  letters: string;
  effects: Effect[] = [];

  constructor(letters: string) {
    this.letters = letters;
  }

  get options(): Effect[] {
    return Array.from(this.children.values()).reduce(
      (acc, curr) => acc.concat(curr.options),
      this.effects
    );
  }
}

export class PizzaTree {
  root: PizzaNode;
  constructor() {
    this.root = new PizzaNode("");
  }

  reset() {
    this.root = new PizzaNode("");
  }

  addEffect(name: string, effect: Effect) {
    function _add(node: PizzaNode) {
      if (node.letters.length === 4 || name.length === 0 || name.match(/^[^a-z0-9\"\']/)) {
        node.effects.push(effect);
        return;
      }
      const letter = name.charAt(0);

      if (!node.children.has(letter)) {
        node.children.set(letter, new PizzaNode(node.letters + letter));
      }

      const child = node.children.get(letter);

      if (child) _add(child);
    }

    _add(this.root);
  }

  precalculate(): void {
    function _calc(node: PizzaNode) {
      let options = node.options;
      for (let option of options) {
        option._pizza = {
          letters: node.letters.toUpperCase(),
          options: options.length,
        };
      }
      if (options.length > 1) {
        for (let child of node.children.values()) {
          _calc(child);
        }
      }
    }

    _calc(this.root);
  }

  build(things: Map<string, Thing>) {
    this.reset();
    for (const thing of things.values()) {
      if (!(thing instanceof Effect)) continue;
      if (thing.get().hookah) {
        this.addEffect(thing.name(), thing);
      }
    }
    this.precalculate();
  }

  async getEmbed(letters: string): Promise<EmbedBuilder> {
    let node = this.root;
    let i = 0;
    for (; i <= letters.length; i++) {
      const child = node.children.get(letters.charAt(i));
      if (child) node = child;
      else break;
    }

    const pizzaName = letters.toUpperCase().padEnd(4, "✱");
    const functionalName = letters.slice(0, i).toUpperCase().padEnd(4, "✱");
    const article = letters.match(/^[aeiouAEIOU]/) ? "An" : "A";

    const options = node.options;

    if (options.length === 1) {
      const name = options[0].name();
      return (
        (await wikiClient.getEmbed(name)) ||
        createEmbed().setTitle("Error").setDescription(`Couldn't create embed for ${name}`)
      );
    }

    if (options.length > 11) {
      return createEmbed()
        .setTitle(`Possible ${pizzaName} Pizza effects`)
        .setDescription(
          `${article} ${pizzaName}${
            i < letters.length ? ` (functionally ${functionalName})` : ""
          } pizza has too many possible effects to list.`
        );
    }

    const description: string[] = await Promise.all(
      options.map(async (effect) => {
        const foundName = await wikiClient.findName(effect.name());
        return hyperlink(foundName?.name ?? "", encodeURI(foundName?.url || ""));
      })
    );

    if (i < letters.length) {
      description.unshift(
        `(Note: ${article} ${pizzaName} pizza functions as ${article.toLowerCase()} ${functionalName} pizza)`
      );
    }

    return createEmbed()
      .setTitle(`Possible ${pizzaName} Pizza effects`)
      .setDescription(description.join("\n"));
  }
}

export const pizzaTree = new PizzaTree();
