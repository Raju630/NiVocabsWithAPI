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
    const collection = db.collection("words");

    // Ensure event.queryStringParameters is an object, even if empty
    const queryParams = event.queryStringParameters || {};
    const { lesson, search, list } = queryParams; // Destructure from the (potentially empty) object
    
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
    
    } else if (lesson !== undefined && lesson !== null) { // This condition is good for lesson
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
    console.error("API Error:", error);
    // You should still check Netlify logs for the specific error here
    return new Response(JSON.stringify({ error: "API Error: " + error.message }), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  }
}