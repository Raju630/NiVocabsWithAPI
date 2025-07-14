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

    // --- UPDATED: Get specific jp_term and en_term parameters ---
    const url = new URL(request.url);
    const jp_term = url.searchParams.get('jp_term');
    const en_term = url.searchParams.get('en_term');
    // --- END UPDATE ---

    // Validate that both terms are provided and not empty after trimming.
    const trimmedJpTerm = jp_term ? jp_term.trim() : '';
    const trimmedEnTerm = en_term ? en_term.trim() : '';

    if (!trimmedJpTerm || !trimmedEnTerm) {
      console.error("Sentences API: Missing 'jp_term' or 'en_term' parameter.");
      return new Response(JSON.stringify({ error: "Both a Japanese and English search term are required." }), {
        status: 400,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      });
    }

    // --- NEW: Build the combined query using $and ---
    
    // Condition A: The Japanese term must be in the 'jp' field.
    const jpRegex = new RegExp(escapeRegExp(trimmedJpTerm), 'i');
    const jpCondition = { jp: { $regex: jpRegex } };

    // Condition B: At least one of the English keywords must be in the 'en' field.
    const englishKeywords = trimmedEnTerm.split(/\s+|[~()]|\s*,\s*/).filter(Boolean);
    
    if (englishKeywords.length === 0) {
       console.error("Sentences API: English term resulted in no valid search words.");
       return new Response(JSON.stringify({ error: "Invalid English search term provided." }), {
            status: 400,
            headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
        });
    }

    // Create an $or query for each English keyword
    const enOrConditions = englishKeywords.map(word => {
        const regex = new RegExp(escapeRegExp(word), 'i');
        return { en: { $regex: regex } };
    });
    const enCondition = { $or: enOrConditions };

    // Combine both conditions with a top-level $and
    const mongoQuery = { $and: [jpCondition, enCondition] };
    // --- END NEW QUERY ---

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