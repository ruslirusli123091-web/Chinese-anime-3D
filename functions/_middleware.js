// File: functions/_middleware.js
// VERSI DEBUGGING DENGAN LOG

class MetaTagInjector {
    // ... (Isi kelas ini sama seperti sebelumnya, tidak perlu diubah) ...
    constructor(metaData) { this.meta = metaData; }
    element(element) { if (!this.meta) return; const title = (this.meta.title || '').replace(/"/g, '&quot;'); const description = (this.meta.description || '').substring(0, 160).replace(/"/g, '&quot;'); const imageUrl = this.meta.imageUrl || ''; const pageUrl = this.meta.url || ''; const ogType = this.meta.ogType || 'website'; if (element.tagName === 'title') { element.setInnerContent(title, { html: false }); } if (element.tagName === 'head') { element.querySelector('meta[name="description"]')?.remove(); element.append(`<meta name="description" content="${description}" />`, { html: true }); element.append(`<meta property="og:url" content="${pageUrl}" />`, { html: true }); element.append(`<meta property="og:title" content="${title}" />`, { html: true }); element.append(`<meta property="og:description" content="${description}" />`, { html: true }); element.append(`<meta property="og:image" content="${imageUrl}" />`, { html: true }); element.append(`<meta property="og:type" content="${ogType}" />`, { html: true }); element.append(`<meta name="twitter:card" content="summary_large_image" />`, { html: true }); } }
}

export async function onRequest(context) {
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
  const episodeNumber = url.searchParams.get('ep');

  if ((page !== 'synopsis' && page !== 'watch') || !donghuaId) {
    console.log('[Middleware] Bukan halaman sinopsis/watch, dilewati.');
    return context.next();
  }
  
  console.log(`[Middleware] Memproses halaman ${page} untuk ID: ${donghuaId}`);
  let metaData = null;

  try {
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
    const donghua = apiData.donghua.find(d => d && String(d.id) === String(donghuaId)); // Menggunakan String() untuk mencocokkan tipe data

    if (!donghua) {
        console.log(`[Middleware] Donghua dengan ID ${donghuaId} tidak ditemukan.`);
        return context.next();
    }

    console.log(`[Middleware] Donghua ditemukan: ${donghua.title}`);
    
    if (page === 'synopsis') {
      metaData = { title: `${donghua.title} - Nonton Donghua Sub Indo`, description: donghua.synopsis || `Nonton streaming ${donghua.title} subtitle Indonesia.`, imageUrl: donghua.image || '', url: url.href, ogType: 'video.tv_show', };
    } else if (page === 'watch' && episodeNumber) {
      metaData = { title: `Nonton ${donghua.title} Episode ${episodeNumber} Sub Indo`, description: `Streaming ${donghua.title} episode ${episodeNumber} dengan subtitle Indonesia. ${donghua.synopsis || ''}`, imageUrl: donghua.image || '', url: url.href, ogType: 'video.episode', };
    }

    console.log('[Middleware] Meta data berhasil dibuat:', metaData);

  } catch (error) {
    // Tampilkan error di log agar kita tahu jika ada masalah
    console.error("[Middleware] TERJADI ERROR:", error.message);
    return context.next();
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
}
