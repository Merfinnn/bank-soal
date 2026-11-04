import { isIPv4 } from "node:net";

export const LOCAL_DEVELOPMENT_ORIGINS = [
  "http://localhost:3000",
  "http://127.0.0.1:3000"
] as const;

const LOCAL_DEVELOPMENT_LAN_PORT = "3000";

export function normalizeOrigin(value: string | undefined | null): string | null {
  if (!value) return null;
  try {
    const origin = new URL(value).origin;
    return origin === "null" ? null : origin;
  } catch {
    return null;
  }
}

function isAllowedDevelopmentLanOrigin(origin: string): boolean {
  try {
    const url = new URL(origin);
    if (
      url.protocol !== "http:"
      || url.port !== LOCAL_DEVELOPMENT_LAN_PORT
      || !isIPv4(url.hostname)
    ) {
      return false;
    }

    const octets = url.hostname.split(".").map(Number);
    return octets[0] === 192 && octets[1] === 168;
  } catch {
    return false;
  }
}

export function getAllowedOrigins(
  configuredOrigin: string | undefined,
  includeLocalDevelopmentOrigins: boolean
): Set<string> {
  const origins = new Set<string>();
  const configured = normalizeOrigin(configuredOrigin);
  if (configured) origins.add(configured);
  if (includeLocalDevelopmentOrigins) {
    for (const origin of LOCAL_DEVELOPMENT_ORIGINS) origins.add(origin);
  }
  return origins;
}

export function isAllowedOrigin(
  value: string | undefined | null,
  configuredOrigin: string | undefined,
  includeLocalDevelopmentOrigins: boolean
): boolean {
  const origin = normalizeOrigin(value);
  if (!origin) return false;

  const allowedOrigins = getAllowedOrigins(
    configuredOrigin,
    includeLocalDevelopmentOrigins
  );
  return allowedOrigins.has(origin)
    || (includeLocalDevelopmentOrigins && isAllowedDevelopmentLanOrigin(origin));
}
