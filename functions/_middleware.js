// File: functions/_middleware.js
// VERSI FINAL DENGAN PENANGANAN ERROR MENYELURUH

class MetaTagInjector {
    constructor(metaData) {
        this.meta = metaData;
    }

    element(element) {
        if (!this.meta) return;

        const title = (this.meta.title || '').replace(/"/g, '&quot;');
        const description = (this.meta.description || '').substring(0, 160).replace(/"/g, '&quot;');
        const imageUrl = this.meta.imageUrl || '';
        const pageUrl = this.meta.url || '';
        const ogType = this.meta.ogType || 'website';

        if (element.tagName === 'title') {
            element.setInnerContent(title, { html: false });
        }

        if (element.tagName === 'head') {
            // Hapus tag lama yang mungkin ada dari index.html
            element.querySelector('meta[name="description"]')?.remove();
            element.querySelector('meta[property="og:title"]')?.remove();
            element.querySelector('meta[property="og:description"]')?.remove();
            element.querySelector('meta[property="og:url"]')?.remove();
            element.querySelector('meta[property="og:image"]')?.remove();
            element.querySelector('meta[property="og:type"]')?.remove();
            element.querySelector('meta[name="twitter:card"]')?.remove();

            // Tambahkan tag baru yang dinamis
            element.append(`<meta name="description" content="${description}" />`, { html: true });
            element.append(`<meta property="og:url" content="${pageUrl}" />`, { html: true });
            element.append(`<meta property="og:title" content="${title}" />`, { html: true });
            element.append(`<meta property="og:description" content="${description}" />`, { html: true });
            element.append(`<meta property="og:image" content="${imageUrl}" />`, { html: true });
            element.append(`<meta property="og:type" content="${ogType}" />`, { html: true });
            element.append(`<meta name="twitter:card" content="summary_large_image" />`, { html: true });
        }
    }
}

export async function onRequest(context) {
  // BUNGKUS SEMUA LOGIKA DALAM SATU TRY...CATCH BESAR
  try {
    const { request } = context;
    const url = new URL(request.url);

    console.log(`[Middleware] Menerima request untuk: ${url.pathname}${url.search}`);

    const isAsset = /\.(css|js|json|png|jpg|jpeg|gif|svg|ico|woff|woff2)$/.test(url.pathname);
    if (isAsset) {
      console.log('[Middleware] Request adalah aset, dilewati.');
      return context.next();
    }

    const page = url.searchParams.get('page');
    const donghuaId = url.searchParams.get('id');
    const episodeNumber = url.search_params.get('ep');

    if ((page !== 'synopsis' && page !== 'watch') || !donghuaId) {
      console.log('[Middleware] Bukan halaman sinopsis/watch, dilewati.');
      return context.next();
    }
    
    console.log(`[Middleware] Memproses halaman ${page} untuk ID: ${donghuaId}`);
    
    const apiUrl = 'https://backup3d.ruslirusli123091.workers.dev/api/donghua';
    console.log(`[Middleware] Mengambil data dari: ${apiUrl}`);
    const apiResponse = await fetch(apiUrl);

    if (!apiResponse.ok) {
      throw new Error(`API fetch gagal! Status: ${apiResponse.status}`);
    }
    
    const apiData = await apiResponse.json();
    if (!apiData || !Array.isArray(apiData.donghua)) {
      throw new Error("Struktur data API tidak valid.");
    }
    
    console.log(`[Middleware] Data API berhasil diambil. Mencari ID: ${donghuaId}`);
    const donghua = apiData.donghua.find(d => d && String(d.id) === String(donghuaId));

    if (!donghua) {
        console.log(`[Middleware] Donghua dengan ID ${donghuaId} tidak ditemukan.`);
        return context.next(); // Keluar dengan aman jika tidak ditemukan
    }

    console.log(`[Middleware] Donghua ditemukan: ${donghua.title}`);
    
    let metaData = null;
    if (page === 'synopsis') {
      metaData = { title: `${donghua.title} - Nonton Donghua Sub Indo`, description: donghua.synopsis || `Nonton streaming ${donghua.title} subtitle Indonesia.`, imageUrl: donghua.image || '', url: url.href, ogType: 'video.tv_show', };
    } else if (page === 'watch' && episodeNumber) {
      metaData = { title: `Nonton ${donghua.title} Episode ${episodeNumber} Sub Indo`, description: `Streaming ${donghua.title} episode ${episodeNumber}. ${donghua.synopsis || ''}`, imageUrl: donghua.image || '', url: url.href, ogType: 'video.episode', };
    }

    if (metaData) {
      console.log('[Middleware] Memproses HTML dengan HTMLRewriter...');
      const response = await context.next();
      return new HTMLRewriter()
        .on('title', new MetaTagInjector(metaData))
        .on('head', new MetaTagInjector(metaData))
        .transform(response);
    }

    return context.next();

  } catch (error) {
    // JIKA TERJADI ERROR DI MANA PUN, CATAT DI LOG DAN KELUAR DENGAN AMAN
    console.error("[Middleware] FATAL EXCEPTION TERJADI:", error);
    return context.next(); // Ini akan mencegah status "Exception"
  }
}
