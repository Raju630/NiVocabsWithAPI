// api/sentences.js (FINAL & CORRECTED for Response API)

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
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export default async function handler(event) {
  try {
    const db = await connectToDatabase();
    const collection = db.collection("sentences");

    const { term } = event.queryStringParameters || {};

    if (!term) {
      // FIX: Return a new Response object for error
      return new Response(JSON.stringify({ error: "A search term is required." }), {
        status: 400,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      });
    }
    
    const searchRegex = new RegExp(escapeRegExp(term), 'i');

    const results = await collection.find({ jp: { $regex: searchRegex } }).limit(50).toArray();

    // FIX: Return a new Response object for success
    return new Response(JSON.stringify(results), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });

  } catch (error) {
    console.error("API Error:", error);
    // FIX: Return a new Response object for error
    return new Response(JSON.stringify({ error: "Failed to connect to the database or fetch sentences." }), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  }
}