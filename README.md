# MiniCloud

MiniCloud is a self-hostable micro cloud platform for developers with compute instances, object storage, VPC networking, load balancers, managed databases, DNS, monitoring, CLI tool, and Terraform provider.

## Architecture

MiniCloud follows a control plane / data plane architecture:

- **Control plane** (`cmd/controlplane`): REST API, auth, RBAC, scheduling, resource orchestration
- **Data plane** (`cmd/dataplane`): agent running on compute nodes, instance execution, networking
- **CLI** (`cmd/cli`): `mc` command-line tool
- **Packages** (`pkg/`): cross-cutting concerns (config, errors, logging, tracing)
- **Internal domains** (`internal/`): controlplane, dataplane, storage, network, compute, database, dns, monitoring, billing, audit

## Getting started

```bash
npm install
npm run start:controlplane
```

## Git workflow

See [CONTRIBUTING.md](./CONTRIBUTING.md) for the strict git workflow and commit conventions.

## License

MIT
