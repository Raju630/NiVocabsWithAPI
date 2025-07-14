// api/sentences.js (CORRECTED for Edge Functions)

import { MongoClient } from 'mongodb';

let cachedDb = null;
const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri);

async function connectToDatabase() {
  if (cachedDb) {
    return cachedDb;
  }
  const connection = await client.connect();
  cachedDb = connection.db("n5_dictionary_db");
  return cachedDb;
}

function escapeRegExp(string) {
  // Escapes regex special characters
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// The 'event' object is actually a standard Request object in Edge Functions
export default async function handler(request) {
  try {
    const db = await connectToDatabase();
    const collection = db.collection("sentences");

    // --- FIX: Get query params from the request URL ---
    const url = new URL(request.url);
    const term = url.searchParams.get('term');
    const lang = url.searchParams.get('lang');
    // --- END FIX ---

    // Validate 'term' for emptiness after trimming.
    const trimmedTerm = term ? term.trim() : '';

    if (!trimmedTerm) { // This check was correctly firing before, causing the 400 error
      console.error("Sentences API: Missing or empty 'term' parameter.");
      return new Response(JSON.stringify({ error: "A search term is required and cannot be empty." }), {
        status: 400,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      });
    }

    let searchField;
    let mongoQuery = {};

    if (lang === 'en') {
      searchField = 'en';
      // For English, split the term into individual words and search for ANY of them.
      const searchTerms = trimmedTerm.split(/\s+|[~()]|\s*,\s*/).filter(Boolean);
      
      if (searchTerms.length === 0) {
           console.error("Sentences API: English term resulted in no valid search words.");
           return new Response(JSON.stringify({ error: "Invalid English search term." }), {
                status: 400,
                headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
            });
      }

      // Create an $or query for each word
      const orConditions = searchTerms.map(word => {
          const regex = new RegExp(escapeRegExp(word), 'i');
          const condition = {};
          condition[searchField] = { $regex: regex };
          return condition;
      });
      mongoQuery = { $or: orConditions };

    } else { // Default to Japanese searchField
      searchField = 'jp';
      const searchRegex = new RegExp(escapeRegExp(trimmedTerm), 'i');
      mongoQuery[searchField] = { $regex: searchRegex };
    }

    const results = await collection.find(mongoQuery).limit(50).toArray();

    return new Response(JSON.stringify(results), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      },
    });

  } catch (error) {
    console.error("API Error in sentences function:", error);
    return new Response(JSON.stringify({ error: "Failed to fetch sentences due to server error. " + error.message }), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      },
    });
  }
}