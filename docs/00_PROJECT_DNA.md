# PlacementHub Project DNA

> Master Source of Truth for the PlacementHub Engineering Project

---

## Document Information

| Field | Value |
|--------|-------|
| Document Name | Project DNA |
| Project | PlacementHub |
| Version | 2.0.0 |
| Status | Draft |
| Owner | Anand Sagar |
| Repository | placementhub |
| Scope | Entire Project |
| Last Updated | 2026-08-03 |

---

## Purpose

The Project DNA defines the engineering foundation of PlacementHub.

It serves as the single authoritative reference for the project's vision, architectural principles, engineering standards, technology decisions, development conventions, security philosophy, scalability strategy, and documentation standards.

Every technical document inside the `/docs` directory must remain consistent with the decisions defined in this document.

---

## Audience

This document is intended for:

- Project Owner
- Software Engineers
- Future Contributors
- Technical Reviewers
- AI Coding Assistants (ChatGPT, EmergentAI, GitHub Copilot, etc.)

---

## Authority

This document is the highest-level engineering reference for the PlacementHub project.

---

# Vision

To establish PlacementHub as a scalable, secure, and maintainable enterprise-grade placement management platform that serves as a complete digital ecosystem for campus recruitment.

The project is designed to demonstrate modern software engineering practices through clean architecture, modular system design, secure authentication, AI integration, comprehensive documentation, and production-oriented development standards.

The long-term vision is to evolve PlacementHub into a reference implementation of an enterprise campus placement platform that can be extended, maintained, and deployed at institutional scale.

---

# Mission

The mission of PlacementHub is to provide an integrated platform that simplifies and automates every stage of the campus placement lifecycle for students, recruiters, and placement administrators.

The platform aims to eliminate fragmented workflows by centralizing placement activities, improving operational efficiency, strengthening security, and providing intelligent assistance through AI-powered features.

Every engineering decision within the project should prioritize maintainability, scalability, usability, security, and long-term extensibility.

---

# Stakeholders

The PlacementHub ecosystem serves multiple stakeholders, each with distinct responsibilities and expectations.

## Primary Stakeholders

- Students
- Recruiters / Companies
- Placement Cell Administrators

## Secondary Stakeholders

- College Administration
- Faculty Coordinators
- Training & Placement Officers
- Future Developers and Contributors

## Technical Stakeholders

- Software Engineers
- Technical Reviewers
- AI Coding Assistants

---

# Problem Statement

Traditional college placement processes are often fragmented across spreadsheets, emails, messaging platforms, and multiple disconnected systems.

These workflows introduce operational inefficiencies, inconsistent data management, delayed communication, limited visibility into placement progress, and significant administrative overhead.

Existing placement portals frequently lack enterprise-grade workflow automation, role-based governance, AI-assisted guidance, document verification pipelines, interview lifecycle management, centralized analytics, and maintainable system architecture.

PlacementHub addresses these challenges by providing a unified enterprise platform that manages the complete placement lifecycle through secure, scalable, and modular software architecture.

---

# Product Goals

The primary goals of PlacementHub are:

- Digitize the complete campus placement lifecycle.
- Centralize placement operations into a single platform.
- Improve transparency for students, recruiters, and administrators.
- Automate repetitive administrative workflows.
- Enforce secure role-based access control.
- Integrate AI capabilities where they provide practical value.
- Maintain a scalable and modular software architecture.
- Follow enterprise software engineering practices.
- Serve as a production-quality portfolio project.

---

# User Personas

## Student

Primary objective:
Participate in the placement process through profile management, document submission, job applications, campus drives, interview tracking, offer management, and AI-assisted career guidance.

---

## Recruiter

Primary objective:

Manage company recruitment activities including job posting, applicant evaluation, interview scheduling, recruitment workflow management, and hiring decisions.

---

## Placement Administrator

Primary objective:

Manage and supervise the complete placement lifecycle including verification workflows, recruiter approvals, placement policies, analytics, reporting, staff management, and governance.

---

## System Administrator (Future)

Primary objective:

Maintain platform configuration, infrastructure, security policies, monitoring, backups, and operational health.

---

# Product Scope

PlacementHub manages the complete campus recruitment lifecycle.

The platform includes:

- Authentication and Authorization
- Student Lifecycle Management
- Recruiter Lifecycle Management
- Placement Administration
- Document Verification
- Job Management
- Application Tracking
- Campus Drive Management
- Interview Scheduling
- Offer Management
- Notification System
- Calendar and Events
- Dashboard Analytics
- AI Services
- Audit Logging
- Security and Access Control

The project is designed as a single integrated enterprise platform rather than a collection of independent applications.

---

# Non Goals

The current scope of PlacementHub does not include:

- Learning Management System (LMS)
- Payroll Management
- Human Resource Management
- Student Academic ERP
- Attendance Management
- Financial Accounting
- Video Conferencing Infrastructure
- Company Applicant Tracking System (ATS)

These capabilities may integrate with PlacementHub in the future but are not part of the current product scope.

---

# Engineering Principles

Every engineering decision within PlacementHub should align with the following principles.

## 1. Simplicity First

Prefer simple, maintainable, and understandable solutions over unnecessary complexity.

---

## 2. Security by Design

Security is treated as a fundamental design requirement rather than an afterthought.

Authentication, authorization, validation, and secure data handling must be incorporated into every feature.

---

## 3. Scalability

Every module should be designed with future growth in mind.

The architecture should support increasing numbers of users, services, and data without requiring fundamental redesign.

---

## 4. Modularity

Business logic should remain modular and loosely coupled.

Each component should have a clearly defined responsibility.

---

## 5. Maintainability

The project should remain easy to understand, modify, debug, and extend throughout its lifecycle.

---

## 6. Consistency

Coding conventions, API design, folder organization, naming standards, and documentation should remain consistent across the project.

---

## 7. Documentation First

Engineering decisions should always be documented before major implementation changes.

Documentation is considered part of the software rather than a separate activity.

---

## 8. AI as an Enhancement

Artificial Intelligence should enhance user productivity rather than replace core business workflows.

AI features must remain optional and should not become critical dependencies for primary platform functionality.

---

# Technology Decisions

Technology choices are made based on long-term maintainability, ecosystem maturity, developer productivity, scalability, and community support.

Current technology decisions include:

| Layer | Technology | Rationale |
|--------|------------|-----------|
| Frontend | React | Mature ecosystem and component-driven architecture |
| Backend | FastAPI | High performance, asynchronous architecture, automatic API documentation |
| Database | MongoDB | Flexible document model suitable for evolving product requirements |
| Authentication | JWT | Stateless authentication suitable for distributed services |
| Media Storage | Cloudinary | Managed cloud storage with secure uploads |
| AI Platform | Google Gemini | AI-powered assistance and recommendation services |
| Deployment | Vercel + Render | Independent frontend/backend deployment with managed infrastructure |

Technology selections may evolve over time, but architectural principles should remain stable.

---

# Architectural Principles

PlacementHub follows a layered architecture.

The architecture is designed around separation of concerns.

Primary architectural principles include:

- Clear separation between frontend and backend.
- API-first communication.
- Stateless backend services.
- Centralized authentication.
- Modular business logic.
- Isolated infrastructure concerns.
- Independent frontend deployment.
- Independent backend deployment.
- Database abstraction through dedicated data access layers.
- AI services isolated from core business logic.

---

# Repository Organization

The repository follows a monorepo structure.

Major project components are organized into independent top-level directories.

Current organization includes:

- frontend/
- backend/
- docs/
- tests/
- memory/

Each directory should have a clearly defined responsibility and should avoid unnecessary coupling with other modules.

---

# Module Inventory

PlacementHub is composed of multiple functional modules.

Each module represents an independent business capability while remaining integrated within the overall platform.

## Core Platform Modules

| Module | Purpose |
|----------|---------|
| Authentication | User authentication, authorization, and account security |
| User Management | Student, Recruiter, and Administrator lifecycle management |
| Profile Management | User profile creation, maintenance, and completion tracking |
| Document Management | Upload, verification, preview, and lifecycle management |
| Job Management | Job posting, editing, publishing, and eligibility validation |
| Application Management | Job application lifecycle and status tracking |
| Campus Drive Management | Drive creation, moderation, registration, and participation |
| Interview Management | Interview scheduling, feedback, and tracking |
| Offer Management | Placement offers, acceptance, comparison, and placement workflow |
| Notification System | Centralized in-app notifications and reminders |
| Calendar & Events | Placement calendar and event scheduling |
| Dashboard & Analytics | Role-based dashboards and analytics |
| AI Services | AI profile review, recommendations, and conversational assistant |
| Administration | Verification, approvals, governance, audit logs, and staff management |

---

# Core Business Workflows

PlacementHub supports multiple business workflows that operate across different user roles.

Major workflows include:

- Student Registration Workflow
- Authentication Workflow
- Profile Completion Workflow
- Document Verification Workflow
- Recruiter Approval Workflow
- Job Publishing Workflow
- Eligibility Validation Workflow
- Job Application Workflow
- Campus Drive Workflow
- Interview Workflow
- Offer Acceptance Workflow
- Placement Freeze Workflow
- Notification Workflow
- AI Assistance Workflow

---

# Security Philosophy

Security is considered a fundamental architectural requirement throughout the PlacementHub platform.

The platform follows the following security principles:

- Authentication before authorization.
- Least privilege access control.
- Role-Based Access Control (RBAC).
- Secure password storage.
- Secure JWT-based authentication.
- Server-side authorization.
- Input validation.
- Secure document handling.
- Signed media uploads.
- Auditability of privileged actions.

Every future feature must comply with the security principles defined in this document.

---

# AI Strategy

Artificial Intelligence within PlacementHub is designed to augment decision-making rather than automate critical administrative decisions.

Current AI responsibilities include:

- Profile review
- Placement guidance
- Company recommendations
- Conversational assistance

Future AI capabilities may expand into analytics, reporting, resume intelligence, and placement insights.

AI services should remain modular and isolated from the core business workflow so that the platform remains functional even if AI services become unavailable.

