import { describe, expect, test } from "vitest";

import { parseSubmission } from "./crowdsource.js";

describe("parseSubmission", () => {
  test("parses a simple key:value pair", () => {
    expect(parseSubmission("snootee:12412")).toEqual({
      key: "snootee",
      value: "12412",
    });
  });

  test("lowercases the key", () => {
    expect(parseSubmission("Snootee:12412")).toEqual({
      key: "snootee",
      value: "12412",
    });
  });

  test("trims whitespace from key and value", () => {
    expect(parseSubmission("  snootee : 12412 ")).toEqual({
      key: "snootee",
      value: "12412",
    });
  });

  test("splits on the first colon only", () => {
    expect(parseSubmission("jickjar:bar:baz")).toEqual({
      key: "jickjar",
      value: "bar:baz",
    });
  });

  test("returns null for unknown keys", () => {
    expect(parseSubmission("unknown:12345")).toBeNull();
    expect(parseSubmission("foo:bar")).toBeNull();
  });

  test("accepts all known keys", () => {
    expect(parseSubmission("snootee:1")).toEqual({
      key: "snootee",
      value: "1",
    });
    expect(parseSubmission("microbrewery:2")).toEqual({
      key: "microbrewery",
      value: "2",
    });
    expect(parseSubmission("jickjar:3")).toEqual({
      key: "jickjar",
      value: "3",
    });
    expect(parseSubmission("votemonster:4")).toEqual({
      key: "votemonster",
      value: "4",
    });
  });

  test("returns null for messages without a colon", () => {
    expect(parseSubmission("claim")).toBeNull();
  });

  test("returns null for messages starting with a colon", () => {
    expect(parseSubmission(":value")).toBeNull();
  });

  test("returns null for empty value after colon", () => {
    expect(parseSubmission("snootee:")).toBeNull();
    expect(parseSubmission("snootee:   ")).toBeNull();
  });

  test("returns null for empty key before colon", () => {
    expect(parseSubmission(" :value")).toBeNull();
  });

  test("strips zero-width spaces", () => {
    expect(parseSubmission("sno\u200Botee:12\u200B412")).toEqual({
      key: "snootee",
      value: "12412",
    });
  });

  test("handles values with spaces", () => {
    expect(parseSubmission("microbrewery:some thing")).toEqual({
      key: "microbrewery",
      value: "some thing",
    });
  });
});
