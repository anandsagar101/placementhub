import React from "react";

/*
 * Lightweight, dependency-free vector illustrations for PlacementHub.
 * Consistent flat style: rounded shapes, soft accents, theme-aware via CSS vars.
 * Palette pulls from the app's design tokens (primary + chart colors).
 */

const P = "hsl(var(--primary))";
const EMERALD = "#10b981";
const VIOLET = "#8b5cf6";
const AMBER = "#f59e0b";

/* Hero: an abstract "placement command center" — dashboard card, chart,
   connected candidate nodes and an offer badge. */
export function IllustrationHero({ className }) {
  return (
    <svg viewBox="0 0 640 460" className={className} fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Campus placement dashboard illustration">
      <defs>
        <linearGradient id="hbg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={P} stopOpacity="0.12" />
          <stop offset="1" stopColor={VIOLET} stopOpacity="0.10" />
        </linearGradient>
        <linearGradient id="hbar" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0" stopColor={P} stopOpacity="0.55" />
          <stop offset="1" stopColor={P} />
        </linearGradient>
      </defs>

      <rect x="0" y="0" width="640" height="460" rx="28" fill="url(#hbg)" />
      {/* soft accent blobs */}
      <circle cx="565" cy="70" r="70" fill={VIOLET} opacity="0.10" />
      <circle cx="70" cy="400" r="60" fill={EMERALD} opacity="0.10" />

      {/* main dashboard card */}
      <rect x="70" y="70" width="380" height="270" rx="20" fill="hsl(var(--card))" stroke="hsl(var(--border))" strokeWidth="2" />
      <rect x="70" y="70" width="380" height="46" rx="20" fill={P} opacity="0.10" />
      <circle cx="94" cy="93" r="6" fill={P} />
      <rect x="110" y="88" width="120" height="10" rx="5" fill="hsl(var(--muted-foreground))" opacity="0.4" />

      {/* bar chart */}
      <rect x="96" y="250" width="26" height="60" rx="6" fill="url(#hbar)" />
      <rect x="134" y="215" width="26" height="95" rx="6" fill="url(#hbar)" />
      <rect x="172" y="235" width="26" height="75" rx="6" fill="url(#hbar)" />
      <rect x="210" y="185" width="26" height="125" rx="6" fill="url(#hbar)" />
      <rect x="248" y="205" width="26" height="105" rx="6" fill="url(#hbar)" />
      <line x1="92" y1="312" x2="286" y2="312" stroke="hsl(var(--border))" strokeWidth="2" />

      {/* donut / rate widget */}
      <circle cx="380" cy="235" r="46" stroke="hsl(var(--muted))" strokeWidth="14" fill="none" />
      <circle cx="380" cy="235" r="46" stroke={EMERALD} strokeWidth="14" fill="none" strokeLinecap="round" strokeDasharray="216 289" transform="rotate(-90 380 235)" />
      <rect x="352" y="150" width="56" height="10" rx="5" fill="hsl(var(--muted-foreground))" opacity="0.35" />

      {/* candidate nodes card */}
      <rect x="410" y="300" width="180" height="120" rx="18" fill="hsl(var(--card))" stroke="hsl(var(--border))" strokeWidth="2" />
      {[0, 1, 2].map((i) => (
        <g key={i} transform={`translate(430, ${322 + i * 32})`}>
          <circle cx="12" cy="12" r="12" fill={[P, VIOLET, EMERALD][i]} opacity="0.85" />
          <rect x="34" y="6" width="90" height="8" rx="4" fill="hsl(var(--muted-foreground))" opacity="0.35" />
          <rect x="34" y="18" width="60" height="7" rx="3.5" fill="hsl(var(--muted-foreground))" opacity="0.2" />
          <circle cx="150" cy="12" r="5" fill={EMERALD} />
        </g>
      ))}

      {/* offer badge */}
      <g transform="translate(470, 96)">
        <rect x="0" y="0" width="120" height="70" rx="16" fill={P} />
        <path d="M22 34 l8 8 l16 -18" stroke="white" strokeWidth="4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        <rect x="54" y="24" width="52" height="9" rx="4.5" fill="white" opacity="0.9" />
        <rect x="54" y="40" width="36" height="8" rx="4" fill="white" opacity="0.6" />
      </g>
    </svg>
  );
}

/* Student: profile card + graduation cap + skill chips */
export function IllustrationStudent({ className }) {
  return (
    <svg viewBox="0 0 480 300" className={className} fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Student profile illustration">
      <defs>
        <linearGradient id="sbg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={P} stopOpacity="0.10" />
          <stop offset="1" stopColor={EMERALD} stopOpacity="0.10" />
        </linearGradient>
      </defs>
      <rect width="480" height="300" rx="0" fill="url(#sbg)" />
      <circle cx="410" cy="60" r="46" fill={EMERALD} opacity="0.12" />
      <circle cx="70" cy="250" r="40" fill={P} opacity="0.10" />

      {/* profile card */}
      <rect x="120" y="60" width="240" height="180" rx="20" fill="hsl(var(--card))" stroke="hsl(var(--border))" strokeWidth="2" />
      <circle cx="240" cy="110" r="30" fill={P} opacity="0.15" />
      <circle cx="240" cy="102" r="11" fill={P} />
      <path d="M222 128 a18 18 0 0 1 36 0 z" fill={P} />
      {/* grad cap */}
      <g transform="translate(240 74)">
        <path d="M-26 0 L0 -12 L26 0 L0 12 Z" fill={VIOLET} />
        <path d="M14 4 L14 16" stroke={AMBER} strokeWidth="3" strokeLinecap="round" />
        <circle cx="14" cy="18" r="3" fill={AMBER} />
      </g>
      <rect x="196" y="150" width="88" height="10" rx="5" fill="hsl(var(--muted-foreground))" opacity="0.35" />
      {/* skill chips */}
      <rect x="150" y="176" width="54" height="20" rx="10" fill={P} opacity="0.15" />
      <rect x="212" y="176" width="44" height="20" rx="10" fill={EMERALD} opacity="0.18" />
      <rect x="264" y="176" width="60" height="20" rx="10" fill={VIOLET} opacity="0.16" />
      <rect x="170" y="206" width="140" height="8" rx="4" fill="hsl(var(--muted-foreground))" opacity="0.2" />
    </svg>
  );
}

/* Recruiter: briefcase + candidate pipeline + check */
export function IllustrationRecruiter({ className }) {
  return (
    <svg viewBox="0 0 480 300" className={className} fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Recruiter hiring illustration">
      <defs>
        <linearGradient id="rbg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={VIOLET} stopOpacity="0.10" />
          <stop offset="1" stopColor={P} stopOpacity="0.10" />
        </linearGradient>
      </defs>
      <rect width="480" height="300" rx="0" fill="url(#rbg)" />
      <circle cx="80" cy="70" r="44" fill={VIOLET} opacity="0.12" />
      <circle cx="410" cy="240" r="40" fill={P} opacity="0.10" />

      {/* briefcase */}
      <g transform="translate(196 74)">
        <rect x="-44" y="10" width="88" height="60" rx="12" fill={P} />
        <rect x="-16" y="-6" width="32" height="18" rx="6" fill={P} opacity="0.7" />
        <rect x="-44" y="34" width="88" height="6" fill="white" opacity="0.35" />
        <rect x="-8" y="30" width="16" height="14" rx="3" fill="white" opacity="0.85" />
      </g>

      {/* candidate pipeline card */}
      <rect x="120" y="160" width="240" height="96" rx="18" fill="hsl(var(--card))" stroke="hsl(var(--border))" strokeWidth="2" />
      {[0, 1, 2].map((i) => (
        <g key={i} transform={`translate(140, ${176 + i * 24})`}>
          <circle cx="10" cy="10" r="9" fill={[P, VIOLET, EMERALD][i]} opacity="0.85" />
          <rect x="28" y="5" width="120" height="7" rx="3.5" fill="hsl(var(--muted-foreground))" opacity="0.3" />
          <rect x="184" y="2" width="32" height="16" rx="8" fill={EMERALD} opacity="0.18" />
        </g>
      ))}
    </svg>
  );
}

/* Auth: abstract secure sign-in graphic for dark primary panels (uses white tones) */
export function IllustrationAuth({ className }) {
  return (
    <svg viewBox="0 0 520 420" className={className} fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Secure login illustration">
      <circle cx="90" cy="90" r="120" fill="white" opacity="0.06" />
      <circle cx="440" cy="360" r="150" fill="white" opacity="0.05" />

      {/* window card */}
      <rect x="120" y="90" width="280" height="200" rx="24" fill="white" opacity="0.12" />
      <rect x="120" y="90" width="280" height="42" rx="24" fill="white" opacity="0.10" />
      <circle cx="146" cy="111" r="6" fill="white" opacity="0.5" />
      <circle cx="166" cy="111" r="6" fill="white" opacity="0.35" />

      {/* lock */}
      <g transform="translate(260 205)">
        <rect x="-34" y="-6" width="68" height="56" rx="12" fill="white" />
        <path d="M-20 -6 v-14 a20 20 0 0 1 40 0 v14" stroke="white" strokeWidth="8" fill="none" strokeLinecap="round" />
        <circle cx="0" cy="18" r="7" fill="hsl(var(--primary))" />
        <rect x="-3" y="20" width="6" height="14" rx="3" fill="hsl(var(--primary))" />
      </g>

      {/* input lines */}
      <rect x="150" y="252" width="140" height="10" rx="5" fill="white" opacity="0.25" />
      <rect x="150" y="270" width="90" height="10" rx="5" fill="white" opacity="0.18" />
    </svg>
  );
}
