# PlacementHub

> Enterprise College Placement Management System built with a modern full-stack architecture.

---

## Overview

PlacementHub is a production-oriented campus placement platform designed to manage the complete placement lifecycle for educational institutions.

The system provides dedicated portals for students, recruiters, and placement administrators while automating verification workflows, recruitment processes, campus drives, interview scheduling, placement analytics, and AI-assisted career guidance.

The project follows an enterprise-first approach with role-based access control, secure document management, scalable backend services, and an AI-powered assistance layer.

---

## Current Status

> Active Development

Current implementation includes the core placement workflow together with enterprise modules such as document verification, recruiter approval, placement policy management, AI services, interview scheduling, campus drives, notifications, audit logs, analytics, and role-based administration.

---

## Technology Stack

### Frontend

- React 19
- React Router v7
- Tailwind CSS
- Shadcn UI
- Radix UI
- SWR
- TanStack React Query
- Axios
- Framer Motion
- Recharts

### Backend

- FastAPI
- Uvicorn
- MongoDB
- Motor (Async Driver)
- JWT Authentication
- bcrypt
- Cloudinary
- Google Gemini

---

## High-Level Architecture

```text
                ┌───────────────────────┐
                │      React Frontend   │
                └───────────┬───────────┘
                            │
                     REST API (HTTPS)
                            │
                ┌───────────▼───────────┐
                │    FastAPI Backend    │
                └───────────┬───────────┘
            ┌───────────────┼────────────────┐
            │               │                │
            ▼               ▼                ▼
      MongoDB         Cloudinary      Google Gemini
```

---

## Repository Structure

```
PlacementHub
│
├── frontend/
├── backend/
├── memory/
├── tests/
├── render.yaml
└── README.md
```

---

> Documentation is being developed incrementally as the project evolves.
![Python](https://img.shields.io/badge/Python-3.11-blue)

![FastAPI](https://img.shields.io/badge/FastAPI-0.115-green)

![React](https://img.shields.io/badge/React-19-61DAFB)

![MongoDB](https://img.shields.io/badge/MongoDB-Async-success)

![License](https://img.shields.io/badge/License-MIT-orange)

![Status](https://img.shields.io/badge/Status-Active%20Development-success)


## Table of Contents

- Overview
- Key Features
- User Roles
- Technology Stack
- Architecture
- Repository Structure
- Quick Start
- Documentation
- Roadmap
- Contributing
- License

## Key Features

- Secure JWT Authentication
- Enterprise Role-Based Access Control
- Student Verification Workflow
- Recruiter Approval Workflow
- Document Management & Verification
- Campus Drive Management
- Interview Scheduling
- Offer Management
- Placement Policy Automation
- Analytics Dashboard
- Notification Center
- Calendar & Reminders
- AI Profile Review
- AI Job Recommendations
- AI Chat Assistant

## User Roles

### Student

- Profile Management
- Job Applications
- Campus Drive Registration
- Interview Tracking
- AI Assistance

### Recruiter

- Company Dashboard
- Job Posting
- Applicant Management
- Interview Scheduling

### Placement Cell

- Student Verification
- Recruiter Approval
- Staff Management
- Analytics
- Audit Logs

## Documentation

Project documentation is maintained inside the `/docs` directory.

The documentation suite includes:

- Project Architecture
- System Design
- API Reference
- Database Schema
- Deployment Guide
- Security Guide
- Testing Guide
- Contribution Guide
- Roadmap
