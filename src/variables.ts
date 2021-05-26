
import { SecretManagerServiceClient } from '@google-cloud/secret-manager';
import * as dotenv from "dotenv";

dotenv.config({ path: __dirname+'/.env' });

export class VariableManager {
    private _variables: Map<string, string | undefined> = new Map();
    private _googleSecretClient: SecretManagerServiceClient;

    constructor() {
        this._googleSecretClient = new SecretManagerServiceClient();
    }

    async getSecret(identifier: string): Promise<string | undefined> {
        try {
            const secret = await this._googleSecretClient.accessSecretVersion({
                name: `${process.env.SECRET_PATH}/${identifier}/latest`,
            })
            if (secret[0].payload) {
                return secret[0].payload.data?.toString();
            }
        }
        catch {}
        return undefined;

    }

    async get(identifier: string): Promise<string | undefined> {
        if (!this._variables.has(identifier)) {
            this._variables.set(identifier, (await this.getSecret(identifier)) || process.env[identifier])
        }

        return this._variables.get(identifier) || undefined;
    }

    async getNumber(identifier: string): Promise<number> {
        return parseInt((await this.get(identifier)) || "NaN");
    }
}