import { compile } from "./compiler.js";
import { Capability, parseWorkers, Worker } from "./Worker.js";

const workers = parseWorkers(process.env);

const itemFeatures = await compile("./features/items.feature");

async function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Find a worker that meets the requirements and is availabile.
 *
 * Throws an error if there are no capable workers, but waits otehrwise for availability.
 *
 * @param requirements Requirements needed from worker
 * @returns Worker to use
 */
async function runOnAvailableWorker<T>(
  test: (worker: Worker, id: number) => Promise<T>,
  requirements: Capability[],
  id: number,
  taskName: string,
) {
  const potential = workers.filter((w) =>
    requirements.every((r) => w.hasCapability(r)),
  );
  if (potential.length === 0)
    throw new Error(
      `There are no workers capable of carrying out a task with the requirements ${JSON.stringify(requirements)}`,
    );
  while (true) {
    const available = potential.find((w) => !w.isBusy());
    if (available) {
      console.log(
        "Running task",
        taskName,
        "for item",
        id,
        "on available worker",
        available.username,
      );
      return await available.run(test, id);
    }
    await wait(1);
  }
}

export async function spadeItems(from: number) {
  const items: string[][] = [];
  // Determine range to check
  while (true) {
    const exists = await runOnAvailableWorker(
      itemFeatures.exists,
      [],
      from + items.length,
      "exists",
    );
    if (!exists) break;
    items.push([]);
  }

  // For each item id, track the mutually exclusive groups that have been satisfied
  const exclusive: Record<number, string[]> = {};

  // Run scenario by scenario, rather than item by item
  for (const scenario of itemFeatures.scenarios) {
    console.log("Running scenario", scenario.name);
    (
      await Promise.all(
        items.map(async (_, i) => {
          const id = from + i;

          if (
            scenario.exclusive &&
            exclusive[i]?.includes(scenario.exclusive)
          ) {
            console.log(
              "Skipping task",
              scenario.name,
              "for item",
              id,
              "because its mutually exclusive group has been satisfied",
            );
            return null;
          }
          return runOnAvailableWorker(
            scenario.test,
            scenario.requirements,
            id,
            scenario.name,
          );
        }),
      )
    ).forEach((finding, i) => {
      if (!finding) return;

      items[i].push(finding);

      if (scenario.exclusive) (exclusive[i] ??= []).push(scenario.exclusive);
    });
  }

  console.log(
    items.map(
      (facts, i) => `Item ${i + from} is: ${facts.join(", ") || "untradeable"}`,
    ),
  );
}

async function main() {
  console.time("items");
  await spadeItems(11594);
  console.timeEnd("items");
}

main();
