const { query } = require('./pool');
const { logger } = require('@minicloud/logging');

class QuotaRepository {
  async getByProject(projectId) {
    const res = await query('SELECT * FROM quotas WHERE project_id = $1', [projectId]);
    return res.rows[0] || null;
  }

  async set({ projectId, cpu, ramMb, storageGb, instances }) {
    const id = `quota_${projectId}`;
    await query(
      `INSERT INTO quotas (id, project_id, cpu, ram_mb, storage_gb, instances)
       VALUES ($1,$2,$3,$4,$5,$6)
       ON CONFLICT (project_id) DO UPDATE
         SET cpu = EXCLUDED.cpu, ram_mb = EXCLUDED.ram_mb,
             storage_gb = EXCLUDED.storage_gb, instances = EXCLUDED.instances`,
      [id, projectId, cpu, ramMb, storageGb, instances]
    );
    logger.info('Quota set', { projectId, cpu, ramMb, storageGb, instances });
    return { projectId, cpu, ramMb, storageGb, instances };
  }
}

function checkQuota(quota, requested) {
  const violations = [];
  if (quota.cpu < (requested.cpu || 0)) {
    violations.push('cpu');
  }
  if (quota.ram_mb < (requested.ramMb || 0)) {
    violations.push('ram');
  }
  if (quota.storage_gb < (requested.storageGb || 0)) {
    violations.push('storage');
  }
  if (quota.instances < (requested.instances || 0)) {
    violations.push('instances');
  }
  return { allowed: violations.length === 0, violations };
}

module.exports = { QuotaRepository, checkQuota };
