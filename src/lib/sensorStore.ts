import { create } from "zustand";

export type SensorReading = {
  temp_dht: number;
  humidity: number;
  temp_ds: number;
  distance: number;
  vibration: number;
  timestamp: number;
};

type Source = "mock" | "mqtt";

type SensorStore = {
  source: Source;
  connected: boolean;
  readings: SensorReading[];
  latest: SensorReading | null;
  setSource: (s: Source) => void;
  setConnected: (b: boolean) => void;
  pushReading: (r: SensorReading) => void;
  reset: () => void;
};

export const useSensorStore = create<SensorStore>((set) => ({
  source: "mock",
  connected: false,
  readings: [],
  latest: null,
  setSource: (s) => set({ source: s, readings: [], latest: null, connected: false }),
  setConnected: (b) => set({ connected: b }),
  pushReading: (r) =>
    set((state) => {
      const next = [...state.readings, r].slice(-30);
      return { readings: next, latest: r };
    }),
  reset: () => set({ readings: [], latest: null }),
}));

// Threshold-based anomaly detection
export type Anomaly = { sensor: string; value: number; threshold: string; severity: "warn" | "critical" };

export function detectAnomalies(r: SensorReading | null): Anomaly[] {
  if (!r) return [];
  const out: Anomaly[] = [];
  if (r.temp_ds > 70)
    out.push({ sensor: "Machine Temp", value: r.temp_ds, threshold: ">70°C", severity: "critical" });
  else if (r.temp_ds > 55)
    out.push({ sensor: "Machine Temp", value: r.temp_ds, threshold: ">55°C", severity: "warn" });
  if (Math.abs(r.vibration) > 8)
    out.push({ sensor: "Vibration", value: r.vibration, threshold: ">8 m/s²", severity: "critical" });
  else if (Math.abs(r.vibration) > 5)
    out.push({ sensor: "Vibration", value: r.vibration, threshold: ">5 m/s²", severity: "warn" });
  if (r.humidity > 80)
    out.push({ sensor: "Humidity", value: r.humidity, threshold: ">80%", severity: "warn" });
  if (r.distance < 5 || r.distance > 100)
    out.push({ sensor: "Distance", value: r.distance, threshold: "outside 5-100cm", severity: "warn" });
  return out;
}