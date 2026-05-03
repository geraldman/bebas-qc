import { useEffect, useRef } from "react";
import type { Anomaly } from "@/lib/sensorStore";

/**
 * Plays a beep sound when a new anomaly is detected.
 * Uses Web Audio API — no asset files needed.
 * - "warn"     -> single short beep (800Hz)
 * - "critical" -> triple urgent beep (1200Hz)
 */
export function useAnomalyAlert(anomalies: Anomaly[], muted: boolean) {
  const lastSigRef = useRef<string>("");
  const ctxRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    if (muted) return;
    // Build a signature so we only beep when the anomaly set actually changes
    const sig = anomalies.map((a) => `${a.sensor}:${a.severity}`).sort().join("|");
    if (sig === lastSigRef.current) return;
    lastSigRef.current = sig;
    if (anomalies.length === 0) return;

    const isCritical = anomalies.some((a) => a.severity === "critical");

    try {
      if (!ctxRef.current) {
        const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        ctxRef.current = new Ctor();
      }
      const ctx = ctxRef.current;
      if (ctx.state === "suspended") ctx.resume();

      const beep = (freq: number, start: number, dur: number) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "square";
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.0001, ctx.currentTime + start);
        gain.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + start + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + start + dur);
        osc.connect(gain).connect(ctx.destination);
        osc.start(ctx.currentTime + start);
        osc.stop(ctx.currentTime + start + dur + 0.02);
      };

      if (isCritical) {
        beep(1200, 0, 0.18);
        beep(1200, 0.22, 0.18);
        beep(1400, 0.44, 0.25);
      } else {
        beep(800, 0, 0.2);
      }
    } catch (e) {
      console.warn("Audio alert failed", e);
    }
  }, [anomalies, muted]);
}