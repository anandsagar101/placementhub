import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { GraduationCap, Building2, Loader2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";

const HERO = "https://images.unsplash.com/photo-1522071820081-009f0129c71c?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA2MjJ8MHwxfHNlYXJjaHwzfHxtb2Rlcm4lMjBvZmZpY2UlMjB0ZWNoJTIwcmVjcnVpdG1lbnR8ZW58MHx8fHwxNzg1NTU0NzM2fDA&ixlib=rb-4.1.0&q=85";

export default function Auth({ mode = "login" }) {
  const navigate = useNavigate();
  const { login, register } = useAuth();
  const isLogin = mode === "login";

  const [role, setRole] = useState("student");
  const [form, setForm] = useState({ name: "", email: "", password: "", company_name: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    let res;
    if (isLogin) {
      res = await login(form.email, form.password);
    } else {
      res = await register({
        name: form.name,
        email: form.email,
        password: form.password,
        role,
        company_name: role === "company" ? form.company_name || form.name : undefined,
      });
    }
    setLoading(false);
    if (res.ok) navigate("/app");
    else setError(res.error);
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Left visual */}
      <div className="relative hidden overflow-hidden lg:block">
        <img src={HERO} alt="Placement" className="h-full w-full object-cover" />
        <div className="absolute inset-0 bg-primary/70 mix-blend-multiply" />
        <div className="absolute inset-0 flex flex-col justify-between p-12 text-white">
          <Link to="/" className="flex items-center gap-2">
            <GraduationCap className="h-6 w-6" />
            <span className="font-heading text-lg font-bold">PlacementHub</span>
          </Link>
          <div>
            <h2 className="font-heading text-4xl font-extrabold leading-tight tracking-tight">
              Your campus career, one login away.
            </h2>
            <p className="mt-4 max-w-md text-white/80">
              Students, recruiters and placement cells — everything you need for a successful placement season.
            </p>
          </div>
        </div>
      </div>

      {/* Right form */}
      <div className="flex items-center justify-center bg-background px-6 py-12">
        <motion.div
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
          className="w-full max-w-md"
        >
          <Link to="/" className="mb-8 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Back to home
          </Link>
          <h1 className="font-heading text-3xl font-bold tracking-tight">
            {isLogin ? "Welcome back" : "Create your account"}
          </h1>
          <p className="mt-2 text-muted-foreground">
            {isLogin ? "Log in to continue to your dashboard." : "Join as a student or a recruiter to get started."}
          </p>

          <form onSubmit={submit} className="mt-8 space-y-5">
            {!isLogin && (
              <div>
                <Label className="mb-2 block text-sm font-medium">I am a</Label>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { v: "student", label: "Student", icon: GraduationCap },
                    { v: "company", label: "Recruiter", icon: Building2 },
                  ].map((r) => (
                    <button
                      key={r.v}
                      type="button"
                      data-testid={`role-${r.v}-btn`}
                      onClick={() => setRole(r.v)}
                      className={cn(
                        "flex items-center gap-2 rounded-lg border p-3 text-sm font-medium transition-colors",
                        role === r.v ? "border-primary bg-primary/5 text-primary" : "border-border text-muted-foreground hover:border-primary/40"
                      )}
                    >
                      <r.icon className="h-4 w-4" /> {r.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {!isLogin && (
              <div>
                <Label htmlFor="name" className="mb-2 block text-sm font-medium">
                  {role === "company" ? "Company name" : "Full name"}
                </Label>
                <Input id="name" data-testid="auth-name-input" value={form.name} onChange={set("name")} required
                  placeholder={role === "company" ? "Acme Technologies" : "Your name"} />
              </div>
            )}

            <div>
              <Label htmlFor="email" className="mb-2 block text-sm font-medium">Email</Label>
              <Input id="email" type="email" data-testid="auth-email-input" value={form.email} onChange={set("email")} required placeholder="you@example.com" />
            </div>

            <div>
              <Label htmlFor="password" className="mb-2 block text-sm font-medium">Password</Label>
              <Input id="password" type="password" data-testid="auth-password-input" value={form.password} onChange={set("password")} required placeholder="••••••••" />
            </div>

            {error && (
              <p data-testid="auth-error" className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </p>
            )}

            <Button type="submit" className="w-full rounded-full" size="lg" data-testid="auth-submit-btn" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isLogin ? "Log in" : "Create account"}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            {isLogin ? "Don't have an account? " : "Already have an account? "}
            <Link to={isLogin ? "/register" : "/login"} className="font-semibold text-primary hover:underline" data-testid="auth-switch-link">
              {isLogin ? "Sign up" : "Log in"}
            </Link>
          </p>

          {isLogin && (
            <div className="mt-6 rounded-lg border border-border bg-muted/40 p-4 text-xs text-muted-foreground">
              <p className="font-semibold text-foreground">Demo logins</p>
              <p className="mt-1">Admin: admin@placementhub.com / Admin@123</p>
              <p>Recruiter: hr@nimbuscloud.com / Company@123</p>
              <p>Student: aarav@student.com / Student@123</p>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
