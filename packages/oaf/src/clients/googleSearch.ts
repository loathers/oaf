import { StatusCodes } from "http-status-codes";

import { config } from "../config.js";

type SearchResponse = {
  items?: { link: string }[];
};

export async function googleSearch(context: string, query: string) {
  const url = `https://www.googleapis.com/customsearch/v1?${new URLSearchParams(
    {
      key: config.GOOGLE_API_KEY!,
      cx: context,
      q: query,
    },
  )}`;

  const response = await fetch(url);

  if (!response.ok)
    return {
      results: [],
      error: {
        statusText: response.statusText,
        status: response.status as StatusCodes,
      },
    };

  return { results: (await response.json()) as SearchResponse, error: null };
}
