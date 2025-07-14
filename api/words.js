// api/words.js (FINAL - CORRECTLY SEPARATES LOGIC FOR LIST VS. SEARCH)

import { MongoClient } from 'mongodb';

function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri);

export default async function handler(request, response) {
  try {
    await client.connect();
    const db = client.db("n5_dictionary_db");
    const collection = db.collection("words");

    // Get all potential parameters
    const { lesson, search, list } = request.query;
    
    let query = {};
    let results = [];

    // --- THE CRITICAL LOGIC SEPARATION ---
    if (list) {
      // 1. Handle requests for a specific list of words (from Study Session)
      const decodedList = decodeURIComponent(list);
      const wordList = decodedList.split(',').map(word => word.trim());
      query = { bangla: { $in: wordList } };
      results = await collection.find(query).toArray();

    } else if (search) {
      // 2. Handle general search requests (from search bar)
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
    
    } else if (lesson) {
      // 3. Handle requests for a specific lesson
      query = { lesson: parseInt(lesson, 10) };
      results = await collection.find(query).sort({ bangla: 1 }).toArray();
    
    } else {
      // 4. Default: Get all words (for homepage)
      results = await collection.find({}).sort({ bangla: 1 }).toArray();
    }
    
    // Convert the results array into the required dictionary object format
    const dictionaryObject = results.reduce((obj, item) => {
        obj[item.bangla] = {
            meaning: item.japanese || '',
            en: item.english || '',
            category: item.category || 'Others',
            lesson: item.lesson || 0
        };
        return obj;
    }, {});

    response.status(200).json(dictionaryObject);

  } catch (error) {
    console.error("API Error:", error);
    response.status(500).json({ error: "API Error: " + error.message });
  } 
}