-- Test kullanıcıları oluştur
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at)
VALUES 
  ('11111111-1111-1111-1111-111111111111', 'test1@example.com', crypt('password123', gen_salt('bf')), NOW(), NOW(), NOW()),
  ('22222222-2222-2222-2222-222222222222', 'test2@example.com', crypt('password123', gen_salt('bf')), NOW(), NOW(), NOW()),
  ('33333333-3333-3333-3333-333333333333', 'test3@example.com', crypt('password123', gen_salt('bf')), NOW(), NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Test profilleri oluştur
INSERT INTO profiles (id, name, email, gender, city, birthdate, interests, is_premium)
VALUES 
  ('11111111-1111-1111-1111-111111111111', 'Ahmet Yılmaz', 'test1@example.com', 'male', 'İstanbul', '1995-05-15', ARRAY['Spor', 'Müzik', 'Seyahat'], false),
  ('22222222-2222-2222-2222-222222222222', 'Ayşe Demir', 'test2@example.com', 'female', 'İstanbul', '1997-08-20', ARRAY['Kitap', 'Sinema', 'Yemek'], true),
  ('33333333-3333-3333-3333-333333333333', 'Mehmet Kaya', 'test3@example.com', 'male', 'Ankara', '1993-03-10', ARRAY['Teknoloji', 'Oyun', 'Müzik'], false)
ON CONFLICT (id) DO NOTHING;

-- Test eşleşmeleri oluştur
INSERT INTO matches (user1_id, user2_id)
VALUES 
  ('11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222'),
  ('22222222-2222-2222-2222-222222222222', '33333333-3333-3333-3333-333333333333')
ON CONFLICT DO NOTHING;

-- Test proposalları oluştur
INSERT INTO proposals (creator_id, title, description, city, status, date_time, venue)
VALUES 
  ('11111111-1111-1111-1111-111111111111', 'Kahve İçelim', 'Taksim''de kahve içmek isteyen var mı?', 'İstanbul', 'active', NOW() + INTERVAL '2 days', 'Starbucks Taksim'),
  ('22222222-2222-2222-2222-222222222222', 'Sinema Keyfi', 'Yeni çıkan filmi izleyelim', 'İstanbul', 'active', NOW() + INTERVAL '3 days', 'Cinemaximum'),
  ('33333333-3333-3333-3333-333333333333', 'Yürüyüş', 'Anıtkabir''de yürüyüş yapalım', 'Ankara', 'active', NOW() + INTERVAL '1 day', 'Anıtkabir')
ON CONFLICT DO NOTHING;

-- Test mesajları oluştur
INSERT INTO messages (sender_id, receiver_id, content, match_id)
SELECT 
  '11111111-1111-1111-1111-111111111111',
  '22222222-2222-2222-2222-222222222222',
  'Merhaba! Nasılsın?',
  id
FROM matches 
WHERE user1_id = '11111111-1111-1111-1111-111111111111' 
  AND user2_id = '22222222-2222-2222-2222-222222222222'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO messages (sender_id, receiver_id, content, match_id)
SELECT 
  '22222222-2222-2222-2222-222222222222',
  '11111111-1111-1111-1111-111111111111',
  'İyiyim, sen nasılsın?',
  id
FROM matches 
WHERE user1_id = '11111111-1111-1111-1111-111111111111' 
  AND user2_id = '22222222-2222-2222-2222-222222222222'
LIMIT 1
ON CONFLICT DO NOTHING;

-- Test bildirimlerini oluştur
INSERT INTO notifications (user_id, type, title, message)
VALUES 
  ('11111111-1111-1111-1111-111111111111', 'new_match', 'Yeni Eşleşme!', 'Ayşe Demir ile eşleştiniz'),
  ('22222222-2222-2222-2222-222222222222', 'new_message', 'Yeni Mesaj', 'Ahmet Yılmaz size mesaj gönderdi'),
  ('33333333-3333-3333-3333-333333333333', 'proposal_invitation', 'Davet', 'Bir proposal''a davet edildiniz')
ON CONFLICT DO NOTHING;

-- Keşfet feed oluştur
INSERT INTO discover_feed (user_id, city, is_visible)
VALUES 
  ('11111111-1111-1111-1111-111111111111', 'İstanbul', true),
  ('22222222-2222-2222-2222-222222222222', 'İstanbul', true),
  ('33333333-3333-3333-3333-333333333333', 'Ankara', true)
ON CONFLICT DO NOTHING;

SELECT 'Test verileri başarıyla oluşturuldu!' as message;
