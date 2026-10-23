-- Up migration
CREATE TABLE IF NOT EXISTS instances (
  id VARCHAR(255) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  project_id VARCHAR(255) NOT NULL,
  region VARCHAR(100) NOT NULL,
  image VARCHAR(255) NOT NULL,
  cpu INTEGER DEFAULT 1,
  ram_mb INTEGER DEFAULT 512,
  storage_gb INTEGER DEFAULT 10,
  state VARCHAR(50) DEFAULT 'pending',
  ip_address VARCHAR(100),
  node_id VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Down migration
DROP TABLE IF EXISTS instances;
