// api/words.js (FINAL & CORRECTED)

import { MongoClient } from 'mongodb';

function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri);

// Declare client and db outside the handler for connection pooling
let cachedDb = null;

async function connectToDatabase() {
  if (cachedDb) {
    return cachedDb;
  }
  const connection = await client.connect();
  cachedDb = connection.db("n5_dictionary_db");
  return cachedDb;
}

export default async function handler(event) { // Change 'request' to 'event' for clarity
  // Netlify Functions (Lambda) pass event and context, not request/response
  // The query parameters are in event.queryStringParameters
  // The HTTP method is in event.httpMethod

  try {
    const db = await connectToDatabase();
    const collection = db.collection("words");

    // Get all potential parameters from event.queryStringParameters
    // Use optional chaining and nullish coalescing for safety
    const { lesson, search, list } = event.queryStringParameters || {}; // FIX 1: Access query params correctly

    let query = {};
    let results = [];

    if (list) {
      const decodedList = decodeURIComponent(list);
      const wordList = decodedList.split(',').map(word => word.trim());
      query = { bangla: { $in: wordList } };
      results = await collection.find(query).toArray();

    } else if (search) {
      const decodedSearch = decodeURIComponent(search);
      const searchRegex = new RegExp(escapeRegExp(decodedSearch), 'i'); 
      query = { 
        $or: [
          { bangla: { $regex: searchRegex } },
          { japanese: { $regex: searchRegex } },
          { english: { $regex: searchRegex } }
        ]
      };
      results = await collection.find(query).sort({ bangla: 1 }).toArray();
    
    } else if (lesson !== undefined && lesson !== null) { // More robust check for lesson presence
      query = { lesson: parseInt(lesson, 10) };
      results = await collection.find(query).sort({ bangla: 1 }).toArray();
    
    } else {
      results = await collection.find({}).sort({ bangla: 1 }).toArray();
    }
    
    const dictionaryObject = results.reduce((obj, item) => {
        obj[item.bangla] = {
            meaning: item.japanese || '',
            en: item.english || '',
            category: item.category || 'Others',
            lesson: item.lesson || 0
        };
        return obj;
    }, {});

    // FIX 2: Return the response in the correct Netlify Functions format
    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*", // Or specific origins if needed for CORS
      },
      body: JSON.stringify(dictionaryObject),
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
      body: JSON.stringify({ error: "API Error: " + error.message }),
    };
  } finally {
    // IMPORTANT: Do NOT close the client connection here if you're using global `client`
    // and `cachedDb` for connection pooling.
    // The connection should persist across invocations.
    // client.close() should only be called if you were truly done with the function instance,
    // which is usually not the case in serverless functions managing database connections.
  }
}