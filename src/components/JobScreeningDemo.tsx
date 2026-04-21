import { useState, useRef, useMemo } from "react";
import {
  Upload, Search, BarChart3, SlidersHorizontal, User,
  GraduationCap, Briefcase, AlertTriangle, CheckCircle, XCircle,
  ArrowRight, RotateCcw, FileText, X, Trophy, Target,
  Save, Download, FileJson
} from "lucide-react";
import ScrollReveal from "./ScrollReveal";
import { logAuditEvent } from "@/hooks/useAuditLog";

type Domain = "software" | "data" | "design" | "marketing" | "finance";
type EducationTier = "Ivy/Tier-1" | "Tier-2 State" | "Tier-3 Regional" | "Non-Degree";

const DOMAINS: { id: Domain; label: string; skills: string[] }[] = [
  { id: "software", label: "Software Engineering", skills: ["JavaScript", "Python", "System Design", "Git", "Testing"] },
  { id: "data", label: "Data Science", skills: ["Python", "SQL", "ML", "Statistics", "TensorFlow"] },
  { id: "design", label: "Product Design", skills: ["Figma", "UX Research", "Prototyping", "Design Systems"] },
  { id: "marketing", label: "Marketing", skills: ["SEO", "Analytics", "Content", "Campaigns"] },
  { id: "finance", label: "Finance", skills: ["Excel", "Modeling", "Valuation", "Risk Analysis"] },
];

const EDUCATION_TIERS: EducationTier[] = ["Ivy/Tier-1", "Tier-2 State", "Tier-3 Regional", "Non-Degree"];
const THRESHOLDS: Record<EducationTier, { original: number; calibrated: number }> = {
  "Ivy/Tier-1": { original: 0.5, calibrated: 0.5 },
  "Tier-2 State": { original: 0.5, calibrated: 0.45 },
  "Tier-3 Regional": { original: 0.5, calibrated: 0.35 },
  "Non-Degree": { original: 0.5, calibrated: 0.25 },
};
const MITIGATION_BONUS: Record<EducationTier, number> = { "Ivy/Tier-1": 0, "Tier-2 State": 5, "Tier-3 Regional": 15, "Non-Degree": 25 };

interface ResumeFile { id: string; name: string; size: number; educationTier: EducationTier; }
interface Candidate {
  id: string; name: string; education: EducationTier; experience: string; skills: string[];
  originalScore: number; fairScore: number; bias: "high" | "medium" | "low"; finalDecision?: "hired" | "rejected";
}

const EXP_POOL = ["3 years at Fortune 500", "5 years startup", "4 years freelance", "2 years agency", "6 years enterprise", "1 year internship"];
const FIRST_NAMES = ["Alex", "Priya", "Raj", "Maria", "John", "Zara", "Noah", "Ravi", "Leah", "Kai", "Isha", "Diego"];

function seededRandom(seed: number) {
  return () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
}

function detectEducationTier(text: string): EducationTier {
  const lower = text.toLowerCase();
  if (["harvard", "mit", "stanford", "iit", "oxford", "cambridge", "tier-1", "ivy"].some((k) => lower.includes(k))) return "Ivy/Tier-1";
  if (["university of", "state university", "anna university", "tier-2", "state college"].some((k) => lower.includes(k))) return "Tier-2 State";
  if (["regional college", "local college", "community college", "tier-3"].some((k) => lower.includes(k))) return "Tier-3 Regional";
  return "Non-Degree";
}

function fallbackEducationTier(index: number): EducationTier {
  const pattern: EducationTier[] = ["Ivy/Tier-1", "Tier-2 State", "Tier-3 Regional", "Non-Degree", "Tier-2 State", "Tier-3 Regional", "Non-Degree", "Ivy/Tier-1"];
  return pattern[index % pattern.length];
}

function scoreBaseForTier(tier: EducationTier) {
  if (tier === "Ivy/Tier-1") return 76;
  if (tier === "Tier-2 State") return 66;
  if (tier === "Tier-3 Regional") return 55;
  return 45;
}

function generateCandidates(files: ResumeFile[], domain: Domain): Candidate[] {
  const skills = DOMAINS.find((d) => d.id === domain)!.skills;
  return files.map((file, index) => {
    const seed = file.id.split("").reduce((sum, char) => sum + char.charCodeAt(0), 0) + index * 17;
    const rand = seededRandom(seed);
    const base = scoreBaseForTier(file.educationTier);
    const original = Math.max(30, Math.min(95, Math.round(base + rand() * 20 - 10)));
    const fair = Math.max(35, Math.min(98, original + MITIGATION_BONUS[file.educationTier]));
    const diff = fair - original;
    return {
      id: file.id,
      name: `${FIRST_NAMES[Math.floor(rand() * FIRST_NAMES.length)]} ${String.fromCharCode(65 + index)}.`,
      education: file.educationTier,
      experience: EXP_POOL[Math.floor(rand() * EXP_POOL.length)],
      skills: skills.slice(0, 3 + Math.floor(rand() * (skills.length - 2))),
      originalScore: original, fairScore: fair,
      bias: diff > 18 ? "high" : diff > 8 ? "medium" : "low",
    };
  });
}

const pipelineSteps = [
  { icon: Upload, label: "Upload Resumes", key: "upload" },
  { icon: Search, label: "Detect Bias", key: "detect" },
  { icon: BarChart3, label: "Measure Fairness", key: "measure" },
  { icon: SlidersHorizontal, label: "Mitigate", key: "mitigate" },
  { icon: Trophy, label: "Shortlist", key: "shortlist" },
];

export default function JobScreeningDemo() {
  const [domain, setDomain] = useState<Domain>("software");
  const [openings, setOpenings] = useState(5);
  const [files, setFiles] = useState<ResumeFile[]>([]);
  const [activeStep, setActiveStep] = useState(0);
  const [mitigationApplied, setMitigationApplied] = useState(false);
  const [shortlistRun, setShortlistRun] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const candidates = useMemo(() => generateCandidates(files, domain), [files, domain]);
  const scoreMode = mitigationApplied;

  const distribution = useMemo(() =>
    EDUCATION_TIERS.map((tier) => {
      const count = candidates.filter((c) => c.education === tier).length;
      return { tier, count, percent: candidates.length ? Math.round((count / candidates.length) * 100) : 0 };
    }), [candidates]);

  const fairnessRows = useMemo(() =>
    EDUCATION_TIERS.map((tier) => {
      const group = candidates.filter((c) => c.education === tier);
      const qualified = group.filter((c) => c.fairScore >= 70);
      const rejected = qualified.filter((c) => c.originalScore < 70);
      const frr = qualified.length ? Math.round((rejected.length / qualified.length) * 100) : 0;
      return { tier, count: group.length, qualified: qualified.length, rejected: rejected.length, frr };
    }), [candidates]);

  const rankedCandidates = useMemo(() => {
    const scoreKey = mitigationApplied ? "fairScore" : "originalScore";
    const ranked = [...candidates].sort((a, b) => b[scoreKey] - a[scoreKey]);
    if (!shortlistRun) return ranked;
    return ranked.map((c, i) => ({ ...c, finalDecision: i < openings ? ("hired" as const) : ("rejected" as const) }));
  }, [candidates, mitigationApplied, shortlistRun, openings]);

  const shortlisted = useMemo(() => rankedCandidates.filter((c) => c.finalDecision === "hired"), [rankedCandidates]);
  const disadvantagedIncluded = shortlisted.filter((c) => c.education === "Tier-3 Regional" || c.education === "Non-Degree").length;

  const handleFiles = async (list: FileList | null) => {
    if (!list) return;
    const startIndex = files.length;
    const next = await Promise.all(Array.from(list).map(async (file, index) => {
      let resumeText = file.name;
      if (file.type.startsWith("text/") || file.name.endsWith(".txt")) {
        try { resumeText = `${file.name} ${await file.text()}`; } catch { }
      }
      const detectedTier = detectEducationTier(resumeText);
      const educationTier = detectedTier === "Non-Degree" && !resumeText.toLowerCase().includes("bootcamp") && !resumeText.toLowerCase().includes("self-taught")
        ? fallbackEducationTier(startIndex + index) : detectedTier;
      return { id: `${file.name}-${file.size}-${Math.random().toString(36).slice(2, 8)}`, name: file.name, size: file.size, educationTier };
    }));
    setFiles((prev) => [...prev, ...next]);
    setMitigationApplied(false); setShortlistRun(false);
    if (activeStep < 1) setActiveStep(1);
  };

  const removeFile = (id: string) => { setFiles((prev) => prev.filter((f) => f.id !== id)); setMitigationApplied(false); setShortlistRun(false); };

  const handleReset = () => {
    setFiles([]); setActiveStep(0); setMitigationApplied(false); setShortlistRun(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const goToStep = (index: number) => {
    if (index > 0 && candidates.length === 0) { alert("Upload resumes first"); return; }
    setActiveStep(index);
    if (index < 3) setMitigationApplied(false);
    if (index < 4) setShortlistRun(false);
    if (index === 4) { setMitigationApplied(true); setShortlistRun(true); }
  };

  const TARGET_SCORE = 70;
  const minorityCount = distribution.filter((r) => r.tier === "Tier-3 Regional" || r.tier === "Non-Degree").reduce((s, r) => s + r.count, 0);
  const minorityRatio = candidates.length ? Math.round((minorityCount / candidates.length) * 100) : 0;
  const maxFrr = Math.max(0, ...fairnessRows.map((r) => r.frr));
  const minFrr = Math.min(...fairnessRows.map((r) => r.frr));
  const disparity = maxFrr - minFrr;

  const handleSaveSession = async () => {
    if (candidates.length === 0) { alert("Nothing to save — upload resumes first"); return; }
    await logAuditEvent("screening_saved", "job_screening", undefined, { domain, candidates: candidates.length, openings });
    alert("Screening session saved to audit log!");
  };

  const handleExportCSV = () => {
    if (candidates.length === 0) return;
    const rows = [["Rank", "Name", "Education", "Experience", "Original Score", "Fair Score", "Bias", "Decision"], ...rankedCandidates.map((c, i) => [i + 1, c.name, c.education, c.experience, c.originalScore, c.fairScore, c.bias, c.finalDecision ?? ""])];
    const csv = rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url;
    a.download = `screening-${domain}-${Date.now()}.csv`; a.click(); URL.revokeObjectURL(url);
  };

  const handleExportJSON = () => {
    if (candidates.length === 0) return;
    const data = { domain, openings, target_score: TARGET_SCORE, distribution, fairnessRows, candidates: rankedCandidates };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url;
    a.download = `screening-${domain}-${Date.now()}.json`; a.click(); URL.revokeObjectURL(url);
  };

  const biasColor = (bias: string) => bias === "high" ? "text-destructive" : bias === "medium" ? "text-warning" : "text-accent";
  const biasIcon = (bias: string) => bias === "high" ? <XCircle size={14} /> : bias === "medium" ? <AlertTriangle size={14} /> : <CheckCircle size={14} />;
  const ResultStatus = ({ value }: { value: number }) => {
    if (value >= 50) return <span className="text-destructive font-semibold">High risk</span>;
    if (value >= 20) return <span className="text-warning font-semibold">Review</span>;
    return <span className="text-accent font-semibold">Acceptable</span>;
  };

  return (
    <div className="space-y-6">
      <ScrollReveal>
        <div className="glass-card p-5 grid gap-4 md:grid-cols-[1fr_auto_auto] md:items-end">
          <div className="space-y-2">
            <label className="text-xs text-muted-foreground">Hiring Domain</label>
            <div className="flex flex-wrap gap-2">
              {DOMAINS.map((item) => (
                <button key={item.id} onClick={() => setDomain(item.id)}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium border transition-all ${domain === item.id ? "bg-primary/15 text-primary border-primary/40" : "bg-secondary/40 text-muted-foreground border-border/50 hover:border-primary/30"}`}
                >{item.label}</button>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-xs text-muted-foreground">Shortlist Size</label>
            <input type="number" min={1} value={openings} onChange={(e) => setOpenings(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-32 px-3 py-2 bg-secondary border border-border rounded-lg text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
          </div>
          <button onClick={handleReset} className="flex items-center gap-2 px-3 py-2 rounded-md border border-border text-sm hover:bg-secondary transition-colors">
            <RotateCcw size={14} /> Reset
          </button>
        </div>
      </ScrollReveal>

      <ScrollReveal delay={100}>
        <div className="flex items-center justify-center gap-2 flex-wrap">
          {pipelineSteps.map((step, index) => (
            <button key={step.key} onClick={() => goToStep(index)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-all duration-200 hover:-translate-y-0.5 active:scale-95 ${activeStep >= index ? "bg-primary/15 text-primary border border-primary/30" : "bg-secondary/50 text-muted-foreground border border-border/50 hover:border-primary/30"}`}
            >
              <step.icon size={14} className="shrink-0" />
              <span>{step.label}</span>
              {index < pipelineSteps.length - 1 && <ArrowRight size={12} className="ml-1 text-muted-foreground shrink-0" />}
            </button>
          ))}
        </div>
      </ScrollReveal>

      <ScrollReveal delay={150}>
        <div className="glass-card p-6">
          <h4 className="text-base font-bold flex items-center gap-2 mb-4"><FileText size={18} className="text-primary" /> Upload Resumes</h4>
          <label htmlFor="resume-upload" className="block border-2 border-dashed border-border/60 hover:border-primary/40 rounded-lg p-8 text-center cursor-pointer transition-all bg-secondary/20">
            <Upload className="mx-auto mb-2 text-muted-foreground" size={28} />
            <p className="text-sm font-medium">Drop resumes here or click to browse</p>
            <p className="text-xs text-muted-foreground mt-1">PDF, DOC, DOCX, TXT — education tier extracted from filename or content</p>
            <input id="resume-upload" ref={fileInputRef} type="file" multiple accept=".pdf,.doc,.docx,.txt" className="hidden" onChange={(e) => handleFiles(e.target.files)} />
          </label>
          {files.length > 0 && (
            <div className="mt-4 space-y-4">
              <div className="rounded-lg border border-accent/30 bg-accent/10 p-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-accent mb-3">
                  <CheckCircle size={16} /> {files.length} resume{files.length !== 1 ? "s" : ""} uploaded successfully
                </div>
                <div className="grid sm:grid-cols-4 gap-2">
                  {distribution.map((row) => (
                    <div key={row.tier} className="rounded-md bg-background/50 border border-border/50 px-3 py-2">
                      <p className="text-[11px] text-muted-foreground">{row.tier}</p>
                      <p className="text-lg font-bold text-foreground">{row.count}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div className="grid gap-2 max-h-48 overflow-y-auto">
                {files.map((file) => (
                  <div key={file.id} className="flex items-center justify-between bg-secondary/30 rounded-md px-3 py-2 text-xs">
                    <span className="flex items-center gap-2 truncate">
                      <FileText size={12} className="text-primary shrink-0" />
                      <span className="truncate">{file.name}</span>
                      <span className="text-muted-foreground shrink-0">({(file.size / 1024).toFixed(1)} KB)</span>
                      <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary shrink-0">{file.educationTier}</span>
                    </span>
                    <button onClick={() => removeFile(file.id)} className="text-muted-foreground hover:text-destructive"><X size={14} /></button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </ScrollReveal>

      {activeStep >= 1 && candidates.length > 0 && (
        <ScrollReveal delay={100}>
          <div className="glass-card p-6">
            <h4 className="text-base font-bold flex items-center gap-2 mb-4"><Search size={18} className="text-primary" /> Detect Bias Results</h4>
            <div className="grid md:grid-cols-2 gap-5">
              <div className="rounded-lg border border-border/50 bg-secondary/20 p-4">
                <p className="text-sm text-muted-foreground">Total Candidates</p>
                <p className="text-3xl font-extrabold text-foreground mt-1">{candidates.length}</p>
                <p className="text-sm text-muted-foreground mt-4">Minority Ratio: <span className="font-semibold text-foreground">{minorityCount}/{candidates.length} = {minorityRatio}%</span></p>
                <p className={`text-sm font-semibold mt-2 ${minorityRatio >= 25 ? "text-accent" : "text-warning"}`}>
                  {minorityRatio >= 25 ? "Balanced distribution" : "Under-representation detected"}
                </p>
              </div>
              <div className="space-y-3">
                {distribution.map((row) => (
                  <div key={row.tier}>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-muted-foreground">{row.tier}</span>
                      <span className="font-semibold text-foreground">{row.count} ({row.percent}%)</span>
                    </div>
                    <div className="h-2.5 rounded-full bg-secondary overflow-hidden">
                      <div className="h-full rounded-full bg-primary" style={{ width: `${row.percent}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </ScrollReveal>
      )}

      {activeStep >= 2 && candidates.length > 0 && (
        <ScrollReveal delay={100}>
          <div className="glass-card p-6">
            <h4 className="text-base font-bold flex items-center gap-2 mb-2"><BarChart3 size={18} className="text-warning" /> Measure Fairness — False Rejection Rate</h4>
            <p className="text-xs text-muted-foreground mb-5">FRR = qualified candidates who were rejected / total qualified candidates.</p>
            <div className="grid md:grid-cols-[0.9fr_1.1fr] gap-6">
              <div className="h-56 flex items-end gap-4 border-l border-b border-border/60 px-4 pt-4">
                {fairnessRows.map((row) => (
                  <div key={row.tier} className="flex-1 flex flex-col items-center justify-end h-full gap-2">
                    <div className="text-xs font-semibold text-foreground">{row.frr}%</div>
                    <div className={`w-full rounded-t ${row.frr >= 50 ? "bg-destructive" : row.frr >= 20 ? "bg-warning" : "bg-accent"}`} style={{ height: `${Math.max(row.frr, 4)}%` }} />
                    <div className="text-[10px] text-muted-foreground text-center leading-tight h-8">{row.tier}</div>
                  </div>
                ))}
              </div>
              <div className="space-y-3">
                {fairnessRows.map((row) => (
                  <div key={row.tier} className="flex items-center justify-between gap-3 rounded-lg border border-border/50 bg-secondary/20 p-3 text-sm">
                    <div>
                      <p className="font-semibold text-foreground">{row.tier}</p>
                      <p className="text-xs text-muted-foreground">{row.rejected}/{Math.max(row.qualified, row.count)} rejected ({row.frr}% FRR)</p>
                    </div>
                    <ResultStatus value={row.frr} />
                  </div>
                ))}
                <div className="rounded-lg bg-warning/10 border border-warning/30 p-3 text-sm text-warning">
                  Disparity: <span className="font-bold">{disparity}%</span> gap between best and worst group
                </div>
              </div>
            </div>
          </div>
        </ScrollReveal>
      )}

      {activeStep >= 3 && candidates.length > 0 && (
        <ScrollReveal delay={100}>
          <div className="glass-card p-6">
            <h4 className="text-base font-bold flex items-center gap-2 mb-2"><SlidersHorizontal size={18} className="text-accent" /> Mitigate Bias — Threshold Calibration</h4>
            <p className="text-sm text-muted-foreground mb-4">Current Threshold: <span className="text-foreground font-semibold">0.50</span> (default)</p>
            <div className="overflow-x-auto rounded-lg border border-border/50">
              <table className="w-full text-sm">
                <thead className="bg-secondary/50 text-xs text-muted-foreground uppercase tracking-wide">
                  <tr>
                    <th className="text-left px-4 py-3">Group</th>
                    <th className="text-left px-4 py-3">Original</th>
                    <th className="text-left px-4 py-3">New Threshold</th>
                    <th className="text-left px-4 py-3">Change</th>
                  </tr>
                </thead>
                <tbody>
                  {EDUCATION_TIERS.map((tier) => {
                    const t = THRESHOLDS[tier];
                    const change = t.original - t.calibrated;
                    return (
                      <tr key={tier} className="border-t border-border/40">
                        <td className="px-4 py-3 font-medium text-foreground">{tier}</td>
                        <td className="px-4 py-3 text-muted-foreground">{t.original.toFixed(2)}</td>
                        <td className="px-4 py-3 text-accent font-semibold">{t.calibrated.toFixed(2)}</td>
                        <td className="px-4 py-3 text-muted-foreground">{change === 0 ? "--" : `↓${change.toFixed(2)}`}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="mt-5 flex justify-end">
              <button onClick={() => { setMitigationApplied(true); setActiveStep(4); setShortlistRun(true); }}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">
                <Trophy size={14} /> Apply Mitigation to Shortlist
              </button>
            </div>
          </div>
        </ScrollReveal>
      )}

      {candidates.length > 0 && (
        <ScrollReveal delay={200}>
          <div className="glass-card p-6">
            <div className="flex items-center justify-between mb-5 flex-wrap gap-2">
              <h4 className="text-base font-bold flex items-center gap-2"><Briefcase size={18} className="text-primary" /> Candidate Scores</h4>
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`px-3 py-1.5 text-xs font-medium rounded-lg border ${mitigationApplied ? "bg-accent/15 text-accent border-accent/30" : "bg-secondary text-muted-foreground border-border/50"}`}>
                  {mitigationApplied ? "Fair scores active" : "Original scores active"}
                </span>
                <button onClick={handleSaveSession} className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md border border-border hover:bg-secondary transition-colors"><Save size={13} /> Save</button>
                <button onClick={handleExportCSV} className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md border border-border hover:bg-secondary transition-colors"><Download size={13} /> CSV</button>
                <button onClick={handleExportJSON} className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md border border-border hover:bg-secondary transition-colors"><FileJson size={13} /> JSON</button>
              </div>
            </div>
            <div className="grid gap-3">
              {rankedCandidates.map((candidate, index) => (
                <ScrollReveal key={candidate.id} delay={40 * (index + 1)} direction="left">
                  <div className="bg-secondary/30 border border-border/50 rounded-lg p-4 flex items-start gap-4 hover:border-primary/30 transition-all">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <User size={18} className="text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="font-semibold text-sm">{candidate.name}</span>
                        <span className={`flex items-center gap-1 text-xs ${biasColor(candidate.bias)}`}>{biasIcon(candidate.bias)} {candidate.bias} bias</span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground mb-2 flex-wrap">
                        <span className="flex items-center gap-1"><GraduationCap size={12} /> {candidate.education}</span>
                        <span className="flex items-center gap-1"><Briefcase size={12} /> {candidate.experience}</span>
                      </div>
                      <div className="flex gap-1.5 flex-wrap">
                        {candidate.skills.map((skill) => (
                          <span key={skill} className="px-2 py-0.5 text-[10px] bg-primary/10 text-primary rounded-full font-medium">{skill}</span>
                        ))}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-xs text-muted-foreground mb-1">{scoreMode ? "Fair Score" : "Original Score"}</div>
                      <div className={`text-2xl font-bold ${scoreMode ? "text-accent" : "text-foreground"}`}>{scoreMode ? candidate.fairScore : candidate.originalScore}</div>
                      {scoreMode && <div className="text-[10px] mt-0.5 text-accent">+{candidate.fairScore - candidate.originalScore} pts</div>}
                    </div>
                  </div>
                </ScrollReveal>
              ))}
            </div>
          </div>
        </ScrollReveal>
      )}

      {shortlistRun && (
        <ScrollReveal delay={100}>
          <div className="glass-card p-6">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
              <h4 className="text-base font-bold flex items-center gap-2"><Trophy size={18} className="text-accent" /> Shortlist Results (Top {Math.min(openings, rankedCandidates.length)} Candidates)</h4>
              <span className="text-xs text-muted-foreground flex items-center gap-1"><Target size={12} /> {shortlisted.length} candidate{shortlisted.length !== 1 ? "s" : ""} selected</span>
            </div>
            <div className="overflow-x-auto rounded-lg border border-border/50">
              <table className="w-full text-sm">
                <thead className="bg-secondary/50 text-xs text-muted-foreground uppercase tracking-wide">
                  <tr>
                    <th className="text-left px-4 py-3">Rank</th><th className="text-left px-4 py-3">Name</th>
                    <th className="text-left px-4 py-3">Education</th><th className="text-left px-4 py-3">Score</th>
                    <th className="text-left px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {shortlisted.map((c, i) => {
                    const fairnessLift = mitigationApplied && c.fairScore >= TARGET_SCORE && c.originalScore < TARGET_SCORE;
                    return (
                      <tr key={c.id} className="border-t border-border/40">
                        <td className="px-4 py-3 font-semibold text-accent">{i + 1}</td>
                        <td className="px-4 py-3 text-foreground font-medium">{c.name}</td>
                        <td className="px-4 py-3 text-muted-foreground">{c.education}</td>
                        <td className="px-4 py-3 text-foreground font-semibold">{((mitigationApplied ? c.fairScore : c.originalScore) / 100).toFixed(2)}</td>
                        <td className="px-4 py-3 text-accent font-semibold">Shortlisted{fairnessLift ? " (Fairness)" : ""}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="mt-4 p-3 bg-accent/5 border border-accent/20 rounded-lg text-xs text-accent flex items-center gap-2">
              <CheckCircle size={14} />
              <span><strong>Fairness note:</strong> {disadvantagedIncluded} candidate{disadvantagedIncluded !== 1 ? "s" : ""} from disadvantaged groups included after threshold calibration.</span>
            </div>
          </div>
        </ScrollReveal>
      )}
    </div>
  );
}
