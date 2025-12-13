/*
  # Premium Expiry Job
  
  Bu script saatlik olarak çalıştırılarak expired premium üyelikleri kontrol eder.
  Cron job veya scheduled task olarak çalıştırılabilir.
  
  Örnek kullanım:
  - Linux/Mac: crontab -e ile "0 * * * * psql -d your_db -f premium_expire_job.sql"
  - Windows: Task Scheduler ile saatlik çalıştır
*/

-- Create system_logs table if it doesn't exist
CREATE TABLE IF NOT EXISTS system_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  operation text NOT NULL,
  details text,
  created_at timestamptz DEFAULT now()
);

-- Check and update expired premiums
SELECT check_expired_premiums();

-- Log the operation
INSERT INTO public.system_logs (operation, details, created_at) 
VALUES (
  'premium_expire_check', 
  'Checked and updated expired premium subscriptions',
  now()
) ON CONFLICT DO NOTHING;