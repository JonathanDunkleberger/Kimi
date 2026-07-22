import type { NextApiRequest, NextApiResponse } from "next";

const UPSTREAM =
  process.env.API_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  process.env.NEXT_PUBLIC_API_BASE ||
  "http://localhost:4000";

/**
 * Same-origin proxy so the club UI can wake a sleeping Render API
 * without browser CORS pain, and keep a single public API surface.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const parts = req.query.path;
  const path = Array.isArray(parts) ? parts.join("/") : parts || "";
  const qsIndex = req.url?.indexOf("?") ?? -1;
  const qs = qsIndex >= 0 ? req.url!.slice(qsIndex) : "";
  const target = `${UPSTREAM.replace(/\/$/, "")}/${path}${qs}`;

  try {
    const headers: Record<string, string> = {
      Accept: "application/json",
    };
    if (req.headers.authorization) {
      headers.Authorization = String(req.headers.authorization);
    }
    if (req.headers["content-type"]) {
      headers["Content-Type"] = String(req.headers["content-type"]);
    }

    const init: RequestInit = {
      method: req.method || "GET",
      headers,
    };
    if (req.method && !["GET", "HEAD"].includes(req.method)) {
      init.body = JSON.stringify(req.body ?? {});
      headers["Content-Type"] = headers["Content-Type"] || "application/json";
    }

    const upstream = await fetch(target, init);
    const text = await upstream.text();
    res.status(upstream.status);
    const ct = upstream.headers.get("content-type");
    if (ct) res.setHeader("Content-Type", ct);
    res.send(text);
  } catch (e: any) {
    res.status(502).json({
      error: "Club ledger unreachable",
      detail: e?.message || "upstream failed",
      target,
    });
  }
}
