import { type KoLMessage } from "kol.js";

import { discordClient } from "./clients/discord.js";
import { greenboxClient } from "./clients/greenbox.js";
import { kolClient } from "./clients/kol.js";

export async function handleGreenboxKmail(message: KoLMessage) {
  if (message.type !== "kmail") return;

  // Remove spaces - KoL adds weird spaces to long messages.
  const text = message.msg.replace(/ /g, "").slice(9);

  switch (text) {
    case "WIPE":
      await wipe(message.who.id);
      break;
    default:
      await update(message.who.id, message.who.name, text);
      break;
  }
}

async function update(
  playerId: number,
  playerName: string,
  greenboxString: string,
) {
  try {
    const response = await greenboxClient.update(
      playerId,
      playerName,
      greenboxString,
    );
    console.log(
      `Updated greenbox for player ${playerId} (${playerName})`,
      response,
    );
  } catch (error) {
    await discordClient.alert(
      "Error processing greenbox submission",
      undefined,
      `Failed to update greenbox for player ${playerId}: ${error}`,
    );
    await kolClient.kmail(
      playerId,
      "There was an error processing your greenbox submission",
    );
  }
}

async function wipe(playerId: number) {
  try {
    const response = await greenboxClient.wipe(playerId);
    console.log(`Wiped greenbox for player ${playerId}`, response);
    await kolClient.kmail(
      playerId,
      "At your request, your public greenbox profile, if it existed, has been removed",
    );
  } catch (error) {
    await discordClient.alert(
      "Error processing greenbox wipe request",
      undefined,
      `Failed to wipe greenbox for player ${playerId}: ${error}`,
    );
    await kolClient.kmail(
      playerId,
      "There was an error processing your greenbox wipe request",
    );
  }
}
