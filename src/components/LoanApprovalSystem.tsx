import { useState, useMemo } from "react";
import {
  Banknote, Brain, CheckCircle2, XCircle, AlertTriangle, Sparkles,
  TrendingUp, Shield, Activity, RotateCcw, Calculator,
  User, Building2, Briefcase, GraduationCap, Users, Wrench, Rocket,
  Factory, Store, Home, Car, Stethoscope, Plane, Wallet,
} from "lucide-react";
import ScrollReveal from "./ScrollReveal";

type LoanCategory = "personal" | "business";
type PersonalEmployment = "tier1_corporate" | "tier2_sme" | "tier3_informal" | "gig" | "govt" | "self_employed";
type BusinessType = "startup_early" | "startup_growth" | "sme_established" | "msme" | "sole_proprietor" | "partnership";
type PersonalPurpose = "home" | "vehicle" | "education" | "medical" | "travel" | "personal";
type BusinessPurpose = "working_capital" | "expansion" | "equipment" | "startup_seed" | "real_estate" | "tech_infra";

interface PersonalApplicant {
  name: string; age: number; income: number; loanAmount: number; loanTermMonths: number;
  creditScore: number; existingDebt: number; employment: PersonalEmployment; yearsEmployed: number; purpose: PersonalPurpose;
}
interface BusinessApplicant {
  name: string; yearsInBusiness: number; annualRevenue: number; loanAmount: number; loanTermMonths: number;
  creditScore: number; existingDebt: number; businessType: BusinessType; employees: number; purpose: BusinessPurpose;
}
interface Decision {
  approved: boolean; fairnessAdjusted: boolean; rawScore: number; fairScore: number;
  riskLevel: "low" | "medium" | "high"; dti: number; reasons: string[];
  recommendedAmount: number; recommendedRate: number; fairnessNote: string;
}

const PERSONAL_EMPLOYMENT: Record<PersonalEmployment, { label: string; icon: typeof User; boost: number }> = {
  tier1_corporate: { label: "Tier-1 Corporate", icon: Building2, boost: 1.0 },
  tier2_sme: { label: "Tier-2 SME", icon: Briefcase, boost: 1.05 },
  govt: { label: "Government", icon: Shield, boost: 1.0 },
  self_employed: { label: "Self Employed", icon: Wrench, boost: 1.12 },
  tier3_informal: { label: "Informal Sector", icon: Users, boost: 1.22 },
  gig: { label: "Gig Worker", icon: Activity, boost: 1.18 },
};
const BUSINESS_TYPES: Record<BusinessType, { label: string; icon: typeof Rocket; boost: number }> = {
  startup_early: { label: "Early-Stage Startup", icon: Rocket, boost: 1.25 },
  startup_growth: { label: "Growth Startup", icon: TrendingUp, boost: 1.10 },
  sme_established: { label: "Established SME", icon: Factory, boost: 1.0 },
  msme: { label: "MSME", icon: Store, boost: 1.20 },
  sole_proprietor: { label: "Sole Proprietor", icon: User, boost: 1.15 },
  partnership: { label: "Partnership / LLP", icon: Users, boost: 1.05 },
};
const PERSONAL_PURPOSES: Record<PersonalPurpose, { label: string; icon: typeof Home; rate: number }> = {
  home: { label: "Home", icon: Home, rate: -2 },
  vehicle: { label: "Vehicle", icon: Car, rate: -1 },
  education: { label: "Education", icon: GraduationCap, rate: -1.5 },
  medical: { label: "Medical", icon: Stethoscope, rate: -0.5 },
  travel: { label: "Travel", icon: Plane, rate: 1.5 },
  personal: { label: "Personal", icon: Wallet, rate: 1 },
};
const BUSINESS_PURPOSES: Record<BusinessPurpose, { label: string; icon: typeof Rocket; rate: number }> = {
  working_capital: { label: "Working Capital", icon: Wallet, rate: 0.5 },
  expansion: { label: "Expansion", icon: TrendingUp, rate: -0.5 },
  equipment: { label: "Equipment", icon: Wrench, rate: -1 },
  startup_seed: { label: "Seed Funding", icon: Rocket, rate: 2 },
  real_estate: { label: "Commercial Property", icon: Building2, rate: -1.5 },
  tech_infra: { label: "Tech / Infra", icon: Factory, rate: 0 },
};

const INR = (n: number) => `₹${n.toLocaleString("en-IN")}`;

function evaluatePersonal(a: PersonalApplicant, applyFairness: boolean): Decision {
  const monthlyIncome = a.income / 12;
  const monthlyPayment = a.loanAmount / a.loanTermMonths;
  const dti = ((a.existingDebt / 12 + monthlyPayment) / Math.max(monthlyIncome, 1)) * 100;
  let raw = 0;
  raw += Math.min(40, (a.creditScore - 500) / 350 * 40);
  raw += Math.max(0, 25 - dti / 2);
  raw += Math.min(15, a.yearsEmployed * 2);
  const empScore: Record<PersonalEmployment, number> = { tier1_corporate: 20, govt: 20, tier2_sme: 12, self_employed: 10, gig: 6, tier3_informal: 4 };
  raw += empScore[a.employment] || 8;
  raw = Math.max(0, Math.min(100, raw));
  const boost = PERSONAL_EMPLOYMENT[a.employment].boost;
  const fair = applyFairness ? Math.min(100, raw * boost) : raw;
  const passed = fair >= 60;
  const reasons: string[] = [];
  if (a.creditScore < 600) reasons.push(`Low credit score (${a.creditScore})`);
  if (dti > 45) reasons.push(`High DTI (${dti.toFixed(1)}%)`);
  if (a.yearsEmployed < 2) reasons.push("Short employment history");
  if (a.creditScore >= 700) reasons.push(`Strong credit (${a.creditScore})`);
  if (dti < 30) reasons.push(`Healthy DTI (${dti.toFixed(1)}%)`);
  if (a.yearsEmployed >= 5) reasons.push(`Stable employment (${a.yearsEmployed} yrs)`);
  const fairnessNote = applyFairness && boost > 1
    ? `Fairness applied: ${PERSONAL_EMPLOYMENT[a.employment].label} historically under-approved by ${Math.round((boost - 1) * 100)}%.`
    : "Standard evaluation — no fairness correction needed.";
  const rate = +(10.5 + (100 - fair) * 0.12 + PERSONAL_PURPOSES[a.purpose].rate).toFixed(2);
  return {
    approved: passed, fairnessAdjusted: applyFairness && fair !== raw, rawScore: +raw.toFixed(1), fairScore: +fair.toFixed(1),
    riskLevel: fair >= 75 ? "low" : fair >= 60 ? "medium" : "high", dti: +dti.toFixed(1),
    reasons: reasons.slice(0, 5), recommendedAmount: passed ? a.loanAmount : Math.round(a.loanAmount * (fair / 60) / 1000) * 1000,
    recommendedRate: rate, fairnessNote,
  };
}

function evaluateBusiness(a: BusinessApplicant, applyFairness: boolean): Decision {
  const monthlyRevenue = a.annualRevenue / 12;
  const monthlyPayment = a.loanAmount / a.loanTermMonths;
  const dti = ((a.existingDebt / 12 + monthlyPayment) / Math.max(monthlyRevenue, 1)) * 100;
  let raw = 0;
  raw += Math.min(35, (a.creditScore - 500) / 350 * 35);
  raw += Math.max(0, 25 - dti / 2);
  raw += Math.min(20, a.yearsInBusiness * 3);
  raw += Math.min(10, a.employees / 5);
  const typeScore: Record<BusinessType, number> = { sme_established: 10, startup_growth: 7, partnership: 7, msme: 5, sole_proprietor: 5, startup_early: 3 };
  raw += typeScore[a.businessType] || 5;
  raw = Math.max(0, Math.min(100, raw));
  const boost = BUSINESS_TYPES[a.businessType].boost;
  const fair = applyFairness ? Math.min(100, raw * boost) : raw;
  const passed = fair >= 58;
  const reasons: string[] = [];
  if (a.creditScore < 650) reasons.push(`Low business credit (${a.creditScore})`);
  if (dti > 50) reasons.push(`High debt-service ratio (${dti.toFixed(1)}%)`);
  if (a.yearsInBusiness < 2) reasons.push("Early-stage business");
  if (a.creditScore >= 720) reasons.push(`Strong business credit (${a.creditScore})`);
  if (a.yearsInBusiness >= 5) reasons.push(`Established (${a.yearsInBusiness} yrs)`);
  if (a.employees >= 10) reasons.push(`Workforce: ${a.employees} employees`);
  const fairnessNote = applyFairness && boost > 1
    ? `Fairness applied: ${BUSINESS_TYPES[a.businessType].label} historically under-served by ${Math.round((boost - 1) * 100)}%.`
    : "Standard evaluation — established business segment.";
  const rate = +(11 + (100 - fair) * 0.13 + BUSINESS_PURPOSES[a.purpose].rate).toFixed(2);
  return {
    approved: passed, fairnessAdjusted: applyFairness && fair !== raw, rawScore: +raw.toFixed(1), fairScore: +fair.toFixed(1),
    riskLevel: fair >= 75 ? "low" : fair >= 58 ? "medium" : "high", dti: +dti.toFixed(1),
    reasons: reasons.slice(0, 5), recommendedAmount: passed ? a.loanAmount : Math.round(a.loanAmount * (fair / 58) / 10000) * 10000,
    recommendedRate: rate, fairnessNote,
  };
}

const DEFAULT_PERSONAL: PersonalApplicant = { name: "", age: 32, income: 1200000, loanAmount: 800000, loanTermMonths: 36, creditScore: 720, existingDebt: 60000, employment: "tier2_sme", yearsEmployed: 4, purpose: "home" };
const DEFAULT_BUSINESS: BusinessApplicant = { name: "", yearsInBusiness: 3, annualRevenue: 8000000, loanAmount: 2500000, loanTermMonths: 48, creditScore: 700, existingDebt: 200000, businessType: "startup_growth", employees: 12, purpose: "expansion" };

function FieldInput({ label, type = "text", value, onChange, placeholder, min, max, step }: {
  label: string; type?: string; value: string | number; onChange: (v: string) => void;
  placeholder?: string; min?: number; max?: number; step?: number;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs text-muted-foreground">{label}</label>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} min={min} max={max} step={step}
        className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
    </div>
  );
}

export default function LoanApprovalSystem() {
  const [category, setCategory] = useState<LoanCategory>("personal");
  const [personal, setPersonal] = useState<PersonalApplicant>(DEFAULT_PERSONAL);
  const [business, setBusiness] = useState<BusinessApplicant>(DEFAULT_BUSINESS);
  const [applyFairness, setApplyFairness] = useState(true);
  const [submitted, setSubmitted] = useState(false);

  const decision = useMemo(
    () => category === "personal" ? evaluatePersonal(personal, applyFairness) : evaluateBusiness(business, applyFairness),
    [category, personal, business, applyFairness]
  );
  const rawDecision = useMemo(
    () => category === "personal" ? evaluatePersonal(personal, false) : evaluateBusiness(business, false),
    [category, personal, business]
  );

  const updateP = <K extends keyof PersonalApplicant>(k: K, v: PersonalApplicant[K]) => setPersonal((p) => ({ ...p, [k]: v }));
  const updateB = <K extends keyof BusinessApplicant>(k: K, v: BusinessApplicant[K]) => setBusiness((p) => ({ ...p, [k]: v }));

  const riskColor = decision.riskLevel === "low" ? "text-accent" : decision.riskLevel === "medium" ? "text-warning" : "text-destructive";

  return (
    <div className="space-y-5">
      <ScrollReveal>
        <div className="glass-card p-5 flex items-center gap-3">
          <div className="w-11 h-11 rounded-lg bg-primary/10 flex items-center justify-center"><Banknote className="text-primary" size={22} /></div>
          <div className="flex-1">
            <h4 className="font-bold text-base flex items-center gap-2">
              AI Loan Approval System
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-accent/10 text-accent border border-accent/20 font-medium"><Sparkles size={10} className="inline mr-1" /> Bias-Aware</span>
            </h4>
            <p className="text-xs text-muted-foreground">Fair credit decisioning across personal and business loan segments.</p>
          </div>
          <button onClick={() => { setPersonal(DEFAULT_PERSONAL); setBusiness(DEFAULT_BUSINESS); setSubmitted(false); }}
            className="flex items-center gap-2 px-3 py-2 text-sm border border-border rounded-md hover:bg-secondary transition-colors">
            <RotateCcw size={14} /> Reset
          </button>
        </div>
      </ScrollReveal>

      <div className="flex gap-2">
        <button onClick={() => { setCategory("personal"); setSubmitted(false); }} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${category === "personal" ? "bg-primary/15 text-primary border-primary/40" : "bg-secondary text-muted-foreground border-border hover:bg-secondary/80"}`}>
          <User size={14} /> Personal Loan
        </button>
        <button onClick={() => { setCategory("business"); setSubmitted(false); }} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${category === "business" ? "bg-primary/15 text-primary border-primary/40" : "bg-secondary text-muted-foreground border-border hover:bg-secondary/80"}`}>
          <Rocket size={14} /> Business Loan
        </button>
      </div>

      <div className="grid lg:grid-cols-[1fr_1.1fr] gap-5">
        <ScrollReveal direction="left">
          <div className="glass-card p-6 space-y-4">
            <h5 className="font-bold text-sm flex items-center gap-2"><Calculator size={16} className="text-primary" /> {category === "personal" ? "Personal" : "Business"} Loan Application</h5>

            {category === "personal" ? (
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2"><FieldInput label="Applicant Name" value={personal.name} onChange={(v) => updateP("name", v)} placeholder="e.g., Priya Sharma" /></div>
                <FieldInput label="Age" type="number" value={personal.age} onChange={(v) => updateP("age", +v)} min={18} max={75} />
                <FieldInput label="Annual Income (₹)" type="number" value={personal.income} onChange={(v) => updateP("income", +v)} min={0} />
                <FieldInput label="Loan Amount (₹)" type="number" value={personal.loanAmount} onChange={(v) => updateP("loanAmount", +v)} min={10000} />
                <FieldInput label="Term (months)" type="number" value={personal.loanTermMonths} onChange={(v) => updateP("loanTermMonths", +v)} min={6} max={360} />
                <FieldInput label="Credit Score (300-850)" type="number" value={personal.creditScore} onChange={(v) => updateP("creditScore", +v)} min={300} max={850} />
                <FieldInput label="Existing Debt (₹/yr)" type="number" value={personal.existingDebt} onChange={(v) => updateP("existingDebt", +v)} min={0} />
                <FieldInput label="Years Employed" type="number" value={personal.yearsEmployed} onChange={(v) => updateP("yearsEmployed", +v)} min={0} />

                <div className="col-span-2 space-y-2">
                  <label className="text-xs text-muted-foreground">Employment Type</label>
                  <div className="grid grid-cols-3 gap-2">
                    {(Object.keys(PERSONAL_EMPLOYMENT) as PersonalEmployment[]).map((e) => {
                      const cfg = PERSONAL_EMPLOYMENT[e]; const Icon = cfg.icon; const sel = personal.employment === e;
                      return (
                        <button key={e} onClick={() => updateP("employment", e)}
                          className={`p-2.5 text-left rounded-lg border transition-all ${sel ? "bg-primary/15 border-primary/50" : "bg-secondary/30 border-border/50 hover:border-primary/30"}`}>
                          <Icon size={13} className={sel ? "text-primary mb-1" : "text-muted-foreground mb-1"} />
                          <div className={`text-[11px] font-semibold leading-tight ${sel ? "text-primary" : "text-foreground"}`}>{cfg.label}</div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="col-span-2 space-y-2">
                  <label className="text-xs text-muted-foreground">Loan Purpose</label>
                  <div className="grid grid-cols-3 gap-2">
                    {(Object.keys(PERSONAL_PURPOSES) as PersonalPurpose[]).map((p) => {
                      const cfg = PERSONAL_PURPOSES[p]; const Icon = cfg.icon; const sel = personal.purpose === p;
                      return (
                        <button key={p} onClick={() => updateP("purpose", p)}
                          className={`p-2 rounded-md border text-center transition-all ${sel ? "bg-accent/15 border-accent/50 text-accent" : "bg-secondary/30 border-border/50 text-muted-foreground hover:border-accent/30"}`}>
                          <Icon size={13} className="mx-auto mb-0.5" />
                          <div className="text-[10px] font-medium">{cfg.label}</div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2"><FieldInput label="Business Name" value={business.name} onChange={(v) => updateB("name", v)} placeholder="e.g., Acme Tech Pvt Ltd" /></div>
                <FieldInput label="Years in Business" type="number" value={business.yearsInBusiness} onChange={(v) => updateB("yearsInBusiness", +v)} min={0} />
                <FieldInput label="Annual Revenue (₹)" type="number" value={business.annualRevenue} onChange={(v) => updateB("annualRevenue", +v)} min={0} />
                <FieldInput label="Loan Amount (₹)" type="number" value={business.loanAmount} onChange={(v) => updateB("loanAmount", +v)} min={50000} />
                <FieldInput label="Term (months)" type="number" value={business.loanTermMonths} onChange={(v) => updateB("loanTermMonths", +v)} min={6} max={360} />
                <FieldInput label="Business Credit Score" type="number" value={business.creditScore} onChange={(v) => updateB("creditScore", +v)} min={300} max={850} />
                <FieldInput label="Existing Debt (₹/yr)" type="number" value={business.existingDebt} onChange={(v) => updateB("existingDebt", +v)} min={0} />
                <div className="col-span-2"><FieldInput label="Number of Employees" type="number" value={business.employees} onChange={(v) => updateB("employees", +v)} min={1} /></div>

                <div className="col-span-2 space-y-2">
                  <label className="text-xs text-muted-foreground">Business Type</label>
                  <div className="grid grid-cols-3 gap-2">
                    {(Object.keys(BUSINESS_TYPES) as BusinessType[]).map((b) => {
                      const cfg = BUSINESS_TYPES[b]; const Icon = cfg.icon; const sel = business.businessType === b;
                      return (
                        <button key={b} onClick={() => updateB("businessType", b)}
                          className={`p-2.5 text-left rounded-lg border transition-all ${sel ? "bg-primary/15 border-primary/50" : "bg-secondary/30 border-border/50 hover:border-primary/30"}`}>
                          <Icon size={13} className={sel ? "text-primary mb-1" : "text-muted-foreground mb-1"} />
                          <div className={`text-[11px] font-semibold leading-tight ${sel ? "text-primary" : "text-foreground"}`}>{cfg.label}</div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="col-span-2 space-y-2">
                  <label className="text-xs text-muted-foreground">Loan Purpose</label>
                  <div className="grid grid-cols-3 gap-2">
                    {(Object.keys(BUSINESS_PURPOSES) as BusinessPurpose[]).map((p) => {
                      const cfg = BUSINESS_PURPOSES[p]; const Icon = cfg.icon; const sel = business.purpose === p;
                      return (
                        <button key={p} onClick={() => updateB("purpose", p)}
                          className={`p-2 rounded-md border text-center transition-all ${sel ? "bg-accent/15 border-accent/50 text-accent" : "bg-secondary/30 border-border/50 text-muted-foreground hover:border-accent/30"}`}>
                          <Icon size={13} className="mx-auto mb-0.5" />
                          <div className="text-[10px] font-medium">{cfg.label}</div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between pt-3 border-t border-border/50">
              <button onClick={() => setApplyFairness(!applyFairness)}
                className={`text-xs px-3 py-1.5 rounded-md font-medium border transition-all ${applyFairness ? "bg-accent/15 text-accent border-accent/30" : "bg-secondary/40 text-muted-foreground border-border/50"}`}>
                <Shield size={11} className="inline mr-1" />{applyFairness ? "Fairness ON" : "Fairness OFF"}
              </button>
              <button onClick={() => setSubmitted(true)} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">
                <Brain size={14} /> Run AI Evaluation
              </button>
            </div>
          </div>
        </ScrollReveal>

        <ScrollReveal direction="right">
          <div className={`glass-card p-6 space-y-4 transition-all ${submitted ? "border-primary/30" : "opacity-90"}`}>
            <div className="flex items-center justify-between">
              <h5 className="font-bold text-sm flex items-center gap-2"><Brain size={16} className="text-primary" /> AI Decision</h5>
              {submitted && (
                <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${decision.approved ? "bg-accent/10 text-accent border-accent/30" : "bg-destructive/10 text-destructive border-destructive/30"}`}>
                  {decision.approved ? <><CheckCircle2 size={11} className="inline mr-1" /> APPROVED</> : <><XCircle size={11} className="inline mr-1" /> DECLINED</>}
                </span>
              )}
            </div>

            {!submitted ? (
              <div className="text-center py-12 text-sm text-muted-foreground">
                <Brain size={36} className="mx-auto mb-3 opacity-40" />
                Fill the form and click <strong className="text-foreground">Run AI Evaluation</strong>.
              </div>
            ) : (
              <>
                <div className="bg-secondary/30 rounded-lg p-4 border border-border/50">
                  <div className="flex items-end justify-between mb-2">
                    <div>
                      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Fairness Score</div>
                      <div className={`text-4xl font-extrabold ${riskColor}`}>{decision.fairScore}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Risk Level</div>
                      <div className={`text-sm font-bold capitalize ${riskColor}`}>{decision.riskLevel}</div>
                    </div>
                  </div>
                  <div className="h-2 bg-background rounded-full overflow-hidden">
                    <div className={`h-full transition-all duration-700 ${decision.riskLevel === "low" ? "bg-accent" : decision.riskLevel === "medium" ? "bg-warning" : "bg-destructive"}`}
                      style={{ width: `${decision.fairScore}%` }} />
                  </div>
                  {decision.fairnessAdjusted && (
                    <div className="mt-2 text-[10px] text-muted-foreground flex items-center gap-1.5">
                      <span>Raw: {decision.rawScore}</span>
                      <TrendingUp size={10} className="text-accent" />
                      <span className="text-accent">Fair: {decision.fairScore} (+{(decision.fairScore - decision.rawScore).toFixed(1)})</span>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: "DTI", value: `${decision.dti}%`, ok: decision.dti < 45 },
                    { label: "Rate", value: `${decision.recommendedRate}%`, ok: true },
                    { label: "Score", value: `${decision.fairScore}/100`, ok: decision.fairScore >= 60 },
                  ].map((m) => (
                    <div key={m.label} className="bg-secondary/30 rounded-md p-2.5 text-center border border-border/40">
                      <div className="text-[10px] uppercase text-muted-foreground">{m.label}</div>
                      <div className={`text-sm font-bold ${m.ok ? "text-foreground" : "text-warning"}`}>{m.value}</div>
                    </div>
                  ))}
                </div>

                <div className="space-y-1.5">
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Key Factors</div>
                  {decision.reasons.map((r) => (
                    <div key={r} className="flex items-start gap-2 text-xs text-muted-foreground">
                      <Activity size={11} className="text-primary mt-0.5 shrink-0" /> {r}
                    </div>
                  ))}
                </div>

                {applyFairness && rawDecision.approved !== decision.approved && (
                  <div className="p-3 rounded-lg bg-accent/5 border border-accent/30 text-xs">
                    <div className="flex items-center gap-1.5 font-bold text-accent mb-1"><Sparkles size={12} /> Fairness Layer Changed Outcome</div>
                    <div className="text-muted-foreground">Without bias correction: <span className="text-destructive font-medium">DECLINED</span> → With fairness: <span className="text-accent font-medium">APPROVED</span></div>
                  </div>
                )}

                <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 text-[11px] text-muted-foreground leading-relaxed flex gap-2">
                  <AlertTriangle size={12} className="text-primary shrink-0 mt-0.5" /><span>{decision.fairnessNote}</span>
                </div>

                {decision.approved && (
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border/50">
                    <div>
                      <div className="text-[10px] uppercase text-muted-foreground">Approved Amount</div>
                      <div className="text-base font-bold text-accent">{INR(decision.recommendedAmount)}</div>
                    </div>
                    <div>
                      <div className="text-[10px] uppercase text-muted-foreground">Interest Rate (APR)</div>
                      <div className="text-base font-bold">{decision.recommendedRate}%</div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </ScrollReveal>
      </div>
    </div>
  );
}
