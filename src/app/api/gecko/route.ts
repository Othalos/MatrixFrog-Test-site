/**
 * src/app/api/gecko/route.ts
 * Proxy for GeckoTerminal API — server-side caching prevents 429 rate limits.
 */

import { NextRequest, NextResponse } from "next/server";

const GECKO_BASE = "https://api.geckoterminal.com";

// Next.js route segment cache — caches this route's responses for 60s at the CDN level
export const revalidate = 60;

// In-memory cache as secondary layer within the same serverless instance
const cache = new Map<string, { data: string; ts: number }>();
const CACHE_TTL = 60_000;

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const path = searchParams.get("path");

  if (!path || !path.startsWith("/api/v2/")) {
    return NextResponse.json({ error: "Invalid path" }, { status: 400 });
  }

  const cached = cache.get(path);
  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    return new NextResponse(cached.data, {
      status: 200,
      headers: { "Content-Type": "application/json", "Cache-Control": "public, max-age=60" },
    });
  }

  try {
    const upstream = await fetch(`${GECKO_BASE}${path}`, {
      headers: { "Accept": "application/json", "User-Agent": "matrixfrog.one/1.0" },
      next: { revalidate: 60 }, // Next.js fetch cache
    });

    const data = await upstream.text();
    if (upstream.ok) cache.set(path, { data, ts: Date.now() });

    return new NextResponse(data, {
      status: upstream.ok ? 200 : upstream.status,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": upstream.ok ? "public, max-age=60" : "no-store",
      },
    });
  } catch (err) {
    return NextResponse.json({ error: "Gecko proxy error", message: String(err) }, { status: 502 });
  }
}
