# ADR-004: Object Storage

## Status

Accepted

## Context

MiniCloud provides S3-compatible object storage with buckets and objects,
presigned URLs, and multipart upload.

## Decision

Storage uses a pluggable driver interface with a local filesystem backend
as the default. Object metadata (content-type, ETag, Last-Modified,
custom metadata) is stored alongside objects. Presigned URLs grant
time-limited upload/download access.

## Consequences

- Backend can be swapped to S3 or other storage without API changes.
- Local backend limits durability to a single node until S3 backend added.
