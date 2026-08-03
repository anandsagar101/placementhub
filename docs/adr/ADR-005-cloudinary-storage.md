# ADR-005: Use Cloudinary for Media Storage

Status: Accepted

Date: 2026-08-03

Owner: Anand Sagar

---

## Context

Students upload resumes, certificates, and verification documents.

Storing media directly within the backend or database would increase operational complexity and reduce scalability.

---

## Decision

Cloudinary has been selected as the managed media storage platform.

---

## Alternatives Considered

- Local filesystem
- AWS S3
- Firebase Storage

---

## Consequences

Advantages

- Managed storage.
- CDN delivery.
- Simplified media handling.
- Scalable infrastructure.

Tradeoffs

- External service dependency.
- Vendor-specific integration.

---

## Related Documents

- 03_DATABASE_SCHEMA.md
- 08_DEPLOYMENT.md
- 07_SECURITY.md