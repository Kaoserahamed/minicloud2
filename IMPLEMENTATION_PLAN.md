# Implementation Plan: minicloud

## Overview

Build MiniCloud: a self-hostable micro cloud platform for developers with compute instances, object storage, VPC networking, load balancers, managed databases, DNS, monitoring, CLI tool, and Terraform provider.

Target scale: a large-scale codebase exceeding 200,000 lines of code across Go control plane, data plane agents, CLI, Terraform provider, web console, and infrastructure-as-code tooling.

## Core Ideas Derived from the Video (Launching Vidyst — Software Product Release)

The video "Launching Vidyst Live streaming and Recording Software" centers on bringing a software product to market: launch readiness, release automation, beta/user onboarding, streaming/recording media handling, and user-facing documentation. Applied to minicloud, these translate to:

1. **Product launch mindset** — treat each resource/service as a shippable product with beta gates, launch checklists, and post-launch monitoring.
2. **Release automation** — release automation (build, test, containerize, publish artifacts, release tags, changelogs) is implemented only after the project completes fully, at the final commit lock.
3. **Streaming/recording media** — object storage for large media objects, presigned URLs, multipart upload, streaming playback endpoints, recording artifact retention.
4. **Beta program & user onboarding** — feature flags, alpha/beta tester enrollment, feedback collection, gradual rollout.
5. **Documentation-first** — user guide, admin guide, API reference, migration guide from AWS, released alongside code.
6. **Observability at launch** — dashboards, alerting, health checks, audit logs ready before GA.

## Large-Scale Codebase Considerations (>200,000 LOC)

- Monorepo with clear module boundaries: `cmd/`, `internal/controlplane`, `internal/dataplane`, `internal/storage`, `internal/network`, `internal/compute`, `internal/database`, `internal/dns`, `internal/monitoring`, `internal/billing`, `internal/audit`, `pkg/`, `api/`, `cli/`, `terraform/`, `web/`, `docs/`, `tests/`, `infra/`.
- Go modules per major domain to keep compile times manageable; shared `pkg/` for cross-cutting concerns.
- Code generation for OpenAPI REST clients, gRPC stubs, and Terraform schema to reduce boilerplate.
- Strict layering: API handlers -> service layer -> repository layer -> data plane gRPC clients; no circular imports.
- Comprehensive test pyramid: unit tests (fast, isolated), integration tests (service + real DB/storage), e2e tests (full cluster), chaos tests (fault injection), performance benchmarks.
- Documentation treated as code: Markdown in `docs/`, OpenAPI in `api/`, ADRs in `docs/adr/`, generated API reference.
- Linting, formatting, pre-commit hooks, and branch protection enforced at scale.

## Git Workflow Standard (Strict)

Every unit of work follows this exact sequence:

1. **Feature development** — create `feature/<ticket>-<description>` from `development`; implement source code only.
2. **Testing** — add unit + integration + e2e tests; run lint/typecheck/test; all must pass.
3. **Documentation** — update API reference, user guide, ADR, and inline doc comments.
4. **Commit** — conventional commit message; squash to logical atomic commits.
5. **Push** — push branch to origin; open Pull Request targeting `development`; code review; merge; delete branch.

CI/CD and release automation gates are enforced at the **final commit** of the complete plan (see "Release & CI/CD Lock" section).

## Commit Roadmap (~300 Commits, Organized by Commit Count)

Commits are numbered sequentially and grouped by ranges of 50 to ensure logical, incremental progression. Each commit entry implies the full workflow: develop -> test -> document -> commit -> push.

### Commits 1-50: Foundation & Repository Bootstrap

1. Initialize empty repository and set Go module root (`go.mod`, `go.sum`)
2. Add `.gitignore`, license, and contributing guidelines
3. Define monorepo directory layout (`cmd/`, `internal/`, `api/`, `pkg/`, `tests/`, `docs/`, `infra/`)
4. Add multi-module Go workspace file (`go.work`)
5. Create `cmd/controlplane` entrypoint scaffold
6. Create `cmd/dataplane` agent entrypoint scaffold
7. Create `cmd/cli` mini-cloud CLI entrypoint scaffold
8. Define shared `pkg/` packages: config, errors, logging, tracing
9. Implement structured JSON logger with levels and trace IDs
10. Add configuration loader (env + YAML) with validation
11. Add secrets management interface (env, file, vault pluggable)
12. Implement request tracing middleware with trace ID propagation
13. Add health check endpoints (`/healthz`, `/readyz`)
14. Add version/build info endpoint (`/version`)
15. Configure `golangci-lint` and `gofmt` pre-commit hooks
16. Add `Makefile` with build, test, lint, fmt targets
17. Add project README with architecture overview and getting started guide
18. Add CODEOWNERS file for code review ownership
19. Add Dockerfile for control plane (multi-stage, distroless)
23. Generate gRPC Go stubs from protobuf definitions
24. Design OpenAPI spec for REST API (compute, storage, network, db, dns)
25. Generate OpenAPI server stubs and client SDK
26. Implement API router with Gin/Echo and middleware (auth, logging, tracing)
27. Implement service account and API key issuance
28. Implement JWT token issuance and validation middleware
29. Implement RBAC roles: admin, user, viewer
30. Add PostgreSQL connection pool and migration tooling
31. Create DB schema: projects, resources, users, roles, audit_log
32. Add DB migration runner (up/down, idempotent)
33. Implement project CRUD: create/list/delete projects
34. Implement resource quotas per project (CPU, RAM, storage, instances)
35. Add quota enforcement middleware at API layer
36. Define region/zone abstraction models
37. Implement region/zone CRUD and resource placement logic
38. Add control plane API server bootstrap with graceful shutdown
39. Add data plane agent bootstrap with gRPC connection to control plane
40. Implement agent registration: node heartbeat, resource discovery (CPU/RAM/disk)
41. Implement agent health reporting and liveness
42. Add scheduler interface and simple bin-packing algorithm
43. Implement scheduler placement decision for instances on nodes
44. Add unit tests: scheduler algorithm, IP allocation, instance state transitions
45. Add integration tests: agent-to-control-plane communication
46. Add integration tests: instance create/delete flow via agent
47. Add API documentation: OpenAPI UI, gRPC reflection, Postman collection
48. Add architecture ADRs (control plane, data plane, auth, storage)
49. Tag release `v0.1.0-foundation`
50. Phase 1 retrospective and roadmap alignment

### Commits 51-100: Compute, Storage, and Networking Core

51. Define compute instance model (VM-like container instances)
52. Implement instance lifecycle: create/start/stop/delete state machine
53. Add instance state persistence to PostgreSQL
54. Integrate containerd runtime for instance execution
55. Implement container image pull and run via containerd
56. Add instance networking: virtual bridge per project
57. Implement IPAM (IP allocation) per project subnet
58. Add veth pair creation for instance attach
59. Implement SSH key injection and authorized keys management
60. Add instance console access (serial output streaming)
61. Implement instance metadata service (cloud-init compatible, 169.254.169.254)
62. Add user-data / cloud-init script execution on boot
63. Implement S3-compatible object storage bucket API
64. Add bucket create/delete/list operations
65. Implement object PUT/GET/DELETE with streaming
66. Add pluggable storage driver interface (local FS, S3, pluggable)
67. Implement local filesystem storage backend
68. Add object metadata: custom metadata, content-type, ETag, Last-Modified
69. Implement presigned URL generation (temporary upload/download, expiration)
70. Add multipart upload: initiate, upload part, complete, abort
71. Implement multipart upload part listing and assembly
72. Add VPC networking: virtual private clouds, subnets, route tables
73. Implement internet gateway creation and attachment
74. Add security groups: stateful firewall, ingress/egress rules, default deny
75. Implement security group rule evaluation engine
76. Add network ACLs: stateless subnet-level allow/deny rules
77. Implement NACL rule evaluation at subnet boundary
78. Add elastic IPs: static IP allocation and release
79. Implement elastic IP associate/disassociate with instances
80. Add application load balancer (ALB) model
81. Implement ALB target groups and target registration
82. Add ALB health checks on targets
83. Implement ALB listeners: HTTP/HTTPS
84. Add SSL termination and certificate management for ALB
85. Add auto scaling groups: scaling policies, target tracking
86. Implement ASG cooldown periods and instance health
87. Add ASG scale-in/scale-out orchestration with scheduler
88. Implement managed database: PostgreSQL instances
89. Add DB backup/restore and point-in-time recovery
90. Add DB read replicas and promotion
91. Add unit tests: VPC routing, security group evaluation, ALB health checks
92. Add integration tests: end-to-end instance creation with networking
93. Add integration tests: object storage CRUD (bucket + object)
94. Add chaos tests: agent failure, control plane restart, network partition
95. Add performance benchmarks: instance boot time, storage throughput, API latency
96. Add load tests: concurrent API requests, agent connection saturation
97. Tag release `v0.2.0-core`
98. Phase 2 retrospective
99. Document VPC, security group, and load balancer user guides
100. Update API reference for compute, storage, network resources

### Commits 101-150: Databases, DNS, Monitoring, Observability

101. Implement managed Redis: instances, persistence config, maxmemory policies
102. Add Redis backup/restore and failover
103. Implement DNS management: hosted zones, record sets (A, CNAME, TXT, MX)
104. Add internal DNS for VPC service discovery
105. Implement DNS-based service discovery within VPC
106. Add Prometheus metrics export from control plane and agents
107. Implement custom metrics per resource (instance CPU, storage IOPS, network)
108. Add alerting: alert rules, evaluation engine, firing states
109. Implement notification channels: email, webhook, Slack
110. Add alert silencing and escalation policies
111. Implement Grafana dashboards for compute, storage, network utilization
112. Add centralized log collection from instances (agent -> control plane)
113. Implement log search and retention policies
114. Add instance snapshots: disk snapshots, snapshot schedules
115. Implement restore from snapshot to new volume
116. Add images/templates: custom machine images, image sharing across projects
117. Implement image build from running instance
118. Add placement groups: cluster placement for low-latency communication
119. Implement placement group affinity/anti-affinity scheduling
120. Add resource tagging: key-value tags on all resources
121. Implement tag-based filtering and listing
122. Add tag-based access control (TBAC) policies
123. Implement billing usage metering (compute hours, storage GB, network egress)
124. Add cost reports and project-level cost breakdown
125. Implement quotas: request limit increases, quota alerts
126. Add multi-tenancy: complete isolation between projects
127. Implement cross-project network isolation (VPC peering)
128. Add SSO integration: SAML/OIDC enterprise login
129. Implement SCIM user provisioning
130. Add audit log: all API actions, user attribution, retention policies
131. Implement audit log export and tamper-evident storage
132. Add GDPR compliance: data export, deletion, privacy controls
133. Implement right-to-be-forgotten data deletion workflow
134. Add penetration testing: API auth bypass, container escape prevention
135. Implement network isolation verification tests
136. Add high availability: control plane multi-node with etcd distributed state
137. Implement etcd leader election and failover
138. Add control plane rolling upgrade with zero downtime
139. Implement disaster recovery: automated backups, cross-region replication
140. Add DR runbook and failback procedures
141. Implement Kubernetes operator for MiniCloud control plane
142. Add Helm charts: control plane, agent, monitoring stack
143. Implement GitOps: ArgoCD application sets, sync policies, pruning
144. Add feature flags: remote configuration for gradual feature rollout
145. Implement feature flag evaluation service
146. Add unit tests: DNS resolution, alert evaluation, tag filtering
147. Add integration tests: DB failover, Redis failover, DNS record updates
148. Add integration tests: cross-region replication, DR failover
149. Add chaos tests: etcd node loss, control plane split-brain, region outage
150. Tag release `v0.3.0-advanced`

### Commits 151-200: CLI, Terraform, Web Console, Beta Program

151. Implement `mc` CLI: interactive and scriptable, config profiles
152. Add CLI `mc compute` subcommand (instances, images, snapshots)
153. Add CLI `mc storage` subcommand (buckets, objects, presigned URLs)
154. Add CLI `mc network` subcommand (VPC, subnets, security groups, ALB)
155. Add CLI `mc database` subcommand (instances, backups, replicas)
156. Add CLI `mc dns` subcommand (zones, records)
157. Implement Terraform provider scaffold for MiniCloud
158. Add Terraform resource: `mini_instance`
159. Add Terraform resource: `mini_bucket`, `mini_object`
160. Add Terraform resource: `mini_vpc`, `mini_subnet`, `mini_security_group`
161. Add Terraform resource: `mini_load_balancer`, `mini_target_group`
162. Implement CloudFormation-like templates: JSON/YAML stack deployment
163. Add stack management: create/update/delete/drift detection
164. Implement Pulumi SDK bindings (optional)
165. Implement spot instances: interruptible instances, spot pricing, termination notice
166. Add spot instance termination notice (2-minute warning)
167. Implement reserved instances: prepaid discounts, commitment tiers
168. Add reserved instance billing integration
169. Implement web console scaffold (React), resource visualization
170. Add web console topology graph (VPC, instances, ALB, DB)
171. Add web console resource listing and detail views
172. Implement web console authentication (JWT, SSO)
173. Add accessibility: WCAG compliance for web console
174. Implement performance profiling: Go pprof, memory allocation analysis
175. Add cache layer: Redis for session and metadata caching
176. Implement resource search across projects (full-text search)
177. Add search indexing and fuzzy matching
178. Implement beta program: alpha tester onboarding, enrollment
179. Add feedback collection mechanism (in-app, CLI, web)
180. Add beta feature flag gating for new resources
181. Implement unit tests: CLI commands, Terraform CRUD, spot pricing
182. Add integration tests: CLI end-to-end flows
183. Add integration tests: Terraform provider apply/destroy
184. Add integration tests: web console E2E (Playwright/Cypress)
185. Add chaos tests: CLI offline mode, Terraform partial apply recovery
186. Add performance benchmarks: CLI startup, Terraform plan/apply latency
187. Add load tests: web console concurrent users, search query latency
188. Document CLI user guide and command reference
189. Document Terraform provider resources and examples
190. Document web console user guide
191. Tag release `v0.4.0-product`
192. Phase 3 retrospective
193. Update ADRs: CLI, Terraform, web console, beta program
194. Add migration guide from AWS to MiniCloud
195. Add admin guide: installation, scaling, HA, DR
196. Add security guide: auth, RBAC, network isolation, audit
197. Add changelog generation from commit history
198. Add release notes template per version
199. Add support plan and SLA definitions
200. Beta launch readiness review

### Commits 201-250: Hardening, Performance, Search, Documentation Polish

201. Implement GDPR data export (portable JSON/zip per user)
202. Implement GDPR data deletion across all storage backends
203. Add data retention policies: logs, audit, snapshots, images
204. Implement automated backup scheduler (cron-based)
205. Add cross-region replication for backups and snapshots
206. Implement backup verification and restore drills
207. Add control plane multi-region deployment topology
208. Implement global load balancer / traffic steering
209. Add edge caching for static assets and metadata
210. Implement rate limiting per API key and per project
211. Add DDoS protection at API gateway layer
212. Implement mTLS between control plane and agents
213. Add certificate rotation (auto-renew via ACME/internal CA)
214. Implement secrets encryption at rest (KMS envelope encryption)
215. Add key rotation for envelope encryption
216. Implement WAF rules for API endpoints
217. Add IP allow/block lists at API gateway
218. Implement session management: JWT refresh, revocation, device tracking
219. Add OAuth2 device flow for CLI login
220. Implement SCIM group provisioning and deprovisioning
221. Add audit log streaming to SIEM (Splunk, Datadog, Elastic)
222. Implement compliance reporting: SOC2, ISO27001 evidence export
223. Add penetration testing: container escape, privilege escalation, network
224. Implement fuzz testing for API input validation
225. Add dependency vulnerability scanning (govulncheck, Snyk)
226. Implement SBOM generation for all container images
227. Add license compliance scanning for dependencies
228. Implement reproducible builds (deterministic Go builds)
229. Add build provenance and attestation (SLSA)
230. Implement canary deployments for control plane updates
231. Add blue-green deployment support via Helm/ArgoCD
232. Implement feature flag targeting (percentage rollout, user targeting)
233. Add feature flag audit log
234. Implement incident response runbook and on-call rotation
235. Add chaos engineering: game day scenarios, fault injection framework
236. Add cost anomaly detection and alerting
237. Implement budget alerts per project
238. Add reserved instance expiration notifications
239. Implement spot instance rebalancing recommendations
240. Add capacity planning recommendations (rightsizing)
241. Implement resource rightsizing advisor
242. Add reserved instance exchange/upgrade workflow
243. Implement consolidated billing across projects (org accounts)
244. Add org-level RBAC and permission inheritance
245. Implement cross-account resource sharing (RAM-like)
246. Add resource groups and tag policies at org level
247. Implement service quotas at org level
248. Add trusted access for third-party integrations
249. Implement private link / VPC endpoint for MiniCloud APIs
250. Tag release `v0.5.0-hardened`

### Commits 251-300: Launch Readiness, GA, CI/CD Lock

251. Implement recording/streaming media storage (object storage for Vidyst-like media)
252. Add media presigned URLs with short expiration for uploads
253. Implement media playback streaming endpoints (range requests)
254. Add media metadata extraction (duration, codec, resolution)
255. Implement media thumbnail generation pipeline
256. Add media transcoding job queue and worker
257. Implement media CDN edge caching
258. Add media access control (signed URLs, token auth)
259. Implement media usage metering (storage GB, egress GB, minutes)
260. Add media cost reporting per project
261. Implement beta launch: tester onboarding dashboard
262. Add beta feedback triage and priority assignment
263. Implement beta feature flag lifecycle (alpha -> beta -> GA)
264. Add beta exit criteria and sign-off checklist
265. Implement GA launch readiness checklist
266. Add final security review and penetration test sign-off
267. Implement compliance audit (SOC2 Type I evidence package)
268. Add production runbook: incident, escalation, rollback
269. Implement on-call rotation and paging integration
270. Add capacity plan for GA launch traffic
271. Implement auto-scaling for control plane under launch load
272. Add circuit breakers and bulkheads at API gateway
273. Implement graceful degradation (read-only mode during outages)
274. Add chaos validation: full cluster failure scenarios
275. Implement final performance tuning (pprof-guided)
276. Add final load test at projected GA peak (10x expected load)
277. Implement documentation freeze: user guide, admin guide, API reference
278. Add migration guide final review (AWS -> MiniCloud)
279. Add support plan and SLA finalization
280. Generate release notes for v1.0.0
281. Tag release `v1.0.0-rc1`
282. RC1 testing: CLI, Terraform, web console, API
283. Fix RC1 blockers and regressions
284. Tag release `v1.0.0` — General Availability
285. Add post-launch monitoring dashboard (launch metrics)
286. Implement post-launch incident review process
287. Add feature usage analytics (opt-in)
288. Implement NPS/CSAT collection post-launch
289. Add roadmap for v1.1 (post-GA backlog)
290. Final code freeze and branch protection enforcement
291. Update all ADRs to reflect GA architecture
292. Add final architecture decision record (GA launch)
293. Implement release automation: tag -> container publish -> Helm chart release
294. Add release artifact signing (cosign)
295. Implement SBOM and provenance attachment to releases
296. Add deprecation policy and version support matrix
297. Final community announcement assets (blog, tweets, changelog)
298. CI/CD and git workflow gate enforcement (final lock)
299. Merge all feature branches to `development`, then to `main`
300. Final `git push` of all tags and branches; project complete

## Release & CI/CD Lock (Final Commit)

The CI/CD pipeline and git workflow are enforced at the **final commit (commit 300)** as the project's release lock:

- CI pipeline (build, test, lint, security scan) must pass on `main` before any tag.
- Container images signed with cosign; SBOM and provenance attached to every release.
- Helm charts versioned and published alongside container images.
- Git tags (`v1.0.0`, etc.) immutable once pushed.
- Branch protection: `main` and `development` require PR review + passing CI; no direct pushes.
- All 300 commits follow: feature development -> testing -> documentation -> commit -> push.
- Post-GA: hotfix branches from `main`, feature branches from `development`.
