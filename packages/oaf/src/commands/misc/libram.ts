import {
  AutocompleteInteraction,
  ChatInputCommandInteraction,
  SlashCommandBuilder,
} from "discord.js";

import { createEmbed } from "../../clients/discord.js";
import {
  type LibramTopic,
  fetchTopics,
  formatTopicEmbed,
  resolveReference,
} from "../../clients/libram.js";

export const data = new SlashCommandBuilder()
  .setName("libram")
  .setDescription("Look up libram API documentation.")
  .addStringOption((option) =>
    option
      .setName("topic")
      .setDescription("The function, class, namespace, or variable to look up")
      .setRequired(true)
      .setAutocomplete(true),
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  const topicName = interaction.options.getString("topic", true);
  await interaction.deferReply();

  const topics = await fetchTopics();
  let topic = topics.find(
    (t) => t.name.toLowerCase() === topicName.toLowerCase(),
  );

  if (!topic) {
    await interaction.editReply(
      `No libram topic found matching "${topicName}".`,
    );
    return;
  }

  // Resolve re-exports to their actual declarations
  if (topic.kind === "Re-export") {
    const resolved = resolveReference(topics, topic.declaration);
    if (resolved !== topic.declaration) {
      topic = {
        name: topic.name,
        kind: topic.kind,
        declaration: resolved,
      } satisfies LibramTopic;
    }
  }

  const { title, url, description, fields } = formatTopicEmbed(topic);

  const embed = createEmbed().setTitle(title).setDescription(description);

  if (url) {
    embed.setURL(url);
  }

  for (const field of fields) {
    embed.addFields({
      name: field.name,
      value: field.value,
      inline: field.inline ?? false,
    });
  }

  await interaction.editReply({
    content: null,
    embeds: [embed],
    allowedMentions: { parse: [], repliedUser: false },
  });
}

export async function init() {
  // Pre-fetch topics on startup so autocomplete is fast
  await fetchTopics();
}

export async function autocomplete(interaction: AutocompleteInteraction) {
  const focusedValue = interaction.options.getFocused().toLowerCase().trim();

  const topics = await fetchTopics();

  const filtered =
    focusedValue === ""
      ? topics.slice(0, 25)
      : topics
          .filter((t) => t.name.toLowerCase().includes(focusedValue))
          .sort((a, b) => {
            // Exact prefix match first
            const aPrefix = a.name.toLowerCase().startsWith(focusedValue);
            const bPrefix = b.name.toLowerCase().startsWith(focusedValue);
            if (aPrefix && !bPrefix) return -1;
            if (!aPrefix && bPrefix) return 1;
            return a.name.localeCompare(b.name);
          })
          .slice(0, 25);

  await interaction.respond(
    filtered.map((t) => ({
      name: `${t.name} (${t.kind})`,
      value: t.name,
    })),
  );
}
