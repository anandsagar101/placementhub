# ADR-006: Integrate Google Gemini for AI Features

Status: Accepted

Date: 2026-08-03

Owner: Anand Sagar

---

## Context

PlacementHub includes AI-assisted capabilities including profile review, career guidance, and conversational assistance.

AI functionality should remain independent from critical business workflows.

---

## Decision

Google Gemini has been selected as the primary AI provider.

---

## Alternatives Considered

- OpenAI APIs
- Anthropic Claude
- Self-hosted open-source models

---

## Consequences

Advantages

- Managed AI platform.
- Modern language model capabilities.
- Scalable integration.

Tradeoffs

- External API dependency.
- Usage-based pricing.
- Internet connectivity required.

---

## Related Documents

- 01_ARCHITECTURE.md
- 06_BACKEND_GUIDE.md
- 07_SECURITY.md