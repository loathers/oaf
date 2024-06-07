import { Client } from "kol.js";

export function parseWorkers(environment: Record<string, string | undefined>) {
  return Object.entries(environment).filter(([k,]) => k.startsWith("WORKER_") && v !== undefined).map(([, v]) => {
    const [username, password, ...capabilities] = v!.split(",");

    return new Worker(username, password, capabilities.map((capability) => {
      const [type, name] = capability.split(":");
      return { type, name } as Capability;
    }));
  });
}

export type Capability =
  | { type: "familiar"; name: string }
  | { type: "skill"; name: string }
  | { type: "path"; name: string };

export class Worker extends Client {
  capabilities: Capability[];
  busy = false;

  constructor(username: string, password: string, capabilities: Capability[]) {
    super(username, password);
    this.capabilities = capabilities;
  }

  hasCapability(capability: Capability) {
    return this.capabilities.find(
      (c) => c.type === capability.type && c.name === capability.name,
    );
  }

  isBusy() {
    return this.busy;
  }

  async run<T>(test: (client: Worker, id: number) => Promise<T>, id: number) {
    this.busy = true;
    const result = await test(this, id);
    this.busy = false;
    return result;
  }
}
