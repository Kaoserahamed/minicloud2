# ADR-002: Data Plane Architecture

## Status

Accepted

## Context

Compute instances run on worker nodes. Each node runs a data plane agent
that registers with the control plane, reports heartbeats and resources,
and executes instance lifecycle operations via a container runtime.

## Decision

The data plane is a lightweight Node.js agent exposing a local REST API.
It registers with the control plane over gRPC/HTTP, reports CPU/RAM/disk
discovery, and handles instance start/stop/delete. The control plane
initiates actions; the agent executes them.

## Consequences

- Agents are stateless from a configuration perspective (state in control plane).
- Agent failure is detected via missed heartbeats.
- Node-local execution keeps instance traffic off the control plane.
