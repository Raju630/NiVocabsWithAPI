// functions/get-particle-quiz-sentence.js (CORRECTED AND ROBUST VERSION)

import { MongoClient } from 'mongodb';

let cachedDb = null;
const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri);

async function connectToDatabase() {
  if (cachedDb) return cachedDb;
  const c = await client.connect();
  cachedDb = c.db("n5_dictionary_db");
  return cachedDb;
}

const TARGET_PARTICLES = ['は', 'が', 'を', 'に', 'へ', 'で', 'と', 'も', 'の', 'か', 'や'];

export default async function handler(request) {
  try {
    const db = await connectToDatabase();
    const collection = db.collection("sentences");

    // 1. Fetch a random sample of documents. This is a simple and fast query for the DB.
    const candidateSentences = await collection.aggregate([
      { $sample: { size: 30 } } // Get 30 random sentences to check
    ]).toArray();

    // 2. Define the smart regex within the function's JS environment
    const smartRegex = new RegExp(`(?<![ぁ-ん])(${TARGET_PARTICLES.join('|')})(?![ぁ-ん])`, 'g');

    // 3. Loop through the candidates to find the first valid one
    for (const sentence of candidateSentences) {
      if (sentence.jp && sentence.jp.match(smartRegex)) {
        // Found a sentence with a valid particle! Send it back and we're done.
        return new Response(JSON.stringify(sentence), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
    }

    // 4. If the loop finishes and no valid sentence was found, tell the frontend.
    // The frontend's existing retry logic will handle this.
    return new Response(JSON.stringify({ error: "No suitable sentence found in the random sample." }), {
      status: 404, // Not Found
      headers: { "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Particle Quiz API Error:", error);
    return new Response(JSON.stringify({ error: "Server error while fetching sentence." }), { 
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}