
import { SecretManagerServiceClient } from '@google-cloud/secret-manager';
import * as dotenv from "dotenv";


export class VariableManager {
    private _variables: Map<string, string | undefined> = new Map();
    private _dotEnvConfig: dotenv.DotenvConfigOutput;
    private _googleSecretClient: SecretManagerServiceClient;

    constructor() {
        this._googleSecretClient = new SecretManagerServiceClient();
        this._dotEnvConfig = dotenv.config({ path: __dirname+'/.env' });
    }

    set(identifier: string, value: string): void {
        this._variables.set(identifier, value);
    }

    get(identifier: string): string | undefined {
        return this._variables.get(identifier)
    }

    getNumber(identifier: string): number {
        return parseInt(this.get(identifier) || "NaN");
    }

    async fetchAll(identifiers: string[]): Promise<void> {
        const results = await Promise.all(identifiers.map((identifier) => this.fetchValue(identifier)));
        for (let i = 0; i < identifiers.length; i++) {
            this.set(identifiers[i], results[i] || "");
        }
    }

    async fetch(identifier: string): Promise<void> {
        this.set(identifier, await this.fetchValue(identifier) || "");
    }

    async fetchValue(identifier: string): Promise<string | undefined> {
        if (process.env[identifier]) {
            return process.env[identifier]
        }
        else {
            return await this.accessSecret(identifier)
        }
    }

    async accessSecret(identifier: string): Promise<string | undefined> {
        try {
            const secret = await this._googleSecretClient.accessSecretVersion({
                name: `${process.env.SECRET_PATH}/${identifier}/versions/latest`,
            })
            if (secret[0].payload) {
                return secret[0].payload.data?.toString();
            }
        }
        catch (error){
            console.log(error);
        }
        return undefined;
    }
}