# ADR-004: Use JWT for Authentication

Status: Accepted

Date: 2026-08-03

Owner: Anand Sagar

---

## Context

PlacementHub requires stateless authentication for multiple user roles while supporting independent frontend and backend deployments.

---

## Decision

JSON Web Tokens (JWT) are used as the primary authentication mechanism.

---

## Alternatives Considered

### Server Sessions

Pros

- Simple implementation.

Cons

- Server-side session storage.
- Reduced scalability.

---

### OAuth Only

Pros

- Third-party authentication.

Cons

- Unnecessary complexity for the current project scope.

---

## Consequences

Advantages

- Stateless authentication.
- Suitable for distributed deployments.
- Supports frontend/backend separation.

Tradeoffs

- Requires secure token lifecycle management.
- Token revocation requires additional design.

---

## Related Documents

- 07_SECURITY.md
- 06_BACKEND_GUIDE.md