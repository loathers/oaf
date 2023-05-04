import * as fs from "node:fs/promises";
import * as path from "node:path";

export async function loadFixture(dirname: string, name: string) {
  const file = path.join(dirname, `__fixtures__/${name}`);
  return await fs.readFile(file, { encoding: "utf-8" });
}

export async function respondWithFixture(dirname: string, name: string) {
  return {
    status: 200,
    statusText: "SUCCESS",
    config: {},
    headers: {},
    data: await loadFixture(dirname, name),
  };
}
