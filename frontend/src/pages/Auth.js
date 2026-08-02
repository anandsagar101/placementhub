import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { GraduationCap, Building2, Loader2, ArrowLeft, Eye, EyeOff, } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";
import HeroImage from "@/assets/images/kiet-campus.jpg";

const HERO = HeroImage;

export default function Auth({ mode = "login" }) {
  const navigate = useNavigate();
  const { login, register } = useAuth();
  const isLogin = mode === "login";

  const [role, setRole] = useState("student");
  const [form, setForm] = useState({ name: "", email: "", password: "", company_name: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

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
            <div className="relative">
               <Input id="password" type={showPassword ? "text" : "password"} data-testid="auth-password-input" value={form.password}  onChange={set("password")}  required  placeholder="" className="pr-10" />
               <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" > {showPassword ? ( <EyeOff className="h-4 w-4" /> ) : ( <Eye className="h-4 w-4" /> )}
               </button>
            </div>
              {isLogin && (
                <div className="mt-2 text-right">
                  <Link to="/forgot-password" className="text-sm font-medium text-primary hover:underline" data-testid="forgot-password-link">Forgot password?</Link>
                </div>
              )}
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

        </motion.div>
      </div>
    </div>
  );
}
