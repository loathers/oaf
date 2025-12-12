import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  time,
} from "discord.js";

import { createEmbed } from "../../clients/discord.js";

interface HistoricalExchangeResponse {
  rate: number;
  game_date: number;
  iotm_is_familiar: boolean;
  iotm_name: string;
}

interface TodayExchangeResponse extends HistoricalExchangeResponse {
  mall_price: number;
  iotm_id: number;
  now: string;
}

const API_URL = "https://4hea44d1a5.execute-api.us-east-1.amazonaws.com";

const numberFormat = new Intl.NumberFormat();
const absoluteChangeFormat = new Intl.NumberFormat(undefined, {
  signDisplay: "always",
});
const percentageChangeFormat = new Intl.NumberFormat(undefined, {
  style: "percent",
  minimumFractionDigits: 2,
  signDisplay: "always",
});

const gameDateToDate = (gameDate: number) => {
  const year = Math.floor(gameDate / 10_000);
  const month = Math.floor((gameDate % 10_000) / 100) - 1;
  const day = gameDate % 100;
  return new Date(year, month, day, 3, 30);
};
const daysBeforeAsGameDate = (date: Date, days = 1) =>
  new Date(date.getTime() - 1000 * 60 * 60 * 24 * days)
    .toISOString()
    .slice(0, 10)
    .replace(/-/g, "");
const formatChange = (now: number, before: number) => {
  const change = now - before;
  return `${absoluteChangeFormat.format(change)} (${percentageChangeFormat.format(change / before)})`;
};

export const data = new SlashCommandBuilder()
  .setName("exchange")
  .setDescription(
    "Get the exchange rate from real dollars to meat (via the price of a Mr A)",
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply();

  const today = await fetch(`${API_URL}/getrate`).then(
    (r) => r.json() as Promise<TodayExchangeResponse>,
  );

  const todaysDate = gameDateToDate(today.game_date);

  const yesterdaysGameDate = daysBeforeAsGameDate(todaysDate, 1);
  const yesterday = await fetch(
    `${API_URL}/getrate?date=${yesterdaysGameDate}`,
  ).then((r) => r.json() as Promise<HistoricalExchangeResponse>);

  const lastWeekGameDate = daysBeforeAsGameDate(todaysDate, 7);
  const lastWeek = await fetch(
    `${API_URL}/getrate?date=${lastWeekGameDate}`,
  ).then((r) => r.json() as Promise<HistoricalExchangeResponse>);

  const embed = createEmbed()
    .setTitle(`Exchange Rate 🎢`)
    .setDescription("All values in 🥩/$")
    .addFields(
      {
        name: `Current rate`,
        value: `${numberFormat.format(today.rate)}`,
      },
      {
        name: `Change since previous day`,
        value: formatChange(today.rate, yesterday.rate),
      },
      {
        name: `Change since previous week`,
        value: formatChange(today.rate, lastWeek.rate),
      },
      {
        name: "Last updated on KoL day starting",
        value: time(gameDateToDate(today.game_date), "d"),
      },
    )
    .setFooter({
      text: "Data with thanks to NateTheDuck of https://www.nathanatos.com",
    });

  await interaction.editReply({
    embeds: [embed],
  });
}
