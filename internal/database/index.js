const { ProjectRepository, ResourceRepository, AuditRepository } = require('./repositories');
const { QuotaRepository, checkQuota } = require('./quotas');

class DatabaseService {
  constructor() {
    this.projects = new ProjectRepository();
    this.resources = new ResourceRepository();
    this.audit = new AuditRepository();
    this.quotas = new QuotaRepository();
  }

  async checkProjectQuota(projectId, requested) {
    const quota = await this.quotas.getByProject(projectId);
    if (!quota) {
      return { allowed: false, violations: ['no_quota_defined'] };
    }
    return checkQuota(quota, requested);
  }
}

module.exports = {
  DatabaseService,
  ProjectRepository,
  ResourceRepository,
  AuditRepository,
  QuotaRepository,
  checkQuota,
};
