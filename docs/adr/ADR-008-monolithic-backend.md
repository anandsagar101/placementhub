# ADR-008: Maintain a Monolithic Backend with Planned Modularization

Status: Accepted

Date: 2026-08-03

Owner: Anand Sagar

---

## Context

Current project size does not justify microservices.

Development speed, simplicity, and maintainability are higher priorities than service decomposition.

---

## Decision

Maintain a centralized FastAPI backend while designing the codebase to support future modularization.

Future extraction into routers, services, repositories, and additional modules should occur only when complexity justifies it.

---

## Alternatives Considered

### Microservices

Pros

- Independent deployment.
- Team scalability.

Cons

- Operational complexity.
- Distributed system challenges.
- Increased infrastructure cost.

---

### Modular Monolith

Pros

- Better internal separation.

Cons

- Additional upfront structure.

---

## Consequences

Advantages

- Faster development.
- Simpler deployment.
- Easier debugging.
- Lower operational overhead.

Tradeoffs

- Larger application file during early development.
- Requires disciplined future refactoring.

---

## Related Documents

- 01_ARCHITECTURE.md
- 06_BACKEND_GUIDE.md
- 11_ROADMAP.md