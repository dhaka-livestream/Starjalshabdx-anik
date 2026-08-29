// functions/proxy/live.m3u8.js
export async function onRequest(context) {
    const request = context.request;
    const url = new URL(request.url);

    // ==========================================
    // ১. .ts ফাইলের রিকোয়েস্ট হ্যান্ডেল করা
    // ==========================================
    const tsUrl = url.searchParams.get('url');
    if (tsUrl && tsUrl.includes('.ts')) {
        const tsResponse = await fetch(tsUrl, {
            headers: {
                'User-Agent': 'VLC/3.0.0',
                'Referer': 'https://devm3u.top/',
                'Origin': 'https://devm3u.top'
            }
        });
        return new Response(tsResponse.body, {
            headers: {
                'Content-Type': 'video/MP2T',
                'Access-Control-Allow-Origin': '*',
                'Cache-Control': 'public, max-age=86400'
            }
        });
    }

    // ==========================================
    // ২. মূল API কল ও ডিবাগ মোড
    // ==========================================
    const apiUrl = 'https://live.devm3u.top/api/play/starjalsha-json-starjalsha';

    try {
        // ২.১ API থেকে ডেটা আনার চেষ্টা
        const apiRes = await fetch(apiUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept': 'application/json',
                'Referer': 'https://devm3u.top/'
            }
        });

        // ২.২ পুরো রেস্পন্স টেক্সট আকারে নিন (জাসন পার্স না করেই)
        const apiText = await apiRes.text();
        let apiData;
        try {
            apiData = JSON.parse(apiText);
        } catch (e) {
            // যদি JSON না হয়, তাহলে এই এররটা ব্রাউজারে দেখান
            return new Response(
                `❌ JSON Parse Error: ${e.message}\n\n🔹 API Status: ${apiRes.status}\n🔹 Raw Response:\n${apiText}`,
                { status: 500, headers: { 'Content-Type': 'text/plain; charset=utf-8' } }
            );
        }

        // ২.৩ ডিবাগ মোড (ব্রাউজারে দেখার জন্য)
        // ব্রাউজারে খুলুন: https://star-jalsha-proxy.pages.dev/proxy/live.m3u8?debug=true
        const isDebug = url.searchParams.get('debug') === 'true';
        if (isDebug) {
            return new Response(
                `✅ API থেকে ডেটা সফলভাবে পাওয়া গেছে!\n\n` +
                `🔹 Status Code: ${apiRes.status}\n` +
                `🔹 Full JSON Response:\n${JSON.stringify(apiData, null, 2)}`,
                { headers: { 'Content-Type': 'text/plain; charset=utf-8' } }
            );
        }

        // ২.৪ চেক করুন JSON-এ 'url' প্রপার্টি আছে কিনা
        if (!apiData.url) {
            return new Response(
                `❌ JSON-এ 'url' ফিল্ড পাওয়া যায়নি!\n\n🔹 Received JSON:\n${JSON.stringify(apiData, null, 2)}`,
                { status: 500, headers: { 'Content-Type': 'text/plain; charset=utf-8' } }
            );
        }

        // ==========================================
        // ৩. m3u8 প্লেলিস্ট প্রসেসিং (যদি সব ঠিক থাকে)
        // ==========================================
        const m3u8Url = apiData.url;

        // ৩.১ m3u8 ফাইল ডাউনলোড করুন
        const m3u8Res = await fetch(m3u8Url, {
            headers: {
                'User-Agent': 'VLC/3.0.0',
                'Referer': 'https://devm3u.top/'
            }
        });

        // যদি m3u8 ডাউনলোড না হয়
        if (!m3u8Res.ok) {
            return new Response(
                `❌ m3u8 ফাইল ডাউনলোড করতে ব্যর্থ!\nStatus: ${m3u8Res.status}\nURL: ${m3u8Url}`,
                { status: 500, headers: { 'Content-Type': 'text/plain; charset=utf-8' } }
            );
        }

        let content = await m3u8Res.text();

        // ৩.২ .ts ফাইলগুলোর লিংক রিরাইট করুন
        const baseUrl = m3u8Url.substring(0, m3u8Url.lastIndexOf('/') + 1);
        const proxyBase = url.origin + url.pathname + '?url=';

        content = content.replace(/(https?:\/\/[^\s"']+\.ts| [^\s"']+\.ts)/g, (match) => {
            let absoluteUrl;
            if (match.startsWith('http')) {
                absoluteUrl = match.trim();
            } else {
                try {
                    absoluteUrl = new URL(match.trim(), baseUrl).href;
                } catch (e) {
                    return match; // যদি URL বানানো না যায়, তাহলে আগের মতো রাখুন
                }
            }
            return ` ${proxyBase}${encodeURIComponent(absoluteUrl)}`;
        });

        // ৩.৩ ফাইনাল রেস্পন্স
        return new Response(content, {
            headers: {
                'Content-Type': 'application/vnd.apple.mpegurl',
                'Access-Control-Allow-Origin': '*',
                'Cache-Control': 'no-cache'
            }
        });

    } catch (error) {
        // নেটওয়ার্ক বা অন্য কোনো ক্রিটিক্যাল এরর
        return new Response(
            `💥 সার্ভার সাইড এরর:\n${error.message}\n\nStack Trace:\n${error.stack}`,
            { status: 500, headers: { 'Content-Type': 'text/plain; charset=utf-8' } }
        );
    }
}
