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

export default async function handler(request) {
  try {
    const db = await connectToDatabase();
    const collection = db.collection("words");

    const url = new URL(request.url);
    const lesson = url.searchParams.get('lesson');
    const search = url.searchParams.get('search');
    const list = url.searchParams.get('list');
    // --- FIX: Corrected typo from searchparams to searchParams ---
    const category = url.searchParams.get('category');
    
    let query = {};
    let results = [];

    if (list) {
      const wordList = list.split(',').map(word => word.trim());
      query = { bangla: { $in: wordList } };
      results = await collection.find(query).toArray();

    } else if (search) {
      const searchRegex = new RegExp(escapeRegExp(search), 'i'); 
      query = { 
        $or: [
          { bangla: { $regex: searchRegex } },
          { japanese: { $regex: searchRegex } },
          { english: { $regex: searchRegex } }
        ]
      };
      results = await collection.find(query).sort({ bangla: 1 }).toArray();
    
    } else { 
      if (lesson) {
        query.lesson = parseInt(lesson, 10);
      }
      if (category) {
        query.category = { $regex: `^${escapeRegExp(category)}$`, $options: 'i' };
      }
      results = await collection.find(query).sort({ bangla: 1 }).toArray();
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