// api/sentences.js (FINAL - With "AND" Logic for JP & EN)

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

export default async function handler(request) {
  try {
    const db = await connectToDatabase();
    const collection = db.collection("sentences");

    const url = new URL(request.url);
    const jpTerm = url.searchParams.get('jp_term');
    const enTerms = url.searchParams.get('en_terms'); // e.g., "time,hour"

    const trimmedJpTerm = jpTerm ? jpTerm.trim() : '';

    if (!trimmedJpTerm) {
      console.error("Sentences API: Missing required 'jp_term' parameter.");
      return new Response(JSON.stringify({ error: "A Japanese search term is required." }), {
        status: 400,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      });
    }

    let mongoQuery = {};

    // Create the regex for the mandatory Japanese term
    const jpRegex = new RegExp(escapeRegExp(trimmedJpTerm), 'i');
    
    // Check if English terms were provided for the "AND" condition
    const enTermsArray = enTerms ? enTerms.split(',').map(t => t.trim()).filter(Boolean) : [];

    if (enTermsArray.length > 0) {
      // --- NEW "AND" LOGIC ---
      // Condition B: Match AT LEAST ONE of the English keywords
      const orConditions = enTermsArray.map(word => ({
        en: { $regex: new RegExp(`\\b${escapeRegExp(word)}\\b`, 'i') } // Use word boundaries for better matching
      }));
      
      // Combine Condition A (Japanese) and Condition B (English) with $and
      mongoQuery = {
        $and: [
          { jp: { $regex: jpRegex } }, // Condition A
          { $or: orConditions }        // Condition B
        ]
      };

    } else {
      // Fallback: If no English terms are provided, just search by Japanese term
      mongoQuery = { jp: { $regex: jpRegex } };
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