import fs from "node:fs/promises";
import {
  AstBuilder,
  GherkinClassicTokenMatcher,
  Parser,
} from "@cucumber/gherkin";
import {
  IdGenerator,
  type Scenario,
  type Step,
  type Rule,
  StepKeywordType,
} from "@cucumber/messages";
import { Client } from "kol.js";
import { getItemFromName } from "./kolData.js";
import { Capability } from "./Worker.js";

const builder = new AstBuilder(IdGenerator.uuid());
const matcher = new GherkinClassicTokenMatcher();

const parser = new Parser(builder, matcher);

/**
 * A utility function to escape regular expressions
 * @param string String to escape
 * @returns Escaped string
 */
function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); // $& means the whole matched string
}

/**
 * Returns true if the scenario has the @Exists tag, meaning that it defines whether the entity exists.
 * @param scenario A scenario
 */
function isExistsScenario(scenario?: Scenario) {
  return scenario?.tags.some((t) => t.name === "@Exists") ?? false;
}

/**
 * Compile actions from a scenario step
 * @param step A step parsed from the features document
 * @returns A callback that takes a kol.js client and an entity id, performs the specified action and returns the resulting HTML
 */
function compileAction({ text }: Step) {
  let match: RegExpMatchArray | null;

  if (
    (match = text.match(/^I equip (the item|an? (.*?))(?: to my (.*?) slot)?$/))
  ) {
    const [, testItem, otherItemName, slot] = match;

    let action = "equip";
    let itemId: number | undefined;

    if (testItem !== "the item") {
      const otherItem = getItemFromName(otherItemName);
      if (!otherItem)
        throw Error(`Cannot recognise item "${otherItemName}" in "${text}"`);
      itemId = otherItem.id;
      if (otherItem.type === "weapon" && slot === "off-hand")
        action = "dualwield";
    }

    return async (client: Client, id: number) =>
      client.fetchText(`inv_equip.php`, {
        searchParams: {
          action,
          which: 2,
          whichitem: itemId || id,
          pwd: true,
        },
      });
  }

  if ((match = text.match(/^I use my (.*?) familiar$/))) {
    const familiarName = match[1];
    return async (client: Client, id: number) => {
      const familiar = (await client.getFamiliars()).find(
        (f) => f.name === familiarName,
      );
      if (!familiar)
        throw new Error(`Do not have a familiar matching ${familiarName}`);
      client.useFamiliar(familiar.id);
      return familiarName;
    };
  }

  if (text === "I eat the item")
    return async (client: Client, id: number) =>
      client.fetchText(`inv_eat.php`, {
        searchParams: {
          which: 1,
          whichitem: id,
          pwd: true,
        },
      });

  if (text === "I drink the item")
    return async (client: Client, id: number) =>
      client.fetchText(`inv_booze.php`, {
        searchParams: {
          which: 1,
          whichitem: id,
          pwd: true,
        },
      });

  if (text === "I chew the item")
    return async (client: Client, id: number) =>
      client.fetchText(`inv_spleen.php`, {
        searchParams: {
          which: 1,
          whichitem: id,
          pwd: true,
        },
      });

  if ((match = text.match(/I visit "(.*?)"/))) {
    const rawUrl = match[1]!;
    return async (client: Client, id: number) => {
      const url = rawUrl.replace("{id}", `${id}`).split("?");
      const searchParams = Object.fromEntries([
        ...new URLSearchParams(url[1] ?? "").entries(),
        ["pwd", true],
      ]);
      const result = await client.fetchText(url[0], { searchParams });
      return result;
    };
  }

  throw new Error(`Cannot parse action "${text}"`);
}

/**
 * @param step The step of the scenario as specified in the feature document
 * @returns A function that takes an HTML string from the response to an action and returns a tuple of success and any captured substrings
 */
function compileOutcome({
  text,
}: Step): (response: string) => [success: boolean, substrings: string[]] {
  let match: RegExpMatchArray | null;

  if (
    (match = text.match(
      /^the response (does not )?(?:contains?|match(?:es)?) "(.*)"$/,
    ))
  ) {
    const negation = !!match[1];
    const pattern = escapeRegExp(match[2]).replaceAll(/$\d+/g, "(.*?)");
    const matcher = new RegExp(pattern);

    return (response: string) => {
      const result = response.match(matcher);
      if ((result === null) === !negation) return [false, []];
      return [true, result?.slice(1) ?? []];
    };
  }

  throw new Error(`Cannot parse otucome "${text}"`);
}

/**
 * @param scenario Scenario to compile
 * @param includeSubstrings Whether to include substrings captured in the response from the callback
 * @returns A callback that takes a kol.js client and an entity id and returns the success, as part of a tuple with captured substrings if `includeSubstrings` is true
 */
function compileTest(
  scenario: Scenario,
  includeSubstrings: false,
): (client: Client, id: number) => Promise<boolean>;
function compileTest(
  scenario: Scenario,
  includeSubstrings: true | undefined,
): (
  client: Client,
  id: number,
) => Promise<[success: boolean, substrings: string[]]>;
function compileTest(
  scenario: Scenario,
  includeSubstrings = true,
): (
  client: Client,
  id: number,
) => Promise<boolean | [success: boolean, substrings: string[]]> {
  const actions = scenario.steps
    .filter((s) => s.keywordType === "Action")
    .map(compileAction);

  const outcomes = scenario.steps
    .filter((s) => s.keywordType === "Outcome")
    .map(compileOutcome);

  return async (client: Client, id: number) => {
    let response = "";
    for (const action of actions) {
      response = await action(client, id);
    }

    let success = true;
    let substrings: string[] = [];
    for (const outcome of outcomes) {
      const [s, ss] = outcome(response);
      success &&= s;
      substrings = ss;
    }

    return includeSubstrings ? [success, substrings] : success;
  };
}

/**
 * @param step
 * @returns A Capability object parsed from the context step
 */
function compileContext({ text }: Step): Capability {
  let match: RegExpMatchArray | null;

  if ((match = text.match(/^I know (.*?)$/))) {
    const skill = match?.[1];
    if (!skill) throw Error(`Cannot parse skill from "${text}"`);
    return { type: "skill", name: skill };
  }

  if ((match = text.match(/^I have an? (.*?) familiar$/))) {
    const familiar = match?.[1];
    if (!familiar) throw Error(`Cannot parse familiar from "${text}"`);
    return { type: "familiar", name: familiar };
  }

  throw new Error(`Cannot parse context "${text}"`);
}

/**
 * @param scenario
 * @returns A list of capabilities required to run the provided scenario
 */
function compileContexts(scenario: Scenario) {
  return scenario.steps
    .filter((s) => s.keywordType === "Context")
    .map(compileContext);
}

/**
 * Mutates the scenario turning conjunction keywordTypes into whatever the are conjoined to.
 * @param scenario Scenario to mutate
 */
function flattenConjunctionSteps(scenario: Scenario) {
  let last: StepKeywordType | undefined;
  for (let i = 0; i < scenario.steps.length; i++) {
    const keywordType = scenario.steps[i].keywordType;
    if (keywordType === "Conjunction") {
      scenario.steps[i].keywordType = last;
    } else {
      last = scenario.steps[i].keywordType;
    }
  }
}

type CompiledScenario = {
  id: string;
  name: string;
  requirements: Capability[];
  test: (client: Client, id: number) => Promise<string | null>;
  exclusive?: string;
};

function compileScenario(scenario: Scenario): CompiledScenario {
  flattenConjunctionSteps(scenario);
  const test = compileTest(scenario, true);
  const determination = scenario.name.match(
    /^The (?:.*?) is(?: an?)? (.*?)$/,
  )?.[1];

  if (!determination)
    throw new Error(`Cannot parse the determination "${scenario.name}"`);

  return {
    id: scenario.id,
    name: scenario.name,
    requirements: compileContexts(scenario),
    test: async (client: Client, id: number) => {
      const [success, substrings] = await test(client, id);
      if (!success) return null;
      return determination.replaceAll(
        /$\d+/g,
        (match) => substrings[Number(match.slice(1))] || "unknown",
      );
    },
  };
}

function compileRule(rule: Rule): CompiledScenario[] {
  // Mutually exclusive group
  if (/^Only one/i.test(rule.name))
    return rule.children
      .map((c) => c.scenario)
      .filter((s): s is Scenario => s !== undefined)
      .map(compileScenario)
      .map((compiled) => ({ ...compiled, exclusive: rule.id }));

  throw new Error(`Cannot parse rule "${rule.name}"`);
}

export async function compile(featureFile: string) {
  const document = parser.parse(await fs.readFile(featureFile, "utf-8"));

  // Extract the scenario that checks if a given entity exists at all.
  // This scneario should be used as a first pass before any other scenarios are run.
  const exists = document.feature?.children
    .map((c) => c.scenario)
    .find(isExistsScenario);
  if (!exists)
    throw new Error(
      "Plan must define one scenario that confirms the tested entity exists and tag it with @Exists",
    );

  const scenarios =
    document.feature?.children
      .flatMap((c) => {
        if (c.scenario && !isExistsScenario(c.scenario))
          return compileScenario(c.scenario);
        if (c.rule) return compileRule(c.rule);
        return null;
      })
      .filter(<T>(s: T | null): s is T => s !== null) ?? [];
  if (scenarios.length === 0) throw new Error("No scenarios defined for plan");

  return {
    exists: compileTest(exists, false),
    scenarios,
  };
}
