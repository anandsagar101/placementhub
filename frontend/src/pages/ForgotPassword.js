import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { GraduationCap, ArrowLeft, Loader2, KeyRound, ShieldCheck, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import api, { formatApiError } from "@/lib/api";
import { toast } from "sonner";

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [pw, setPw] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [devOtp, setDevOtp] = useState("");

  const request = async (e) => {
    e.preventDefault(); setError(""); setLoading(true);
    try {
      const { data } = await api.post("/auth/forgot-password", { email });
      if (data.dev_otp) setDevOtp(data.dev_otp);
      toast.success("OTP generated");
      setStep(2);
    } catch (e) { setError(formatApiError(e.response?.data?.detail)); }
    finally { setLoading(false); }
  };

  const verify = async (e) => {
    e.preventDefault(); setError(""); setLoading(true);
    try {
      const { data } = await api.post("/auth/verify-otp", { email, otp });
      setResetToken(data.reset_token);
      setStep(3);
    } catch (e) { setError(formatApiError(e.response?.data?.detail)); }
    finally { setLoading(false); }
  };

  const reset = async (e) => {
    e.preventDefault(); setError(""); setLoading(true);
    try {
      await api.post("/auth/reset-password", { reset_token: resetToken, new_password: pw, confirm_password: confirm });
      toast.success("Password reset! Please log in.");
      navigate("/login");
    } catch (e) { setError(formatApiError(e.response?.data?.detail)); }
    finally { setLoading(false); }
  };

  const steps = [
    { n: 1, label: "Email", icon: KeyRound },
    { n: 2, label: "Verify OTP", icon: ShieldCheck },
    { n: 3, label: "New Password", icon: Lock },
  ];

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6 py-12">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
        <Link to="/login" className="mb-8 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back to login
        </Link>
        <div className="mb-6 flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground"><GraduationCap className="h-5 w-5" /></div>
          <span className="font-heading text-lg font-bold">PlacementHub</span>
        </div>

        <div className="mb-8 flex items-center justify-between">
          {steps.map((s, i) => (
            <React.Fragment key={s.n}>
              <div className="flex flex-col items-center gap-1">
                <div className={`flex h-9 w-9 items-center justify-center rounded-full border-2 ${step >= s.n ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground"}`}>
                  <s.icon className="h-4 w-4" />
                </div>
                <span className={`text-[11px] ${step >= s.n ? "font-medium text-foreground" : "text-muted-foreground"}`}>{s.label}</span>
              </div>
              {i < steps.length - 1 && <div className={`h-0.5 flex-1 ${step > s.n ? "bg-primary" : "bg-border"}`} />}
            </React.Fragment>
          ))}
        </div>

        <h1 className="font-heading text-2xl font-bold tracking-tight">Reset your password</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {step === 1 && "Enter your registered email to receive a one-time code."}
          {step === 2 && "Enter the 6-digit OTP. It expires in 10 minutes."}
          {step === 3 && "Choose a strong new password."}
        </p>

        {devOtp && step === 2 && (
          <div className="mt-4 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-700 dark:text-amber-400" data-testid="dev-otp-hint">
            Dev mode (no email provider): your OTP is <span className="font-bold">{devOtp}</span>
          </div>
        )}

        {step === 1 && (
          <form onSubmit={request} className="mt-6 space-y-4">
            <div><Label className="mb-2 block text-sm">Email</Label><Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" data-testid="fp-email" /></div>
            {error && <p className="text-sm text-destructive" data-testid="fp-error">{error}</p>}
            <Button type="submit" disabled={loading} className="w-full rounded-full" data-testid="fp-send-otp">{loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Send OTP</Button>
          </form>
        )}
        {step === 2 && (
          <form onSubmit={verify} className="mt-6 space-y-4">
            <div><Label className="mb-2 block text-sm">OTP</Label><Input required value={otp} onChange={(e) => setOtp(e.target.value)} placeholder="6-digit code" maxLength={6} data-testid="fp-otp" /></div>
            {error && <p className="text-sm text-destructive" data-testid="fp-error">{error}</p>}
            <Button type="submit" disabled={loading} className="w-full rounded-full" data-testid="fp-verify-otp">{loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Verify OTP</Button>
            <button type="button" onClick={request} className="w-full text-sm text-primary hover:underline">Resend OTP</button>
          </form>
        )}
        {step === 3 && (
          <form onSubmit={reset} className="mt-6 space-y-4">
            <div><Label className="mb-2 block text-sm">New password</Label><Input type="password" required value={pw} onChange={(e) => setPw(e.target.value)} placeholder="Min 8 chars, mixed case, number, symbol" data-testid="fp-new-password" /></div>
            <div><Label className="mb-2 block text-sm">Confirm password</Label><Input type="password" required value={confirm} onChange={(e) => setConfirm(e.target.value)} data-testid="fp-confirm-password" /></div>
            {error && <p className="text-sm text-destructive" data-testid="fp-error">{error}</p>}
            <Button type="submit" disabled={loading} className="w-full rounded-full" data-testid="fp-reset">{loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Reset password</Button>
          </form>
        )}
      </motion.div>
    </div>
  );
}
