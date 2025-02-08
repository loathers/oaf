import path from "node:path";

type Patient = {
  id: string;
  patientId: string;
  firstName: string;
  lastName: string;
};
type IsPatientPredicate = (patient: Patient) => boolean;

export class LibreLinkUpClient {
  baseUrl = "https://api-us.libreview.io/llu";

  email: string;
  password: string;
  isPatient: IsPatientPredicate;

  token?: string;
  patientId?: string;

  constructor(email: string, password: string, isPatient: IsPatientPredicate) {
    this.email = email;
    this.password = password;
    this.isPatient = isPatient;
  }

  headers() {
    return {
      "accept-encoding": "gzip",
      "cache-control": "no-cache",
      connection: "Keep-Alive",
      "content-type": "application/json",
      product: "llu.android",
      version: "4.7.0",
      ...(this.token ? { authorization: `Bearer ${this.token}` } : {}),
    };
  }

  async login() {
    const response = await fetch(path.join(this.baseUrl, "/auth/login"), {
      method: "POST",
      body: JSON.stringify({ email: this.email, password: this.password }),
      headers: this.headers(),
    });
    const result = (await response.json()) as {
      status: number;
      data: { authTicket: { token: string } };
    };

    if (result.status === 2) {
      throw new Error("Invalid credentials");
    }

    this.token = result.data.authTicket.token;
    await this.discoverPatientId();
  }

  async discoverPatientId() {
    const response = await fetch(path.join(this.baseUrl, "connections"), {
      headers: this.headers(),
    });
    const patients = (await response.json()) as { data: Patient[] };
    if (!("data" in patients)) throw new Error(`Patients does not contain \`data\` attribute! Instead, it looks like ${JSON.stringify(patients)}`);
    if (!patients.data.length)
      throw new Error("No patients connected to this account.");
    const patient = patients.data.find(this.isPatient) || patients.data[0];
    this.patientId = patient.patientId;
  }

  async read() {
    if (!this.patientId) throw new Error("No patient id identified.");
    const response = await fetch(
      path.join(this.baseUrl, "connections", this.patientId, "graph"),
      { headers: this.headers() },
    );
    const result = (await response.json()) as {
      data: { graphData: RawData[] };
    };
    const data = result.data.graphData;
    return data.map((d) => ({
      date: new Date(`${d.FactoryTimestamp} UTC`),
      value: d.Value,
      isLow: d.isLow,
      isHigh: d.isHigh,
    }));
  }

  async latest() {
    const data = await this.read();
    return data
      .toSorted((a, b) => (a.date > b.date ? -1 : a.date < b.date ? 1 : 0))
      .at(0)!;
  }
}

type RawData = {
  FactoryTimestamp: string;
  Timestamp: string;
  type: number;
  ValueInMgPerDl: number;
  MeasurementColor: number;
  GlucoseUnits: number;
  Value: number;
  isHigh: boolean;
  isLow: boolean;
};
