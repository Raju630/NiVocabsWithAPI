// api/sentences.js

import { MongoClient } from 'mongodb';

const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri);

// This function escapes special regex characters
function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export default async function handler(request, response) {
  try {
    await client.connect();
    const db = client.db("n5_dictionary_db");
    const collection = db.collection("sentences");

    // Get the search term from the URL (?term=japanese_word)
    const { term } = request.query;

    if (!term) {
      return response.status(400).json({ error: "A search term is required." });
    }
    
    // Create a case-insensitive regular expression to find the term within sentences
    const searchRegex = new RegExp(escapeRegExp(term), 'i');

    // Find all sentences where the 'jp' field matches the regex
    const results = await collection.find({ jp: { $regex: searchRegex } }).limit(50).toArray(); // Limit to 50 results for performance

    response.status(200).json(results);

  } catch (error) {
    console.error("API Error:", error);
    response.status(500).json({ error: "Failed to connect to the database or fetch sentences." });
  }
}