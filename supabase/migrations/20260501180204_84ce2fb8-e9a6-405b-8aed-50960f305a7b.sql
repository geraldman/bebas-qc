
CREATE TABLE public.detections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  image_url TEXT,
  defect_type TEXT NOT NULL,
  severity TEXT NOT NULL,
  confidence NUMERIC NOT NULL DEFAULT 0,
  description TEXT,
  root_cause TEXT,
  recommendations TEXT,
  sensor_snapshot JSONB,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.sensor_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  source TEXT NOT NULL DEFAULT 'mock',
  temp_dht NUMERIC,
  humidity NUMERIC,
  temp_ds NUMERIC,
  distance NUMERIC,
  vibration NUMERIC,
  raw JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_detections_created_at ON public.detections(created_at DESC);
CREATE INDEX idx_sensor_logs_created_at ON public.sensor_logs(created_at DESC);

ALTER TABLE public.detections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sensor_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read detections" ON public.detections FOR SELECT USING (true);
CREATE POLICY "Public insert detections" ON public.detections FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update detections" ON public.detections FOR UPDATE USING (true);

CREATE POLICY "Public read sensor_logs" ON public.sensor_logs FOR SELECT USING (true);
CREATE POLICY "Public insert sensor_logs" ON public.sensor_logs FOR INSERT WITH CHECK (true);
