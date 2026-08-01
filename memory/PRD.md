# PlacementHub — Product Requirements Document

## Original Problem Statement
Improve the GitHub repo `anandsagar101/placement-portal` (a MERN placement portal) to an industry-level, interactive, well-organized platform for students, companies and colleges. Correct/add features expected in a modern placement portal.

## User Choices
- Roles: Student, Company/Recruiter, College/Admin
- Features: all (jobs, applications, company dashboard, admin analytics, profiles/resume)
- Auth: JWT email/password with roles
- Design: agent-decided clean, modern, professional look
- Stack: platform default → React + FastAPI + MongoDB (rebuilt from original MERN)

## Architecture
- Backend: FastAPI (`/app/backend/server.py`), MongoDB via motor, JWT (PyJWT) + bcrypt, UUID string ids.
- Frontend: React 19 + CRA/craco, Tailwind + Shadcn UI, SWR for data, recharts, framer-motion, sonner toasts.
- Auth: JWT Bearer token (localStorage `ph_token`) with httpOnly cookie fallback; role-based route guards.

## Personas
- Student: builds profile, browses/searches drives, applies, tracks status timeline.
- Recruiter (company): posts jobs, manages postings, reviews applicants, moves them through funnel.
- Placement Cell (admin): analytics dashboard, manages students/companies, moderates all jobs.

## Implemented (2026-08-01)
- JWT auth: register (student/company), login, me, logout; admin seeded from env.
- Seeded demo data: 3 companies, 3 students, 4 jobs, sample applications.
- Student: dashboard (stats + status pie + recent apps), browse jobs (search/filter), job detail dialog + apply (dup-prevented), My Applications with timeline, profile editor.
- Company: dashboard (stats + funnel bar + latest applicants), post job form, manage jobs (close/activate/delete), applicants table with status update (appends timeline).
- Admin: analytics dashboard (6 KPIs, area trend, top-companies bar), manage students/companies tables with delete, moderate all jobs.
- Landing page, light/dark mode, responsive collapsible sidebar, data-testids throughout.
- Verified: testing agent — backend 24/24, frontend critical flows 100%.

## Backlog / Next
- P1: Resume file upload (object storage) instead of link.
- P1: Email notifications on status change (SendGrid/Resume).
- P2: Interview scheduling / calendar.
- P2: Company verification/approval workflow by admin.
- P2: Split server.py into routers; use relativedelta for trend months.
