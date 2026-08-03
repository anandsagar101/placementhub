# ADR-002: Adopt FastAPI for Backend

Status: Accepted

Date: 2026-08-03

Owner: Anand Sagar

---

## Context

PlacementHub required a backend framework capable of supporting:

- High-performance REST APIs
- Asynchronous request processing
- Automatic API documentation
- Strong validation
- Maintainable architecture
- Future scalability

The backend is responsible for all business logic, authentication, authorization, and database interactions.

---

## Decision

FastAPI has been selected as the official backend framework for PlacementHub.

---

## Alternatives Considered

### Flask

Pros

- Lightweight
- Mature ecosystem

Cons

- Requires additional libraries for validation and API documentation.
- Less structured for larger applications.

---

### Django

Pros

- Batteries included
- Mature ORM
- Large ecosystem

Cons

- Monolithic architecture.
- Unnecessary features for an API-first backend.
- Less flexibility for asynchronous APIs.

---

### Express.js

Pros

- Large ecosystem
- JavaScript throughout the stack

Cons

- Separate language from current backend strategy.
- Additional validation libraries required.

---

## Consequences

Advantages

- Native async support.
- Automatic OpenAPI generation.
- Excellent Pydantic integration.
- High performance.
- Strong developer experience.

Tradeoffs

- Smaller ecosystem than Django.
- Requires understanding asynchronous programming.

---

## Related Documents

- 01_ARCHITECTURE.md
- 04_API_REFERENCE.md
- 06_BACKEND_GUIDE.md