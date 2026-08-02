import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  GraduationCap, Building2, ShieldCheck, ArrowRight, Briefcase,
  TrendingUp, Users, Sparkles, CheckCircle2, LineChart, Search, Moon, Sun,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/context/ThemeContext";
import { useAuth } from "@/context/AuthContext";
import { IllustrationHero, IllustrationStudent, IllustrationRecruiter } from "@/components/illustrations";

function Nav() {
  const { theme, toggle } = useTheme();
  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-background/70 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <Link to="/" className="flex items-center gap-2" data-testid="brand-logo">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <GraduationCap className="h-5 w-5" />
          </div>
          <span className="font-heading text-lg font-bold tracking-tight">PlacementHub</span>
        </Link>
        <div className="flex items-center gap-2">
          <button
            onClick={toggle}
            data-testid="theme-toggle"
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:text-foreground"
            aria-label="Toggle theme"
          >
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
          <Link to="/login">
            <Button variant="ghost" data-testid="nav-login-btn">Log in</Button>
          </Link>
          <Link to="/register">
            <Button data-testid="nav-register-btn" className="rounded-full">Get started</Button>
          </Link>
        </div>
      </div>
    </header>
  );
}

const personas = [
  {
    icon: GraduationCap, title: "For Students", Ill: IllustrationStudent,
    points: ["Build a standout profile & upload resume", "Discover verified drives & apply in one click", "Track every application on a live timeline"],
  },
  {
    icon: Building2, title: "For Recruiters", Ill: IllustrationRecruiter,
    points: ["Post roles and reach qualified candidates", "Screen, shortlist & manage the funnel", "Analytics on applicants and hiring velocity"],
  },
];

const features = [
  { icon: Search, title: "Smart Job Discovery", desc: "Filter drives by role, location and skills with instant search." },
  { icon: LineChart, title: "Placement Analytics", desc: "Live dashboards on placement rate, offers and hiring trends." },
  { icon: Briefcase, title: "Application Tracking", desc: "A transparent timeline from applied to selected for every student." },
  { icon: ShieldCheck, title: "Role-based Access", desc: "Separate, secure workspaces for students, recruiters and the cell." },
];

export default function Landing() {
  const navigate = useNavigate();
  const { user } = useAuth();
  React.useEffect(() => {
    if (user) navigate("/app");
  }, [user, navigate]);

  return (
    <div className="min-h-screen bg-background">
      <Nav />

      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border">
        <div className="mx-auto grid max-w-7xl items-center gap-12 px-6 py-16 lg:grid-cols-2 lg:py-24">
          <motion.div
            initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}
          >
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground">
              <Sparkles className="h-3.5 w-3.5 text-primary" /> Campus recruitment, reimagined
            </span>
            <h1 className="mt-6 font-heading text-4xl font-extrabold leading-[1.05] tracking-tighter sm:text-5xl lg:text-6xl">
              Where campuses <span className="text-primary">hire</span> and students <span className="text-primary">get placed</span>.
            </h1>
            <p className="mt-6 max-w-xl text-lg text-muted-foreground">
              A single, industry-grade platform connecting students, recruiters and placement cells — from the first application to the final offer letter.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button size="lg" className="rounded-full" data-testid="hero-get-started-btn" onClick={() => navigate("/register")}>
                Get started free <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
              <Button size="lg" variant="outline" className="rounded-full" data-testid="hero-login-btn" onClick={() => navigate("/login")}>
                I already have an account
              </Button>
            </div>
            <div className="mt-10 flex flex-wrap gap-8">
              {[["10k+", "Students placed"], ["500+", "Hiring partners"], ["94%", "Placement rate"]].map(([n, l]) => (
                <div key={l}>
                  <p className="font-heading text-2xl font-bold">{n}</p>
                  <p className="text-sm text-muted-foreground">{l}</p>
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.7, delay: 0.1 }}
            className="relative"
          >
            <div className="overflow-hidden rounded-2xl border border-border shadow-2xl shadow-primary/5">
              <IllustrationHero className="h-[420px] w-full" />
            </div>
            <div className="absolute -bottom-5 -left-5 hidden rounded-xl border border-border bg-card p-4 shadow-xl sm:block">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-500">
                  <TrendingUp className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold">Offer accepted</p>
                  <p className="text-xs text-muted-foreground">Aarav · Software Engineer</p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-7xl px-6 py-20">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Everything in one place</p>
          <h2 className="mt-3 font-heading text-3xl font-bold tracking-tight sm:text-4xl">Built for the entire placement journey</h2>
        </div>
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.08 }}
              className="rounded-xl border border-border bg-card p-6 transition-transform duration-200 hover:-translate-y-1"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <f.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-4 font-heading text-lg font-semibold">{f.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Personas */}
      <section className="border-y border-border bg-card/40">
        <div className="mx-auto max-w-7xl px-6 py-20">
          <div className="grid gap-8 lg:grid-cols-2">
            {personas.map((p) => (
              <div key={p.title} className="overflow-hidden rounded-2xl border border-border bg-card">
                <p.Ill className="h-52 w-full" />
                <div className="p-8">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <p.icon className="h-5 w-5" />
                    </div>
                    <h3 className="font-heading text-xl font-bold">{p.title}</h3>
                  </div>
                  <ul className="mt-6 space-y-3">
                    {p.points.map((pt) => (
                      <li key={pt} className="flex items-start gap-3 text-sm">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                        <span className="text-muted-foreground">{pt}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Admin CTA */}
      <section className="mx-auto max-w-7xl px-6 py-20">
        <div className="overflow-hidden rounded-2xl border border-border bg-primary p-10 text-primary-foreground lg:p-16">
          <div className="max-w-2xl">
            <div className="flex items-center gap-3">
              <ShieldCheck className="h-6 w-6" />
              <span className="text-sm font-semibold uppercase tracking-[0.15em]">For Placement Cells</span>
            </div>
            <h2 className="mt-4 font-heading text-3xl font-bold tracking-tight sm:text-4xl">
              Run your entire placement season from one command center.
            </h2>
            <p className="mt-4 text-primary-foreground/80">
              Approve drives, manage students and companies, and watch placement analytics update in real time.
            </p>
            <Button
              size="lg" variant="secondary" className="mt-8 rounded-full"
              data-testid="cta-register-btn" onClick={() => navigate("/register")}
            >
              Create your account <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          </div>
        </div>
      </section>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-6 py-8 sm:flex-row">
          <div className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5 text-primary" />
            <span className="font-heading font-semibold">PlacementHub</span>
          </div>
          <p className="text-sm text-muted-foreground">© {new Date().getFullYear()} PlacementHub. Built for modern campuses.</p>
        </div>
      </footer>
    </div>
  );
}
