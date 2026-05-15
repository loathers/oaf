import { readFile } from "node:fs/promises";
import { describe, expect, test } from "vitest";

import {
  type LibramTopic,
  TypedocRoot,
  formatTopicEmbed,
  parseTopics,
  renderType,
  resolveReference,
} from "./libram.js";

const typedocData = JSON.parse(
  await readFile(
    new URL("./__fixtures__/typedoc.json", import.meta.url),
    "utf-8",
  ),
) as TypedocRoot;

const topics = parseTopics(typedocData);
const byName = (name: string) => topics.find((t) => t.name === name)!;

describe("parseTopics", () => {
  test("parses all root children", () => {
    expect(topics.length).toBe(typedocData.children.length);
  });

  test("assigns correct kind labels to namespaces", () => {
    const topic = byName("AprilingBandHelmet");
    expect(topic.kind).toBe("Namespace");
  });

  test("assigns correct kind labels to classes", () => {
    const topic = byName("Clan");
    expect(topic.kind).toBe("Class");
  });

  test("assigns correct kind labels to functions", () => {
    const topic = byName("have");
    expect(topic.kind).toBe("Function");
  });

  test("assigns correct kind labels to variables", () => {
    const topic = byName("holidayWanderers");
    expect(topic.kind).toBe("Variable");
  });

  test("assigns correct kind labels to enums", () => {
    const topic = byName("Lifestyle");
    expect(topic.kind).toBe("Enum");
  });

  test("assigns correct kind labels to type aliases", () => {
    const topic = byName("MoonSign");
    expect(topic.kind).toBe("Type Alias");
  });

  test("assigns correct kind labels to re-exports", () => {
    const topic = byName("get");
    expect(topic.kind).toBe("Re-export");
  });

  test("preserves declaration data", () => {
    const topic = byName("Clan");
    expect(topic.declaration.id).toBe(
      typedocData.children.find((c: { name: string }) => c.name === "Clan")?.id,
    );
    expect(topic.declaration.children).toBeDefined();
  });
});

describe("renderType", () => {
  test("renders intrinsic types", () => {
    expect(renderType({ type: "intrinsic", name: "boolean" })).toBe("boolean");
    expect(renderType({ type: "intrinsic", name: "string" })).toBe("string");
    expect(renderType({ type: "intrinsic", name: "number" })).toBe("number");
    expect(renderType({ type: "intrinsic", name: "void" })).toBe("void");
  });

  test("renders string literals", () => {
    expect(renderType({ type: "literal", value: "hello" })).toBe('"hello"');
  });

  test("renders number literals", () => {
    expect(renderType({ type: "literal", value: 42 })).toBe("42");
  });

  test("renders boolean literals", () => {
    expect(renderType({ type: "literal", value: true })).toBe("true");
  });

  test("renders undefined for missing literal value", () => {
    expect(renderType({ type: "literal" })).toBe("undefined");
  });

  test("renders reference types", () => {
    expect(renderType({ type: "reference", name: "Item" })).toBe("Item");
  });

  test("renders reference types with type arguments", () => {
    expect(
      renderType({
        type: "reference",
        name: "Map",
        typeArguments: [
          { type: "intrinsic", name: "string" },
          { type: "intrinsic", name: "number" },
        ],
      }),
    ).toBe("Map<string, number>");
  });

  test("renders union types", () => {
    expect(
      renderType({
        type: "union",
        types: [
          { type: "intrinsic", name: "string" },
          { type: "intrinsic", name: "number" },
        ],
      }),
    ).toBe("string | number");
  });

  test("renders intersection types", () => {
    expect(
      renderType({
        type: "intersection",
        types: [
          { type: "reference", name: "A" },
          { type: "reference", name: "B" },
        ],
      }),
    ).toBe("A & B");
  });

  test("renders array types", () => {
    expect(
      renderType({
        type: "array",
        elementType: { type: "intrinsic", name: "string" },
      }),
    ).toBe("string[]");
  });

  test("renders tuple types", () => {
    expect(
      renderType({
        type: "tuple",
        elements: [
          { type: "intrinsic", name: "string" },
          { type: "intrinsic", name: "number" },
        ],
      }),
    ).toBe("[string, number]");
  });

  test("renders reflection types (function)", () => {
    expect(
      renderType({
        type: "reflection",
        declaration: {
          id: 1,
          name: "__type",
          variant: "declaration",
          kind: 65536,
          flags: {},
          signatures: [
            {
              id: 2,
              name: "__type",
              kind: 4096,
              flags: {},
              parameters: [
                {
                  id: 3,
                  name: "x",
                  kind: 32768,
                  flags: {},
                  type: { type: "intrinsic", name: "number" },
                },
              ],
              type: { type: "intrinsic", name: "boolean" },
            },
          ],
        },
      }),
    ).toBe("(x: number) => boolean");
  });

  test("renders reflection types (object without signatures)", () => {
    expect(
      renderType({
        type: "reflection",
        declaration: {
          id: 1,
          name: "__type",
          variant: "declaration",
          kind: 65536,
          flags: {},
        },
      }),
    ).toBe("object");
  });

  test("renders undefined input", () => {
    expect(renderType(undefined)).toBe("unknown");
  });

  test("renders complex types as fallback", () => {
    expect(renderType({ type: "mapped" })).toBe("complex type");
    expect(renderType({ type: "conditional" })).toBe("complex type");
    expect(renderType({ type: "templateLiteral" })).toBe("complex type");
  });

  test("renders unknown type names as-is", () => {
    expect(renderType({ type: "namedTupleMember" })).toBe("namedTupleMember");
  });
});

describe("renderType with real typedoc data", () => {
  test("renders the have function return type", () => {
    const have = byName("have");
    const sig = have.declaration.signatures?.[0];
    expect(sig).toBeDefined();
    expect(renderType(sig!.type)).toBe("boolean");
  });

  test("renders the have function parameter type as a union", () => {
    const have = byName("have");
    const param = have.declaration.signatures?.[0]?.parameters?.[0];
    expect(param).toBeDefined();
    const rendered = renderType(param!.type);
    expect(rendered).toContain("Effect");
    expect(rendered).toContain("Item");
    expect(rendered).toContain("|");
  });

  test("renders byClass variable type", () => {
    const byClassTopic = byName("byClass");
    const rendered = renderType(byClassTopic.declaration.type);
    expect(rendered).not.toBe("unknown");
  });
});

describe("formatTopicEmbed", () => {
  describe("functions", () => {
    test("formats have function with signature", () => {
      const result = formatTopicEmbed(byName("have"));
      expect(result.title).toBe("have");
      expect(result.description).toContain("```ts");
      expect(result.description).toContain("have(");
      expect(result.url).toContain("github.com");
    });

    test("formats maxBy with parameter descriptions", () => {
      const result = formatTopicEmbed(byName("maxBy"));
      expect(result.title).toBe("maxBy");
      expect(result.description).toContain("best element");
      const paramField = result.fields.find((f) => f.name === "Parameters");
      expect(paramField).toBeDefined();
      expect(paramField!.value).toContain("**array**");
      expect(paramField!.value).toContain("**optimizer**");
    });

    test("includes return description when available", () => {
      const result = formatTopicEmbed(byName("maxBy"));
      const returnField = result.fields.find((f) => f.name === "Returns");
      expect(returnField).toBeDefined();
      expect(returnField!.value).toBeTruthy();
    });

    test("formats function with multiple overloads", () => {
      const result = formatTopicEmbed(byName("maxBy"));
      const sigBlock = result.description.match(/```ts\n([\s\S]*?)\n```/);
      expect(sigBlock).toBeTruthy();
      // maxBy has multiple overloads
      const signatures = sigBlock![1].split("\n");
      expect(signatures.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe("variables", () => {
    test("formats holidayWanderers", () => {
      const result = formatTopicEmbed(byName("holidayWanderers"));
      expect(result.title).toBe("holidayWanderers");
      expect(result.description).toContain("**Type**:");
    });

    test("formats $item template literal", () => {
      const result = formatTopicEmbed(byName("$item"));
      expect(result.title).toBe("$item");
      expect(result.description).toContain("Item");
    });

    test("includes default value when available", () => {
      const topic = byName("holidayWanderers");
      if (topic.declaration.defaultValue != null) {
        const result = formatTopicEmbed(topic);
        const defaultField = result.fields.find(
          (f) => f.name === "Default Value",
        );
        expect(defaultField).toBeDefined();
      }
    });
  });

  describe("classes", () => {
    test("formats Clan class with properties and methods", () => {
      const result = formatTopicEmbed(byName("Clan"));
      expect(result.title).toBe("Clan");

      const propsField = result.fields.find((f) => f.name === "Properties");
      expect(propsField).toBeDefined();
      expect(propsField!.value).toContain("id");
      expect(propsField!.value).toContain("name");

      const staticField = result.fields.find(
        (f) => f.name === "Static Methods",
      );
      expect(staticField).toBeDefined();
      expect(staticField!.value).toContain("get()");

      const instanceField = result.fields.find(
        (f) => f.name === "Instance Methods",
      );
      expect(instanceField).toBeDefined();
      expect(instanceField!.value).toContain("join()");
    });

    test("formats Macro class", () => {
      const result = formatTopicEmbed(byName("Macro"));
      expect(result.title).toBe("Macro");
      expect(result.description).toContain("BALLS macro");
    });
  });

  describe("namespaces", () => {
    test("formats AprilingBandHelmet with grouped children", () => {
      const result = formatTopicEmbed(byName("AprilingBandHelmet"));
      expect(result.title).toBe("AprilingBandHelmet");

      const funcField = result.fields.find((f) => f.name === "Functions");
      expect(funcField).toBeDefined();
      expect(funcField!.value).toContain("```ts");
      expect(funcField!.value).toContain("have()");
      expect(funcField!.value).toContain("canJoinSection()");
      // Should include return types
      expect(funcField!.value).toContain("boolean");

      const varField = result.fields.find((f) => f.name === "Variables");
      expect(varField).toBeDefined();
      expect(varField!.value).toContain("INSTRUMENTS");
    });

    test("formats SourceTerminal namespace", () => {
      const result = formatTopicEmbed(byName("SourceTerminal"));
      expect(result.title).toBe("SourceTerminal");
      expect(result.fields.length).toBeGreaterThan(0);
    });
  });

  describe("enums", () => {
    test("formats Lifestyle enum with members", () => {
      const result = formatTopicEmbed(byName("Lifestyle"));
      expect(result.title).toBe("Lifestyle");
      const membersField = result.fields.find((f) => f.name === "Members");
      expect(membersField).toBeDefined();
      expect(membersField!.value).toContain("casual");
      expect(membersField!.value).toContain("hardcore");
    });
  });

  describe("type aliases", () => {
    test("formats a type alias", () => {
      const result = formatTopicEmbed(byName("MoonSign"));
      expect(result.title).toBe("MoonSign");
    });

    test("formats type alias with children", () => {
      const topic = byName("FindActionSourceConstraints");
      const result = formatTopicEmbed(topic);
      expect(result.title).toBe("FindActionSourceConstraints");
      if (topic.declaration.children?.length) {
        const propsField = result.fields.find((f) => f.name === "Properties");
        expect(propsField).toBeDefined();
      }
    });
  });

  describe("re-exports", () => {
    test("formats get as re-export", () => {
      const result = formatTopicEmbed(byName("get"));
      expect(result.title).toBe("get");
      expect(result.description).toContain("Re-exported");
    });
  });

  describe("edge cases", () => {
    test("handles missing comment gracefully", () => {
      // AprilingBandHelmet has no comment
      const result = formatTopicEmbed(byName("AprilingBandHelmet"));
      expect(result.description).toBeTruthy();
    });

    test("source URL is populated when available", () => {
      const result = formatTopicEmbed(byName("have"));
      expect(result.url).toMatch(/^https:\/\/github\.com/);
    });

    test("description includes source link when available", () => {
      const result = formatTopicEmbed(byName("have"));
      expect(result.description).toContain("[View source");
      expect(result.description).toContain("github.com");
      expect(result.description).toContain("src/lib.ts");
    });

    test("embed fields are within Discord limits", () => {
      for (const topic of topics) {
        const result = formatTopicEmbed(topic);
        const totalChars =
          result.title.length +
          result.description.length +
          result.fields.reduce(
            (sum, f) => sum + f.name.length + f.value.length,
            0,
          );
        expect(totalChars).toBeLessThanOrEqual(6000);
        expect(result.description.length).toBeLessThanOrEqual(4096);
        for (const field of result.fields) {
          expect(field.value.length).toBeLessThanOrEqual(1024);
        }
      }
    });

    test("all topics can be formatted without throwing", () => {
      for (const topic of topics) {
        expect(() => formatTopicEmbed(topic)).not.toThrow();
      }
    });
  });
});

describe("resolveReference", () => {
  test("resolves get reference to its target function", () => {
    const getRef = byName("get");
    expect(getRef.kind).toBe("Re-export");

    const resolved = resolveReference(topics, getRef.declaration);
    expect(resolved.kind).not.toBe(4194304); // Not a reference anymore
    expect(resolved.name).toBe("get");
  });

  test("resolves set reference", () => {
    const setRef = byName("set");
    const resolved = resolveReference(topics, setRef.declaration);
    expect(resolved.name).toBe("set");
    expect(resolved.kind).not.toBe(4194304);
  });

  test("returns declaration unchanged for non-references", () => {
    const have = byName("have");
    const result = resolveReference(topics, have.declaration);
    expect(result).toBe(have.declaration);
  });

  test("resolved references can be formatted as embeds", () => {
    const getRef = byName("get");
    const resolved = resolveReference(topics, getRef.declaration);
    const topic: LibramTopic = {
      name: resolved.name,
      kind: "Function",
      declaration: resolved,
    };
    const result = formatTopicEmbed(topic);
    expect(result.title).toBe("get");
    expect(result.description).toContain("```ts");
  });
});
