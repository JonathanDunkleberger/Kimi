import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import dayjs from "dayjs";
import { useBetSlip } from "../store/betSlipStore";

type Match = { id: string; team_a: string; team_b: string; start_time?: string | null };

export default function MatchCard({ match }: { match: Match }) {
  const { selections, add, remove } = useBetSlip();
  const [lines, setLines] = React.useState<Array<{ id: string; player: string; prop: string; line: number; status: string }>>([]);

  React.useEffect(() => {
    async function load() {
      const u = new URL("/api/match-props", window.location.origin);
      u.searchParams.set("match_id", match.id);
      const r = await fetch(u);
      const j = await r.json();
      setLines(j.lines || []);
    }
    load();
  }, [match.id]);

  function select(lineId: string, choice: "over" | "under") {
    const existing = selections.find(s => s.prop_line_id === lineId);
    if (existing && existing.choice === choice) {
      // toggle off
      remove(lineId);
      return;
    }
    add({ prop_line_id: lineId, choice });
    window.dispatchEvent(new CustomEvent("open-slip"));
  }

  return (
    <Card className="mb-4">
      <CardHeader>
        <CardTitle>
          <div className="flex items-center justify-between">
            <span>{match.team_a} vs. {match.team_b}</span>
            {match.start_time && <span className="text-sm text-muted-foreground">{dayjs(match.start_time).format("MMM D, HH:mm")}</span>}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Player</TableHead>
              <TableHead>Prop</TableHead>
              <TableHead className="text-right">Line</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {lines.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="text-sm text-muted-foreground">No prop lines.</TableCell>
              </TableRow>
            )}
            {lines.map((p) => (
              <TableRow key={p.id}>
                <TableCell>{p.player}</TableCell>
                <TableCell>{p.prop}</TableCell>
                <TableCell className="text-right">{p.line}</TableCell>
                <TableCell className="text-right space-x-2">
                  {(() => {
                    const sel = selections.find(s => s.prop_line_id === p.id);
                    const overActive = sel?.choice === "over";
                    const underActive = sel?.choice === "under";
                    return (
                      <>
                        <Button
                          size="sm"
                          variant={overActive ? "default" : "outline"}
                          className={overActive ? "bg-green-600 hover:bg-green-600 text-white border-green-700" : ""}
                          onClick={() => select(p.id, "over")}
                        >
                          {overActive ? "Selected" : "More"}
                        </Button>
                        <Button
                          size="sm"
                          variant={underActive ? "secondary" : "outline"}
                          className={underActive ? "bg-red-600 hover:bg-red-600 text-white border-red-700" : ""}
                          onClick={() => select(p.id, "under")}
                        >
                          {underActive ? "Selected" : "Less"}
                        </Button>
                      </>
                    );
                  })()}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}