# Phase 1 Retrospective — Foundation (v0.1.0-foundation)

## Summary

Phase 1 (commits 1-50) established the MiniCloud foundation: repository
bootstrap, shared packages, control plane / data plane entrypoints, the
REST API with auth and RBAC, the database layer, region/zone and scheduler,
tests, documentation, and ADRs.

## What went well

- Monorepo layout with clear package boundaries (`cmd/`, `internal/`,
  `pkg/`, `api/`, `tests/`, `docs/`).
- Shared cross-cutting concerns (config, errors, logging, tracing, secrets)
  are consistent across entrypoints.
- Strict layering (API -> service -> repository) keeps domain logic isolated.
- OpenAPI spec drives the API surface and is served at `/api/openapi`.
- Tests pass and lint/format are clean.

## What to improve

- The data plane currently speaks HTTP to the control plane; plan item 39
  (gRPC agent connection) should be completed in Phase 2.
- PostgreSQL is configured but not provisioned in development; add a
  docker-compose/dev database.
- Add OpenAPI-generated client SDK and server stubs (plan items 24-25).

## Roadmap alignment (Phase 2: commits 51-100)

Proceed with compute instance lifecycle, object storage (S3-compatible),
IPAM/VPC networking, security groups, ALB, and managed databases per the
commit roadmap.
