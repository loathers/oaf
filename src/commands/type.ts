import { Pool } from "pg";
import { DiscordClient } from "../discord";
import { KOLClient } from "../kol";
import { WikiSearcher } from "../wikisearch";

type BaseParams = {
  discordClient: DiscordClient;
  kolClient: KOLClient;
  databasePool: Pool;
  wikiSearcher: WikiSearcher;
};

type AttachParams = BaseParams;
type SyncParams = BaseParams;

export type Command = {
  attach: (params: AttachParams) => void;
  sync?: (params: SyncParams) => Promise<void>;
};
