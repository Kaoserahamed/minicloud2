# ADR-003: Authentication and Authorization

## Status

Accepted

## Context

API access must be authenticated and authorized. Users, service accounts,
and the CLI all need scoped access to resources.

## Decision

Authentication uses bearer JWT tokens issued against API keys. Authorization
uses RBAC with three roles: admin, user, viewer. Permissions are checked at
the API layer via middleware. API keys authenticate service accounts.

## Consequences

- Stateless token verification (JWT).
- Role changes require new token issuance.
- API keys provide non-interactive access for CLI/Terraform.
