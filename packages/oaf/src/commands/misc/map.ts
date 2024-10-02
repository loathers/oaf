import {
  AttachmentBuilder,
  ChatInputCommandInteraction,
  SlashCommandBuilder,
} from "discord.js";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import proj4 from "proj4";
import { dedent } from "ts-dedent";

import { prisma } from "../../clients/database.js";
import { renderSvg } from "../../svgConverter.js";
import { bufferToDataUri } from "../../utils.js";

export const data = new SlashCommandBuilder()
  .setName("map")
  .setDescription(
    "Let's see how far ASS is spread! No options will display the map, or you can add your location",
  )
  .addStringOption((option) =>
    option
      .setName("location")
      .setDescription(
        'Your location (or "clear" to remove). Will respond with the resolved location, try again if wrong.',
      )
      .setRequired(false),
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  const location = interaction.options.getString("location", false);

  if (!location) return await renderMap(interaction);
  if (location.trim() === "clear") return await removeLocation(interaction);
  return await addLocation(interaction, location);
}

proj4.defs(
  "robinson",
  "+proj=robin +ellps=WGS84 +datum=WGS84 +units=m +no_defs +lon_0=12",
);
proj4.defs("longlat", "+proj=longlat +datum=WGS84 +no_defs");
const converter = proj4("longlat", "robinson");

const xMax = 17005833; // Coordinate starts in the range (-17005833,17005833)
const yMax = 8625154; // Coordinate starts in the range (-8625154,8625154)

function longLatToRobinson(longitude: number, latitude: number) {
  const { x, y } = converter.forward({ x: longitude, y: latitude });
  return { x: (x + xMax) / (2 * xMax), y: (-y + yMax) / (2 * yMax) };
}

const MAP = bufferToDataUri(
  readFileSync(
    path.join(fileURLToPath(new URL(".", import.meta.url)), "world.png"),
  ),
);

async function renderMap(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply();

  const positions = await prisma.player.findMany({
    where: { latitude: { not: null }, longitude: { not: null } },
    select: { latitude: true, longitude: true },
  });

  const coords = positions.map(({ longitude, latitude }) =>
    longLatToRobinson(longitude!, latitude!),
  );

  const svg = dedent`
    <?xml version="1.0" encoding="UTF-8" standalone="no"?>
    <svg xmlns="http://www.w3.org/2000/svg" version="1.1" width="800" height="406">
      <image href="${MAP}"/>
      ${coords.map(
        ({ x, y }) =>
          `<text x="${x * 800}" y="${y * 406}" font-size="8px" font-family="Noto Color Emoji">📍</text>`,
      )}
    </svg>
  `;

  console.log(svg);

  const image = await renderSvg(svg);

  const attachment = new AttachmentBuilder(image).setName(`map.png`);

  return void (await interaction.editReply({ files: [attachment] }));
}

async function removeLocation(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply({ ephemeral: true });

  await prisma.player.updateMany({
    where: { discordId: interaction.user.id },
    data: { latitude: null, longitude: null },
  });

  return void interaction.editReply(
    "Your location has been removed, if it was set",
  );
}

type Geocode = {
  place_id: number;
  licence: string;
  osm_type: string;
  osm_id: number;
  lat: string;
  lon: string;
  category: string;
  type: string;
  place_rank: number;
  importance: number;
  addresstype: string;
  name: string;
  display_name: string;
  boundingbox: string[];
};

async function addLocation(
  interaction: ChatInputCommandInteraction,
  location: string,
) {
  await interaction.deferReply({ ephemeral: true });
  const request = await fetch(
    `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(location)}&format=jsonv2&limit=1`,
  );
  const results = (await request.json()) as Geocode[];

  if (results.length === 0) {
    return void interaction.editReply("I couldn't find that location!");
  }

  const { lat, lon, display_name: displayName } = results[0];

  const { count } = await prisma.player.updateMany({
    where: { discordId: interaction.user.id },
    data: { latitude: parseFloat(lat), longitude: parseFloat(lon) },
  });

  if (count === 0) {
    return void interaction.editReply(
      "You need to /claim your KoL account to put a pin in the map!",
    );
  }

  return void interaction.editReply(
    `Your location has been recorded as ${displayName}`,
  );
}
