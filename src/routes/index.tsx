import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useSensorConnection } from "@/hooks/useSensorConnection";
import { detectAnomalies, useSensorStore } from "@/lib/sensorStore";
import { useAnomalyAlert } from "@/hooks/useAnomalyAlert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Thermometer, Droplets, Flame, Ruler, Activity, AlertTriangle, CheckCircle2, Wifi, WifiOff, Camera, Volume2, VolumeX } from "lucide-react";
import { LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts";
import { toast } from "sonner";

export const Route = createFileRoute("/")({
  component: Dashboard,
});

function Dashboard() {
  useSensorConnection();
  const { source, setSource, connected, latest, readings } = useSensorStore();
  const anomalies = detectAnomalies(latest);
  const status = anomalies.some((a) => a.severity === "critical")
    ? "critical"
    : anomalies.length > 0
      ? "warning"
      : "ok";

  const [muted, setMuted] = useState(false);
  useAnomalyAlert(anomalies, muted);

  // Toast notification on new anomaly signature
  const lastToastSig = useRef<string>("");
  useEffect(() => {
    const sig = anomalies.map((a) => `${a.sensor}:${a.severity}`).sort().join("|");
    if (sig && sig !== lastToastSig.current) {
      lastToastSig.current = sig;
      const critical = anomalies.find((a) => a.severity === "critical");
      if (critical) {
        toast.error(`🚨 CRITICAL: ${critical.sensor} = ${critical.value.toFixed(1)} (${critical.threshold})`);
      } else if (anomalies[0]) {
        toast.warning(`⚠️ ${anomalies[0].sensor} = ${anomalies[0].value.toFixed(1)} (${anomalies[0].threshold})`);
      }
    } else if (!sig) {
      lastToastSig.current = "";
    }
  }, [anomalies]);

  const chartData = readings.map((r) => ({
    t: new Date(r.timestamp).toLocaleTimeString("en-US", { minute: "2-digit", second: "2-digit" }),
    temp_ds: Number(r.temp_ds.toFixed(1)),
    vibration: Number(r.vibration.toFixed(2)),
    humidity: Number(r.humidity.toFixed(1)),
  }));

  return (
    <div className="space-y-6">
      {/* Header strip */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold">Production Line Monitor</h2>
          <p className="text-sm text-muted-foreground">Real-time IoT + AI defect intelligence</p>
        </div>
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setMuted((m) => !m)}
            title={muted ? "Unmute alerts" : "Mute alerts"}
          >
            {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </Button>
          <div className="flex items-center gap-2 px-3 py-2 rounded-md border border-border bg-card">
            <Label htmlFor="source" className="text-sm cursor-pointer">
              {source === "mock" ? "Mock Data" : "Live MQTT"}
            </Label>
            <Switch
              id="source"
              checked={source === "mqtt"}
              onCheckedChange={(v) => setSource(v ? "mqtt" : "mock")}
            />
            {connected ? (
              <Wifi className="w-4 h-4 text-green-600" />
            ) : (
              <WifiOff className="w-4 h-4 text-muted-foreground" />
            )}
          </div>
          <Button asChild>
            <Link to="/detect">
              <Camera className="w-4 h-4" /> Inspect Product
            </Link>
          </Button>
        </div>
      </div>

      {/* Status banner */}
      <Card
        className={
          status === "critical"
            ? "border-destructive bg-destructive/5"
            : status === "warning"
              ? "border-yellow-500 bg-yellow-500/5"
              : "border-green-500 bg-green-500/5"
        }
      >
        <CardContent className="py-4 flex items-center gap-3">
          {status === "ok" ? (
            <CheckCircle2 className="w-6 h-6 text-green-600" />
          ) : (
            <AlertTriangle
              className={status === "critical" ? "w-6 h-6 text-destructive" : "w-6 h-6 text-yellow-600"}
            />
          )}
          <div className="flex-1">
            <div className="font-semibold">
              Machine Status:{" "}
              {status === "ok" ? "All Normal" : status === "warning" ? "Warning" : "Critical Anomaly"}
            </div>
            {anomalies.length > 0 && (
              <div className="text-sm text-muted-foreground">
                {anomalies.map((a) => `${a.sensor} ${a.threshold}`).join(" • ")}
              </div>
            )}
          </div>
          {anomalies.length > 0 && (
            <Button variant="outline" asChild>
              <Link to="/rca">Run RCA →</Link>
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Sensor cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <SensorCard icon={Thermometer} label="Air Temp" value={latest?.temp_dht} unit="°C" />
        <SensorCard icon={Droplets} label="Humidity" value={latest?.humidity} unit="%" />
        <SensorCard
          icon={Flame}
          label="Machine Temp"
          value={latest?.temp_ds}
          unit="°C"
          alert={latest && latest.temp_ds > 55}
        />
        <SensorCard icon={Ruler} label="Distance" value={latest?.distance} unit="cm" />
        <SensorCard
          icon={Activity}
          label="Vibration"
          value={latest?.vibration}
          unit="m/s²"
          alert={latest && Math.abs(latest.vibration) > 5}
        />
      </div>

      {/* Charts */}
      <div className="grid lg:grid-cols-2 gap-4">
        <ChartCard title="Machine Temperature (°C)" dataKey="temp_ds" color="#ef4444" data={chartData} />
        <ChartCard title="Vibration (m/s²)" dataKey="vibration" color="#f59e0b" data={chartData} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">MQTT Configuration</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-1">
          <div>Broker: <code className="text-foreground">broker.hivemq.com</code> (WSS port 8884)</div>
          <div>Topic: <code className="text-foreground">iot/smartvision</code></div>
          <div>ESP32 publishes: temp_dht, humidity, temp_ds, distance, vibration</div>
        </CardContent>
      </Card>
    </div>
  );
}

function SensorCard({
  icon: Icon,
  label,
  value,
  unit,
  alert,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value?: number;
  unit: string;
  alert?: boolean | null;
}) {
  return (
    <Card className={alert ? "border-destructive" : ""}>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
          <Icon className="w-3.5 h-3.5" />
          {label}
        </div>
        <div className="text-2xl font-bold">
          {value !== undefined && value !== null ? value.toFixed(1) : "—"}
          <span className="text-sm text-muted-foreground ml-1">{unit}</span>
        </div>
        {alert && <Badge variant="destructive" className="mt-1 text-[10px]">High</Badge>}
      </CardContent>
    </Card>
  );
}

function ChartCard({
  title,
  dataKey,
  color,
  data,
}: {
  title: string;
  dataKey: string;
  color: string;
  data: Array<Record<string, string | number>>;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">{title}</CardTitle>
      </CardHeader>
      <CardContent className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <XAxis dataKey="t" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10 }} />
            <Tooltip />
            <Line type="monotone" dataKey={dataKey} stroke={color} strokeWidth={2} dot={false} isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}