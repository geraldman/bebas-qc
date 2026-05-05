export type SensorReading = {
  machine_id?: string;
  temp_dht: number;
  humidity: number;
  temp_ds: number;
  belt_speed: number;
  vibration: number;
  timestamp: number;
};

export type Anomaly = {
  sensor: string;
  value: number;
  threshold: string;
  severity: "warn" | "critical";
};

export const THRESHOLDS = {
  machineTemp: { warn: 55, critical: 70 },
  vibration: { warn: 5, critical: 8 },
  humidity: { warn: 80 },
  beltSpeed: { min: 70 },
};

export function detectAnomalies(r: SensorReading | null): Anomaly[] {
  if (!r) return [];
  const out: Anomaly[] = [];

  if (r.temp_ds > THRESHOLDS.machineTemp.critical) {
    out.push({
      sensor: "Machine Temp",
      value: r.temp_ds,
      threshold: `>${THRESHOLDS.machineTemp.critical} deg C`,
      severity: "critical",
    });
  } else if (r.temp_ds > THRESHOLDS.machineTemp.warn) {
    out.push({
      sensor: "Machine Temp",
      value: r.temp_ds,
      threshold: `>${THRESHOLDS.machineTemp.warn} deg C`,
      severity: "warn",
    });
  }

  if (Math.abs(r.vibration) > THRESHOLDS.vibration.critical) {
    out.push({
      sensor: "Vibration",
      value: r.vibration,
      threshold: `>${THRESHOLDS.vibration.critical} m/s^2`,
      severity: "critical",
    });
  } else if (Math.abs(r.vibration) > THRESHOLDS.vibration.warn) {
    out.push({
      sensor: "Vibration",
      value: r.vibration,
      threshold: `>${THRESHOLDS.vibration.warn} m/s^2`,
      severity: "warn",
    });
  }

  if (r.humidity > THRESHOLDS.humidity.warn) {
    out.push({
      sensor: "Humidity",
      value: r.humidity,
      threshold: `>${THRESHOLDS.humidity.warn}%`,
      severity: "warn",
    });
  }

  if (r.belt_speed < THRESHOLDS.beltSpeed.min) {
    out.push({
      sensor: "Belt Speed",
      value: r.belt_speed,
      threshold: `<${THRESHOLDS.beltSpeed.min} items/min`,
      severity: "warn",
    });
  }

  return out;
}

export function isMachineTempAlert(r: SensorReading | null): boolean {
  return Boolean(r && r.temp_ds > THRESHOLDS.machineTemp.warn);
}

export function isVibrationAlert(r: SensorReading | null): boolean {
  return Boolean(r && Math.abs(r.vibration) > THRESHOLDS.vibration.warn);
}

export function isBeltSpeedAlert(r: SensorReading | null): boolean {
  return Boolean(r && r.belt_speed < THRESHOLDS.beltSpeed.min);
}
