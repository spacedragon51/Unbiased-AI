import { Link } from "react-router-dom";
import { Brain, Scale, AlertTriangle, TrendingUp, FileText, Cpu, ArrowRight, Sparkles } from "lucide-react";
import ScrollReveal from "./ScrollReveal";

const HIGHLIGHTS = [
  { icon: Brain, title: "Bias Detection", desc: "Detect representation, sampling, and measurement bias instantly.", color: "text-primary" },
  { icon: Scale, title: "Fairness Metrics", desc: "FNR, FPR, demographic parity & equalized odds across groups.", color: "text-accent" },
  { icon: AlertTriangle, title: "Mitigation", desc: "Threshold calibration & re-weighting to reduce bias.", color: "text-warning" },
  { icon: TrendingUp, title: "Live Monitoring", desc: "Continuous drift detection with instant alerts.", color: "text-chart-4" },
  { icon: FileText, title: "Compliance Reports", desc: "HIPAA, ECOA, EEOC, GDPR-ready audit trails.", color: "text-accent" },
  { icon: Cpu, title: "API Access", desc: "REST API & SDKs for ML pipeline integration.", color: "text-primary" },
];

export default function LoggedInHighlights() {
  return (
    <section className="py-16 px-4 sm:px-6 bg-card/30">
      <div className="container max-w-7xl mx-auto">
        <ScrollReveal>
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent/10 border border-accent/20 text-accent text-xs font-medium mb-4">
              <Sparkles size={14} /> Your fairness toolkit
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold mb-3">All Services at Your Fingertips</h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Jump back into the pipeline whenever you need — every capability is one click away.
            </p>
          </div>
        </ScrollReveal>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {HIGHLIGHTS.map((h, i) => (
            <ScrollReveal key={h.title} delay={70 * i}>
              <Link to="/dashboard" className="glass-card p-6 hover-lift hover:border-primary/30 group h-full block">
                <h.icon className={`${h.color} mb-4 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-6`} size={28} />
                <h3 className="text-lg font-semibold mb-2">{h.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed mb-3">{h.desc}</p>
                <span className="text-xs text-primary font-medium inline-flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  Open in dashboard <ArrowRight size={12} />
                </span>
              </Link>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
