# ADR-001: Control Plane Architecture

## Status

Accepted

## Context

MiniCloud needs a central control plane responsible for API exposure,
authentication, RBAC, scheduling, resource orchestration, and coordination
of data plane agents.

## Decision

The control plane is a Node.js/Express service exposing a REST API. It owns
the PostgreSQL database (source of truth), runs the scheduler, and maintains
gRPC connections to data plane agents. All API traffic flows through the
control plane.

## Consequences

- Single logical API surface for operators and the CLI.
- Strong consistency via PostgreSQL.
- Agents depend on control plane availability for scheduling decisions.
