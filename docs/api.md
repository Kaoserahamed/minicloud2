# MiniCloud API Reference

Base URL: `http://localhost:8080` (development) or `https://api.minicloud.example.com` (production)

The OpenAPI 3.0 specification is available at `GET /api/openapi`.

## Authentication

MiniCloud uses bearer JWT tokens. Obtain a token by presenting an API key:

```
POST /api/auth/tokens
{
  "api_key": "mc_..."
}
```

Include the token in subsequent requests:

```
Authorization: Bearer <jwt>
```

## Roles and permissions

| Role   | Permissions                                                                                     |
| ------ | ----------------------------------------------------------------------------------------------- |
| admin  | `*` (all)                                                                                       |
| user   | compute:read/write, storage:read/write, network:read/write, database:read/write, dns:read/write |
| viewer | compute:read, storage:read, network:read, database:read, dns:read                               |

## Endpoints

### Health and version

- `GET /api/healthz` — health check
- `GET /api/readyz` — readiness check
- `GET /api/version` — version and build info
- `GET /api/openapi` — raw OpenAPI 3.0 specification

### Projects

- `GET /api/projects` — list projects (`compute:read`)
- `POST /api/projects` — create a project (`compute:write`)
- `GET /api/projects/:id` — get a project (`compute:read`)
- `DELETE /api/projects/:id` — delete a project (`admin`)

### Instances

- `GET /api/instances` — list instances (`compute:read`)
- `POST /api/instances` — create an instance (`compute:write`)

### Storage

- `GET /api/buckets` — list buckets (`storage:read`)

### Network

- `GET /api/vpcs` — list VPCs (`network:read`)

### DNS

- `GET /api/dns/zones` — list DNS zones (`dns:read`)

### Regions and zones

- `GET /api/regions` — list regions (`compute:read`)
- `GET /api/regions/:region/zones` — list zones in a region (`compute:read`)

## Errors

All errors return a JSON body:

```json
{
  "success": false,
  "error": "QUOTA_EXCEEDED",
  "message": "Quota exceeded for project proj_1",
  "violations": ["cpu"],
  "traceId": "abc123"
}
```

Common status codes: `400` validation, `401` unauthorized, `403` forbidden/quota, `404` not found, `409` conflict, `429` rate limited, `500` internal error.
