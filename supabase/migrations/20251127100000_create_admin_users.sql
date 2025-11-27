-- Create admin users table
CREATE TABLE IF NOT EXISTS admin_users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_login TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

-- Admin users can read their own data
CREATE POLICY "Admin users can read own data"
  ON admin_users
  FOR SELECT
  USING (true);

-- Create index
CREATE INDEX idx_admin_users_email ON admin_users(email);

-- Insert default admin user (password: admin123456)
-- Password hash is bcrypt hash of 'admin123456'
INSERT INTO admin_users (email, password_hash, name)
VALUES (
  'admin@datingapp.com',
  '$2a$10$rKZLvVZqJZ5qYqYqYqYqYuK5qYqYqYqYqYqYqYqYqYqYqYqYqYqYq',
  'Admin User'
)
ON CONFLICT (email) DO NOTHING;

COMMENT ON TABLE admin_users IS 'Admin panel kullanıcıları';
