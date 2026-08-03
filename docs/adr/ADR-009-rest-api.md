# ADR-009: Adopt REST API Architecture

Status: Accepted

Date: 2026-08-03

Owner: Anand Sagar

---

## Context

Frontend and backend communicate over HTTP.

The project requires a widely understood, language-independent communication protocol.

---

## Decision

REST has been selected as the primary API architecture.

Endpoints are organized around business capabilities rather than database collections.

---

## Alternatives Considered

### GraphQL

Pros

- Flexible querying.
- Reduced over-fetching.

Cons

- Higher implementation complexity.
- Additional learning overhead.

---

### gRPC

Pros

- High performance.

Cons

- Less suitable for browser-first applications.
- More complex tooling.

---

## Consequences

Advantages

- Industry standard.
- Excellent tooling.
- Easy frontend integration.
- Automatic FastAPI documentation.

Tradeoffs

- Potential over-fetching.
- More endpoint definitions.

---

## Related Documents

- 04_API_REFERENCE.md
- 06_BACKEND_GUIDE.md