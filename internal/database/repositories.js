const { query } = require('./pool');
const { logger } = require('@minicloud/logging');

class ProjectRepository {
  async create({ id, name }) {
    await query('INSERT INTO projects (id, name) VALUES ($1, $2)', [id, name]);
    logger.info('Project created', { id, name });
    return { id, name };
  }

  async list() {
    const res = await query('SELECT id, name, created_at FROM projects ORDER BY created_at DESC');
    return res.rows;
  }

  async get(id) {
    const res = await query('SELECT id, name, created_at FROM projects WHERE id = $1', [id]);
    return res.rows[0] || null;
  }

  async remove(id) {
    await query('DELETE FROM projects WHERE id = $1', [id]);
    logger.info('Project deleted', { id });
  }
}

class ResourceRepository {
  async create({ id, projectId, type, name, state = 'pending' }) {
    await query(
      'INSERT INTO resources (id, project_id, type, name, state) VALUES ($1, $2, $3, $4, $5)',
      [id, projectId, type, name, state]
    );
    return { id, projectId, type, name, state };
  }

  async listByProject(projectId) {
    const res = await query(
      'SELECT id, project_id, type, name, state, created_at FROM resources WHERE project_id = $1',
      [projectId]
    );
    return res.rows;
  }

  async get(id) {
    const res = await query('SELECT * FROM resources WHERE id = $1', [id]);
    return res.rows[0] || null;
  }

  async updateState(id, state) {
    await query('UPDATE resources SET state = $1 WHERE id = $2', [state, id]);
  }
}

class AuditRepository {
  async log({ userId, action, resourceType, resourceId, metadata = {} }) {
    const id = `audit_${Date.now()}`;
    await query(
      'INSERT INTO audit_log (id, user_id, action, resource_type, resource_id, metadata) VALUES ($1,$2,$3,$4,$5,$6)',
      [id, userId, action, resourceType, resourceId, JSON.stringify(metadata)]
    );
    return id;
  }
}

module.exports = { ProjectRepository, ResourceRepository, AuditRepository };
