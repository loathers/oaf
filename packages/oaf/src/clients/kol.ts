import { Client } from "kol.js";

import { config } from "../config.js";

export const kolClient = new Client(config.KOL_USER, config.KOL_PASS);
