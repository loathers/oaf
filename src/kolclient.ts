import { VariableManager } from "./variables";
import axios from "axios";
import { POINT_CONVERSION_COMPRESSED } from "constants";

type MallPrice = {
    mallPrice: string,
    limitedMallPrice: string,
}

type KOLCredentials = {
    sessionCookies?: string,
    pwdhash?: string,
}

export class KOLClient {
    private _loginParameters: URLSearchParams;
    private _credentials: KOLCredentials = {};

    constructor(variableManager: VariableManager) {
        this._loginParameters = new URLSearchParams();
        this._loginParameters.append("loggingin", "Yup.");
        this._loginParameters.append("loginname", variableManager.get("KOL_USER"));
        this._loginParameters.append("password", variableManager.get("KOL_PASS"));
        this._loginParameters.append("secure", "0");
        this._loginParameters.append("submitbutton", "Log In");
    }

    async logIn(): Promise<void> {
        try {
            const loginResponse = await axios("https://www.kingdomofloathing.com/login.php", {
                method: "POST",
                data: this._loginParameters,
                maxRedirects: 0,
                validateStatus: (status) => status === 302,
            });
            const sessionCookies = loginResponse.headers["set-cookie"].map((cookie: string) => cookie.split(";")[0]).join("; ");
            const apiResponse = await axios("https://www.kingdomofloathing.com/api.php", {
                withCredentials: true,
                headers: {
                    cookie: sessionCookies,
                },
                params: {
                    what: "status",
                    for: "OAF Discord bot for Kingdom of Loathing",
                },
            });
            this._credentials = {
                sessionCookies: sessionCookies,
                pwdhash: apiResponse.data.pwd,
            }
        } catch (error) {
            console.log(error)
        }
    }

    private async makeCredentialedRequest(url: string, parameters: object) {
        try {
            const request = await axios(`https://www.kingdomofloathing.com/${url}`, {
                method: "GET",
                headers: {
                    cookie: this._credentials.sessionCookies,
                },
                params: {
                    pwd: this._credentials.pwdhash,
                    ...parameters,
                },
            });
            return request.data;
        } catch {
            return undefined;
        }
    }

    private async tryRequestWithLogin(url: string, parameters: object) {
        const result = await this.makeCredentialedRequest(url, parameters);
        if (result) return result;
        await this.logIn()
        return await this.makeCredentialedRequest(url, parameters);
    } 

    async getMallPrice(itemId: number): Promise<MallPrice> {
        const prices = await this.tryRequestWithLogin("backoffice.php", {
            action: "prices",
            ajax: 1,
            iid: itemId,
        });
        const unlimitedMatch = prices.match(/<td>unlimited:<\/td><td><b>(?<unlimitedPrice>[\d\,]+)/);
        const limitedMatch = prices.match(/<td>limited:<\/td><td><b>(?<limitedPrice>[\d\,]+)/);
        return {
            mallPrice: unlimitedMatch ? unlimitedMatch[1] : "",
            limitedMallPrice: limitedMatch ? limitedMatch[1] : "",
        }
    }
}