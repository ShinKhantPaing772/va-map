import { getMapConfig } from "../lib/map-config.mjs";

export function onRequestGet({ env }) {
  return new Response(JSON.stringify(getMapConfig(env)), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
