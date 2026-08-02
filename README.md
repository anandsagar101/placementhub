
# PlacementHub

> Enterprise College Placement Management System for Students, Recruiters, and Placement Administrators.

![Python](https://img.shields.io/badge/Python-3.11-blue)
![FastAPI](https://img.shields.io/badge/FastAPI-0.115-green)
![React](https://img.shields.io/badge/React-19-61DAFB)
![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-success)
![Google Gemini](https://img.shields.io/badge/AI-Google%20Gemini-orange)
![Cloudinary](https://img.shields.io/badge/Storage-Cloudinary-blue)
![Vercel](https://img.shields.io/badge/Frontend-Vercel-black)
![Render](https://img.shields.io/badge/Backend-Render-purple)

## Live Demo

🌐 **Live Demo:** https://placementhub-steel.vercel.app/

The application is publicly accessible for demonstration, evaluation, and testing purposes.

> **Deployment Status:** Live Demo Environment  
> **Frontend:** Vercel  
> **Backend:** Render  
> **Database:** MongoDB Atlas

## Demo Access

| Role | Email | Password |
|------|-------|----------|
| Student | anand@gmail.com | Anand@123 |
| Recruiter | zs@gmail.com | Zs@123 |
| Admin | princegupta@gmail.com | Prince@123 |

Super Admin's credentials are not public.

---

## Overview

PlacementHub is an enterprise-grade college placement management platform designed to digitize and streamline the complete campus recruitment lifecycle.

The platform provides dedicated portals for students, recruiters, and placement administrators while automating verification workflows, campus drives, interview scheduling, placement analytics, and AI-powered career assistance.

Built with a modern full-stack architecture, PlacementHub focuses on scalability, security, automation, and an improved placement experience for all stakeholders.


## Project Objectives

PlacementHub is designed to modernize and automate the complete campus placement process through a secure, scalable, and AI-assisted platform.

The primary objectives of the project are:

- Digitize the complete placement lifecycle
- Simplify interactions between students, recruiters, and placement administrators
- Automate verification and approval workflows
- Improve placement transparency and tracking
- Provide AI-powered career assistance
- Build a production-grade system following modern software engineering practices

## Project Highlights

- Enterprise-grade architecture
- AI-powered placement assistance using Google Gemini
- Role-Based Access Control (RBAC)
- Secure JWT Authentication
- Cloud-based document storage
- Async backend using FastAPI and Motor
- Modern React 19 frontend
- Responsive user interface
- Campus drive and interview automation
- Production-ready deployment configuration

## Current Status

> Active Development

Current implementation includes the core placement workflow together with enterprise modules such as document verification, recruiter approval, placement policy management, AI services, interview scheduling, campus drives, notifications, audit logs, analytics, and role-based administration.

---

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

## Core Modules

| Module | Description |
|----------|-------------|
| Authentication | Secure JWT-based authentication and authorization |
| Student Management | Student profiles, verification, eligibility, and placement tracking |
| Recruiter Management | Recruiter onboarding, approval workflow, and company management |
| Job Management | Job posting, eligibility validation, applications, and status tracking |
| Campus Drives | Drive creation, registration, moderation, and lifecycle management |
| Interview Management | Interview scheduling, rescheduling, feedback, and tracking |
| Document Management | Secure document uploads with verification workflow |
| Offer Management | Offer generation, acceptance, comparison, and placement policy |
| Notifications | In-app notification center with reminders |
| AI Services | Resume review, company recommendations, and AI assistant |
| Analytics | Placement statistics and administrative dashboards |
| Administration | RBAC, audit logs, staff management, and system controls |

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


## Documentation

Project documentation is maintained inside the `/docs` directory.

The documentation suite includes:

- Project DNA
- Project Architecture
- System Design
- Database Schema
- API Reference
- Database Schema
- Deployment Guide
- Security Guide
- Testing Guide
- Contribution Guide
- Roadmap

## Roadmap

The project is under active development. Planned improvements include:

- Production email notification service
- Modular backend architecture (router separation)
- Advanced analytics and reporting
- Performance optimization
- CI/CD pipeline
- Docker support
- Comprehensive automated testing
- Extended API documentation
- Public deployment

## Contributing

Contributions, suggestions, and issue reports are welcome.

As the project is currently under active development, contribution guidelines will be published in a dedicated `CONTRIBUTING.md` document.

## License

A license has not been specified yet for this project.