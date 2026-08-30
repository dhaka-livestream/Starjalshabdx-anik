// functions/proxy/live.m3u8.js
export async function onRequest(context) {
    const url = new URL(context.request.url);

    // --------------------------------------------------------------
    // ১. .ts ভিডিও খণ্ডের রিকোয়েস্ট প্রক্রিয়াকরণ
    // --------------------------------------------------------------
    const segmentUrl = url.searchParams.get('url');
    if (segmentUrl) {
        // সরাসরি আসল সার্ভার থেকে .ts ফেট্চ করে ক্লায়েন্টে পাঠান
        const response = await fetch(segmentUrl, {
            headers: {
                'User-Agent': 'VLC/3.0.0',
                'Referer': 'https://devm3u.top/',
                'Origin': 'https://devm3u.top'
            }
        });
        return new Response(response.body, {
            headers: {
                'Content-Type': 'video/MP2T',
                'Access-Control-Allow-Origin': '*',
                'Cache-Control': 'public, max-age=86400' // ১ দিন ক্যাশে
            }
        });
    }

    // --------------------------------------------------------------
    // ২. মূল m3u8 প্লেলিস্ট রিকোয়েস্ট
    // --------------------------------------------------------------
    const apiUrl = 'https://live.devm3u.top/api/play/starjalsha-json-starjalsha';

    try {
        // ২.১ API থেকে বর্তমান m3u8 লিংক সংগ্রহ
        const apiRes = await fetch(apiUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0',
                'Referer': 'https://devm3u.top/'
            }
        });
        const apiData = await apiRes.json();

        if (!apiData.ok || !apiData.url) {
            return new Response('API থেকে বৈধ লিংক পাওয়া যায়নি', { status: 500 });
        }

        const m3u8Url = apiData.url;

        // ২.২ m3u8 প্লেলিস্ট ডাউনলোড
        const m3u8Res = await fetch(m3u8Url, {
            headers: {
                'User-Agent': 'VLC/3.0.0',
                'Referer': 'https://devm3u.top/'
            }
        });
        let content = await m3u8Res.text();

        // ২.৩ প্লেলিস্টের সব .ts লিংককে প্রোক্সি লিংকে রূপান্তর
        const baseUrl = m3u8Url.substring(0, m3u8Url.lastIndexOf('/') + 1);
        const proxyBase = url.origin + url.pathname + '?url=';

        content = content.replace(/([^\s"']+\.ts)/g, (match) => {
            let absoluteUrl;
            if (match.startsWith('http://') || match.startsWith('https://')) {
                absoluteUrl = match.trim();
            } else {
                try {
                    absoluteUrl = new URL(match.trim(), baseUrl).href;
                } catch {
                    return match;
                }
            }
            // প্রতিটি .ts লিংককে প্রোক্সি দিয়ে মোড়ানো
            return `${proxyBase}${encodeURIComponent(absoluteUrl)}`;
        });

        // ২.৪ রিরাইট করা প্লেলিস্ট ক্লায়েন্টে পাঠান
        return new Response(content, {
            headers: {
                'Content-Type': 'application/vnd.apple.mpegurl',
                'Access-Control-Allow-Origin': '*',
                'Cache-Control': 'no-cache' // সবসময় তাজা কন্টেন্ট পেতে
            }
        });

    } catch (error) {
        return new Response(`প্রক্সি এরর: ${error.message}`, { status: 500 });
    }
}
