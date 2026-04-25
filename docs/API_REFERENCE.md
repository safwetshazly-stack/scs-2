# Public API Reference & SaaS Management

This document defines the external-facing APIs, SaaS tenant management, billing strategies, and webhook delivery guarantees for the hyperscale payment platform.

## 1. Public API Design

The API is fully asynchronous. It never blocks on external provider calls, guaranteeing zero socket exhaustion at 1M+ CCU.

### Base URL: `https://api.hyperscale-pay.com/v1`

### Authentication
All requests require a Bearer token (`JWT`) or an `API-Key` passed in the `Authorization` header.

### Endpoints

#### `POST /payments`
Initiates a payment asynchronously.

**Headers:**
*   `Authorization`: `Bearer <token>`
*   `Idempotency-Key`: `uuidv4` (Mandatory)

**Request Body:**
```json
{
  "amount": 5000,
  "currency": "usd",
  "paymentMethodId": "pm_123456",
  "description": "Premium Subscription"
}
```

**Response (202 Accepted):**
```json
{
  "success": true,
  "jobId": "job_987654",
  "status": "PENDING"
}
```

#### `GET /payments/:id`
Polls the status of a payment. (Recommended approach is Webhooks).

**Response (200 OK):**
```json
{
  "id": "job_987654",
  "status": "SUCCESS",
  "result": { "providerId": "ch_12345" }
}
```

## 2. Webhook System

Webhooks are the primary method for clients to receive terminal state updates (`SUCCESS` or `FAILED`).

### Delivery Guarantees
*   **At-Least-Once Delivery**: Webhooks are dispatched via a dedicated Kafka topic (`webhook.dispatch`).
*   **Retry Logic**: Exponential backoff (1m, 5m, 15m, 1h, 24h) before moving to a Webhook DLQ.
*   **Signature Verification**: Every webhook contains a `Hyperscale-Signature` header.
    ```text
    Hyperscale-Signature: t=1614567890,v1=a3b2c...
    ```
    Clients must compute the HMAC SHA-256 of the payload using their Webhook Secret to verify authenticity.

## 3. SaaS User & Access Control

*   **Tenant Isolation**: Every API key is cryptographically bound to an `accountId`. All database queries strictly scope to `accountId`.
*   **Key Rotation**: API keys consist of a prefix (`pk_live_`), a random 32-byte payload, and a checksum. Keys can be rolled instantly without downtime.

## 4. Billing System & Rate Limits

Pricing tiers govern the token bucket rate limiter evaluated at the API Gateway.

*   **Developer Plan**: 10 RPS. 2% transaction fee.
*   **Scale Plan**: 500 RPS. 1.5% transaction fee.
*   **Enterprise Plan**: 10,000+ RPS. Custom volume pricing.

Usage is tracked incrementally via Redis HyperLogLog and asynchronously aggregated to CockroachDB for monthly invoicing.
