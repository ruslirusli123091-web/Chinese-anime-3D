
class RemoveHandler {
  element(element) {
    element.remove();
  }
}


class TitleHandler {
  constructor(title) {
    this.title = title;
  }
  element(element) {
    element.setInnerContent(this.title);
  }
}


class HeadHandler {
  constructor(metaData) {
    this.meta = metaData;
  }
  element(element) {
    const description = (this.meta.description || '').substring(0, 160).replace(/"/g, '&quot;');
    const imageUrl = this.meta.imageUrl || '';
    const pageUrl = this.meta.url || '';
    const ogType = this.meta.ogType || 'video.episode';
    const title = (this.meta.title || '').replace(/"/g, '&quot;');

    element.append(`<meta name="description" content="${description}" />`, { html: true });
    element.append(`<meta property="og:url" content="${pageUrl}" />`, { html: true });
    element.append(`<meta property="og:title" content="${title}" />`, { html: true });
    element.append(`<meta property="og:description" content="${description}" />`, { html: true });
    element.append(`<meta property="og:image" content="${imageUrl}" />`, { html: true });
    element.append(`<meta property="og:type" content="${ogType}" />`, { html: true });
    element.append(`<meta name="twitter:card" content="summary_large_image" />`, { html: true });
  }
}


export async function onRequest(context) {
  try {
    const { request } = context;
    const url = new URL(request.url);

    const isAsset = /\.(css|js|json|png|jpg|jpeg|gif|svg|ico|woff|woff2)$/.test(url.pathname);
    if (isAsset) return context.next();

    const page = url.searchParams.get('page');
    const donghuaId = url.searchParams.get('id');
    const episodeNumber = url.searchParams.get('ep');

    if ((page !== 'synopsis' && page !== 'watch') || !donghuaId) {
      return context.next();
    }
    
    const apiUrl = 'https://backup3d.ruslirusli123091.workers.dev/api/donghua';
    const apiResponse = await fetch(apiUrl);

    if (!apiResponse.ok) throw new Error(`API fetch gagal! Status: ${apiResponse.status}`);
    
    const apiData = await apiResponse.json();
    if (!apiData || !Array.isArray(apiData.donghua)) throw new Error("Struktur data API tidak valid.");
    
    const donghua = apiData.donghua.find(d => d && String(d.id) === String(donghuaId));

    if (!donghua) return context.next();

    let metaData = null;
    if (page === 'synopsis') {
      metaData = { title: `${donghua.title} - Nonton Donghua Sub Indo`, description: donghua.synopsis || `Nonton streaming ${donghua.title} subtitle Indonesia.`, imageUrl: donghua.image || '', url: url.href, ogType: 'video.tv_show', };
    } else if (page === 'watch' && episodeNumber) {
      metaData = { title: `Nonton ${donghua.title} Episode ${episodeNumber} Sub Indo`, description: `Streaming ${donghua.title} episode ${episodeNumber}. ${donghua.synopsis || ''}`, imageUrl: donghua.image || '', url: url.href, ogType: 'video.episode', };
    }

    if (metaData) {
      const response = await context.next();
      
      const remover = new RemoveHandler();

      return new HTMLRewriter()

        .on('meta[name="description"]', remover)
        .on('meta[property="og:title"]', remover)
        .on('meta[property="og:description"]', remover)
        .on('meta[property="og:url"]', remover)
        .on('meta[property="og:image"]', remover)
        .on('meta[property="og:type"]', remover)
        .on('meta[name="twitter:card"]', remover)
        

        .on('title', new TitleHandler(metaData.title))
        

        .on('head', new HeadHandler(metaData))

        .transform(response);
    }

    return context.next();

  } catch (error) {
    console.error("[Middleware] FATAL ERROR:", error.message);
    return context.next();
  }
}
