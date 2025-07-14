// api/sentences.js (FINAL & Robust for Combined JP/EN Search)

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
    // NEW: Expecting specific parameters for combined search
    const jpTerm = url.searchParams.get('jp_term');
    const enTerms = url.searchParams.get('en_terms');

    // Japanese term is always required
    if (!jpTerm || !jpTerm.trim()) {
      return new Response(JSON.stringify({ error: "A Japanese search term (jp_term) is required." }), {
        status: 400,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      });
    }

    const trimmedJpTerm = jpTerm.trim();
    
    // --- The Core Logic Change: Build an $and query ---
    const andConditions = [];

    // Condition A: The Japanese term must be in the 'jp' field.
    andConditions.push({ 
      jp: { $regex: new RegExp(escapeRegExp(trimmedJpTerm), 'i') } 
    });

    // Condition B: If English terms are provided, AT LEAST ONE must be in the 'en' field.
    if (enTerms && enTerms.trim()) {
      const englishKeywords = enTerms.trim().split(',').filter(Boolean);
      
      if (englishKeywords.length > 0) {
        const orConditionsForEnglish = englishKeywords.map(word => ({
          en: { $regex: new RegExp(escapeRegExp(word.trim()), 'i') }
        }));
        
        // Add the $or block for English keywords to the main $and query
        andConditions.push({ $or: orConditionsForEnglish });
      }
    }

    const mongoQuery = { $and: andConditions };

    console.log("Executing MongoDB Query:", JSON.stringify(mongoQuery));

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