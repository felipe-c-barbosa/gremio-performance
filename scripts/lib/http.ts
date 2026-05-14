/** Shared fetch defaults for third-party sports APIs (best-effort browser mimic). */

export const DEFAULT_HEADERS: Record<string, string> = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
  Accept: "application/json, text/plain, */*",
  "Accept-Language": "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7",
};

export function fotmobHeaders(): HeadersInit {
  return {
    ...DEFAULT_HEADERS,
    Referer: "https://www.fotmob.com/",
    Origin: "https://www.fotmob.com",
  };
}

export function sofascoreHeaders(): HeadersInit {
  return {
    ...DEFAULT_HEADERS,
    Referer: "https://www.sofascore.com/",
    Origin: "https://www.sofascore.com",
  };
}

export async function delay(ms: number): Promise<void> {
  await new Promise((r) => setTimeout(r, ms));
}

export async function fetchJsonOrNull(
  url: string,
  headers: HeadersInit
): Promise<unknown | null> {
  try {
    const res = await fetch(url, { headers });
    if (!res.ok) return null;
    return (await res.json()) as unknown;
  } catch {
    return null;
  }
}
