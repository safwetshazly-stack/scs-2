# Security Model & Immutability

This system prioritizes absolute financial correctness. Security is embedded deeply into the data layer, ensuring that even internal database administrators cannot silently corrupt financial records.

## 1. Ledger Tampering & Immutability (Hash Chaining)

To protect against malicious internal actors or compromised DB credentials, the `Ledger` table implements **Cryptographic Hash Chaining** (similar to a blockchain).

*   Every ledger entry includes a `previousHash` and a `currentHash`.
*   `currentHash = SHA-256(id + jobId + amount + previousHash + SECRET_SALT)`
*   An external audit service (or AWS QLDB) continuously verifies the chain. If an admin manually updates an `amount` via SQL, the hash chain breaks, instantly triggering a P1 security alert and halting the system.

## 2. Kill Switch Reliability

The Kill Switch ensures that if any mathematical invariant fails, the system **Fails-Stop**. 

*   **Mechanism**: Do not rely on Redis (which favors availability/partition tolerance). The Kill Switch state is stored in **etcd** (CP over AP). 
*   **Behavior**: When triggered (`etcdctl put SYSTEM_HALT 1`), etcd propagates the event.
    *   API Gateways immediately return `503 Service Unavailable` for new writes.
    *   Kafka Consumers crash deliberately (`process.exit(1)`) and Kubernetes Readiness probes fail until the flag is cleared.

## 3. AEAD Cryptographic Integrity

Kafka and network boundaries are assumed to be hostile environments subject to bit-flips and tampering.

*   The API Gateway encrypts the incoming JSON payload using `AES-256-GCM` before storing it in CockroachDB or Kafka.
*   The Consumer decrypts the payload. If the `AuthTag` (MAC) fails validation, it means the payload was modified or corrupted in transit. The Consumer drops the message and alerts Security.

## 4. Replay Attack Protection

Idempotency keys prevent double execution of identical payloads. However, a malicious user could capture an old idempotency key and payload, and attempt to replay it years later.

*   **Protection**: The API validates the JWT `jti` (JWT ID) and `iat` (Issued At) claims. Payloads older than 5 minutes are rejected at the edge, preventing replay attacks using captured network traffic.
