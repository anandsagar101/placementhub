# PlacementHub System Design

> Business Workflows, Module Interactions, and Runtime Behavior

---

## Document Information

| Field | Value |
|--------|-------|
| Document Name | System Design |
| Project | PlacementHub |
| Version | 1.0.0 |
| Status | Draft |
| Owner | Anand Sagar |
| Parent Document | 00_PROJECT_DNA.md |
| Depends On | 01_ARCHITECTURE.md |
| Last Updated | 2026-08-03 |

---

## Purpose

This document describes how PlacementHub operates from a business and runtime perspective.

It documents user journeys, module interactions, business workflows, sequence diagrams, and system behavior.

This document complements the Architecture document by explaining how the architectural components collaborate to implement business functionality.

# Table of Contents

1. System Overview
2. Business Domains
3. User Journey Overview
4. Authentication Workflow
5. Student Workflow
6. Recruiter Workflow
7. Placement Administrator Workflow
8. AI Workflow
9. Notification Workflow
10. Document Verification Workflow
11. Campus Drive Workflow
12. Interview Workflow
13. Offer Workflow
14. Placement Lifecycle
15. State Transitions
16. Failure Scenarios
17. Future Enhancements

---

# System Overview

PlacementHub operates as a centralized placement management platform where Students, Recruiters, and Placement Administrators collaborate through a unified workflow.

Every business operation is executed through authenticated API requests processed by the backend, validated against business rules, and persisted in MongoDB.

External cloud services such as Cloudinary and Google Gemini extend the platform without becoming part of the core business logic.

---

# Business Domains

The platform is organized into the following business domains:

- Identity & Authentication
- User Management
- Profile Management
- Document Management
- Job Management
- Applications
- Campus Drives
- Interviews
- Offers
- Notifications
- Calendar & Events
- AI Services
- Administration
- Reporting & Analytics

---

# User Journey Overview

PlacementHub supports three primary user journeys.

- Student Journey
- Recruiter Journey
- Placement Administrator Journey

These journeys represent the complete business lifecycle supported by the platform.

---

# Student Workflow

The following workflow represents the complete placement lifecycle from a student's perspective.

```mermaid
flowchart TD

Register["Register"]

Login["Login"]

Profile["Complete Profile"]

Documents["Upload Documents"]

Verification["Document Verification"]

Eligibility["Eligibility Check"]

Browse["Browse Jobs / Drives"]

Apply["Apply"]

Interview["Interview Process"]

Offer["Receive Offer"]

Accept["Accept Offer"]

Placed["Placement Complete"]

Register --> Login

Login --> Profile

Profile --> Documents

Documents --> Verification

Verification --> Eligibility

Eligibility --> Browse

Browse --> Apply

Apply --> Interview

Interview --> Offer

Offer --> Accept

Accept --> Placed
```

---

# Recruiter Workflow

Recruiters interact with PlacementHub through an approval-based workflow.

```mermaid
flowchart TD

Register["Register Company"]

Approval["Admin Approval"]

Dashboard["Recruiter Dashboard"]

CreateJob["Create Job"]

Publish["Publish Job"]

Applications["Receive Applications"]

Interview["Schedule Interviews"]

Feedback["Submit Feedback"]

Offer["Generate Offers"]

Approval --> Dashboard

Dashboard --> CreateJob

CreateJob --> Publish

Publish --> Applications

Applications --> Interview

Interview --> Feedback

Feedback --> Offer
```
---

# Placement Administrator Workflow

Placement administrators supervise and govern the complete placement ecosystem.

```mermaid
flowchart TD

Dashboard

StudentVerification

RecruiterApproval

JobModeration

DriveManagement

InterviewMonitoring

OfferMonitoring

Analytics

AuditLogs

Dashboard --> StudentVerification

Dashboard --> RecruiterApproval

Dashboard --> JobModeration

Dashboard --> DriveManagement

Dashboard --> InterviewMonitoring

Dashboard --> OfferMonitoring

Dashboard --> Analytics

Dashboard --> AuditLogs
```

---

# Authentication Workflow

```mermaid
sequenceDiagram

participant User

participant Frontend

participant Backend

participant Database

User->>Frontend: Login

Frontend->>Backend: Credentials

Backend->>Database: Verify Credentials

Database-->>Backend: User

Backend-->>Frontend: JWT Token

Frontend-->>User: Authenticated Session
```

---

# Document Verification Workflow

Student-submitted documents are reviewed by Placement Administrators before they become eligible for placement activities.

```mermaid
flowchart LR

Student["Student"]

Upload["Upload Documents"]

Pending["Pending Verification"]

Admin["Placement Admin"]

Approve["Approved"]

Reject["Rejected"]

Student --> Upload

Upload --> Pending

Pending --> Admin

Admin --> Approve

Admin --> Reject

Approve --> Eligibility["Eligible for Placement"]

Reject --> Upload
```


---

# Campus Drive Workflow

```mermaid
flowchart TD

Recruiter["Recruiter"]

CreateDrive["Create Drive"]

Moderation["Admin Moderation"]

Approved["Approved"]

Rejected["Rejected"]

Registration["Student Registration"]

Interview["Interview"]

Offer["Offer"]

Placed["Placed"]

Recruiter --> CreateDrive

CreateDrive --> Moderation

Moderation --> Approved

Moderation --> Rejected

Approved --> Registration

Registration --> Interview

Interview --> Offer

Offer --> Placed
```

---

# Interview Workflow

```mermaid
sequenceDiagram

participant Recruiter

participant Backend

participant Student

Recruiter->>Backend: Schedule Interview

Backend-->>Student: Notification

Student->>Backend: Accept / Request Reschedule

Backend-->>Recruiter: Student Response

Recruiter->>Backend: Submit Feedback

Backend-->>Student: Interview Status Updated
```

---

# Offer Workflow

```mermaid
flowchart LR

Interview["Interview Completed"]

Selection["Selected"]

Offer["Offer Generated"]

Student["Student"]

Accept["Accept Offer"]

Decline["Decline Offer"]

Freeze["Placement Freeze"]

Interview --> Selection

Selection --> Offer

Offer --> Student

Student --> Accept

Student --> Decline

Accept --> Freeze
```

---

# AI Workflow

```mermaid
sequenceDiagram

participant Student

participant Frontend

participant Backend

participant Gemini

Student->>Frontend: Request AI Assistance

Frontend->>Backend: API Request

Backend->>Gemini: Generate Response

Gemini-->>Backend: AI Output

Backend-->>Frontend: Processed Result

Frontend-->>Student: Display AI Response
```

---

# Notification Workflow

PlacementHub generates notifications for significant business events.

Examples include:

- Student verification updates
- Recruiter approval decisions
- Job application updates
- Campus drive registrations
- Interview schedules
- Offer generation
- Offer acceptance
- Placement status changes
- Administrative announcements


---

# Placement Lifecycle

```mermaid
stateDiagram-v2

[*] --> Registered

Registered --> Verified

Verified --> Eligible

Eligible --> Applied

Applied --> Shortlisted

Shortlisted --> Interview

Interview --> Selected

Interview --> Rejected

Selected --> OfferIssued

OfferIssued --> OfferAccepted

OfferIssued --> OfferDeclined

OfferAccepted --> Placed

Placed --> Frozen
```
---

# Failure Scenarios

Representative business failure scenarios include:

- Invalid authentication credentials
- Incomplete student profile
- Missing mandatory documents
- Student not meeting eligibility criteria
- Recruiter pending approval
- Campus drive registration deadline exceeded
- Interview declined or missed
- Offer declined by student
- AI service temporarily unavailable

The platform should fail gracefully while preserving system integrity and user data.


---

# Future Enhancements

The current system design supports future enhancements including:

- Multi-college support
- Multi-campus placement management
- Advanced workflow automation
- Email notification service
- Public APIs
- Mobile applications
- AI-powered analytics
- Background job processing

