export function getMapConfig(env) {
  // Only this browser-visible basemap key is public; never expose the flight API key.
  return { cartoBasemapApiKey: String(env.CARTO_BASEMAP_API_KEY || "").trim() };
}
