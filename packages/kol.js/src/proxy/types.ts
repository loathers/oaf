import type { Client } from "../Client.js";

export type ProxyRequest = {
  path: string;
  method: string;
  params: URLSearchParams;
};

export type ProxyResponse = {
  status: number;
  contentType: string;
  body: string | Buffer;
};

export interface Interceptor {
  path?: string | RegExp;
  matches?: (req: ProxyRequest) => boolean;
  onRequest?(client: Client, req: ProxyRequest): void | Promise<void>;
  onResponse?(client: Client, req: ProxyRequest, res: ProxyResponse): void | Promise<void>;
  decorate?(html: string, req: ProxyRequest): string | Promise<string>;
}
