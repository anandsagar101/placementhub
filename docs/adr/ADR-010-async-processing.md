# ADR-010: Use Asynchronous Backend Processing

Status: Accepted

Date: 2026-08-03

Owner: Anand Sagar

---

## Context

PlacementHub performs database operations and communicates with multiple external services.

Efficient handling of concurrent requests improves scalability and responsiveness.

---

## Decision

Use Python asynchronous programming with FastAPI and asynchronous MongoDB operations.

---

## Alternatives Considered

### Synchronous Processing

Pros

- Easier to understand.

Cons

- Lower concurrency.
- Reduced scalability.

---

## Consequences

Advantages

- Improved request throughput.
- Better utilization of I/O wait time.
- Strong compatibility with FastAPI.

Tradeoffs

- Requires understanding async programming.
- More careful debugging.

---

## Related Documents

- 06_BACKEND_GUIDU.md
- 08_DEPLOYMENT.md