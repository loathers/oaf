import type { Client } from "../Client.js";
import { getMatchingInterceptors } from "./registry.js";
import type { ProxyRequest, ProxyResponse } from "./types.js";

export async function runRequestPipeline(
  client: Client,
  req: ProxyRequest,
): Promise<void> {
  for (const i of getMatchingInterceptors(req)) {
    await i.onRequest?.(client, req);
  }
}

export async function runResponsePipeline(
  client: Client,
  req: ProxyRequest,
  res: ProxyResponse,
): Promise<void> {
  for (const i of getMatchingInterceptors(req)) {
    await i.onResponse?.(client, req, res);
  }
}

export async function runDecoratePipeline(
  req: ProxyRequest,
  html: string,
): Promise<string> {
  let result = html;
  for (const i of getMatchingInterceptors(req)) {
    if (i.decorate) result = await i.decorate(result, req);
  }
  return result;
}
