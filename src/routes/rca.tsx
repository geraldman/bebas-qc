import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Brain, Loader2, AlertTriangle, ChevronRight, ListChecks } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { z } from "zod";

const searchSchema = z.object({ id: z.string().optional() });

export const Route = createFileRoute("/rca")({
  validateSearch: searchSchema,
  component: RCAPage,
});

type RCA = {
  primary_cause: string;
  contributing_factors: string[];
  category: string;
  five_whys: string[];
  recommendations: string[];
  urgency: string;
};

type Detection = {
  id: string;
  defect_type: string;
  severity: string;
  confidence: number;
  description: string | null;
  sensor_snapshot: Record<string, number> | null;
  root_cause: string | null;
  recommendations: string | null;
};

function RCAPage() {
  const { id } = Route.useSearch();
  const [detection, setDetection] = useState<Detection | null>(null);
  const [rca, setRca] = useState<RCA | null>(null);
  const [loading, setLoading] = useState(false);
  const [list, setList] = useState<Detection[]>([]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("detections")
        .select("*")
        .neq("defect_type", "none")
        .order("created_at", { ascending: false })
        .limit(20);
      setList((data as Detection[]) || []);
      if (id) {
        const found = (data as Detection[])?.find((d) => d.id === id);
        if (found) setDetection(found);
      }
    })();
  }, [id]);

  const generate = async () => {
    if (!detection) return;
    setLoading(true);
    setRca(null);
    try {
      const { data, error } = await supabase.functions.invoke("root-cause", {
        body: {
          defect: {
            defect_type: detection.defect_type,
            severity: detection.severity,
            confidence: detection.confidence,
            description: detection.description,
            affected_area: "",
          },
          sensorSnapshot: detection.sensor_snapshot || {},
          productType: "manufacturing packaging",
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setRca(data as RCA);

      await supabase
        .from("detections")
        .update({
          root_cause: data.primary_cause,
          recommendations: data.recommendations.join("\n"),
          status: "analyzed",
        })
        .eq("id", detection.id);
      toast.success("RCA generated");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "RCA failed");
    } finally {
      setLoading(false);
    }
  };

  const urgencyColor =
    rca?.urgency === "immediate" || rca?.urgency === "high" ? "destructive" : "default";

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Brain className="w-6 h-6" /> Root Cause Analysis
        </h2>
        <p className="text-sm text-muted-foreground">
          AI fuses defect detection + IoT sensor data to find the root cause using the 5-Why method.
        </p>
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        {/* Left: detection picker */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-sm">Defects awaiting analysis</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {list.length === 0 && (
              <div className="text-sm text-muted-foreground py-6 text-center">
                No defects yet.{" "}
                <Link to="/detect" className="text-primary underline">
                  Run detection
                </Link>
              </div>
            )}
            {list.map((d) => (
              <button
                key={d.id}
                onClick={() => {
                  setDetection(d);
                  setRca(null);
                }}
                className={`w-full text-left p-3 rounded-md border transition-colors ${
                  detection?.id === d.id
                    ? "border-primary bg-primary/5"
                    : "border-border hover:bg-accent"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="font-medium text-sm">{d.defect_type}</div>
                  <Badge variant="outline" className="text-[10px]">
                    {d.severity}
                  </Badge>
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {(d.confidence * 100).toFixed(0)}% conf
                </div>
              </button>
            ))}
          </CardContent>
        </Card>

        {/* Right: RCA */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-sm">
              {detection ? `Analyzing: ${detection.defect_type}` : "Select a defect"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!detection && (
              <div className="text-center text-muted-foreground py-12 text-sm">
                ← Pick a defect from the list to analyze
              </div>
            )}
            {detection && !rca && !loading && (
              <div className="space-y-4">
                <div className="bg-muted/40 p-3 rounded-md text-sm">
                  <div className="font-medium mb-1">Sensor snapshot at detection</div>
                  {detection.sensor_snapshot ? (
                    <pre className="text-xs overflow-x-auto">
                      {JSON.stringify(detection.sensor_snapshot, null, 2)}
                    </pre>
                  ) : (
                    <span className="text-muted-foreground">No sensor data captured</span>
                  )}
                </div>
                <Button onClick={generate} className="w-full">
                  <Brain className="w-4 h-4" /> Generate AI Root Cause Analysis
                </Button>
              </div>
            )}
            {loading && (
              <div className="text-center py-12">
                <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
                <p className="text-sm text-muted-foreground mt-2">
                  AI fusing visual + sensor data using 5-Why analysis...
                </p>
              </div>
            )}
            {rca && (
              <div className="space-y-5">
                <div className="flex items-center gap-2">
                  <Badge variant={urgencyColor}>Urgency: {rca.urgency}</Badge>
                  <Badge variant="outline">{rca.category}</Badge>
                </div>

                <Section icon={AlertTriangle} title="Primary Root Cause">
                  <p className="text-sm">{rca.primary_cause}</p>
                </Section>

                <Section icon={ChevronRight} title="Contributing Factors (sensor evidence)">
                  <ul className="text-sm space-y-1 list-disc pl-5">
                    {rca.contributing_factors.map((f, i) => (
                      <li key={i}>{f}</li>
                    ))}
                  </ul>
                </Section>

                <Section icon={Brain} title="5-Why Chain">
                  <ol className="text-sm space-y-2">
                    {rca.five_whys.map((w, i) => (
                      <li key={i} className="flex gap-2">
                        <span className="font-bold text-primary">{i + 1}.</span>
                        <span>{w}</span>
                      </li>
                    ))}
                  </ol>
                </Section>

                <Section icon={ListChecks} title="Recommended Actions">
                  <ul className="text-sm space-y-1">
                    {rca.recommendations.map((r, i) => (
                      <li key={i} className="flex gap-2">
                        <span className="text-green-600">✓</span>
                        <span>{r}</span>
                      </li>
                    ))}
                  </ul>
                </Section>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Section({
  icon: Icon,
  title,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center gap-2 text-sm font-semibold mb-2">
        <Icon className="w-4 h-4 text-primary" />
        {title}
      </div>
      <div className="pl-6">{children}</div>
    </div>
  );
}