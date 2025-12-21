/*
  # Update Interests System with Individual Icons
  
  1. Changes
    - Remove old category-based grouping
    - Each interest becomes its own category with icon
    - Update existing interests data
*/

-- Önce mevcut ilgi alanlarını temizle
DELETE FROM user_interests;
DELETE FROM interests;

-- Yeni ilgi alanlarını ekle (her biri kendi kategorisi)
INSERT INTO interests (name, category) VALUES
  -- Spor & Aktivite
  ('Futbol', 'Futbol'),
  ('Basketbol', 'Basketbol'),
  ('Yüzme', 'Yüzme'),
  ('Voleybol', 'Voleybol'),
  ('Tenis', 'Tenis'),
  ('Yoga', 'Yoga'),
  ('Fitness', 'Fitness'),
  ('Koşu', 'Koşu'),
  ('Yürüyüş', 'Yürüyüş'),
  ('Bisiklet', 'Bisiklet'),
  ('Dağcılık', 'Dağcılık'),
  
  -- Sanat & Müzik
  ('Sinema', 'Sinema'),
  ('Müzik', 'Müzik'),
  ('Dans', 'Dans'),
  ('Tiyatro', 'Tiyatro'),
  ('Konser', 'Konser'),
  ('Gitar', 'Gitar'),
  ('Piyano', 'Piyano'),
  ('Resim', 'Resim'),
  ('Fotoğrafçılık', 'Fotoğrafçılık'),
  
  -- Yaşam Tarzı
  ('Seyahat', 'Seyahat'),
  ('Kamp', 'Kamp'),
  ('Doğa', 'Doğa'),
  ('Yemek Yapmak', 'Yemek'),
  ('Kahve', 'Kahve'),
  ('Kitap Okuma', 'Kitap'),
  ('Yazma', 'Yazma'),
  ('Alışveriş', 'Alışveriş'),
  ('Moda', 'Moda'),
  
  -- Teknoloji & Oyun
  ('Teknoloji', 'Teknoloji'),
  ('Oyun', 'Oyun'),
  ('Tasarım', 'Tasarım'),
  ('Girişimcilik', 'Girişimcilik'),
  ('Yatırım', 'Yatırım'),
  ('Podcast', 'Podcast'),
  
  -- Sosyal & Diğer
  ('Gönüllülük', 'Gönüllülük'),
  ('Hayvanlar', 'Hayvanlar'),
  ('Meditasyon', 'Meditasyon'),
  ('Bahçecilik', 'Bahçecilik')
ON CONFLICT DO NOTHING;
