import { Client } from "kol.js";

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
