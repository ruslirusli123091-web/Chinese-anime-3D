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
     
      element.querySelector('meta[name="description"]')?.remove();
      
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
  const { request } = context;
  const url = new URL(request.url);

  const isAsset = /\.(css|js|json|png|jpg|jpeg|gif|svg|ico|woff|woff2)$/.test(url.pathname);
  if (isAsset) {
    return context.next();
  }

  const page = url.searchParams.get('page');
  const donghuaId = url.searchParams.get('id');
  const episodeNumber = url.searchParams.get('ep');


  if ((page !== 'synopsis' && page !== 'watch') || !donghuaId) {
    return context.next();
  }
  
  let metaData = null;

  try {

    const apiUrl = 'https://backup3d.ruslirusli123091.workers.dev/api/donghua';
    const apiResponse = await fetch(apiUrl);

    if (!apiResponse.ok) {
      throw new Error(`Gagal mengambil data dari API. Status: ${apiResponse.status}`);
    }
    
    const apiData = await apiResponse.json();
    if (!apiData || !Array.isArray(apiData.donghua)) {
      throw new Error("Data API tidak valid atau bukan array.");
    }
    
   
    const donghua = apiData.donghua.find(d => d && d.id === donghuaId);

    if (!donghua) {
      
        return context.next();
    }
    
  
    if (page === 'synopsis') {
      metaData = {
        title: `${donghua.title} - Nonton Donghua Sub Indo`,
        description: donghua.synopsis || `Nonton streaming ${donghua.title} subtitle Indonesia.`,
        imageUrl: donghua.image || '',
        url: url.href, 
        ogType: 'video.tv_show',
      };
    } 
    else if (page === 'watch' && episodeNumber) {
      metaData = {
        title: `Nonton ${donghua.title} Episode ${episodeNumber} Sub Indo`,
        description: `Streaming ${donghua.title} episode ${episodeNumber} dengan subtitle Indonesia. ${donghua.synopsis || ''}`,
        imageUrl: donghua.image || '', 
        url: url.href, 
        ogType: 'video.episode',
      };
    }
  } catch (error) {
   
    console.error("Error di _middleware.js:", error);
    return context.next();
  }

  if (metaData) {
    const response = await context.next(); 
    
    return new HTMLRewriter()
      .on('title', new MetaTagInjector(metaData))
      .on('head', new MetaTagInjector(metaData))
      .transform(response);
  }

  return context.next();
}
