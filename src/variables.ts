
import { SecretManagerServiceClient } from '@google-cloud/secret-manager';
import * as dotenv from "dotenv";


export class VariableManager {
    private _variables: Map<string, string | undefined> = new Map();
    private _dotEnvConfig: dotenv.DotenvConfigOutput;
    private _googleSecretClient: SecretManagerServiceClient;

    constructor() {
        this._googleSecretClient = new SecretManagerServiceClient();
        this._dotEnvConfig = dotenv.config({ path: __dirname+'/.env' });
        console.log("Variable manager started");
    }

    async getSecret(identifier: string): Promise<string | undefined> {
        try {
            const secret = await this._googleSecretClient.accessSecretVersion({
                name: `${process.env.SECRET_PATH}/${identifier}/latest`,
            })
            console.log("Secret request returned.");
            console.log(secret);
            console.log(secret[0]);
            console.log(secret[0].payload);
            console.log(secret[0].payload?.data);
            if (secret[0].payload) {
                return secret[0].payload.data?.toString();
            }
        }
        catch (error){
            console.log("Error thrown when seeking secret:");
            throw(error);
        }
        return undefined;

    }

    async get(identifier: string): Promise<string | undefined> {
        console.log(`Looking for variable with identifier ${identifier}`);
        if (!this._variables.has(identifier)) {
            console.log(`Identifier ${identifier} not previously seen.`);
            if (process.env[identifier]) {
                console.log(`Environment variable ${identifier} found.`);
                this._variables.set(identifier, process.env[identifier])
            }
            else {
                console.log(`Looking for secret ${process.env.SECRET_PATH}/${identifier}/latest`);
                this._variables.set(identifier, (await this.getSecret(identifier)))
            }
        }
        console.log(`Returning ${this._variables.get(identifier)} for variable ${identifier}.`)
        return this._variables.get(identifier) || undefined;
    }

    async getNumber(identifier: string): Promise<number> {
        return parseInt((await this.get(identifier)) || "NaN");
    }
}