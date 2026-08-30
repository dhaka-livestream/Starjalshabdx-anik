// functions/proxy/live.m3u8.js
export async function onRequest(context) {
    const url = new URL(context.request.url);

    // API থেকে বর্তমান m3u8 লিংক সংগ্রহ করুন
    const apiUrl = 'https://live.devm3u.top/api/play/starjalsha-json-starjalsha';

    try {
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

        // ====================================================
        // মূল সমাধান: 302 রিডাইরেক্ট + Referrer Policy সেট করা
        // ====================================================
        return new Response(null, {
            status: 302,
            headers: {
                'Location': m3u8Url,
                'Referrer-Policy': 'no-referrer',  // এই লাইনটি ব্রাউজারকে Referer না পাঠাতে বলে
                'Cache-Control': 'no-cache'
            }
        });

    } catch (error) {
        return new Response(`রিডাইরেক্ট এরর: ${error.message}`, { status: 500 });
    }
}
