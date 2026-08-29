// functions/proxy/live.m3u8.js
export async function onRequest(context) {
    const request = context.request;
    const url = new URL(request.url);

    // ==========================================
    // ১. .ts ফাইলের রিকোয়েস্ট হ্যান্ডেল করা
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
            // যদি .ts ফাইল না পাওয়া যায়, তাহলে ৪০৪ রিটার্ন করুন
            if (!tsResponse.ok) {
                return new Response('TS file not found', { status: 404 });
            }
            return new Response(tsResponse.body, {
                headers: {
                    'Content-Type': 'video/MP2T',
                    'Access-Control-Allow-Origin': '*',
                    'Cache-Control': 'public, max-age=86400' // ১ দিন ক্যাশে
                }
            });
        } catch (e) {
            return new Response('TS proxy error: ' + e.message, { status: 500 });
        }
    }

    // ==========================================
    // ২. API কল ও m3u8 প্রসেসিং
    // ==========================================
    const apiUrl = 'https://live.devm3u.top/api/play/starjalsha-json-starjalsha';

    try {
        // ২.১ API থেকে ফ্রেশ m3u8 লিংক নিন
        const apiRes = await fetch(apiUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
                'Accept': 'application/json',
                'Referer': 'https://devm3u.top/'
            }
        });

        if (!apiRes.ok) {
            return new Response(`API call failed with status ${apiRes.status}`, { status: 500 });
        }

        const apiData = await apiRes.json();

        // ২.২ চেক করুন JSON-এ 'url' আছে কিনা
        if (!apiData.ok || !apiData.url) {
            return new Response(
                `Invalid API response: ${JSON.stringify(apiData)}`,
                { status: 500, headers: { 'Content-Type': 'text/plain' } }
            );
        }

        const m3u8Url = apiData.url;

        // ২.৩ m3u8 ফাইল ডাউনলোড করুন
        const m3u8Res = await fetch(m3u8Url, {
            headers: {
                'User-Agent': 'VLC/3.0.0',
                'Referer': 'https://devm3u.top/'
            }
        });

        if (!m3u8Res.ok) {
            return new Response(`Failed to fetch m3u8: ${m3u8Res.status}`, { status: 500 });
        }

        let content = await m3u8Res.text();

        // ২.৪ .ts ফাইলগুলোর লিংক রিরাইট করুন (উন্নত লজিক)
        const baseUrl = m3u8Url.substring(0, m3u8Url.lastIndexOf('/') + 1);
        const proxyBase = url.origin + url.pathname + '?url=';

        // রেগুলার এক্সপ্রেশন দিয়ে সব .ts খুঁজুন (স্পেস, কোটেশন, লাইন ব্রেক ইত্যাদি হ্যান্ডেল করে)
        content = content.replace(/(https?:\/\/[^\s"']+\.ts|[^\s"']+\.ts)/g, (match) => {
            let absoluteUrl;
            if (match.startsWith('http://') || match.startsWith('https://')) {
                absoluteUrl = match.trim();
            } else {
                try {
                    absoluteUrl = new URL(match.trim(), baseUrl).href;
                } catch (e) {
                    // যদি URL বানানো না যায়, তাহলে আগের মতো রাখুন
                    return match;
                }
            }
            return ` ${proxyBase}${encodeURIComponent(absoluteUrl)}`;
        });

        // ২.৫ চূড়ান্ত রেস্পন্স রিটার্ন করুন
        return new Response(content, {
            headers: {
                'Content-Type': 'application/vnd.apple.mpegurl',
                'Access-Control-Allow-Origin': '*',
                'Cache-Control': 'no-cache',
                'Referrer-Policy': 'no-referrer-when-downgrade'
            }
        });

    } catch (error) {
        return new Response(`Proxy error: ${error.message}`, { status: 500 });
    }
}
