# Failure Modes & Recovery Strategies

This document defines the exact deterministic behavior of the system under catastrophic failure conditions. There are no "unknown states" in this architecture.

## 1. Distributed Execution Failures

### Consumer Crash Before Commit
*   **Trigger**: Kubernetes OOMKills a payment consumer pod exactly after it successfully hits the Stripe API and updates the Ledger, but *before* it commits the Kafka offset.
*   **Behavior**: Kafka detects the pod death and redelivers the message to a new consumer.
*   **Defense**: The new consumer checks the `ProcessedEvents` table inside a serializable CockroachDB transaction. It finds the `eventId` already exists. It instantly commits the Kafka offset and drops the message. **Result: Exactly-Once Execution.**

### Kafka CDC Duplication
*   **Trigger**: Debezium crashes and loses its WAL offset. It restarts and replays 50,000 `OutboxEvent` records into Kafka.
*   **Defense**: Identical to above. The `ProcessedEvents` table inherently drops all duplicated events before they reach the execution logic.

### Stripe Outage & Recovery Storm
*   **Trigger**: Stripe goes offline for 2 hours. Millions of events buffer in Kafka. Stripe comes back online. KEDA autoscales consumers to 2,000 pods.
*   **Defense**: Without limits, 2,000 pods would instantly DDOS Stripe, causing them to rate-limit us or crash again. We use a **Global Token Bucket** in etcd limiting external egress to 500 RPS. The pods will aggressively pull from Kafka but block internally, ensuring smooth, predictable recovery.

## 2. Data Management Failures

### ProcessedEvents Scalability (10M+ Events/Day)
*   **Problem**: Unbounded growth of the `ProcessedEvents` table will eventually degrade CockroachDB performance.
*   **Defense**: The `ProcessedEvents` table is partitioned by day. We implement an automated archival strategy:
    *   API Gateways reject requests with an `idempotencyKey` older than 7 days.
    *   Therefore, replay attacks older than 7 days are impossible.
    *   We safely `DROP PARTITION` for `ProcessedEvents` data older than 14 days, keeping the hot database small and fast without sacrificing correctness.

## 3. DLQ Governance & Replay

Permanent failures (e.g., AEAD validation failed, or Stripe returns `400 Bad Request`) are routed to the Dead Letter Queue (DLQ).

*   **Governance**: DLQ messages cannot be auto-replayed. They require manual intervention via an internal admin dashboard.
*   **Controlled Replay**: When an admin initiates a replay, the DLQ Recovery Worker runs in a "Dry-Run" mode first, simulating the execution against the current database state.
*   **Execution**: If approved, messages are re-published to the primary topic but rate-limited to 50 RPS to ensure they do not impact live production traffic.
