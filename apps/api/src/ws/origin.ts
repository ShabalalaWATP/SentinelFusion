export function isAllowedOrigin(origin: string | undefined, allowedOrigins: string[]): boolean {
  if (!origin) {
    return false;
  }

  return allowedOrigins.includes(origin);
}
