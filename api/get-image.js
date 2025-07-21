// functions/get-image.js

import { MongoClient } from 'mongodb'; // Although not used, helps Netlify identify it as a function

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
  const PEXELS_API_KEY = process.env.PEXELS_API_KEY;

  if (!PEXELS_API_KEY) {
     return new Response(JSON.stringify({ error: 'Server configuration error: API key not found.' }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
  
  // 3. Make the actual request to the Pexels API from the server
  const pexelsUrl = `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=1`;
  
  try {
    const pexelsResponse = await fetch(pexelsUrl, {
      headers: {
        Authorization: PEXELS_API_KEY,
      },
    });

    if (!pexelsResponse.ok) {
      // Pass the error from Pexels back to the frontend
      const errorData = await pexelsResponse.text();
      throw new Error(`Pexels API error: ${pexelsResponse.status} - ${errorData}`);
    }

    const data = await pexelsResponse.json();
    
    // 4. Return the successful response to the frontend
    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Pexels Proxy Error:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 502, // Bad Gateway - indicates an issue with the upstream server
      headers: { "Content-Type": "application/json" },
    });
  }
}