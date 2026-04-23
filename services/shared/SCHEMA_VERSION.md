# Schema Versioning & Compatibility Policy

## Current Schema Version
```
SCHEMA_VERSION = "2.0.0"
```

## Versioning Strategy
- **MAJOR**: Breaking changes (incompatible)
- **MINOR**: New features (backward compatible)
- **PATCH**: Bug fixes (backward compatible)

## Compatibility Guarantees
✅ All MINOR and PATCH versions maintain backward compatibility
⚠️ MAJOR versions require coordinated deployment
❌ Never remove fields without deprecation notice

## Deprecation Policy
- Fields marked `@deprecated` will be maintained for **3 full release cycles**
- Deprecation warnings will be logged
- Breaking changes announced 2 weeks in advance

## Contract Tests
All services must run contract tests against schema changes before deployment.

---
Last Updated: 2026-04-23
Maintained By: Architecture Team