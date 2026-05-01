# Apache Kafka Integration Plan
## Medical Coverage System Architecture Evolution

## Current State
✅ Redis Streams currently handles all messaging:
- Async job queues
- Domain event bus
- Saga orchestration coordination
- Request/reply patterns

## Recommended Architecture

### 1. Separation of Concerns

| Workload Type | Recommended Technology | Retention | Durability | Throughput |
|---|---|---|---|---|
| Short running async jobs, real-time notifications | **Redis Streams** | Minutes-Hours | Best-effort | High |
| Permanent event log, audit trail, system of record | **Apache Kafka** | Permanent | Guaranteed | Extreme |
| Long running workflows, sagas, business processes | **Kafka + Temporal** | Permanent | Guaranteed | Medium |
| Request/reply, command patterns | **Redis Streams** | Seconds | At-least-once | Very High |

### 2. Migration Stages

#### Stage 1: Dual Write (No Breaking Changes)
- Keep Redis as primary queue
- Add Kafka producer as sidecar publisher
- All domain events are published to both systems
- Existing consumers continue using Redis
- No downtime, safe rollback possible

#### Stage 2: Parallel Consumers
- Implement new Kafka consumers alongside existing Redis consumers
- Idempotency keys ensure messages are processed exactly once regardless of source
- Run both streams in parallel for validation period

#### Stage 3: Gradual Cutover
- Switch event sourcing read model to use Kafka only
- Migrate sagas to use Kafka for state transitions
- Retire Redis event consumers one by one

#### Stage 4: Optimize Redis Usage
- Convert Redis to be exclusively for:
  - Caching layer
  - Real-time socket notifications
  - Rate limiting
  - Temporary job queues
  - Leader election

### 3. Topic Design

| Topic Name | Partition Count | Retention | Purpose |
|---|---|---|---|
| `domain-events.v1` | 12 | 7 years | System-wide event log |
| `commands.v1` | 8 | 1 day | Command messages |
| `saga-events.v1` | 8 | 30 days | Saga orchestration |
| `audit-log.v1` | 4 | Permanent | Immutable audit trail |
| `notifications.v1` | 4 | 7 days | User notifications |

### 4. Schema Management
- Use Avro / Protobuf schemas for all Kafka messages
- Schema registry with versioning
- Forward/backward compatibility guarantees
- Automatic schema validation on producers/consumers

### 5. Integration Points

#### Required Changes:
1. ✅ Event Store already implemented in PostgreSQL
2. ✅ Idempotency keys implemented in database
3. ✅ Dead Letter Queue management implemented
4. ☐ Add Kafka producer library to shared message queue
5. ☐ Implement dual publishing in EventBus
6. ☐ Add Kafka consumer group management

### 6. Testing & Validation
- Run side-by-side comparison for 30 days
- Verify message ordering guarantees
- Measure end-to-end latency
- Validate exactly-once processing semantics
- Failure testing for broker outages

### 7. Infrastructure Requirements
- 3 node Kafka cluster (minimum)
- 3 node Zookeeper ensemble or KRaft mode
- Schema registry service
- Kafka Connect for database CDC
- Monitoring stack: Prometheus + Grafana + Burrow
- UI: AKHQ or Confluent Control Center

## Risk Mitigation

| Risk | Mitigation Strategy |
|---|---|
| Operational complexity | Start with managed Kafka service (AWS MSK / Confluent Cloud) |
| Learning curve | Use wrapper libraries with Redis-like interface |
| Migration risk | Maintain dual pipeline for full transition period |
| Performance impact | Benchmark and optimize before full cutover |

## Success Criteria
- Zero downtime during migration
- 100% message delivery guarantee
- Event replay capabilities
- Full audit trail for all system changes
- Linear scalability for 20M+ members

---
**Implementation Timeline**: 8-12 weeks
**Risk Level**: Medium (well understood migration path)
**ROI**: System will support 100x current throughput