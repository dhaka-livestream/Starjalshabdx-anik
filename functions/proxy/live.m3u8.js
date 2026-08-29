// functions/proxy/live.m3u8.js
export async function onRequest(context) {
    const request = context.request;
    const url = new URL(request.url);

    // ================================================
    // ১. এটি কি কোনো .ts ফাইলের রিকোয়েস্ট?
    // ================================================
    const tsUrl = url.searchParams.get('url');
    if (tsUrl && tsUrl.includes('.ts')) {
        // সরাসরি .ts ফাইল ফেচ করুন (প্রয়োজনীয় হেডারসহ)
        const tsResponse = await fetch(tsUrl, {
            headers: {
                'User-Agent': 'VLC/3.0.0',
                'Referer': 'https://devm3u.top/',
                'Origin': 'https://devm3u.top'
            }
        });
        return new Response(tsResponse.body, {
            headers: {
                'Content-Type': 'video/MP2T',  // ঠিক MIME টাইপ
                'Access-Control-Allow-Origin': '*',
                'Cache-Control': 'public, max-age=86400'  // ১ দিন ক্যাশে
            }
        });
    }

    // ================================================
    // ২. মূল m3u8 প্লেলিস্ট তৈরি করুন
    // ================================================
    const apiUrl = 'https://live.devm3u.top/api/play/starjalsha-json-starjalsha';

    try {
        // ২.১ API থেকে ফ্রেশ লিংক নিন
        const apiRes = await fetch(apiUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0',
                'Referer': 'https://devm3u.top/'
            }
        });
        const apiData = await apiRes.json();

        if (!apiData.ok || !apiData.url) {
            return new Response('API রেস্পন্স ঠিক নেই', { status: 500 });
        }

        const m3u8Url = apiData.url;

        // ২.২ m3u8 ফাইল ডাউনলোড করুন
        const m3u8Res = await fetch(m3u8Url, {
            headers: {
                'User-Agent': 'VLC/3.0.0',
                'Referer': 'https://devm3u.top/'
            }
        });
        let content = await m3u8Res.text();

        // ২.৩ .ts লিংকগুলো রিরাইট করুন - সব ধরনের লিংক সাপোর্ট করে
        const baseUrl = m3u8Url.substring(0, m3u8Url.lastIndexOf('/') + 1);
        const proxyBase = url.origin + url.pathname + '?url=';

        // রেগুলার এক্সপ্রেশন দিয়ে সব .ts খুঁজুন (কোটা, স্পেস, লাইন ব্রেক সব হ্যান্ডেল করে)
        content = content.replace(/(https?:\/\/[^\s"']+\.ts| [^\s"']+\.ts)/g, (match) => {
            // যদি লিংকটি আপেক্ষিক (relative) হয়, তাহলে বেস দিয়ে যোগ করুন
            let absoluteUrl;
            if (match.startsWith('http')) {
                absoluteUrl = match.trim();
            } else {
                absoluteUrl = new URL(match.trim(), baseUrl).href;
            }
            return ` ${proxyBase}${encodeURIComponent(absoluteUrl)}`;  // স্পেস রেখে দিন
        });

        // ২.৪ রেস্পন্স রিটার্ন করুন (সঠিক হেডারসহ)
        return new Response(content, {
            headers: {
                'Content-Type': 'application/vnd.apple.mpegurl',
                'Access-Control-Allow-Origin': '*',
                'Cache-Control': 'no-cache',
                'Referrer-Policy': 'no-referrer-when-downgrade'
            }
        });

    } catch (error) {
        return new Response('প্রক্সি এরর: ' + error.message, { status: 500 });
    }
}
