import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Domain, domains } from "@/data/biasData";
import DomainSelector from "@/components/DomainSelector";
import StatsBar from "@/components/StatsBar";
import RepresentationPanel from "@/components/RepresentationPanel";
import FairnessPanel from "@/components/FairnessPanel";
import MitigationPanel from "@/components/MitigationPanel";
import CsvUploader from "@/components/CsvUploader";
import AuditTrailPanel from "@/components/AuditTrailPanel";
import AlertsPanel from "@/components/AlertsPanel";
import ModelVersionPanel from "@/components/ModelVersionPanel";
import JobScreeningDemo from "@/components/JobScreeningDemo";
import JobHiringPipeline from "@/components/JobHiringPipeline";
import LoanApprovalSystem from "@/components/LoanApprovalSystem";
import DomainAnalysisActions from "@/components/DomainAnalysisActions";
import UserMenu from "@/components/UserMenu";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import Logo from "@/components/Logo";
import ThemeToggle from "@/components/ThemeToggle";
import HamburgerMenu from "@/components/HamburgerMenu";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { logAuditEvent } from "@/hooks/useAuditLog";
import { Home, FileSearch, Banknote, Database } from "lucide-react";

export default function Dashboard() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [selectedDomain, setSelectedDomain] = useState<Domain>("healthcare");
  const [mitigatedMap, setMitigatedMap] = useState<Record<Domain, boolean>>({
    healthcare: false,
    banking: false,
    job: false,
  });
  const [resetKey, setResetKey] = useState<Record<Domain, number>>({
    healthcare: 0,
    banking: 0,
    job: 0,
  });
  const [analysisReadyMap, setAnalysisReadyMap] = useState<Record<Domain, boolean>>({
    healthcare: false,
    banking: false,
    job: false,
  });

  useEffect(() => {
    setMitigatedMap({ healthcare: false, banking: false, job: false });
    setAnalysisReadyMap({ healthcare: false, banking: false, job: false });
    setResetKey((prev) => ({ healthcare: prev.healthcare + 1, banking: prev.banking + 1, job: prev.job + 1 }));
    setSelectedDomain("healthcare");
  }, [user?.id]);

  const domain = domains[selectedDomain];
  const mitigated = mitigatedMap[selectedDomain];
  const analysisReady = analysisReadyMap[selectedDomain];

  const handleMitigate = async () => {
    setMitigatedMap((prev) => ({ ...prev, [selectedDomain]: true }));
    await logAuditEvent("mitigation_applied", "domain", undefined, { domain: selectedDomain, method: "threshold_calibration" });
  };

  const handleResetDomain = () => {
    setMitigatedMap((prev) => ({ ...prev, [selectedDomain]: false }));
    setAnalysisReadyMap((prev) => ({ ...prev, [selectedDomain]: false }));
    setResetKey((prev) => ({ ...prev, [selectedDomain]: prev[selectedDomain] + 1 }));
  };

  const CorePipeline = (
    <div key={`${selectedDomain}-${resetKey[selectedDomain]}`} className="space-y-6">
      <CsvUploader
        domain={selectedDomain}
        onUploadStart={() => {
          setMitigatedMap((prev) => ({ ...prev, [selectedDomain]: false }));
          setAnalysisReadyMap((prev) => ({ ...prev, [selectedDomain]: false }));
        }}
        onUploadComplete={() => setAnalysisReadyMap((prev) => ({ ...prev, [selectedDomain]: true }))}
      />
      <StatsBar domain={domain} mitigated={mitigated} analysisReady={analysisReady} />
      <div className="grid md:grid-cols-2 gap-6">
        <RepresentationPanel domain={domain} analysisReady={analysisReady} />
        <FairnessPanel domain={domain} analysisReady={analysisReady} />
      </div>
      <MitigationPanel domain={domain} mitigated={mitigated} onMitigate={handleMitigate} analysisReady={analysisReady} />
      <DomainAnalysisActions domain={selectedDomain} domainConfig={domain} mitigated={mitigated} onReset={handleResetDomain} />
      <div className="grid md:grid-cols-2 gap-6">
        <ModelVersionPanel domain={selectedDomain} />
        <AlertsPanel />
      </div>
      <AuditTrailPanel />
      <div className="glass-card p-4 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
        <span>{t("footer.sensitiveAttr")}: <span className="text-foreground font-medium">{domain.sensitiveAttribute}</span></span>
        <span>{t("footer.pipeline")}</span>
        <span>{t("footer.framework")}</span>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/50 bg-card/50 backdrop-blur-md sticky top-0 z-50">
        <div className="container max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Logo />
          <div className="flex items-center gap-3">
            <Link to="/" className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors btn-press px-2 py-1 rounded-md hover:bg-secondary">
              <Home size={14} /> Home
            </Link>
            <div className="hidden sm:flex items-center gap-2 text-xs text-muted-foreground">
              <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
              {t("header.auditActive")}
            </div>
            <LanguageSwitcher />
            <ThemeToggle />
            <UserMenu />
            <HamburgerMenu />
          </div>
        </div>
      </header>

      <main className="container max-w-7xl mx-auto px-6 py-8 space-y-6">
        <div className="animate-fade-in">
          <h2 className="text-3xl font-extrabold gradient-text-primary mb-2">{t("hero.title")}</h2>
          <p className="text-sm text-muted-foreground max-w-2xl">{t("hero.description")}</p>
        </div>

        <DomainSelector selected={selectedDomain} onSelect={setSelectedDomain} />

        <div className="glass-card px-5 py-3 text-sm text-muted-foreground border-l-2 border-primary/50">
          {domain.description}
        </div>

        {selectedDomain === "job" && <JobHiringPipeline />}

        {selectedDomain === "job" ? (
          <Tabs defaultValue="csv" className="w-full">
            <TabsList className="grid w-full sm:w-auto grid-cols-2 sm:inline-grid">
              <TabsTrigger value="csv" className="gap-2"><Database size={14} /> CSV Analysis</TabsTrigger>
              <TabsTrigger value="resume" className="gap-2"><FileSearch size={14} /> Resume Screener</TabsTrigger>
            </TabsList>
            <TabsContent value="csv" className="mt-6">{CorePipeline}</TabsContent>
            <TabsContent value="resume" className="mt-6">
              <div className="glass-card p-6">
                <div className="flex items-center gap-2 mb-4">
                  <FileSearch size={20} className="text-primary" />
                  <h3 className="text-lg font-bold">AI Resume Screener — Bias Detection</h3>
                </div>
                <JobScreeningDemo />
              </div>
            </TabsContent>
          </Tabs>
        ) : selectedDomain === "banking" ? (
          <Tabs defaultValue="csv" className="w-full">
            <TabsList className="grid w-full sm:w-auto grid-cols-2 sm:inline-grid">
              <TabsTrigger value="csv" className="gap-2"><Database size={14} /> CSV Analysis</TabsTrigger>
              <TabsTrigger value="loan" className="gap-2"><Banknote size={14} /> Loan Approval</TabsTrigger>
            </TabsList>
            <TabsContent value="csv" className="mt-6">{CorePipeline}</TabsContent>
            <TabsContent value="loan" className="mt-6">
              <div className="glass-card p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Banknote size={20} className="text-primary" />
                  <h3 className="text-lg font-bold">AI Loan Approval System</h3>
                </div>
                <LoanApprovalSystem />
              </div>
            </TabsContent>
          </Tabs>
        ) : (
          CorePipeline
        )}
      </main>
    </div>
  );
}
