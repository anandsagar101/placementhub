# PlacementHub API Reference

> Comprehensive API specification for the PlacementHub backend.

---

# Document Information

| Field | Value |
|--------|-------|
| Document Name | API Reference |
| Project | PlacementHub |
| Version | 2.0.0 |
| Status | Draft |
| Owner | Anand Sagar |
| Repository | placementhub |
| Scope | Backend REST APIs |
| Last Updated | 2026-08-03 |

---

# Purpose

This document provides the official API specification for PlacementHub.

It describes every REST endpoint exposed by the backend, including authentication requirements, request models, response behavior, business rules, and related database collections.

The API Reference serves as the primary technical guide for frontend developers, backend engineers, future contributors, and AI coding assistants.

---

# Audience

This document is intended for:

- Frontend Developers
- Backend Developers
- API Integrators
- Technical Reviewers
- Future Contributors
- AI Coding Assistants

---

# Authority

This document is the authoritative reference for all publicly exposed backend REST APIs implemented within PlacementHub.

---

# API Design Principles

PlacementHub follows the following API design principles.

- RESTful endpoint design
- Resource-oriented routing
- JWT-based authentication
- Role-Based Access Control (RBAC)
- Consistent request validation
- Standardized HTTP status codes
- JSON request and response payloads
- Stateless backend architecture
- Business rule enforcement at the API layer

---

# Base Configuration

| Property | Value |
|----------|-------|
| Protocol | HTTPS |
| Architecture | REST API |
| Authentication | JWT (HTTP Only Cookie) |
| Request Format | JSON |
| Response Format | JSON |
| Content Type | application/json |

---

# API Categories

The PlacementHub backend is organized into the following functional API groups.

| Category | Description |
|----------|-------------|
| Authentication | Account creation and authentication |
| Profile | User profile management |
| Documents | Document upload and verification |
| Jobs | Job lifecycle management |
| Applications | Student applications |
| Offers | Placement offers |
| Notifications | User notifications |
| Dashboard | Analytics and statistics |
| Administration | User and platform administration |
| AI Services | AI review, recommendations and assistant |
| Password Recovery | OTP-based password reset |
| Campus Drives | Drive management |
| Interviews | Interview scheduling and feedback |
| Events | Placement events |
| Calendar | Unified placement calendar |
| Chat | AI conversational assistant |
| Health | Service monitoring |

---

# Authentication APIs

Authentication APIs manage user registration, login, session validation, logout, password recovery, and credential management.

All authentication operations are implemented using JWT-based authentication with HTTP-only cookies.

---

## POST /auth/register

### Purpose

Registers a new PlacementHub account.

Supports both Student and Recruiter registration.

Administrator accounts are created only through administrative APIs.

### Authentication

Not Required

### Authorization

Public Endpoint

### Request Body

| Field | Type | Required | Description |
|--------|------|----------|-------------|
| name | String | Yes | User full name |
| email | String | Yes | Email address |
| password | String | Yes | Account password |
| role | Enum | Yes | student or company |
| company_name | String | Conditional | Required for recruiter registration |

### Success Response

- User account created
- JWT issued
- Authentication cookie generated
- Initial profile initialized

### Error Responses

| Status | Reason |
|---------|--------|
| 400 | Invalid role |
| 400 | Email already exists |

### Business Rules

- Email must be unique.
- Students start with pending verification.
- Recruiters start with pending approval.
- Password is securely hashed before storage.

### Database Collections

- users
- notifications
- audit_logs (indirect)

### Related Endpoints

- POST /auth/login
- GET /auth/me

## POST /auth/login

### Purpose

Authenticates an existing user.

### Authentication

Not Required

### Authorization

Public Endpoint

### Request Body

| Field | Type | Required |
|--------|------|----------|
| email | String | Yes |
| password | String | Yes |

### Success Response

- JWT issued
- User authenticated
- Session cookie created

### Error Responses

| Status | Reason |
|---------|--------|
| 401 | Invalid credentials |

### Database Collections

- users

### Related Endpoints

- POST /auth/logout
- GET /auth/me

## GET /auth/me

### Purpose

Returns the currently authenticated user.

### Authentication

Required

### Authorization

Authenticated Users

### Success Response

Returns authenticated user profile.

### Error Responses

| Status | Reason |
|---------|--------|
| 401 | Unauthorized |

### Database Collections

- users

## POST /auth/logout

### Purpose

Terminates the current authenticated session.

### Authentication

Required

### Authorization

Authenticated Users

### Success Response

Authentication cookie removed.

### Database Collections

None

## POST /auth/forgot-password

### Purpose

Initiates the password recovery workflow by generating a One-Time Password (OTP).

### Authentication

Not Required

### Authorization

Public Endpoint

### Request Body

| Field | Type | Required | Description |
|--------|------|----------|-------------|
| email | String | Yes | Registered user email |

### Success Response

- Password reset process initiated
- OTP generated
- Temporary reset session created

### Error Responses

| Status | Reason |
|---------|--------|
| 404 | Email not registered |
| 429 | Too many OTP requests |

### Business Rules

- OTP expiration time is enforced.
- Request rate limiting is applied.
- Previous active OTPs become invalid.

### Database Collections

- users
- password_reset_otps
- security_logs

### Related Endpoints

- POST /auth/verify-otp

## POST /auth/verify-otp

### Purpose

Verifies the OTP submitted during password recovery.

### Authentication

Not Required

### Authorization

Public Endpoint

### Request Body

| Field | Type | Required | Description |
|--------|------|----------|-------------|
| email | String | Yes | Registered email |
| otp | String | Yes | One-Time Password |

### Success Response

- OTP verified
- Temporary password reset token generated

### Error Responses

| Status | Reason |
|---------|--------|
| 400 | Invalid OTP |
| 400 | OTP expired |
| 429 | Maximum verification attempts exceeded |

### Business Rules

- OTP can only be used once.
- Verification attempts are limited.
- Expired OTPs are rejected.

### Database Collections

- password_reset_otps

### Related Endpoints

- POST /auth/reset-password

## POST /auth/reset-password

### Purpose

Completes the password recovery workflow by updating the user's password.

### Authentication

Temporary Password Reset Token

### Authorization

Verified Password Recovery Session

### Request Body

| Field | Type | Required | Description |
|--------|------|----------|-------------|
| new_password | String | Yes | New account password |

### Success Response

- Password updated
- Previous reset tokens invalidated
- Password recovery completed

### Error Responses

| Status | Reason |
|---------|--------|
| 400 | Invalid password |
| 401 | Invalid reset session |

### Business Rules

- Password policy validation is enforced.
- Passwords are securely hashed.
- Previous OTPs become permanently invalid.

### Database Collections

- users
- password_reset_otps
- security_logs

---

# Profile APIs

Profile APIs manage user profile information, profile completion tracking, document upload preparation, and student verification workflows.

---

## PUT /profile

### Purpose

Creates or updates the authenticated user's profile.

### Authentication

Required

### Authorization

Authenticated Users

### Request Body

Profile fields vary according to the authenticated user's role.

### Success Response

- Profile updated
- Profile completion recalculated

### Error Responses

| Status | Reason |
|---------|--------|
| 401 | Unauthorized |
| 400 | Invalid profile data |

### Business Rules

- Only authenticated users may modify their own profile.
- Profile completion is automatically recalculated after every update.

### Database Collections

- users

### Related Endpoints

- GET /profile/completion

## GET /profile/completion

### Purpose

Returns the current profile completion percentage and missing profile information.

### Authentication

Required

### Authorization

Authenticated Users

### Success Response

Returns:

- Completion Percentage
- Missing Fields
- Profile Status

### Error Responses

| Status | Reason |
|---------|--------|
| 401 | Unauthorized |

### Database Collections

- users

## GET /cloudinary/signature

### Purpose

Generates a signed Cloudinary upload signature for secure client-side document uploads.

### Authentication

Required

### Authorization

Authenticated Users

### Success Response

Returns:

- Cloud Name
- API Key
- Upload Signature
- Timestamp

### Error Responses

| Status | Reason |
|---------|--------|
| 401 | Unauthorized |

### Business Rules

- Upload signatures are generated server-side.
- Cloudinary credentials are never exposed to clients.

### Database Collections

None

---

# Document APIs

Document APIs manage upload, deletion, verification, and lifecycle management of student documents.

---

## POST /documents

### Purpose

Registers a newly uploaded student document.

### Authentication

Required

### Authorization

Students

### Request Body

| Field | Type | Required | Description |
|--------|------|----------|-------------|
| doc_type | Enum | Yes | Document category |
| url | String | Yes | Cloudinary document URL |

### Success Response

- Document stored
- Verification status initialized

### Error Responses

| Status | Reason |
|---------|--------|
| 400 | Invalid document |
| 401 | Unauthorized |

### Business Rules

- Documents are stored inside the authenticated student's profile.
- Uploaded documents require administrative verification.

### Database Collections

- users

## DELETE /documents/{doc_type}

### Purpose

Deletes an uploaded student document.

### Authentication

Required

### Authorization

Students

### Path Parameters

| Parameter | Description |
|-----------|-------------|
| doc_type | Document category |

### Success Response

Document removed successfully.

### Error Responses

| Status | Reason |
|---------|--------|
| 404 | Document not found |

### Database Collections

- users

## PATCH /admin/documents/{student_id}/{doc_type}

### Purpose

Approves or rejects uploaded student documents.

### Authentication

Required

### Authorization

Placement Administrator

### Path Parameters

| Parameter | Description |
|-----------|-------------|
| student_id | Student identifier |
| doc_type | Document category |

### Request Body

| Field | Type | Required |
|--------|------|----------|
| status | Enum | Yes |
| remarks | String | No |

### Success Response

Document verification updated.

### Error Responses

| Status | Reason |
|---------|--------|
| 401 | Unauthorized |
| 403 | Insufficient permissions |
| 404 | Student or document not found |

### Business Rules

- Only administrators may verify documents.
- Verification remarks are stored for auditability.

### Database Collections

- users
- audit_logs

---

# Job Management APIs

Job Management APIs allow approved recruiters and administrators to create, manage, publish, update, and monitor placement opportunities.

Students consume these APIs to browse available jobs and verify eligibility before submitting applications.

---
## POST /jobs

### Purpose

Creates a new placement opportunity.

### Authentication

Required

### Authorization

Approved Recruiters

### Request Body

Job creation payload including eligibility criteria, compensation details, application deadline, and job description.

### Success Response

- Job created
- Initial status assigned
- Job available for publishing workflow

### Error Responses

| Status | Reason |
|---------|--------|
| 401 | Unauthorized |
| 403 | Recruiter not approved |
| 400 | Invalid job information |

### Business Rules

- Only approved recruiters may create jobs.
- Jobs are associated with the authenticated recruiter.
- Eligibility rules are stored with each job.

### Database Collections

- jobs
- users

### Related Endpoints

- GET /jobs
- PUT /jobs/{job_id}


## GET /jobs

### Purpose

Returns placement opportunities visible to the authenticated user.

### Authentication

Required

### Authorization

All Authenticated Users

### Query Parameters

Filtering may include:

- Status
- Search
- Eligibility
- Recruiter
- Department
- Branch

### Success Response

Returns filtered job listings.

### Error Responses

| Status | Reason |
|---------|--------|
| 401 | Unauthorized |

### Database Collections

- jobs
- users

## GET /jobs/{job_id}

### Purpose

Returns complete information for a specific job.

### Authentication

Required

### Authorization

Authenticated Users

### Path Parameters

| Parameter | Description |
|-----------|-------------|
| job_id | Job identifier |

### Success Response

Complete job details.

### Error Responses

| Status | Reason |
|---------|--------|
| 404 | Job not found |

### Database Collections

- jobs

## GET /jobs/{job_id}/eligibility

### Purpose

Evaluates whether the authenticated student satisfies the eligibility requirements for a job.

### Authentication

Required

### Authorization

Students

### Path Parameters

| Parameter | Description |
|-----------|-------------|
| job_id | Job identifier |

### Success Response

Returns:

- Eligible
- Not Eligible
- Eligibility Explanation

### Business Rules

Eligibility evaluation considers:

- Branch
- Department
- Backlogs
- Graduation Year
- CGPA
- Placement Status
- Freeze Status
- Required Documents

### Database Collections

- users
- jobs

## PUT /jobs/{job_id}

### Purpose

Updates an existing job.

### Authentication

Required

### Authorization

Recruiter Owner

### Path Parameters

| Parameter | Description |
|-----------|-------------|
| job_id | Job identifier |

### Success Response

Job updated successfully.

### Error Responses

| Status | Reason |
|---------|--------|
| 403 | Access denied |
| 404 | Job not found |

### Database Collections

- jobs

## PATCH /jobs/{job_id}/status

### Purpose

Updates the operational status of a placement opportunity.

### Authentication

Required

### Authorization

Recruiter Owner

### Supported Status Values

- Draft
- Active
- Closed
- Archived

### Database Collections

- jobs

## DELETE /jobs/{job_id}

### Purpose

Deletes an existing placement opportunity.

### Authentication

Required

### Authorization

Recruiter Owner

### Business Rules

Associated application records are handled according to the platform's business rules.

### Database Collections

- jobs
- applications

## POST /jobs/{job_id}/apply

### Purpose

Submits a student application for a placement opportunity.

### Authentication

Required

### Authorization

Students

### Path Parameters

| Parameter | Description |
|-----------|-------------|
| job_id | Job identifier |

### Success Response

Application created successfully.

### Error Responses

| Status | Reason |
|---------|--------|
| 400 | Eligibility failed |
| 400 | Duplicate application |
| 403 | Student frozen |
| 404 | Job unavailable |

### Business Rules

Before an application is created the platform validates:

- Student verification
- Profile completion
- Required documents
- Eligibility criteria
- Placement policy
- Duplicate application prevention

### Database Collections

- applications
- jobs
- users

### Related Endpoints

- GET /applications/me

---

# Application Management APIs

Application APIs manage the complete lifecycle of student job applications from submission through recruitment decisions.

---

## GET /applications/me

### Purpose

Returns all job applications submitted by the authenticated student.

### Authentication

Required

### Authorization

Students

### Success Response

Returns:

- Applied Jobs
- Current Status
- Timeline
- Company Information

### Error Responses

| Status | Reason |
|---------|--------|
| 401 | Unauthorized |

### Database Collections

- applications
- jobs

## GET /jobs/{job_id}/applications

### Purpose

Returns all student applications submitted for a specific job.

### Authentication

Required

### Authorization

Recruiter Owner

### Path Parameters

| Parameter | Description |
|-----------|-------------|
| job_id | Job identifier |

### Success Response

Returns all applicants associated with the specified job.

### Error Responses

| Status | Reason |
|---------|--------|
| 403 | Access denied |
| 404 | Job not found |

### Database Collections

- applications
- users
- jobs

## GET /applications/received

### Purpose

Returns every application received by the authenticated recruiter.

### Authentication

Required

### Authorization

Recruiters

### Success Response

Applications grouped by recruiter-owned jobs.

### Database Collections

- applications
- jobs

## PATCH /applications/{app_id}/status

### Purpose

Updates the recruitment status of an application.

### Authentication

Required

### Authorization

Recruiter Owner

### Path Parameters

| Parameter | Description |
|-----------|-------------|
| app_id | Application identifier |

### Supported Status Values

- Applied
- Under Review
- Shortlisted
- Interview
- Selected
- Rejected

### Success Response

Application status updated.

### Business Rules

- Every status transition is recorded in the application timeline.
- Selecting a candidate automatically triggers offer generation when appropriate.
- Notifications are generated for important status changes.

### Database Collections

- applications
- offers
- notifications


---

# Offer Management APIs

Offer APIs manage placement offers issued to students after successful recruitment.

---

## GET /offers/me

### Purpose

Returns all placement offers received by the authenticated student.

### Authentication

Required

### Authorization

Students

### Success Response

Returns:

- Offer Details
- Company
- Compensation
- Offer Status

### Database Collections

- offers

## PATCH /offers/{offer_id}

### Purpose

Accepts or declines a placement offer.

### Authentication

Required

### Authorization

Students

### Path Parameters

| Parameter | Description |
|-----------|-------------|
| offer_id | Offer identifier |

### Request Body

| Field | Type | Required |
|--------|------|----------|
| action | Enum | Yes |

### Supported Actions

- Accept
- Decline

### Success Response

Offer status updated.

### Business Rules

Offer acceptance automatically performs:

- Placement confirmation
- Placement freeze
- Offer history update
- Placement statistics update
- Automatic handling of competing offers according to placement policy

### Database Collections

- offers
- users
- applications

---

# Notification APIs

Notification APIs provide authenticated users with real-time access to platform notifications generated by business events.

---

## GET /notifications

### Purpose

Returns all notifications belonging to the authenticated user.

### Authentication

Required

### Authorization

Authenticated Users

### Success Response

Returns:

- Notification List
- Read Status
- Notification Type
- Timestamp

### Database Collections

- notifications

## PATCH /notifications/{nid}/read

### Purpose

Marks a single notification as read.

### Authentication

Required

### Authorization

Authenticated Users

### Path Parameters

| Parameter | Description |
|-----------|-------------|
| nid | Notification identifier |

### Database Collections

- notifications

## PATCH /notifications/read-all

### Purpose

Marks every notification belonging to the authenticated user as read.

### Authentication

Required

### Authorization

Authenticated Users

### Database Collections

- notifications

---

# Dashboard APIs

Dashboard APIs provide analytics and operational statistics customized for each platform role.

---

## GET /student/stats

### Purpose

Returns placement statistics for the authenticated student.

### Authentication

Required

### Authorization

Students

### Returned Information

- Profile Completion
- Applications
- Active Jobs
- Offers
- Upcoming Interviews
- Active Campus Drives

### Database Collections

- users
- applications
- jobs
- offers
- interviews
- drives


## GET /company/stats

### Purpose

Returns recruiter dashboard statistics.

### Authentication

Required

### Authorization

Recruiters

### Returned Information

- Active Jobs
- Total Jobs
- Applications Received
- Hiring Statistics
- Interview Metrics
- Pending Feedback

### Database Collections

- jobs
- applications
- interviews


## GET /admin/stats

### Purpose

Returns administrative analytics across the PlacementHub platform.

### Authentication

Required

### Authorization

Placement Administrators

### Returned Information

- Student Statistics
- Recruiter Statistics
- Placement Metrics
- Active Drives
- Pending Interviews
- Pending Verification
- Department Analytics
- Branch Analytics

### Database Collections

- users
- jobs
- applications
- drives
- interviews
- events

---

# Administration APIs

Administrative APIs provide governance, verification, moderation, analytics, and platform management capabilities.

---

## PATCH /admin/students/{sid}/verification

### Purpose

Updates student verification status.

### Authorization

Placement Administrator

### Database Collections

- users
- audit_logs

## PATCH /admin/students/{sid}/freeze

### Purpose

Freezes or unfreezes student placement participation.

### Authorization

Placement Administrator

### Database Collections

- users
- audit_logs

## PATCH /admin/companies/{cid}/approval

### Purpose

Approves or rejects recruiter accounts.

### Authorization

Placement Administrator

### Database Collections

- users
- audit_logs

## GET /admin/students

### Purpose

Returns student records with enterprise filtering capabilities.

### Supported Filters

- Department
- Branch
- Verification Status
- Placement Status
- Frozen Status
- Missing Documents
- Search

### Database Collections

- users

## GET /admin/companies

### Purpose

Returns recruiter accounts for administrative review.

### Database Collections

- users


## GET /admin/users

### Purpose

Returns all registered platform users.

### Database Collections

- users

## GET /admin/students/{sid}

### Purpose

Returns complete information for a specific student.

### Database Collections

- users
- applications
- offers

## DELETE /admin/users/{user_id}

### Purpose

Removes a user and associated platform resources.

### Business Rules

Associated business records are removed according to platform deletion policy.

### Database Collections

- users
- jobs
- applications

## POST /admin/staff

### Purpose

Creates a new administrative staff account.

### Authorization

Super Administrator

### Database Collections

- users
- audit_logs

## GET /admin/staff

### Purpose

Returns all administrative staff members.

### Database Collections

- users

## GET /admin/audit

### Purpose

Returns administrative audit history.

### Database Collections

- audit_logs

---

# AI Services APIs

AI Services provide intelligent assistance to students through profile evaluation, company recommendations, and conversational AI.

Artificial Intelligence enhances user productivity but does not replace business workflows.

---

## POST /student/ai-review

### Purpose

Performs an AI-powered evaluation of the authenticated student's placement profile.

### Authentication

Required

### Authorization

Students

### Success Response

Returns:

- Profile Score
- Strengths
- Weaknesses
- Suggested Improvements
- AI Recommendations

### Business Rules

- AI analysis is generated using Google Gemini.
- Profile score is stored for future dashboard usage.

### Database Collections

- users

## GET /student/recommendations

### Purpose

Returns AI-generated company recommendations for the authenticated student.

### Authentication

Required

### Authorization

Students

### Success Response

Recommended companies based on:

- Skills
- Projects
- Branch
- Profile Quality
- Eligibility

### Database Collections

- users
- jobs

---

# Campus Drive APIs

Campus Drive APIs manage the complete lifecycle of institutional recruitment drives including creation, moderation, registration, participation, and operational management.

---

## POST /drives

### Purpose

Creates a new campus recruitment drive.

### Authorization

Approved Recruiters

### Database Collections

- drives

## GET /drives

### Purpose

Returns campus drives visible to the authenticated user.

### Database Collections

- drives
- drive_registrations

## GET /drives/{drive_id}

### Purpose

Returns detailed information for a campus drive.

### Database Collections

- drives

## PATCH /drives/{drive_id}/moderation

### Purpose

Approves or rejects a campus drive.

### Authorization

Placement Administrator

### Database Collections

- drives
- audit_logs

## PATCH /drives/{drive_id}/status

### Purpose

Updates the operational lifecycle status of a campus drive.

### Supported Status Values

- Draft
- Registration Open
- Upcoming
- Ongoing
- Completed
- Cancelled

### Database Collections

- drives

## POST /drives/{drive_id}/register

### Purpose

Registers a student for a campus drive.

### Business Rules

Validation includes:

- Eligibility
- Capacity
- Registration Deadline
- Duplicate Registration Prevention

### Database Collections

- drive_registrations
- users
- drives

## DELETE /drives/{drive_id}/register

### Purpose

Withdraws a student from a campus drive.

### Database Collections

- drive_registrations

## GET /drives/me/registered

### Purpose

Returns all campus drives registered by the authenticated student.

### Database Collections

- drive_registrations
- drives

## GET /drives/{drive_id}/registrations

### Purpose

Returns all student registrations for a campus drive.

### Authorization

Recruiter Owner

### Database Collections

- drive_registrations
- users

## PATCH /registrations/{reg_id}/stage

### Purpose

Updates the recruitment stage of a campus drive participant.

### Supported Stages

- Registered
- Eligible
- Shortlisted
- Round 1
- Round 2
- HR
- Offer
- Accepted
- Placed

### Business Rules

Stage progression follows institutional recruitment workflow.

### Database Collections

- drive_registrations
- users

---

# Interview Management APIs

Interview APIs manage scheduling, rescheduling, candidate responses, interview feedback, and interview lifecycle management.

---

## POST /interviews

### Purpose

Schedules a new interview for a student.

### Authentication

Required

### Authorization

Recruiters

### Success Response

Interview successfully scheduled.

### Business Rules

Interview scheduling automatically generates notifications for the student.

### Database Collections

- interviews
- notifications

## GET /interviews/me

### Purpose

Returns interviews assigned to the authenticated student.

### Authentication

Required

### Authorization

Students

### Success Response

Returns:

- Upcoming Interviews
- Completed Interviews
- Interview Status
- Schedule Information

### Database Collections

- interviews

## GET /interviews/company

### Purpose

Returns interviews scheduled by the authenticated recruiter.

### Authentication

Required

### Authorization

Recruiters

### Database Collections

- interviews

## PATCH /interviews/{iv_id}/respond

### Purpose

Allows students to accept or request rescheduling of an interview.

### Supported Responses

- Accept
- Request Reschedule

### Business Rules

Student responses automatically notify recruiters.

### Database Collections

- interviews
- notifications

## PATCH /interviews/{iv_id}

### Purpose

Updates interview details including schedule, venue, status, or cancellation.

### Authorization

Recruiter Owner

### Database Collections

- interviews
- notifications

## POST /interviews/{iv_id}/feedback

### Purpose

Stores structured recruiter feedback after interview completion.

### Success Response

Interview feedback recorded.

### Business Rules

Feedback includes:

- Technical Evaluation
- Communication
- Problem Solving
- Confidence
- Overall Rating
- Hiring Recommendation

### Database Collections

- interview_feedback
- interviews
- notifications

---

# Event Management APIs

Placement event APIs manage institution-wide placement activities displayed within the centralized calendar.

---

## POST /events

### Purpose

Creates a placement event.

### Authorization

Placement Administrator

### Database Collections

- events

## GET /events

### Purpose

Returns placement events visible to the authenticated user.

### Database Collections

- events

---

# Calendar APIs

Calendar APIs aggregate interviews, drives, deadlines, and placement events into a unified calendar view.

---

## GET /calendar

### Purpose

Returns role-specific placement calendar events.

### Returned Information

- Interviews
- Campus Drives
- Placement Events
- Registration Deadlines

### Database Collections

- interviews
- drives
- events


## GET /reminders

### Purpose

Returns upcoming placement reminders for the authenticated user.

### Reminder Types

- Interviews
- Registration Deadlines
- Offers
- Pending Verification

### Database Collections

- interviews
- drives
- offers
- users

---

# AI Chat APIs

AI Chat APIs provide persistent conversational assistance powered by Google Gemini.

Conversation history is maintained per authenticated user.

---

## GET /chat/history

### Purpose

Returns conversation history for the authenticated user.

### Database Collections

- chat_messages

## DELETE /chat/history

### Purpose

Deletes the authenticated user's conversation history.

### Database Collections

- chat_messages

## POST /chat

### Purpose

Processes AI chat requests and streams responses to the client.

### Authentication

Required

### Authorization

Authenticated Users

### Business Rules

- Responses are streamed using Server-Sent Events (SSE).
- Conversation history is automatically persisted.
- AI responses are generated using Google Gemini.
- Role-aware system context is applied.

### Database Collections

- chat_messages

---

# System APIs

System APIs expose basic service information used for monitoring and health verification.

---

## GET /

### Purpose

Returns the PlacementHub API root endpoint.

### Authentication

Not Required

## GET /health

### Purpose

Returns application health information.

### Authentication

Not Required

### Success Response

Service availability status.

Used by deployment platforms and operational monitoring.

---

# HTTP Status Codes

| Status Code | Description |
|-------------|-------------|
| 200 | Successful request |
| 201 | Resource created |
| 400 | Bad request |
| 401 | Authentication required |
| 403 | Permission denied |
| 404 | Resource not found |
| 409 | Resource conflict |
| 422 | Validation failed |
| 429 | Rate limit exceeded |
| 500 | Internal server error |

---

# Security Considerations

The PlacementHub API follows multiple security practices including:

- JWT-based authentication
- HTTP-only authentication cookies
- Role-Based Access Control (RBAC)
- Server-side authorization
- Password hashing
- Signed Cloudinary uploads
- Input validation
- Audit logging
- Security event logging
- Rate limiting for sensitive operations

---

# Future API Evolution

Future improvements may include:

- API versioning
- OpenAPI specification generation
- WebSocket support
- Rate limiting middleware
- API analytics
- API gateway integration
- Public integration APIs
- Webhook support

---

# Revision History

| Version | Date | Description |
|---------|------|-------------|
| 2.0.0 | 2026-08-03 | Initial enterprise API reference created. |

