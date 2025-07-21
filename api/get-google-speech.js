// functions/get-google-speech.js

export default async function handler(request) {
  // 1. Get the text from the request URL
  const url = new URL(request.url);
  const text = url.searchParams.get('text');

  if (!text) {
    return new Response(JSON.stringify({ error: 'Text parameter is required.' }), { status: 400 });
  }

  // 2. Construct the Google Translate TTS URL
  const googleTtsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&tl=ja&client=tw-ob&q=${encodeURIComponent(text)}`;

  try {
    // 3. Fetch the audio from Google on the server
    const response = await fetch(googleTtsUrl, {
      // It's good practice to set a realistic User-Agent header
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch audio from Google. Status: ${response.status}`);
    }

    // 4. Get the audio data as an ArrayBuffer
    const audioArrayBuffer = await response.arrayBuffer();

    // 5. Convert the audio data to a Base64 string to send it as JSON
    // The 'Buffer' class is available in Netlify's Node.js environment
    const audioBase64 = Buffer.from(audioArrayBuffer).toString('base64');
    
    // 6. Return the Base64 audio data to the frontend
    return new Response(JSON.stringify({ audioContent: audioBase64 }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error("Google Speech Proxy Error:", error.message);
    return new Response(JSON.stringify({ error: error.message }), { status: 502 });
  }
}