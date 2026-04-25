# Hyperscale Payment Platform Architecture

## 1. Final System Architecture

The system operates under a strict **Fail-Stop** paradigm. Mathematical financial correctness is prioritized over availability. The architecture relies on CockroachDB for serializable isolation, Debezium for polling-free event generation, Kafka for streaming, and etcd for Raft-based consensus locking.

### Components and Trust Boundaries
*   **Public API Gateway**: The only public ingress. Performs AEAD cryptographic signing and atomic DB writes. Never communicates with external providers.
*   **CockroachDB (Global DB)**: The ultimate source of truth. Enforces DB-level idempotency and serializability.
*   **Debezium CDC**: Tails the WAL of CockroachDB to publish outbox events to Kafka, guaranteeing no polling bottlenecks.
*   **Kafka Cluster**: The event backbone, partitioned heavily by `jobId` to guarantee sequential processing per transaction.
*   **etcd Cluster**: Provides Raft-consensus distributed locking and acts as the central repository for the global Kill Switch.
*   **Payment Consumers**: Internal workers that acquire locks, perform AEAD validation, execute external Stripe calls via Circuit Breakers, and update the immutable Double-Entry Ledger.

## 2. Database Design & Ledger Immutability

The schema enforces strict idempotency and introduces **Cryptographic Hash Chaining** on the Ledger to prevent tampering by database administrators.

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model Job {
  id             String    @id @default(uuid())
  accountId      String    // SaaS Tenant ID
  idempotencyKey String
  status         JobStatus @default(PENDING)
  fencingToken   Int       @default(0) 
  
  // AEAD Encryption for Payload Integrity
  payloadCipher  String    
  payloadIv      String    
  payloadAuthTag String    
  
  createdAt      DateTime  @default(now())
  updatedAt      DateTime  @updatedAt

  @@unique([accountId, idempotencyKey]) 
}

model OutboxEvent {
  eventId        String   @id @default(uuid())
  topic          String
  payloadCipher  String   
  payloadIv      String
  payloadAuthTag String
  createdAt      DateTime @default(now())
}

// Partitioned by Time (e.g., daily partitions in CockroachDB) with a 7-day TTL
model ProcessedEvent {
  eventId       String   @id
  processedAt   DateTime @default(now())
  
  @@index([processedAt])
}

// Immutable Hash-Chained Ledger
model Ledger {
  id            String   @id @default(uuid())
  jobId         String
  accountId     String
  amount        Decimal  
  currency      String
  
  // Hash Chaining to prevent Admin Tampering
  previousHash  String   @unique
  currentHash   String   @unique
  
  createdAt     DateTime @default(now())

  Job           Job      @relation(fields: [jobId], references: [id])
  @@index([accountId])
}

enum JobStatus { PENDING, PROCESSING, SUCCESS, FAILED }
```

## 3. Infrastructure & Zero-Trust Policies

### KEDA Autoscaling (Kafka Lag Based)
```yaml
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: payment-consumer-scaler
spec:
  scaleTargetRef:
    name: payment-consumer
  minReplicaCount: 10
  maxReplicaCount: 2000
  triggers:
  - type: kafka
    metadata:
      bootstrapServers: kafka-cluster:9092
      consumerGroup: payment-group
      topic: payment.requested
      lagThreshold: "100" 
```

### Network Policies (Zero Trust)
```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: isolate-consumers
spec:
  podSelector:
    matchLabels:
      app: payment-consumer
  policyTypes:
  - Egress
  egress:
  - to:
    - podSelector:
        matchLabels:
          app: cockroachdb
    - podSelector:
        matchLabels:
          app: etcd
    - ipBlock:
        cidr: 0.0.0.0/0 # Only consumers can access internet (Stripe)
```

## 4. Failure Handling & Guarantees

| Scenario | System Behavior & Exact Mitigation | Result |
| :--- | :--- | :--- |
| **Kafka Duplication** | `ProcessedEvents` checked inside DB transaction. Second event finds match, commits offset, drops payload. | EXACTLY-ONCE |
| **Consumer Crash Pre-Commit** | Message redelivers. New pod checks `ProcessedEvents`, sees success, commits offset, drops payload. | EXACTLY-ONCE |
| **Bit-Level Corruption** | AEAD MAC validation fails before processing. Message sent to DLQ. Alert triggered. | ZERO CORRUPTION |
| **Stripe Outage + Recovery** | Circuit Breaker opens. Token Bucket (etcd) enforces max 500 RPS egress. Backlog drains slowly regardless of KEDA scaling. | NO RECOVERY STORM |
| **Network Partition** | etcd Raft consensus fails to grant Fencing Tokens in minority partition. Consumers halt processing. | NO SPLIT-BRAIN |
