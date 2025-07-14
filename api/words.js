// api/words.js (CORRECTED for Edge Functions)

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

// The 'event' object is actually a standard Request object in Edge Functions
export default async function handler(request) {
  try {
    const db = await connectToDatabase();
    const collection = db.collection("words");

    // --- FIX: Get query params from the request URL ---
    const url = new URL(request.url);
    const lesson = url.searchParams.get('lesson');
    const search = url.searchParams.get('search');
    const list = url.searchParams.get('list');
    // --- END FIX ---
    
    let query = {};
    let results = [];

    if (list) {
      // Note: decodeURIComponent is not needed here, url.searchParams.get() already decodes.
      const wordList = list.split(',').map(word => word.trim());
      query = { bangla: { $in: wordList } };
      results = await collection.find(query).toArray();

    } else if (search) {
      // Note: decodeURIComponent is not needed here.
      const searchRegex = new RegExp(escapeRegExp(search), 'i'); 
      query = { 
        $or: [
          { bangla: { $regex: searchRegex } },
          { japanese: { $regex: searchRegex } },
          { english: { $regex: searchRegex } }
        ]
      };
      results = await collection.find(query).sort({ bangla: 1 }).toArray();
    
    } else if (lesson) {
      query = { lesson: parseInt(lesson, 10) };
      results = await collection.find(query).sort({ bangla: 1 }).toArray();
    
    } else { // This is the default branch for no parameters
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

    return new Response(JSON.stringify(dictionaryObject), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });

  } catch (error) {
    console.error("API Error in words function:", error);
    return new Response(JSON.stringify({ error: "API Error: " + error.message }), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  }
}