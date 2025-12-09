-- Create access_logs table for visitor monitoring
-- Run this in your Supabase SQL Editor

CREATE TABLE IF NOT EXISTS shorts_access_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  user_email TEXT,
  ip_address TEXT,
  user_agent TEXT,
  path TEXT,
  method TEXT,
  status_code INTEGER,
  response_time_ms INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_access_logs_created_at ON shorts_access_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_access_logs_user_id ON shorts_access_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_access_logs_path ON shorts_access_logs(path);
CREATE INDEX IF NOT EXISTS idx_access_logs_user_email ON shorts_access_logs(user_email);

-- Enable RLS (Row Level Security)
ALTER TABLE shorts_access_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own logs
CREATE POLICY "Users can view own logs" ON shorts_access_logs
  FOR SELECT USING (auth.uid() = user_id);

-- Policy: Service role can insert logs (for backend logging)
CREATE POLICY "Service role can insert logs" ON shorts_access_logs
  FOR INSERT WITH CHECK (true);

-- Policy: Service role can view all logs (for admin analytics)
CREATE POLICY "Service role can view all logs" ON shorts_access_logs
  FOR SELECT USING (true);

-- Optional: Create a function to clean up old logs (older than 90 days)
CREATE OR REPLACE FUNCTION cleanup_old_access_logs()
RETURNS void AS $$
BEGIN
  DELETE FROM shorts_access_logs
  WHERE created_at < NOW() - INTERVAL '90 days';
END;
$$ LANGUAGE plpgsql;

-- Optional: Schedule cleanup (requires pg_cron extension)
-- SELECT cron.schedule('cleanup-access-logs', '0 2 * * *', 'SELECT cleanup_old_access_logs()');

