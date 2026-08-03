# ADR-007: Deploy Frontend on Vercel and Backend on Render

Status: Accepted

Date: 2026-08-03

Owner: Anand Sagar

---

## Context

PlacementHub requires independent deployment of frontend and backend while minimizing infrastructure management overhead.

The deployment platform should support:

- Continuous deployment
- Managed infrastructure
- HTTPS
- Scalability
- Simple operational workflow

---

## Decision

Deploy:

- React Frontend → Vercel
- FastAPI Backend → Render

MongoDB Atlas, Cloudinary, and Google Gemini remain managed external services.

---

## Alternatives Considered

### AWS

Pros

- Maximum flexibility.
- Enterprise ecosystem.

Cons

- Higher operational complexity.
- Increased infrastructure management.

---

### Railway

Pros

- Easy deployment.

Cons

- Less mature operational ecosystem for long-term scaling.

---

### Self Hosting

Pros

- Complete control.

Cons

- Higher maintenance.
- Infrastructure ownership.

---

## Consequences

Advantages

- Independent deployments.
- Automatic HTTPS.
- Managed infrastructure.
- Reduced operational overhead.

Tradeoffs

- Vendor dependency.
- Service limits on free tiers.

---

## Related Documents

- 01_ARCHITECTURE.md
- 08_DEPLOYMENT.md