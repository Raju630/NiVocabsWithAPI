// api/sentences.js (FINAL & CORRECTED)

import { MongoClient } from 'mongodb';

// Add the connection pooling logic
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
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export default async function handler(event) { // Change 'request' to 'event'
  try {
    const db = await connectToDatabase();
    const collection = db.collection("sentences");

    // Get the search term from event.queryStringParameters
    const { term } = event.queryStringParameters || {}; // FIX 1: Access query params correctly

    if (!term) {
      // FIX 2: Return the error response in the correct format
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify({ error: "A search term is required." }),
      };
    }
    
    const searchRegex = new RegExp(escapeRegExp(term), 'i');

    const results = await collection.find({ jp: { $regex: searchRegex } }).limit(50).toArray();

    // FIX 2: Return the success response in the correct format
    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify(results),
    };

  } catch (error) {
    console.error("API Error:", error);
    // FIX 2 (continued): Return error response in the correct format
    return {
      statusCode: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify({ error: "Failed to connect to the database or fetch sentences." }),
    };
  } finally {
    // Do NOT close the client connection here for connection pooling
  }
}