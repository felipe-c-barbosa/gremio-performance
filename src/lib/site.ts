/**
 * URL canónica do site (sem barra final).
 * Em produção defina `NEXT_PUBLIC_SITE_URL` no Netlify / CI (ex.: https://gremio.example.com).
 */
export function getSiteUrl(): string {
  const raw = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (raw) return raw.replace(/\/$/, "");
  return "http://localhost:3000";
}
