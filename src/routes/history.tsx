import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { History as HistoryIcon } from "lucide-react";

export const Route = createFileRoute("/history")({
  component: HistoryPage,
});

type Row = {
  id: string;
  defect_type: string;
  severity: string;
  confidence: number;
  description: string | null;
  root_cause: string | null;
  status: string;
  created_at: string;
};

function HistoryPage() {
  const [rows, setRows] = useState<Row[]>([]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("detections")
        .select("id, defect_type, severity, confidence, description, root_cause, status, created_at")
        .order("created_at", { ascending: false })
        .limit(50);
      setRows((data as Row[]) || []);
    })();

    const channel = supabase
      .channel("detections-history")
      .on("postgres_changes", { event: "*", schema: "public", table: "detections" }, () => {
        supabase
          .from("detections")
          .select("id, defect_type, severity, confidence, description, root_cause, status, created_at")
          .order("created_at", { ascending: false })
          .limit(50)
          .then(({ data }) => setRows((data as Row[]) || []));
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const sevVariant = (s: string) =>
    s === "critical" || s === "high" ? "destructive" : s === "medium" ? "default" : "secondary";

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <HistoryIcon className="w-6 h-6" /> Detection History
        </h2>
        <p className="text-sm text-muted-foreground">All AI inspections, sorted newest first.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">{rows.length} record(s)</CardTitle>
        </CardHeader>
        <CardContent>
          {rows.length === 0 ? (
            <div className="text-sm text-muted-foreground text-center py-12">
              No detections yet.
            </div>
          ) : (
            <div className="space-y-2">
              {rows.map((r) => (
                <div
                  key={r.id}
                  className="border border-border rounded-md p-3 hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-start justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{r.defect_type}</span>
                      <Badge variant={sevVariant(r.severity)}>{r.severity}</Badge>
                      <Badge variant="outline">{r.status}</Badge>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {new Date(r.created_at).toLocaleString()}
                    </span>
                  </div>
                  {r.description && (
                    <p className="text-sm text-muted-foreground mt-1">{r.description}</p>
                  )}
                  {r.root_cause && (
                    <div className="mt-2 text-sm bg-muted/40 p-2 rounded">
                      <span className="font-medium">Root cause: </span>
                      {r.root_cause}
                    </div>
                  )}
                  <div className="text-xs text-muted-foreground mt-1">
                    Confidence: {(r.confidence * 100).toFixed(0)}%
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}