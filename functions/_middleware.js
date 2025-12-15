// File: functions/_middleware.js
// KODE DEBUGGING SANGAT MINIMAL UNTUK TES FUNGSI DASAR

export async function onRequest(context) {
  try {
    // Ambil URL untuk logging
    const url = new URL(context.request.url);
    
    // Log paling sederhana untuk membuktikan middleware ini berjalan
    console.log(`[DEBUG] Middleware Minimal Berjalan untuk URL: ${url.pathname}`);
    
    // Langsung lanjutkan ke halaman asli tanpa modifikasi apa pun
    return await context.next();

  } catch (error) {
    // Jika ada error fundamental, kita catat di sini
    console.error(`[DEBUG] FATAL ERROR DI LEVEL DASAR: ${error.message}`);
    
    // Kembalikan halaman asli jika terjadi error
    return context.next();
  }
}
