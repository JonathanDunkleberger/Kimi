import type { NextApiRequest, NextApiResponse } from "next";
import { handleDemoApi } from "@/lib/demo/boardApi";

const UPSTREAM =
  process.env.API_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  process.env.NEXT_PUBLIC_API_BASE ||
  "";

/**
 * Prefer the hosted Express API when awake; otherwise serve the Inklings
 * demo slate from Vercel so friends always see a live board.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const parts = req.query.path;
  const path = Array.isArray(parts) ? parts.join("/") : parts || "";
  const qsIndex = req.url?.indexOf("?") ?? -1;
  const qs = qsIndex >= 0 ? req.url!.slice(qsIndex) : "";

  if (UPSTREAM) {
    const target = `${UPSTREAM.replace(/\/$/, "")}/${path}${qs}`;
    try {
      const headers: Record<string, string> = { Accept: "application/json" };
      if (req.headers.authorization) {
        headers.Authorization = String(req.headers.authorization);
      }
      const init: RequestInit = { method: req.method || "GET", headers };
      if (req.method && !["GET", "HEAD"].includes(req.method)) {
        headers["Content-Type"] = "application/json";
        init.body = JSON.stringify(req.body ?? {});
        init.headers = headers;
      }

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 3500);
      const upstream = await fetch(target, { ...init, signal: controller.signal });
      clearTimeout(timer);

      if (upstream.ok || (upstream.status >= 400 && upstream.status < 500)) {
        const text = await upstream.text();
        res.status(upstream.status);
        const ct = upstream.headers.get("content-type");
        if (ct) res.setHeader("Content-Type", ct);
        res.setHeader("X-Esports-Props-Source", "upstream");
        res.send(text);
        return;
      }
    } catch {
      // fall through to demo
    }
  }

  const result = handleDemoApi(
    req.method || "GET",
    path,
    req.query as Record<string, string | string[] | undefined>,
    req.body,
    req.headers.authorization
  );
  res.setHeader("X-Esports-Props-Source", "demo");
  res.status(result.status).json(result.json);
}
