// functions/proxy/live.m3u8.js
export async function onRequest(context) {
    const url = new URL(context.request.url);

    // যদি URL-এ ইতিমধ্যে 'direct' প্যারামিটার থাকে, তাহলে সেটি প্রক্রিয়া করবেন না (রিডাইরেক্ট লুপ এড়াতে)
    if (url.searchParams.has('direct')) {
        return new Response('Invalid request', { status: 400 });
    }

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

        // ক্লায়েন্টকে সরাসরি ওই m3u8 লিংকে ৩০২ রিডাইরেক্ট করুন
        return Response.redirect(m3u8Url, 302);

    } catch (error) {
        return new Response(`রিডাইরেক্ট এরর: ${error.message}`, { status: 500 });
    }
}
