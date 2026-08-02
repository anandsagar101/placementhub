# PlacementHub — Product Requirements Document

## Original Problem Statement
Upgrade the existing MERN placement portal (rebuilt on React + FastAPI + MongoDB) into a complete Enterprise College Placement Management System, adding 20 feature areas WITHOUT removing existing functionality.

## User Choices (Enterprise iteration)
- File storage: Cloudinary (signed uploads)
- AI model: Google Gemini (via the official Google Gen AI SDK)
- Email: skipped for now — in-app Notification Center only
- RBAC: all admin sub-roles (super_admin, placement_officer, department_coordinator)
- Priority: Verification/Docs/Storage/Profile → Eligibility/Freeze/Offers → Recruiter approval/Filters/Dashboard/Audit → Notifications/Timeline → AI/RBAC/Policy

## Architecture
- Backend: FastAPI (`/app/backend/server.py`), MongoDB (motor), JWT+bcrypt, Cloudinary (signed upload), Google Gemini. UUID string ids.
- Frontend: React 19 + Tailwind + Shadcn UI, SWR, recharts, framer-motion, sonner.

## Personas / Roles
- Student, Company/Recruiter, and admin with 3 sub-roles: super_admin, placement_officer, department_coordinator.

## Implemented — Base (2026-08-01)
JWT auth, role dashboards, jobs, applications, analytics, profile, timeline, dark mode, responsive UI, seed data.

## Implemented — Enterprise (2026-08-01)
1. Student verification workflow (pending/approved/rejected/changes_requested) + remarks + date; dashboard banner.
2. Document upload to Cloudinary (photo, resume, marksheets, aadhar, pan, certs, offer letter, portfolio, other) + admin verify/reject + preview (image/PDF).
3. Profile completion % with missing-fields list.
4. Eligibility engine (CGPA, backlogs, branch, dept, passing year, gender, degree) + pre-apply preview panel.
5. Placement freeze/unfreeze with reasons; blocks apply & offer accept.
6. Recruiter approval workflow; blocks job posting until approved.
7. Document preview (no download needed).
8. Advanced student filters (verification, frozen, placed, applied, cgpa, missing docs, search).
9. Placement policy: accepted offer → placed + auto-freeze; dream-company higher-package exception.
10. Offer management: auto-created on selection; accept/decline; compare offers.
11. In-app Notification Center (bell + unread badge + mark-all-read).
12. Admin audit logs (timestamp, admin, action, target).
13. Student placement journey timeline.
14. RBAC admin sub-roles with permission matrix + staff management (super_admin).
15. AI profile review + AI company recommendations (Google Gemini).
16. Extended admin dashboard (awaiting verification/approval, pending docs, highest/avg package, dept & branch-wise).

Verified: testing agent — backend 50/50 (26 enterprise + 24 legacy), frontend 100% critical flows.

## Implemented — AI Chat Assistant (2026-08-01)
- Google Gemini chat assistant as a floating widget for ALL roles (student/recruiter/admin), role-aware system context.
- **Streaming** responses (SSE) typed live; **persistent per-user history** (db.chat_messages) with reload + "New chat" clear.
- Endpoints: POST /api/chat (SSE), GET/DELETE /api/chat/history. Frontend: `components/ChatWidget.js` mounted in DashboardLayout.
- Verified: testing agent — backend streaming/history/roles pass, frontend 100% across 3 roles (panel opacity fixed).

## Implemented — Campus Ops & Security (2026-08-01)
1. **OTP Password Reset** — /auth/forgot-password → verify-otp → reset-password. OTP hashed, 10-min expiry, max 5 attempts, request rate limiting, previous tokens invalidated, strong-password validation + confirm, security logging. Email abstracted behind `EmailService` (logs now; OTP returned as `dev_otp` until a provider is added). UI: 3-step wizard at /forgot-password + "Forgot password?" link.
2. **Campus Drive Management** — recruiter create; admin moderate (approve/reject/archive); lifecycle status (upcoming→…→cancelled); student register/withdraw; capacity + deadline + eligibility enforced.
3. **Interview Scheduling** — modes (Online/Offline/Phone), round types, date/time/venue/link/instructions; student accept / request-reschedule; recruiter reschedule/cancel/complete/no-show; auto notifications.
4. **Interview Feedback** — communication/technical/problem-solving/confidence/overall ratings + recommendation + pass/fail/hold.
5. **Drive Pipeline** — registered→eligible→shortlisted→round_1/2→hr→offer→accepted→placed (placed marks student placed + frozen).
6. **Calendar** — month grid for all roles (interviews, drives, deadlines, events); admin creates placement events.
7. **Reminders** — /reminders computes upcoming interviews, drive deadlines, offers, pending verification.
8. **Dashboard widgets** — student (upcoming interviews/drives, pending docs), recruiter (today's interviews, upcoming drives, pending feedback), admin (active drives, pending interviews, today's events).

Verified: testing agent — backend 22/22, frontend 100% functional.

## Backlog / Next
- P1: Real email notifications (SendGrid/Resend) for the same events.
- P2: Split server.py into routers; use aggregation pipelines for admin stats.
- P2: Input length caps; notification pagination; explicit CORS origins.
- P2: Placement policy config UI (dream threshold, offer caps).
