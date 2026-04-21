import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Settings2, Moon, Globe, Bell, Shield, Trash2, Home, LayoutDashboard, ArrowLeft, Save } from "lucide-react";
import Logo from "@/components/Logo";
import ThemeToggle from "@/components/ThemeToggle";
import HamburgerMenu from "@/components/HamburgerMenu";

export default function Settings() {
  const { signOut } = useAuth();
  const [notifications, setNotifications] = useState(true);
  const [biasAlerts, setBiasAlerts] = useState(true);
  const [weeklyReport, setWeeklyReport] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleDeleteAccount = () => {
    if (confirm("Are you sure you want to delete your account? This will sign you out. (Demo only — no data is deleted)")) {
      signOut();
    }
  };

  const Toggle = ({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) => (
    <button
      onClick={() => onChange(!checked)} role="switch" aria-checked={checked}
      className={`relative w-11 h-6 rounded-full transition-colors ${checked ? "bg-primary" : "bg-secondary border border-border"}`}
    >
      <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${checked ? "left-6" : "left-1"}`} />
    </button>
  );

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border/50 bg-card/50 backdrop-blur-md sticky top-0 z-50">
        <div className="container max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Logo />
          <div className="flex items-center gap-3">
            <Link to="/" className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded-md hover:bg-secondary"><Home size={14} /> Home</Link>
            <Link to="/dashboard" className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded-md hover:bg-secondary"><LayoutDashboard size={14} /> Dashboard</Link>
            <ThemeToggle />
            <HamburgerMenu />
          </div>
        </div>
      </header>

      <main className="container max-w-2xl mx-auto px-6 py-12">
        <Link to="/dashboard" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-8 transition-colors">
          <ArrowLeft size={16} /> Back to Dashboard
        </Link>

        <h1 className="text-3xl font-extrabold mb-2">Settings</h1>
        <p className="text-muted-foreground mb-8">Manage your application preferences and notifications.</p>

        <div className="space-y-5">
          <div className="glass-card p-6">
            <div className="flex items-center gap-2 mb-5">
              <Moon size={18} className="text-primary" />
              <h2 className="font-semibold">Appearance</h2>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Theme</p>
                <p className="text-xs text-muted-foreground mt-0.5">Toggle between dark and light mode</p>
              </div>
              <ThemeToggle />
            </div>
          </div>

          <div className="glass-card p-6">
            <div className="flex items-center gap-2 mb-5">
              <Globe size={18} className="text-primary" />
              <h2 className="font-semibold">Language & Region</h2>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Language</p>
                <p className="text-xs text-muted-foreground mt-0.5">Interface language</p>
              </div>
              <select className="px-3 py-1.5 bg-secondary border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary">
                <option value="en">🇬🇧 English</option>
              </select>
            </div>
          </div>

          <div className="glass-card p-6">
            <div className="flex items-center gap-2 mb-5">
              <Bell size={18} className="text-primary" />
              <h2 className="font-semibold">Notifications</h2>
            </div>
            <div className="space-y-4">
              {[
                { label: "All Notifications", desc: "Receive notifications for all activity", value: notifications, onChange: setNotifications },
                { label: "Bias Alerts", desc: "Get alerted when high disparity is detected", value: biasAlerts, onChange: setBiasAlerts },
                { label: "Weekly Report", desc: "Receive a weekly fairness summary email", value: weeklyReport, onChange: setWeeklyReport },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between py-2 border-b border-border/30 last:border-0">
                  <div>
                    <p className="text-sm font-medium">{item.label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{item.desc}</p>
                  </div>
                  <Toggle checked={item.value} onChange={item.onChange} />
                </div>
              ))}
            </div>
          </div>

          <div className="glass-card p-6">
            <div className="flex items-center gap-2 mb-5">
              <Shield size={18} className="text-primary" />
              <h2 className="font-semibold">Privacy & Data</h2>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between py-2">
                <div>
                  <p className="text-sm font-medium">Audit Data Retention</p>
                  <p className="text-xs text-muted-foreground mt-0.5">How long audit logs are kept locally</p>
                </div>
                <select className="px-3 py-1.5 bg-secondary border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary">
                  <option>30 days</option>
                  <option>90 days</option>
                  <option>1 year</option>
                </select>
              </div>
              <div className="flex items-center justify-between py-2">
                <div>
                  <p className="text-sm font-medium text-destructive">Clear All Local Data</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Remove all locally stored audit logs and datasets</p>
                </div>
                <button
                  onClick={() => { localStorage.clear(); alert("Local data cleared."); }}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-destructive/10 text-destructive border border-destructive/30 rounded-lg hover:bg-destructive/20 transition-colors"
                >
                  <Trash2 size={13} /> Clear Data
                </button>
              </div>
            </div>
          </div>

          <div className="flex gap-3 justify-end">
            <button
              onClick={handleDeleteAccount}
              className="flex items-center gap-2 px-4 py-2.5 border border-destructive/30 text-destructive rounded-lg text-sm hover:bg-destructive/10 transition-colors"
            >
              <Trash2 size={15} /> Delete Account
            </button>
            <button onClick={handleSave}
              className="flex items-center gap-2 px-6 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors">
              <Save size={15} /> {saved ? "Saved!" : "Save Settings"}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
