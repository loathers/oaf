import makeFetchCookie from "fetch-cookie";

export function createBody(data: Record<string, string | number>) {
  const formData = new FormData();
  Object.entries(data).forEach(([key, value]) =>
    formData.append(key, String(value)),
  );
  return new URLSearchParams(formData as unknown as Record<string, string>);
}

export function formatQuerystring(params: Record<string, string | number>) {
  return new URLSearchParams(
    Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)])),
  );
}

export const createSession = () => makeFetchCookie(fetch);
