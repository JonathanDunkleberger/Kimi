import { existsSync, readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import type { DemoStatRow } from '../demo/slate.js';

export type LiveStatRow = DemoStatRow & { source?: string };

export type LiveStatsFile = {
  updatedAt?: string;
  sources?: string[];
  players: LiveStatRow[];
};

const __dirname = dirname(fileURLToPath(import.meta.url));

/** Resolve live_stats.json next to the API package (src or dist). */
function candidatePaths(): string[] {
  return [
    join(__dirname, '../../ml/data/live_stats.json'),
    join(process.cwd(), 'packages/api/ml/data/live_stats.json'),
    join(process.cwd(), 'ml/data/live_stats.json'),
  ];
}

export function loadLiveStats(): LiveStatsFile | null {
  for (const p of candidatePaths()) {
    try {
      if (!existsSync(p)) continue;
      const raw = readFileSync(p, 'utf8');
      const data = JSON.parse(raw) as LiveStatsFile;
      if (Array.isArray(data?.players) && data.players.length > 0) {
        return data;
      }
    } catch {
      // try next path
    }
  }
  return null;
}
