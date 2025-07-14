// api/sentences.js (FINAL & CORRECTED for Language Handling)

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
  // This is good for escaping special characters in a regex pattern
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export default async function handler(event) {
  try {
    const db = await connectToDatabase();
    const collection = db.collection("sentences");

    const { term, lang } = event.queryStringParameters || {}; // Now destructure 'lang' as well

    if (!term) {
      return new Response(JSON.stringify({ error: "A search term is required." }), {
        status: 400,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      });
    }

    let searchField;
    // Determine which field to search based on the 'lang' parameter
    if (lang === 'en') {
      searchField = 'en';
    } else if (lang === 'bn') { // Assuming you might add Bangla sentences later
      searchField = 'bn';
    } else { // Default to Japanese if lang is not 'en', 'bn', or not provided
      searchField = 'jp';
    }

    // Adjust the search term for English words to be more flexible,
    // as English terms in your data might be phrases.
    // However, the database sentences might only contain individual words.
    // For now, let's keep it simple with a direct regex on the term.
    // If you're searching for "post office", you might search for "post" AND "office".
    // For simplicity, let's just search the whole term passed, and rely on `RegExp`'s behavior.
    const searchRegex = new RegExp(escapeRegExp(term), 'i');

    // Build the query object dynamically
    const mongoQuery = {};
    mongoQuery[searchField] = { $regex: searchRegex };

    const results = await collection.find(mongoQuery).limit(50).toArray(); // Use mongoQuery

    return new Response(JSON.stringify(results), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });

  } catch (error) {
    console.error("API Error in sentences function:", error); // Make this log more specific
    // If a specific term (like the long English one) causes an error in RegExp or MongoDB
    // it will be caught here. This is why we are getting a 400/500 depending on the catch block.
    return new Response(JSON.stringify({ error: "Failed to fetch sentences. " + error.message }), {
      status: 500, // Changed to 500 as this is a server-side error, not a bad client request.
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  }
}