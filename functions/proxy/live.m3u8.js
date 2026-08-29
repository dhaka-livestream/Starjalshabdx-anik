// functions/proxy/live.m3u8.js
export async function onRequest(context) {
    const request = context.request;
    const url = new URL(request.url);
    const target = url.searchParams.get('url');

    // =============================================
    // অংশ ১: যদি এটি কোনো .ts ভিডিও ক্লিপের রিকোয়েস্ট হয়
    // (যেমন: ?url=https://...file.ts)
    // =============================================
    if (target && target.includes('.ts')) {
        const tsResponse = await fetch(target, {
            headers: {
                'User-Agent': 'VLC/3.0.0'
            }
        });
        return new Response(tsResponse.body, {
            headers: {
                'Content-Type': 'video/MP2T',
                'Access-Control-Allow-Origin': '*',
                'Cache-Control': 'public, max-age=3600' // ১ ঘণ্টা ক্যাশে রাখবে
            }
        });
    }

    // =============================================
    // অংশ ২: মূল m3u8 প্লেলিস্ট রিকোয়েস্ট
    // =============================================
    const apiUrl = 'https://live.devm3u.top/api/play/starjalsha-json-starjalsha';
    
    try {
        // ২.১: API থেকে ফ্রেশ কার্যকরী লিংক সংগ্রহ করুন
        const apiResponse = await fetch(apiUrl, {
            headers: { 'User-Agent': 'Mozilla/5.0' }
        });
        const apiData = await apiResponse.json();

        // চেক করুন API ঠিকমতো কাজ করছে কিনা
        if (!apiData.ok || !apiData.url) {
            return new Response('API থেকে সঠিক লিংক পাওয়া যায়নি', { status: 500 });
        }

        const freshM3u8Url = apiData.url;

        // ২.২: সেই ফ্রেশ লিংক থেকে m3u8 প্লেলিস্ট ডাউনলোড করুন
        const playlistResponse = await fetch(freshM3u8Url, {
            headers: { 'User-Agent': 'VLC/3.0.0' }
        });
        const content = await playlistResponse.text();

        // ২.৩: m3u8 ফাইলের ভিতরের .ts ফাইলগুলোর লিংক পুনরায় লিখুন (Rewrite)
        const baseUrl = freshM3u8Url.substring(0, freshM3u8Url.lastIndexOf('/') + 1);
        
        // নিজের প্রোক্সির ঠিকানা বের করুন (যেমন: https://star-jalsha-proxy.pages.dev/proxy/live.m3u8)
        const currentUrl = context.request.url;
        const proxyBase = currentUrl.split('?')[0] + '?url='; 

        const newContent = content.replace(/([^\n]+\.ts)/g, (match, p1) => {
            // আপেক্ষিক লিংককে সম্পূর্ণ লিংকে রূপান্তর
            const absoluteUrl = new URL(p1, baseUrl).href;
            // প্রতিটি .ts ফাইলকেও এই প্রোক্সি দিয়ে আনুন
            return `${proxyBase}${encodeURIComponent(absoluteUrl)}`;
        });

        // ২.৪: পরিবর্তিত প্লেলিস্ট প্লেয়ারে পাঠান
        return new Response(newContent, {
            headers: {
                'Content-Type': 'application/vnd.apple.mpegurl',
                'Access-Control-Allow-Origin': '*',
                'Cache-Control': 'no-cache' // সবসময় ফ্রেশ কনটেন্ট পেতে
            }
        });

    } catch (error) {
        return new Response('সার্ভার এরর: ' + error.message, { status: 500 });
    }
}
