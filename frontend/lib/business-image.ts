/** Authorization headers must only be sent to the configured API origin. */
export function privateBusinessImageUrl(
  src: string,
  apiBase: string | undefined,
): string | null {
  try {
    if (!apiBase) return null;
    const api = new URL(apiBase);
    const asset = new URL(src, api);
    if (
      asset.origin !== api.origin ||
      asset.username ||
      asset.password ||
      !/^\/api\/v1\/businesses\/[0-9a-f-]{36}\/image$/.test(asset.pathname)
    )
      return null;
    asset.pathname = asset.pathname.replace(
      "/api/v1/businesses/",
      "/api/v1/platform/businesses/",
    );
    asset.search = "";
    asset.hash = "";
    return asset.toString();
  } catch {
    return null;
  }
}
