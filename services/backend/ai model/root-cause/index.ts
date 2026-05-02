package ai

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"
)

// =================== OpenAI (vision + chat) ===================

type OpenAI struct {
	Key   string
	Model string
}

func (o *OpenAI) Name() string { return "openai:" + o.Model }

type oaiMsg struct {
	Role    string `json:"role"`
	Content any    `json:"content"`
}

type oaiResp struct {
	Choices []struct {
		Message struct {
			Content string `json:"content"`
		} `json:"message"`
	} `json:"choices"`
}

func (o *OpenAI) DetectDefect(ctx context.Context, imageBase64, productType string) (*DefectResult, error) {
	body := map[string]any{
		"model": o.Model,
		"messages": []oaiMsg{
			{Role: "system", Content: VisionSystemPrompt},
			{Role: "user", Content: []map[string]any{
				{"type": "text", "text": fmt.Sprintf("Inspect this %s product. Return JSON only.", productType)},
				{"type": "image_url", "image_url": map[string]string{"url": imageBase64}},
			}},
		},
		"response_format": map[string]string{"type": "json_object"},
		"temperature":     0.2,
	}
	var r oaiResp
	if err := postJSON(ctx, "https://api.openai.com/v1/chat/completions", o.Key, body, &r); err != nil {
		return nil, err
	}
	if len(r.Choices) == 0 {
		return nil, fmt.Errorf("no choices")
	}
	var out DefectResult
	if err := json.Unmarshal([]byte(stripFences(r.Choices[0].Message.Content)), &out); err != nil {
		return nil, fmt.Errorf("parse: %w (raw=%s)", err, r.Choices[0].Message.Content)
	}
	return &out, nil
}

func (o *OpenAI) AnalyzeRootCause(ctx context.Context, d *DefectResult, snap map[string]any, productType string) (*RCAResult, error) {
	user := fmt.Sprintf("Defect:\n%s\n\nSensor snapshot:\n%s\n\nProduct: %s",
		mustJSON(d), mustJSON(snap), productType)
	body := map[string]any{
		"model": o.Model,
		"messages": []oaiMsg{
			{Role: "system", Content: RCASystemPrompt},
			{Role: "user", Content: user},
		},
		"response_format": map[string]string{"type": "json_object"},
		"temperature":     0.3,
	}
	var r oaiResp
	if err := postJSON(ctx, "https://api.openai.com/v1/chat/completions", o.Key, body, &r); err != nil {
		return nil, err
	}
	if len(r.Choices) == 0 {
		return nil, fmt.Errorf("no choices")
	}
	var out RCAResult
	if err := json.Unmarshal([]byte(stripFences(r.Choices[0].Message.Content)), &out); err != nil {
		return nil, fmt.Errorf("parse: %w", err)
	}
	return &out, nil
}

// =================== DeepSeek (RCA / text only) ===================

type DeepSeek struct {
	Key   string
	Model string
}

func (d *DeepSeek) Name() string { return "deepseek:" + d.Model }

func (d *DeepSeek) AnalyzeRootCause(ctx context.Context, defect *DefectResult, snap map[string]any, productType string) (*RCAResult, error) {
	user := fmt.Sprintf("Defect:\n%s\n\nSensor snapshot:\n%s\n\nProduct: %s",
		mustJSON(defect), mustJSON(snap), productType)
	body := map[string]any{
		"model": d.Model,
		"messages": []map[string]string{
			{"role": "system", "content": RCASystemPrompt},
			{"role": "user", "content": user},
		},
		"response_format": map[string]string{"type": "json_object"},
		"temperature":     0.3,
	}
	var r oaiResp
	if err := postJSON(ctx, "https://api.deepseek.com/chat/completions", d.Key, body, &r); err != nil {
		return nil, err
	}
	if len(r.Choices) == 0 {
		return nil, fmt.Errorf("no choices")
	}
	var out RCAResult
	if err := json.Unmarshal([]byte(stripFences(r.Choices[0].Message.Content)), &out); err != nil {
		return nil, fmt.Errorf("parse: %w (raw=%s)", err, r.Choices[0].Message.Content)
	}
	return &out, nil
}

// =================== Gemini ===================

type Gemini struct {
	Key   string
	Model string
}

func (g *Gemini) Name() string { return "gemini:" + g.Model }

type gemContent struct {
	Parts []map[string]any `json:"parts"`
}

type gemResp struct {
	Candidates []struct {
		Content struct {
			Parts []struct {
				Text string `json:"text"`
			} `json:"parts"`
		} `json:"content"`
	} `json:"candidates"`
}

func (g *Gemini) DetectDefect(ctx context.Context, imageBase64, productType string) (*DefectResult, error) {
	// strip data url prefix
	mime, b64 := splitDataURL(imageBase64)
	body := map[string]any{
		"system_instruction": map[string]any{"parts": []map[string]string{{"text": VisionSystemPrompt}}},
		"contents": []gemContent{{Parts: []map[string]any{
			{"text": fmt.Sprintf("Inspect this %s product. Return JSON only.", productType)},
			{"inline_data": map[string]string{"mime_type": mime, "data": b64}},
		}}},
		"generationConfig": map[string]any{"response_mime_type": "application/json", "temperature": 0.2},
	}
	url := fmt.Sprintf("https://generativelanguage.googleapis.com/v1beta/models/%s:generateContent?key=%s", g.Model, g.Key)
	var r gemResp
	if err := postJSON(ctx, url, "", body, &r); err != nil {
		return nil, err
	}
	if len(r.Candidates) == 0 || len(r.Candidates[0].Content.Parts) == 0 {
		return nil, fmt.Errorf("no candidates")
	}
	var out DefectResult
	if err := json.Unmarshal([]byte(stripFences(r.Candidates[0].Content.Parts[0].Text)), &out); err != nil {
		return nil, fmt.Errorf("parse: %w", err)
	}
	return &out, nil
}

func (g *Gemini) AnalyzeRootCause(ctx context.Context, d *DefectResult, snap map[string]any, productType string) (*RCAResult, error) {
	user := fmt.Sprintf("Defect:\n%s\n\nSensor snapshot:\n%s\n\nProduct: %s",
		mustJSON(d), mustJSON(snap), productType)
	body := map[string]any{
		"system_instruction": map[string]any{"parts": []map[string]string{{"text": RCASystemPrompt}}},
		"contents":           []gemContent{{Parts: []map[string]any{{"text": user}}}},
		"generationConfig":   map[string]any{"response_mime_type": "application/json", "temperature": 0.3},
	}
	url := fmt.Sprintf("https://generativelanguage.googleapis.com/v1beta/models/%s:generateContent?key=%s", g.Model, g.Key)
	var r gemResp
	if err := postJSON(ctx, url, "", body, &r); err != nil {
		return nil, err
	}
	if len(r.Candidates) == 0 || len(r.Candidates[0].Content.Parts) == 0 {
		return nil, fmt.Errorf("no candidates")
	}
	var out RCAResult
	if err := json.Unmarshal([]byte(stripFences(r.Candidates[0].Content.Parts[0].Text)), &out); err != nil {
		return nil, fmt.Errorf("parse: %w", err)
	}
	return &out, nil
}

// =================== Mocks (no API key fallback) ===================

type MockVision struct{}

func (MockVision) Name() string { return "mock-vision" }
func (MockVision) DetectDefect(_ context.Context, _, _ string) (*DefectResult, error) {
	return &DefectResult{
		DefectType:   "label_misaligned",
		Severity:     "medium",
		Confidence:   0.78,
		Description:  "[MOCK] No vision API key configured. Set OPENAI_API_KEY or GEMINI_API_KEY in .env.",
		AffectedArea: "label area, top-right",
	}, nil
}

type MockRCA struct{}

func (MockRCA) Name() string { return "mock-rca" }
func (MockRCA) AnalyzeRootCause(_ context.Context, d *DefectResult, snap map[string]any, _ string) (*RCAResult, error) {
	return &RCAResult{
		PrimaryCause:        fmt.Sprintf("[MOCK] %s likely due to elevated machine temp + vibration. Set DEEPSEEK_API_KEY for real analysis.", d.DefectType),
		ContributingFactors: []string{fmt.Sprintf("temp_ds=%v", snap["temp_ds"]), fmt.Sprintf("vibration=%v", snap["vibration"])},
		Category:            "machine",
		FiveWhys: []string{
			"Why defect? -> Vision detected " + d.DefectType,
			"Why? -> Mechanical instability during forming",
			"Why? -> Vibration above threshold",
			"Why? -> Bearing wear / imbalance",
			"Why? -> Missed PM schedule",
		},
		Recommendations: []string{"Schedule bearing inspection", "Reduce line speed 10%", "Re-tension belt"},
		Urgency:         "medium",
	}, nil
}

// =================== utils ===================

func stripFences(s string) string {
	s = strings.TrimSpace(s)
	s = strings.TrimPrefix(s, "```json")
	s = strings.TrimPrefix(s, "```")
	s = strings.TrimSuffix(s, "```")
	return strings.TrimSpace(s)
}

func splitDataURL(s string) (mime, b64 string) {
	mime = "image/jpeg"
	if strings.HasPrefix(s, "data:") {
		i := strings.Index(s, ";base64,")
		if i > 5 {
			mime = s[5:i]
			return mime, s[i+8:]
		}
	}
	return mime, s
}

func mustJSON(v any) string {
	b, _ := json.MarshalIndent(v, "", "  ")
	return string(b)
}
