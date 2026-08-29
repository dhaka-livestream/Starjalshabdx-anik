// functions/proxy/live.m3u8.js
export async function onRequest(context) {
    const request = context.request;
    const url = new URL(request.url);

    // ==========================================
    // ১. .ts ফাইলের রিকোয়েস্ট
    // ==========================================
    const tsUrl = url.searchParams.get('url');
    if (tsUrl && tsUrl.includes('.ts')) {
        try {
            const tsResponse = await fetch(tsUrl, {
                headers: {
                    'User-Agent': 'VLC/3.0.0',
                    'Referer': 'https://devm3u.top/',
                    'Origin': 'https://devm3u.top'
                }
            });
            if (!tsResponse.ok) {
                return new Response(`TS file not found: ${tsResponse.status}`, { status: 404 });
            }
            return new Response(tsResponse.body, {
                headers: {
                    'Content-Type': 'video/MP2T',
                    'Access-Control-Allow-Origin': '*',
                    'Cache-Control': 'public, max-age=86400'
                }
            });
        } catch (e) {
            return new Response(`TS proxy error: ${e.message}`, { status: 500 });
        }
    }

    // ==========================================
    // ২. API থেকে m3u8 লিংক আনা
    // ==========================================
    const apiUrl = 'https://live.devm3u.top/api/play/starjalsha-json-starjalsha';

    try {
        // ২.১ API কল
        const apiRes = await fetch(apiUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
                'Accept': 'application/json',
                'Referer': 'https://devm3u.top/'
            }
        });

        if (!apiRes.ok) {
            return new Response(`API failed: ${apiRes.status}`, { status: 500 });
        }

        const apiData = await apiRes.json();

        // ২.২ চেক
        if (!apiData.ok || !apiData.url) {
            return new Response(
                `Invalid API: ${JSON.stringify(apiData)}`,
                { status: 500, headers: { 'Content-Type': 'text/plain' } }
            );
        }

        const m3u8Url = apiData.url;

        // ২.৩ m3u8 ডাউনলোড
        const m3u8Res = await fetch(m3u8Url, {
            headers: {
                'User-Agent': 'VLC/3.0.0',
                'Referer': 'https://devm3u.top/'
            }
        });

        if (!m3u8Res.ok) {
            return new Response(`m3u8 fetch failed: ${m3u8Res.status}`, { status: 500 });
        }

        let content = await m3u8Res.text();

        // ২.৪ .ts রিরাইট (শক্তিশালী লজিক)
        const baseUrl = m3u8Url.substring(0, m3u8Url.lastIndexOf('/') + 1);
        const proxyBase = url.origin + url.pathname + '?url=';

        // সব .ts খুঁজে বের করা
        content = content.replace(/([^\s"']+\.ts)/g, (match) => {
            let absoluteUrl;
            if (match.startsWith('http://') || match.startsWith('https://')) {
                absoluteUrl = match.trim();
            } else {
                try {
                    absoluteUrl = new URL(match.trim(), baseUrl).href;
                } catch (e) {
                    return match;
                }
            }
            return `${proxyBase}${encodeURIComponent(absoluteUrl)}`;
        });

        // ২.৫ রিটার্ন
        return new Response(content, {
            headers: {
                'Content-Type': 'application/vnd.apple.mpegurl',
                'Access-Control-Allow-Origin': '*',
                'Cache-Control': 'no-cache'
            }
        });

    } catch (error) {
        return new Response(`Proxy error: ${error.message}`, { status: 500 });
    }
}
