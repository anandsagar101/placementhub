import React, { useState } from "react";
import useSWR from "swr";
import { Link } from "react-router-dom";
import {
  Sparkles, Loader2, RefreshCw, TrendingUp, Wand2, ArrowRight,
} from "lucide-react";
import {
  ResponsiveContainer, RadialBarChart, RadialBar, PolarAngleAxis,
} from "recharts";
import api, { formatApiError } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { PageHeader, EmptyState } from "@/components/shared";
import { Button } from "@/components/ui/button";
import JobCard from "@/components/JobCard";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const fetcher = (url) => api.get(url).then((r) => r.data);

function ScoreBar({ label, value }) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-semibold">{value}</span>
      </div>
      <div className="h-2 rounded-full bg-muted">
        <div className="h-2 rounded-full bg-primary transition-all duration-500" style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

export default function AiInsights() {
  const { user } = useAuth();
  const [score, setScore] = useState(user?.profile_score || null);
  const [loading, setLoading] = useState(false);
  const { data: recoData, isLoading: recoLoading } = useSWR("/student/recommendations", fetcher);

  const runReview = async () => {
    setLoading(true);
    try {
      const { data } = await api.post("/student/ai-review");
      setScore(data);
      toast.success("AI review complete");
    } catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
    finally { setLoading(false); }
  };

  const recs = recoData?.recommendations || [];
  const gaugeData = [{ name: "score", value: score?.overall || 0, fill: "hsl(var(--primary))" }];

  return (
    <div>
      <PageHeader title="AI Insights" subtitle="Get an AI-powered profile score and personalized company recommendations.">
        <Button onClick={runReview} disabled={loading} className="rounded-full" data-testid="run-ai-review-btn">
          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wand2 className="mr-2 h-4 w-4" />}
          {score ? "Re-run review" : "Generate AI review"}
        </Button>
      </PageHeader>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-6">
          <h3 className="mb-2 font-heading text-lg font-semibold">Profile Score</h3>
          {score ? (
            <>
              <div className="relative">
                <ResponsiveContainer width="100%" height={200}>
                  <RadialBarChart innerRadius="70%" outerRadius="100%" data={gaugeData} startAngle={90} endAngle={-270}>
                    <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
                    <RadialBar dataKey="value" cornerRadius={20} background />
                  </RadialBarChart>
                </ResponsiveContainer>
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                  <span className="font-heading text-4xl font-bold">{score.overall}</span>
                  <span className="text-xs text-muted-foreground">{score.strength_label}</span>
                </div>
              </div>
            </>
          ) : (
            <p className="py-12 text-center text-sm text-muted-foreground">Run the AI review to see your score.</p>
          )}
        </div>

        <div className="rounded-xl border border-border bg-card p-6 lg:col-span-2">
          <h3 className="mb-4 font-heading text-lg font-semibold">Breakdown & Suggestions</h3>
          {score ? (
            <div className="grid gap-6 sm:grid-cols-2">
              <div className="space-y-4">
                <ScoreBar label="Resume Quality" value={score.resume} />
                <ScoreBar label="Skills" value={score.skills} />
                <ScoreBar label="Projects" value={score.projects} />
                <ScoreBar label="Certificates" value={score.certificates} />
              </div>
              <div>
                <p className="mb-2 flex items-center gap-1.5 text-sm font-semibold"><TrendingUp className="h-4 w-4 text-primary" /> How to improve</p>
                <ul className="space-y-2">
                  {(score.suggestions || []).map((s, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" /> {s}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ) : (
            <p className="py-12 text-center text-sm text-muted-foreground">Your improvement suggestions will appear here.</p>
          )}
        </div>
      </div>

      <div className="mt-8">
        <h3 className="mb-4 flex items-center gap-2 font-heading text-xl font-bold"><Sparkles className="h-5 w-5 text-primary" /> Recommended for you</h3>
        {recoLoading ? (
          <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
        ) : recs.length ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {recs.map((job) => (
              <JobCard key={job.id} job={job} testid={`reco-job-${job.id}`}
                footer={
                  <div className="flex items-center justify-between rounded-lg bg-primary/5 px-3 py-2">
                    <span className="text-xs text-muted-foreground">{job.match_reason}</span>
                    <span className="font-heading text-sm font-bold text-primary">{job.match_score}%</span>
                  </div>
                } />
            ))}
          </div>
        ) : (
          <EmptyState icon={Sparkles} title="No recommendations yet"
            subtitle="Complete your profile and get verified to unlock personalized matches."
            action={<Link to="/app/jobs"><Button className="rounded-full">Browse all jobs</Button></Link>} />
        )}
      </div>
    </div>
  );
}
