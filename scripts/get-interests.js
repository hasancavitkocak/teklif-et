// Mevcut ilgi alanlarını getiren script
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

// Environment değişkenlerini kontrol et
if (!process.env.EXPO_PUBLIC_SUPABASE_URL) {
  console.error('❌ EXPO_PUBLIC_SUPABASE_URL environment değişkeni bulunamadı');
  process.exit(1);
}

if (!process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY) {
  console.error('❌ EXPO_PUBLIC_SUPABASE_ANON_KEY environment değişkeni bulunamadı');
  process.exit(1);
}

// Supabase client oluştur
const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
);

async function getInterests() {
  try {
    console.log('🔍 Mevcut tabloları kontrol ediliyor...');
    
    // Önce tabloları listele
    const { data: tables, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public');

    if (tablesError) {
      console.log('Tablo listesi alınamadı, doğrudan interests tablosunu deniyoruz...');
    } else {
      console.log('📋 Mevcut tablolar:', tables?.map(t => t.table_name).join(', '));
    }

    console.log('\n🔍 Interests tablosunu kontrol ediliyor...');
    
    const { data, error } = await supabase
      .from('interests')
      .select('*')
      .order('name');

    if (error) {
      console.error('❌ Interests tablosu hatası:', error);
      
      // Alternatif tablo adlarını dene
      console.log('\n🔍 Alternatif tablo adlarını deniyoruz...');
      
      const alternatives = ['interest', 'categories', 'activity_types'];
      for (const tableName of alternatives) {
        try {
          const { data: altData, error: altError } = await supabase
            .from(tableName)
            .select('*')
            .limit(5);
          
          if (!altError && altData) {
            console.log(`✅ ${tableName} tablosu bulundu:`, altData);
          }
        } catch (e) {
          console.log(`❌ ${tableName} tablosu bulunamadı`);
        }
      }
      return;
    }

    console.log(`✅ ${data.length} ilgi alanı bulundu:\n`);
    
    data.forEach((interest, index) => {
      console.log(`${index + 1}. ${interest.name} (ID: ${interest.id}${interest.category ? ', Kategori: ' + interest.category : ''})`);
    });

    console.log('\n📋 JSON formatında:');
    console.log(JSON.stringify(data, null, 2));

  } catch (error) {
    console.error('❌ Script hatası:', error);
  }
}

getInterests();