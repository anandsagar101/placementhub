# ADR-003: Use MongoDB as Primary Database

Status: Accepted

Date: 2026-08-03

Owner: Anand Sagar

---

## Context

PlacementHub manages diverse and evolving business entities including:

- Users
- Jobs
- Applications
- Campus Drives
- Interviews
- Offers
- Notifications
- AI metadata

The data model is expected to evolve frequently during development.

---

## Decision

MongoDB Atlas has been selected as the primary operational database.

---

## Alternatives Considered

### PostgreSQL

Pros

- Strong relational consistency.
- Mature ecosystem.

Cons

- More rigid schema evolution.
- Additional migration management.

---

### MySQL

Pros

- Popular
- Reliable

Cons

- Less flexible document modeling.

---

### Firebase

Pros

- Managed infrastructure.

Cons

- Vendor lock-in.
- Less control over backend architecture.

---

## Consequences

Advantages

- Flexible document model.
- Rapid schema evolution.
- Strong integration with FastAPI.
- Managed cloud service.
- Horizontal scalability.

Tradeoffs

- No relational constraints.
- Requires careful schema discipline.

---

## Related Documents

- 03_DATABASE_SCHEMA.md
- 06_BACKEND_GUIDE.md
- 08_DEPLOYMENT.md