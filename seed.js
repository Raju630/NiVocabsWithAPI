// seed.js (With Full Index Creation)

// This script is for one-time use to populate your MongoDB database.
// It reads from your local full_data.json and uploads it.
// It also creates essential indexes for fast queries.

import { MongoClient } from 'mongodb';
import fs from 'fs/promises';
import path from 'path';
import dotenv from 'dotenv';

// Load the secret connection string from the .env file
dotenv.config();

// --- Main Seeder Function ---
async function seedDatabase() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error("Error: MONGODB_URI not found in .env file.");
    console.error("Please ensure you have a .env file with your MongoDB connection string.");
    return;
  }

  const client = new MongoClient(uri);

  try {
    // 1. Connect to the MongoDB cluster
    await client.connect();
    console.log("✅ Successfully connected to MongoDB Atlas!");

    // 2. Define your database and collections
    const db = client.db("n5_dictionary_db");
    const wordsCollection = db.collection("words");
    const sentencesCollection = db.collection("sentences");

    // 3. Clear existing data to prevent duplicates on re-seeding
    // UNCOMMENT these lines only if you want to WIPE and RE-SEED your database.
    // For just adding indexes, keep them commented out.
    // await wordsCollection.deleteMany({});
    // await sentencesCollection.deleteMany({});
    // console.log("🧹 Cleared existing collections.");

    // 4. Read your local full_data.json file (optional, if re-seeding)
    // const dataPath = path.join(process.cwd(), 'data', 'full_data.json');
    // const fileContent = await fs.readFile(dataPath, 'utf8');
    // const data = JSON.parse(fileContent);
    // const dictionary = data.dictionary;
    // const exampleSentences = data.exampleSentences;

    // 5. Prepare data for insertion (optional, if re-seeding)
    // const wordsToInsert = Object.keys(dictionary).map(banglaWord => ({ /* ... */ }));
    // const sentencesToInsert = exampleSentences;

    // 6. Insert data (optional, if re-seeding)
    // if (wordsToInsert.length > 0) { /* ... */ }
    // if (sentencesToInsert.length > 0) { /* ... */ }

    // --- 7. CREATE INDEXES (This is the most important part) ---
    console.log("🚀 Creating search indexes... (This may take a moment)");

    // Index for the 'words' collection
    console.log("   - Creating indexes for 'words' collection...");
    await wordsCollection.createIndex({ lesson: 1, category: 1 }); // For filtering in admin panel
    await wordsCollection.createIndex({ bangla: "text", japanese: "text", english: "text" }); // For main search bar
    console.log("   ✔ 'words' indexes created.");

    // Index for the 'sentences' collection
    console.log("   - Creating indexes for 'sentences' collection...");
    await sentencesCollection.createIndex({ jp: 1 }); // For sorting in admin panel and main site search
    console.log("   ✔ 'sentences' indexes created.");

    console.log("✅ All indexes created successfully.");

  } catch (err) {
    console.error("❌ An error occurred during the process:", err);
  } finally {
    // 8. Close the connection to the database
    await client.close();
    console.log("👋 Database connection closed.");
  }
}

// Run the seeder function
seedDatabase();