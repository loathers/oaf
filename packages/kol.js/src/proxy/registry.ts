import type { Interceptor, ProxyRequest } from "./types.js";

const interceptors: Interceptor[] = [];

export function registerInterceptor(interceptor: Interceptor): void {
  interceptors.push(interceptor);
}

export function getMatchingInterceptors(req: ProxyRequest): Interceptor[] {
  return interceptors.filter((i) => {
    if (i.matches) return i.matches(req);
    if (!i.path) return true;
    if (typeof i.path === "string") return req.path === i.path;
    return i.path.test(req.path);
  });
}
