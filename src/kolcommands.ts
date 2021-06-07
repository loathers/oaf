import { Message } from "discord.js";
import { DiscordClient } from "./discord";

export function attachKoLCommands(client: DiscordClient) {
  client.attachCommand("item", item, "Print the +item drop required to cap a drop.");
  client.attachCommand(
    "fairy",
    fairy,
    "Print the +item drop supplied by a fairy of a given weight."
  );
  client.attachCommand(
    "leprechaun",
    lep,
    "Print the +meat drop supplied by a leprechaun of a given weight."
  );
  client.attachCommand("lep", lep, "Alias for leprechaun.");
  client.attachCommand(
    "volleyball",
    volley,
    "Print the +stat drop supplied by a volleyball of a given weight."
  );
  client.attachCommand("volley", volley, "Alias for volleyball.");
  //client.attachCommand("level", level, "Finds the stats and substats needed for a given level.");
  //client.attachCommand("stat", stat, "Finds the substats and level for a given mainstat total.");
  //client.attachCommand("substat", substat, "Finds the mainstat and level for a given substat total");
}

function item(message: Message, args: string[]): void {
  if (args.length === 0) {
    message.channel.send("Please supply a drop rate.");
    return;
  }
  const drop = parseFloat(args[1]) || 0;
  if (drop < 0.1) {
    message.channel.send("Please supply a sensible drop rate.");
    return;
  }
  if (drop > 99.9) {
    message.channel.send(`A 100% drop does not require any item drop bonus to cap.`);
    return;
  }
  message.channel.send(
    `A ${Number(drop.toFixed(1))}% drop requires a +${Math.ceil(10000 / Number(drop.toFixed(1))) - 100}% item drop bonus to cap.`
  );
}

function fairy(message: Message, args: string[]): void {
  if (args.length === 0) {
    message.channel.send("Please supply a fairy weight.");
    return;
  }
  const weight = parseInt(args[1]) || 0;
  if (weight <= 0) {
    message.channel.send("Please supply a positive fairy weight.");
    return;
  }
  message.channel.send(
    `A ${weight}lb fairy provides +${Number(
      (Math.sqrt(55 * weight) + weight - 3).toFixed(2)
    )}% item drop. (+${Number(
      (Math.sqrt(55 * weight * 1.25) + weight * 1.25 - 3).toFixed(2)
    )}% for Jumpsuited Hound Dog)`
  );
}

function lep(message: Message, args: string[]): void {
  if (args.length === 0) {
    message.channel.send("Please supply a leprechaun weight.");
    return;
  }
  const weight = parseInt(args[1]) || 0;
  if (weight <= 0) {
    message.channel.send("Please supply a positive leprechaun weight.");
    return;
  }
  message.channel.send(
    `A ${weight}lb leprechaun provides +${Number(
      (2 * (Math.sqrt(55 * weight) + weight - 3)).toFixed(2)
    )}% meat drop. (+${Number(
      (2 * (Math.sqrt(55 * weight * 1.25) + weight * 1.25 - 3)).toFixed(2)
    )}% for Hobo Monkey)`
  );
}

function volley(message: Message, args: string[]): void {
  if (args.length === 0) {
    message.channel.send("Please supply a volleyball weight.");
    return;
  }
  const weight = parseInt(args[1]) || 0;
  if (weight <= 0) {
    message.channel.send("Please supply a positive volleyball weight.");
    return;
  }
  message.channel.send(
    `A ${weight}lb volleyball provides +${2 + 0.2 * weight} substats per combat.`
  );
}
