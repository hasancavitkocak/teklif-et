-- Job logları için tablo oluştur
CREATE TABLE IF NOT EXISTS job_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  job_name VARCHAR(100) NOT NULL,
  job_type VARCHAR(50) NOT NULL, -- 'daily_reset', 'premium_expire', 'auto_reject', etc.
  status VARCHAR(20) NOT NULL DEFAULT 'running', -- 'running', 'success', 'failed'
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  duration_ms INTEGER,
  affected_rows INTEGER DEFAULT 0,
  error_message TEXT,
  details JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- İndeksler
CREATE INDEX IF NOT EXISTS idx_job_logs_job_name ON job_logs(job_name);
CREATE INDEX IF NOT EXISTS idx_job_logs_status ON job_logs(status);
CREATE INDEX IF NOT EXISTS idx_job_logs_created_at ON job_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_job_logs_job_type ON job_logs(job_type);

-- RLS politikaları (admin paneli için)
ALTER TABLE job_logs ENABLE ROW LEVEL SECURITY;

-- Admin kullanıcıları için okuma izni
DROP POLICY IF EXISTS "Admin users can read job logs" ON job_logs;
CREATE POLICY "Admin users can read job logs" ON job_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM admin_users 
      WHERE admin_users.id = auth.uid()
    )
  );

-- Job istatistikleri fonksiyonu
CREATE OR REPLACE FUNCTION get_job_statistics()
RETURNS TABLE (
  total_jobs BIGINT,
  successful_jobs BIGINT,
  failed_jobs BIGINT,
  running_jobs BIGINT,
  avg_duration_ms NUMERIC,
  last_24h_jobs BIGINT
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::BIGINT as total_jobs,
    COUNT(*) FILTER (WHERE status = 'success')::BIGINT as successful_jobs,
    COUNT(*) FILTER (WHERE status = 'failed')::BIGINT as failed_jobs,
    COUNT(*) FILTER (WHERE status = 'running')::BIGINT as running_jobs,
    AVG(duration_ms)::NUMERIC as avg_duration_ms,
    COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '24 hours')::BIGINT as last_24h_jobs
  FROM job_logs;
END;
$$;

-- Job log ekleme fonksiyonu
CREATE OR REPLACE FUNCTION log_job_start(
  p_job_name VARCHAR(100),
  p_job_type VARCHAR(50),
  p_details JSONB DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  job_id UUID;
BEGIN
  INSERT INTO job_logs (job_name, job_type, status, details)
  VALUES (p_job_name, p_job_type, 'running', p_details)
  RETURNING id INTO job_id;
  
  RETURN job_id;
END;
$$;

-- Job log tamamlama fonksiyonu
CREATE OR REPLACE FUNCTION log_job_complete(
  p_job_id UUID,
  p_status VARCHAR(20),
  p_affected_rows INTEGER DEFAULT 0,
  p_error_message TEXT DEFAULT NULL,
  p_details JSONB DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE job_logs 
  SET 
    status = p_status,
    completed_at = NOW(),
    duration_ms = EXTRACT(EPOCH FROM (NOW() - started_at)) * 1000,
    affected_rows = p_affected_rows,
    error_message = p_error_message,
    details = COALESCE(p_details, details)
  WHERE id = p_job_id;
END;
$$;

-- Eski teklifleri expire etme fonksiyonu
CREATE OR REPLACE FUNCTION expire_old_proposals()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_expired_count INTEGER;
BEGIN
  -- 24 saat geçmiş ve henüz expire olmamış teklifleri expire et
  UPDATE proposals 
  SET 
    status = 'expired',
    updated_at = NOW()
  WHERE 
    status = 'pending' 
    AND event_datetime < NOW() - INTERVAL '24 hours';
  
  GET DIAGNOSTICS v_expired_count = ROW_COUNT;
  
  RETURN v_expired_count;
END;
$$;

-- Daily job'ları çalıştıran ana fonksiyon
CREATE OR REPLACE FUNCTION run_daily_proposal_reset()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_job_id UUID;
  v_expired_count INTEGER;
  v_result JSONB;
BEGIN
  -- Job başlat
  SELECT log_job_start('daily_proposal_reset', 'scheduled') INTO v_job_id;
  
  BEGIN
    -- Eski proposal count kayıtlarını temizle
    PERFORM reset_daily_proposal_counts();
    
    -- Eski request count kayıtlarını temizle  
    PERFORM reset_daily_request_counts();
    
    -- Eski teklifleri expire et
    SELECT expire_old_proposals() INTO v_expired_count;
    
    -- Sonuç hazırla
    v_result := jsonb_build_object(
      'success', true,
      'affected_rows', v_expired_count,
      'message', format('Daily reset completed. %s proposals expired.', v_expired_count)
    );
    
    -- Job'ı başarılı olarak tamamla
    PERFORM log_job_complete(v_job_id, 'success', v_expired_count, NULL, v_result);
    
    RETURN v_result;
    
  EXCEPTION WHEN OTHERS THEN
    -- Hata durumunda job'ı failed olarak işaretle
    PERFORM log_job_complete(v_job_id, 'failed', 0, SQLERRM, 
      jsonb_build_object('error', SQLERRM));
    
    -- Hatayı tekrar fırlat
    RAISE;
  END;
END;
$$;