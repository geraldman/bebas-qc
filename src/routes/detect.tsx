import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Upload, Loader2, AlertCircle, CheckCircle2, Brain, Video, VideoOff, Zap, ZapOff } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useSensorStore } from "@/lib/sensorStore";
import { useSensorConnection } from "@/hooks/useSensorConnection";

export const Route = createFileRoute("/detect")({
  component: DetectPage,
});

type DefectResult = {
  defect_type: string;
  severity: string;
  confidence: number;
  description: string;
  affected_area: string;
};

function DetectPage() {
  useSensorConnection();
  const { latest, source, connected } = useSensorStore();
  const navigate = useNavigate();
  const [imageData, setImageData] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<DefectResult | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Live webcam state
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [camOn, setCamOn] = useState(false);
  const [autoDetect, setAutoDetect] = useState(false);
  const [intervalSec, setIntervalSec] = useState(5);
  const autoTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const inflightRef = useRef(false);

  // Auto-detect only allowed when ESP32 live MQTT is connected
  const canAutoDetect = source === "mqtt" && connected;

  const startCam = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCamOn(true);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Camera access denied";
      toast.error(msg);
    }
  };

  const stopCam = () => {
    if (autoTimerRef.current) {
      clearInterval(autoTimerRef.current);
      autoTimerRef.current = null;
    }
    setAutoDetect(false);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setCamOn(false);
  };

  const snapshotFromVideo = (): string | null => {
    const v = videoRef.current;
    if (!v || !v.videoWidth) return null;
    const canvas = document.createElement("canvas");
    canvas.width = v.videoWidth;
    canvas.height = v.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(v, 0, 0);
    return canvas.toDataURL("image/jpeg", 0.85);
  };

  const captureFrame = () => {
    const data = snapshotFromVideo();
    if (!data) {
      toast.error("Camera not ready");
      return;
    }
    setImageData(data);
    setResult(null);
    setSavedId(null);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      if (autoTimerRef.current) clearInterval(autoTimerRef.current);
    };
  }, []);

  // Auto-detect loop — only when ESP32 connected
  useEffect(() => {
    if (autoTimerRef.current) {
      clearInterval(autoTimerRef.current);
      autoTimerRef.current = null;
    }
    if (!autoDetect || !camOn || !canAutoDetect) return;

    autoTimerRef.current = setInterval(async () => {
      if (inflightRef.current) return;
      const data = snapshotFromVideo();
      if (!data) return;
      inflightRef.current = true;
      try {
        const { data: ai, error } = await supabase.functions.invoke("detect-defect", {
          body: { imageBase64: data, productType: "manufacturing packaging/bottles" },
        });
        if (error || ai?.error) throw new Error(error?.message || ai?.error);
        setImageData(data);
        setResult(ai as DefectResult);
        const { data: inserted } = await supabase
          .from("detections")
          .insert([{
            defect_type: ai.defect_type,
            severity: ai.severity,
            confidence: ai.confidence,
            description: ai.description,
            sensor_snapshot: (latest ? JSON.parse(JSON.stringify(latest)) : null) as never,
            status: ai.defect_type === "none" ? "ok" : "needs_rca",
          }])
          .select()
          .single();
        if (inserted) setSavedId(inserted.id);
        if (ai.defect_type !== "none") {
          toast.error(`🚨 Auto-detect: ${ai.defect_type} (${ai.severity})`);
        }
      } catch (e) {
        console.warn("Auto-detect failed", e);
      } finally {
        inflightRef.current = false;
      }
    }, intervalSec * 1000);

    return () => {
      if (autoTimerRef.current) clearInterval(autoTimerRef.current);
    };
  }, [autoDetect, camOn, canAutoDetect, intervalSec, latest]);

  // If ESP32 disconnects, force-stop auto-detect
  useEffect(() => {
    if (!canAutoDetect && autoDetect) {
      setAutoDetect(false);
      toast.warning("Auto-detect stopped — ESP32 not connected");
    }
  }, [canAutoDetect, autoDetect]);

  const handleFile = (file: File) => {
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image too large (max 5MB)");
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      setImageData(e.target?.result as string);
      setResult(null);
      setSavedId(null);
    };
    reader.readAsDataURL(file);
  };

  const analyze = async () => {
    if (!imageData) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("detect-defect", {
        body: { imageBase64: imageData, productType: "manufacturing packaging/bottles" },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setResult(data as DefectResult);

      // Save to DB
      const { data: inserted, error: insErr } = await supabase
        .from("detections")
        .insert([{
          defect_type: data.defect_type,
          severity: data.severity,
          confidence: data.confidence,
          description: data.description,
          sensor_snapshot: (latest ? JSON.parse(JSON.stringify(latest)) : null) as never,
          status: data.defect_type === "none" ? "ok" : "needs_rca",
        }])
        .select()
        .single();
      if (insErr) throw insErr;
      setSavedId(inserted.id);
      toast.success("Analysis complete");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Analysis failed";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const goRCA = () => {
    if (savedId) navigate({ to: "/rca", search: { id: savedId } });
  };

  const sevColor =
    result?.severity === "critical" || result?.severity === "high"
      ? "destructive"
      : result?.severity === "medium"
        ? "default"
        : "secondary";

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Defect Detection</h2>
        <p className="text-sm text-muted-foreground">
          Upload, snap a photo, or stream live webcam — AI vision auto-inspects when ESP32 is live.
        </p>
      </div>

      {/* Live Webcam */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Video className="w-4 h-4" /> Live Webcam Stream
          </CardTitle>
          <div className="flex items-center gap-3">
            <Badge variant={canAutoDetect ? "default" : "secondary"} className="text-[10px]">
              ESP32 {canAutoDetect ? "LIVE" : "offline"}
            </Badge>
            {camOn ? (
              <Button variant="outline" size="sm" onClick={stopCam}>
                <VideoOff className="w-4 h-4" /> Stop
              </Button>
            ) : (
              <Button size="sm" onClick={startCam}>
                <Video className="w-4 h-4" /> Start Camera
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="relative aspect-video bg-black rounded-md overflow-hidden">
            <video ref={videoRef} className="w-full h-full object-contain" muted playsInline />
            {!camOn && (
              <div className="absolute inset-0 flex items-center justify-center text-muted-foreground text-sm">
                Camera off
              </div>
            )}
            {autoDetect && camOn && (
              <div className="absolute top-2 left-2 flex items-center gap-1 bg-destructive/90 text-destructive-foreground px-2 py-1 rounded text-xs font-semibold">
                <span className="w-2 h-2 rounded-full bg-white animate-pulse" /> AUTO-DETECT
              </div>
            )}
          </div>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-2">
              <Switch
                id="auto"
                checked={autoDetect}
                onCheckedChange={setAutoDetect}
                disabled={!camOn || !canAutoDetect}
              />
              <Label htmlFor="auto" className="text-sm cursor-pointer flex items-center gap-1">
                {autoDetect ? <Zap className="w-3.5 h-3.5 text-yellow-500" /> : <ZapOff className="w-3.5 h-3.5" />}
                Auto-detect every
              </Label>
              <select
                value={intervalSec}
                onChange={(e) => setIntervalSec(Number(e.target.value))}
                disabled={autoDetect}
                className="bg-background border border-border rounded px-2 py-1 text-sm"
              >
                <option value={3}>3s</option>
                <option value={5}>5s</option>
                <option value={10}>10s</option>
                <option value={20}>20s</option>
              </select>
            </div>
            <Button onClick={captureFrame} disabled={!camOn} variant="outline" size="sm">
              📸 Snap Frame Manually
            </Button>
          </div>
          {!canAutoDetect && (
            <p className="text-xs text-muted-foreground">
              💡 Auto-detect activates when ESP32 is connected via Live MQTT (toggle on dashboard). This syncs vision + sensor fusion in real time.
            </p>
          )}
        </CardContent>
      </Card>

      <div className="grid lg:grid-cols-2 gap-4">
        {/* Upload */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">1. Capture / Upload</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
            />
            <div
              className="border-2 border-dashed border-border rounded-lg aspect-video flex items-center justify-center bg-muted/30 cursor-pointer hover:bg-muted/50 transition-colors overflow-hidden"
              onClick={() => fileRef.current?.click()}
            >
              {imageData ? (
                <img src={imageData} alt="Product" className="max-h-full max-w-full object-contain" />
              ) : (
                <div className="text-center text-muted-foreground p-4">
                  <Upload className="w-10 h-10 mx-auto mb-2" />
                  <p className="text-sm">Click to upload or take a photo</p>
                  <p className="text-xs">JPG/PNG, max 5MB</p>
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => fileRef.current?.click()} className="flex-1">
                <Upload className="w-4 h-4" /> Choose Image
              </Button>
              <Button onClick={analyze} disabled={!imageData || loading} className="flex-1">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Brain className="w-4 h-4" />}
                {loading ? "Analyzing..." : "Analyze"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Result */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">2. AI Detection Result</CardTitle>
          </CardHeader>
          <CardContent>
            {!result && !loading && (
              <div className="text-center text-muted-foreground py-12 text-sm">
                Upload an image and click Analyze
              </div>
            )}
            {loading && (
              <div className="text-center py-12">
                <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
                <p className="text-sm text-muted-foreground mt-2">Vision AI inspecting product...</p>
              </div>
            )}
            {result && (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  {result.defect_type === "none" ? (
                    <CheckCircle2 className="w-6 h-6 text-green-600" />
                  ) : (
                    <AlertCircle className="w-6 h-6 text-destructive" />
                  )}
                  <div className="text-xl font-bold">{result.defect_type}</div>
                  <Badge variant={sevColor}>{result.severity}</Badge>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <Stat label="Confidence" value={`${(result.confidence * 100).toFixed(0)}%`} />
                  <Stat label="Affected area" value={result.affected_area} />
                </div>
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Description</div>
                  <p className="text-sm">{result.description}</p>
                </div>
                {result.defect_type !== "none" && savedId && (
                  <Button onClick={goRCA} className="w-full">
                    <Brain className="w-4 h-4" /> Generate Root Cause Analysis →
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-muted/40 rounded-md p-2">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="font-semibold">{value}</div>
    </div>
  );
}