import { config } from "../config.js";

type SearchResponse = {
  items: { link: string }[];
};

export async function googleSearch(query: string) {
  const response = await fetch(
    `https://www.googleapis.com/customsearch/v1?${new URLSearchParams({
      key: config.GOOGLE_API_KEY!,
      cx: config.MAFIA_CUSTOM_SEARCH!,
      q: query,
    })}`,
  );

  if (!response.ok)
    return {
      results: [],
      error: { statusText: response.statusText, status: response.status },
    };

  return { results: (await response.json()) as SearchResponse, error: null };
}
