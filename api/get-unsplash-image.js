// functions/get-unsplash-image.js

export default async function handler(request) {
  // 1. Get the search query from the frontend request
  const url = new URL(request.url);
  const query = url.searchParams.get('query');

  if (!query) {
    return new Response(JSON.stringify({ error: 'Search query is required.' }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  // 2. Securely get the API key from environment variables
  const UNSPLASH_ACCESS_KEY = process.env.UNSPLASH_ACCESS_KEY;

  if (!UNSPLASH_ACCESS_KEY) {
     return new Response(JSON.stringify({ error: 'Server configuration error: API key not found.' }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
  
  // 3. Construct the Unsplash API URL
  const unsplashUrl = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=1&orientation=landscape`;
  
  try {
    const unsplashResponse = await fetch(unsplashUrl, {
      headers: {
        // Unsplash uses a different authorization header format
        'Authorization': `Client-ID ${UNSPLASH_ACCESS_KEY}`,
      },
    });

    if (!unsplashResponse.ok) {
      const errorData = await unsplashResponse.text();
      throw new Error(`Unsplash API error: ${unsplashResponse.status} - ${errorData}`);
    }

    const data = await unsplashResponse.json();
    
    // 4. Return the successful response to the frontend
    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Unsplash Proxy Error:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 502, // Bad Gateway
      headers: { "Content-Type": "application/json" },
    });
  }
}