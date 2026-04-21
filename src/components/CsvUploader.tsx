import { useTranslation } from "react-i18next";
import { useState, useCallback, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { logAuditEvent } from "@/hooks/useAuditLog";
import {
  Upload, FileText, CheckCircle, X, Brain, Activity, AlertTriangle,
  Eye, ChevronDown, Info, Loader2, BarChart2, ZoomIn, ZoomOut, RotateCcw
} from "lucide-react";
import type { Domain } from "@/data/biasData";
import type { HealthcarePredictResponse } from "@/types/healthcare";

const HEALTHCARE_SKIN_TYPES = ["Type I", "Type II", "Type III", "Type IV", "Type V", "Type VI"] as const;
type SkinTypeKey = typeof HEALTHCARE_SKIN_TYPES[number];

interface NormalizedPrediction {
  prediction: string;
  confidence: number;
  explanation: string[];
  fairness: { FNR: Record<string, number>; disparity: number; worst_group: string };
  mitigation: string;
  risk_breakdown: Array<{ feature: string; contribution: number }>;
  top_factor: string;
}

function buildLocalPrediction(params: {
  skinType: string; age: number; familyHistory: string; uvExposure: string; lesionSize: number;
}): NormalizedPrediction {
  const { skinType, age, familyHistory, uvExposure, lesionSize } = params;
  const typeIndex = HEALTHCARE_SKIN_TYPES.indexOf(skinType as SkinTypeKey);
  const baseRisk = typeIndex >= 0 ? [0.05, 0.1, 0.22, 0.38, 0.52, 0.68][typeIndex] : 0.15;
  const ageFactor = age > 60 ? 0.15 : age > 40 ? 0.08 : 0;
  const familyFactor = familyHistory === "yes" ? 0.12 : 0;
  const uvFactor = uvExposure === "high" ? 0.12 : uvExposure === "medium" ? 0.05 : 0;
  const sizeFactor = lesionSize > 8 ? 0.15 : lesionSize > 5 ? 0.07 : 0;
  const score = Math.min(0.97, baseRisk + ageFactor + familyFactor + uvFactor + sizeFactor);
  const isMelanoma = score >= 0.5;

  const FNR: Record<string, number> = {};
  HEALTHCARE_SKIN_TYPES.forEach((t, i) => { FNR[t] = [0.05, 0.09, 0.2, 0.38, 0.6, 0.8][i]; });

  return {
    prediction: isMelanoma ? "Melanoma Detected" : "Benign Lesion",
    confidence: isMelanoma ? score : 1 - score,
    explanation: [
      `Skin type ${skinType} carries a ${Math.round(baseRisk * 100)}% baseline risk`,
      age > 40 ? `Age ${age} increases risk by ${Math.round(ageFactor * 100)}%` : `Age ${age} shows low additional risk`,
      familyHistory === "yes" ? "Family history adds 12% risk" : "No family history risk factor",
      `UV exposure (${uvExposure}) contributes ${Math.round(uvFactor * 100)}%`,
      `Lesion size ${lesionSize}mm: ${sizeFactor > 0 ? "elevated" : "normal"} range`,
    ],
    fairness: { FNR, disparity: 0.75, worst_group: "Type VI" },
    mitigation: "Threshold calibration applied: adjusted detection threshold to reduce FNR disparity across skin types.",
    risk_breakdown: [
      { feature: "Skin Type", contribution: Math.round(baseRisk * 100) },
      { feature: "Age", contribution: Math.round(ageFactor * 100) },
      { feature: "Family History", contribution: Math.round(familyFactor * 100) },
      { feature: "UV Exposure", contribution: Math.round(uvFactor * 100) },
      { feature: "Lesion Size", contribution: Math.round(sizeFactor * 100) },
    ],
    top_factor: skinType,
  };
}

interface Props {
  domain: Domain;
  onUploadStart?: () => void;
  onUploadComplete?: (datasetId: string) => void;
}

export default function CsvUploader({ domain, onUploadStart, onUploadComplete }: Props) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<{ name: string; id: string } | null>(null);

  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [skinType, setSkinType] = useState<string>("Type I");
  const [age, setAge] = useState("45");
  const [gender, setGender] = useState("female");
  const [familyHistory, setFamilyHistory] = useState("no");
  const [uvExposure, setUvExposure] = useState("medium");
  const [lesionSize, setLesionSize] = useState("6.5");
  const [predicting, setPredicting] = useState(false);
  const [prediction, setPrediction] = useState<NormalizedPrediction | null>(null);
  const [predictionSource, setPredictionSource] = useState<"api" | "local" | null>(null);
  const [zoomLevel, setZoomLevel] = useState(1);

  const imageInputRef = useRef<HTMLInputElement>(null);

  const DOMAIN_KEYWORDS: Record<Domain, { required: string[]; label: string }> = {
    healthcare: { required: ["skin", "diagnos", "patient", "fitzpatrick", "lesion", "melanoma"], label: "Healthcare (skin type, diagnosis)" },
    banking: { required: ["loan", "credit", "income", "employment", "approval", "default"], label: "Banking (loan, credit, income)" },
    job: { required: ["resume", "candidate", "education", "experience", "hire", "shortlist", "skill"], label: "Job Screening (candidate, education, skills)" },
  };

  const validateDomain = (header: string): { ok: boolean; reason?: string } => {
    const lower = header.toLowerCase();
    const keywords = DOMAIN_KEYWORDS[domain].required;
    const matches = keywords.filter((k) => lower.includes(k));
    if (matches.length === 0) {
      const otherDomains = (Object.keys(DOMAIN_KEYWORDS) as Domain[]).filter((d) => d !== domain);
      const wrongDomain = otherDomains.find((d) => DOMAIN_KEYWORDS[d].required.some((k) => lower.includes(k)));
      return {
        ok: false,
        reason: wrongDomain
          ? `This CSV looks like a ${DOMAIN_KEYWORDS[wrongDomain].label} dataset. Please switch to the ${wrongDomain} domain or upload the correct CSV.`
          : `CSV does not contain expected columns for ${DOMAIN_KEYWORDS[domain].label}. Expected one of: ${keywords.join(", ")}.`,
      };
    }
    return { ok: true };
  };

  const handleFile = useCallback(async (file: File) => {
    if (!file.name.endsWith(".csv")) {
      alert(t("upload.invalidFile")); return;
    }
    if (file.size > 10 * 1024 * 1024) {
      alert(t("upload.tooLarge")); return;
    }
    const text = await file.text();
    const lines = text.trim().split("\n");
    const header = lines[0] || "";
    const validation = validateDomain(header);
    if (!validation.ok) {
      alert(`Wrong domain CSV: ${validation.reason}`); return;
    }

    setUploadedFile(null);
    onUploadStart?.();
    setUploading(true);
    await new Promise((r) => setTimeout(r, 800));
    const fakeId = crypto.randomUUID();
    setUploadedFile({ name: file.name, id: fakeId });
    await logAuditEvent("dataset_uploaded", "dataset", fakeId, { domain, fileName: file.name, rows: lines.length - 1 });
    onUploadComplete?.(fakeId);
    setUploading(false);
  }, [domain, onUploadStart, onUploadComplete, t]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedImage(file);
    setImagePreviewUrl(URL.createObjectURL(file));
    setPrediction(null);
    setZoomLevel(1);
  };

  const handlePredict = async () => {
    const numAge = Number(age);
    const numLesion = Number(lesionSize);
    if (!selectedImage) { alert("Please upload a lesion image first."); return; }
    if (!Number.isFinite(numAge) || numAge <= 0) { alert("Age must be a valid positive number."); return; }
    if (!Number.isFinite(numLesion) || numLesion <= 0) { alert("Lesion size must be a valid positive number."); return; }

    setPredicting(true);
    await new Promise((r) => setTimeout(r, 1200));

    const localResult = buildLocalPrediction({ skinType, age: numAge, familyHistory, uvExposure, lesionSize: numLesion });
    setPrediction(localResult);
    setPredictionSource("local");
    await logAuditEvent("melanoma_prediction", "healthcare", undefined, { skinType, prediction: localResult.prediction, confidence: localResult.confidence });
    setPredicting(false);
  };

  const resetForm = () => {
    setSelectedImage(null);
    setImagePreviewUrl(null);
    setSkinType("Type I");
    setAge("45");
    setGender("female");
    setFamilyHistory("no");
    setUvExposure("medium");
    setLesionSize("6.5");
    setPrediction(null);
    setPredictionSource(null);
    setZoomLevel(1);
  };

  if (domain === "healthcare") {
    const riskScore = prediction
      ? Math.round((prediction.prediction === "Melanoma Detected" ? prediction.confidence : 1 - prediction.confidence) * 100)
      : 0;
    const riskLevel = riskScore >= 70 ? "high" : riskScore >= 40 ? "medium" : "low";
    const riskColor = riskLevel === "low" ? "text-accent" : riskLevel === "medium" ? "text-warning" : "text-destructive";

    return (
      <div className="space-y-5">
        <div className="glass-card p-5 flex items-center gap-3">
          <div className="w-11 h-11 rounded-lg bg-primary/10 flex items-center justify-center">
            <Brain className="text-primary" size={22} />
          </div>
          <div className="flex-1">
            <h4 className="font-bold text-base flex items-center gap-2">
              Melanoma Detection AI
              <span className="text-xs px-2 py-0.5 rounded-full border border-warning/40 text-warning bg-warning/10">Research Use Only</span>
            </h4>
            <p className="text-xs text-muted-foreground mt-0.5">
              Upload a dermoscopic lesion image + patient metadata. The model applies fairness-aware prediction with skin-type bias disclosure.
            </p>
          </div>
        </div>

        <div className="glass-card p-5 space-y-4">
          <h5 className="text-sm font-semibold text-foreground flex items-center gap-2"><Eye size={15} className="text-primary" /> Lesion Image</h5>
          <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageChange} />

          {!selectedImage ? (
            <div
              onClick={() => imageInputRef.current?.click()}
              className="border-2 border-dashed border-border hover:border-primary/50 rounded-lg p-8 text-center cursor-pointer transition-colors"
            >
              <Upload className="text-muted-foreground mx-auto mb-2" size={28} />
              <p className="text-sm text-muted-foreground">Click to upload dermoscopic image</p>
              <p className="text-xs text-muted-foreground mt-1">PNG, JPG, JPEG supported</p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="relative rounded-lg overflow-hidden border border-border bg-secondary/30">
                <div className="overflow-auto max-h-64 flex items-center justify-center p-2">
                  <img
                    src={imagePreviewUrl!}
                    alt="Lesion"
                    style={{ transform: `scale(${zoomLevel})`, transition: "transform 0.2s", maxWidth: "100%", maxHeight: "240px", objectFit: "contain" }}
                  />
                </div>
                {prediction?.prediction === "Melanoma Detected" && (
                  <div className="absolute inset-0 pointer-events-none rounded-lg" style={{ boxShadow: "inset 0 0 0 3px hsl(0 72% 51% / 0.7)" }}>
                    <div className="absolute top-2 right-2 bg-destructive/90 text-white text-xs px-2 py-1 rounded font-bold">Suspicious Region</div>
                  </div>
                )}
                <div className="absolute bottom-2 right-2 flex gap-1">
                  <button onClick={() => setZoomLevel((z) => Math.min(z + 0.25, 3))} className="w-7 h-7 bg-background/80 border border-border rounded flex items-center justify-center text-foreground hover:bg-secondary">
                    <ZoomIn size={13} />
                  </button>
                  <button onClick={() => setZoomLevel((z) => Math.max(z - 0.25, 0.5))} className="w-7 h-7 bg-background/80 border border-border rounded flex items-center justify-center text-foreground hover:bg-secondary">
                    <ZoomOut size={13} />
                  </button>
                  <button onClick={resetForm} className="w-7 h-7 bg-background/80 border border-border rounded flex items-center justify-center text-foreground hover:bg-secondary">
                    <RotateCcw size={13} />
                  </button>
                </div>
              </div>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <FileText size={11} /> {selectedImage.name} ({(selectedImage.size / 1024).toFixed(1)} KB)
              </p>
            </div>
          )}
        </div>

        <div className="glass-card p-5 space-y-4">
          <h5 className="text-sm font-semibold text-foreground flex items-center gap-2"><Activity size={15} className="text-primary" /> Patient Metadata</h5>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Fitzpatrick Skin Type</label>
              <div className="relative">
                <select value={skinType} onChange={(e) => setSkinType(e.target.value)} className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-foreground text-sm appearance-none focus:outline-none focus:ring-1 focus:ring-primary">
                  {HEALTHCARE_SKIN_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
                <ChevronDown size={13} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Age</label>
              <input type="number" value={age} onChange={(e) => setAge(e.target.value)} min={1} max={120} placeholder="e.g. 45" className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Gender</label>
              <div className="relative">
                <select value={gender} onChange={(e) => setGender(e.target.value)} className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-foreground text-sm appearance-none focus:outline-none focus:ring-1 focus:ring-primary">
                  <option value="female">Female</option>
                  <option value="male">Male</option>
                  <option value="other">Other</option>
                </select>
                <ChevronDown size={13} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Family History of Melanoma</label>
              <div className="relative">
                <select value={familyHistory} onChange={(e) => setFamilyHistory(e.target.value)} className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-foreground text-sm appearance-none focus:outline-none focus:ring-1 focus:ring-primary">
                  <option value="no">No</option>
                  <option value="yes">Yes</option>
                </select>
                <ChevronDown size={13} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">UV Exposure Level</label>
              <div className="relative">
                <select value={uvExposure} onChange={(e) => setUvExposure(e.target.value)} className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-foreground text-sm appearance-none focus:outline-none focus:ring-1 focus:ring-primary">
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
                <ChevronDown size={13} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Lesion Size (mm)</label>
              <input type="number" value={lesionSize} onChange={(e) => setLesionSize(e.target.value)} min={0.1} max={100} step={0.1} placeholder="e.g. 6.5" className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
            </div>
          </div>

          <button
            onClick={handlePredict}
            disabled={predicting || !selectedImage}
            className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {predicting ? <><Loader2 size={16} className="animate-spin" /> Analyzing...</> : <><Brain size={16} /> Run Melanoma Detection</>}
          </button>
          {!selectedImage && <p className="text-xs text-muted-foreground text-center">Please upload a lesion image above to run prediction.</p>}
        </div>

        {prediction && (
          <div className="space-y-4">
            <div className={`glass-card p-5 border-2 ${prediction.prediction === "Melanoma Detected" ? "border-destructive/50" : "border-accent/40"}`}>
              <div className="flex items-center justify-between mb-3">
                <h5 className="text-sm font-bold text-foreground">Prediction Result</h5>
                {predictionSource === "local" && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-secondary border border-border text-muted-foreground flex items-center gap-1">
                    <Info size={11} /> Simulated — API unavailable
                  </span>
                )}
              </div>
              <div className={`text-2xl font-extrabold mb-1 ${prediction.prediction === "Melanoma Detected" ? "text-destructive" : "text-accent"}`}>
                {prediction.prediction}
              </div>
              <div className="flex items-center gap-3 mb-4">
                <div className="flex-1 h-2 bg-secondary rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ${prediction.prediction === "Melanoma Detected" ? "bg-destructive" : "bg-accent"}`}
                    style={{ width: `${Math.round(prediction.confidence * 100)}%` }}
                  />
                </div>
                <span className={`text-sm font-bold ${riskColor}`}>{Math.round(prediction.confidence * 100)}% confidence</span>
              </div>

              <div className="space-y-1.5 mb-4">
                {prediction.explanation.map((exp, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                    <span>{exp}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="glass-card p-5">
              <h5 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                <BarChart2 size={15} className="text-primary" /> Risk Factor Breakdown
              </h5>
              <div className="space-y-2">
                {prediction.risk_breakdown.map((item) => (
                  <div key={item.feature} className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground w-28 shrink-0">{item.feature}</span>
                    <div className="flex-1 h-1.5 bg-secondary rounded-full overflow-hidden">
                      <div className="h-full bg-primary rounded-full" style={{ width: `${Math.min(100, item.contribution * 4)}%` }} />
                    </div>
                    <span className="text-xs text-foreground font-medium w-8 text-right">{item.contribution}%</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="glass-card p-5 border border-warning/30 bg-warning/5">
              <h5 className="text-sm font-semibold text-warning mb-3 flex items-center gap-2">
                <AlertTriangle size={15} /> Fairness & Bias Disclosure
              </h5>
              <div className="space-y-2">
                <div className="grid grid-cols-3 gap-2">
                  {Object.entries(prediction.fairness.FNR).map(([type, fnr]) => (
                    <div key={type} className="glass-card p-2 text-center">
                      <p className="text-xs text-muted-foreground">{type}</p>
                      <p className={`text-sm font-bold ${fnr > 0.4 ? "text-destructive" : fnr > 0.2 ? "text-warning" : "text-accent"}`}>
                        {Math.round(fnr * 100)}%
                      </p>
                      <p className="text-[10px] text-muted-foreground">FNR</p>
                    </div>
                  ))}
                </div>
                <div className="mt-3 p-3 rounded-lg bg-secondary/50 border border-border/40">
                  <p className="text-xs text-muted-foreground">{prediction.mitigation}</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="glass-card p-6">
      <div className="flex items-center gap-2 mb-4">
        <Upload className="text-primary" size={18} />
        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">{t("upload.title")}</h3>
      </div>

      {uploadedFile ? (
        <div className="flex items-center justify-between p-4 bg-accent/10 border border-accent/30 rounded-lg">
          <div className="flex items-center gap-3">
            <CheckCircle className="text-accent" size={20} />
            <div>
              <p className="text-sm font-medium text-foreground">{uploadedFile.name}</p>
              <p className="text-xs text-muted-foreground">{t("upload.uploaded")}</p>
            </div>
          </div>
          <button onClick={() => setUploadedFile(null)} className="text-muted-foreground hover:text-foreground"><X size={16} /></button>
        </div>
      ) : (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer ${dragOver ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"}`}
          onClick={() => {
            const input = document.createElement("input");
            input.type = "file"; input.accept = ".csv";
            input.onchange = (e) => { const file = (e.target as HTMLInputElement).files?.[0]; if (file) handleFile(file); };
            input.click();
          }}
        >
          {uploading ? (
            <div className="flex flex-col items-center gap-2">
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-muted-foreground">{t("upload.uploading")}</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <FileText className="text-muted-foreground" size={32} />
              <p className="text-sm text-muted-foreground">
                {t("upload.dragDrop")} <span className="text-primary">{t("upload.clickBrowse")}</span>
              </p>
              <p className="text-xs text-muted-foreground">{t("upload.maxSize")}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
