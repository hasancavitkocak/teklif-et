// Image Moderation Test Script
// Çalıştır: node scripts/test-moderation.js

const { testImageModeration, runModerationTest } = require('../utils/testImageModeration.ts');

// Ana test fonksiyonu
async function main() {
  try {
    await runModerationTest();
  } catch (error) {
    console.error('Test hatası:', error);
  }
}

// Eğer direkt çalıştırılıyorsa test'i başlat
if (require.main === module) {
  main();
}