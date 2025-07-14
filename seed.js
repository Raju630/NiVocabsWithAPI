// seed.js

// This script is for one-time use to populate your MongoDB database.
// It reads from your local full_data.json and uploads it.

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
    const db = client.db("n5_dictionary_db"); // You can name your database anything
    const wordsCollection = db.collection("words");
    const sentencesCollection = db.collection("sentences");

    // 3. Clear existing data to prevent duplicates on re-seeding
    await wordsCollection.deleteMany({});
    await sentencesCollection.deleteMany({});
    console.log("🧹 Cleared existing collections.");

    // 4. Read your local full_data.json file
    const dataPath = path.join(process.cwd(), 'data', 'full_data.json');
    const fileContent = await fs.readFile(dataPath, 'utf8');
    const data = JSON.parse(fileContent);
    const dictionary = data.dictionary;
    const exampleSentences = data.exampleSentences;

    // 5. Prepare the data for insertion
    const wordsToInsert = Object.keys(dictionary).map(banglaWord => ({
      bangla: banglaWord,
      japanese: dictionary[banglaWord].meaning,
      english: dictionary[banglaWord].en,
      category: dictionary[banglaWord].category,
      lesson: dictionary[banglaWord].lesson
    }));

    // Sentences are already in a good format
    const sentencesToInsert = exampleSentences;

    // 6. Insert the data into the collections
    if (wordsToInsert.length > 0) {
      const wordsResult = await wordsCollection.insertMany(wordsToInsert);
      console.log(`👍 Successfully seeded ${wordsResult.insertedCount} words.`);
    }

    if (sentencesToInsert.length > 0) {
      const sentencesResult = await sentencesCollection.insertMany(sentencesToInsert);
      console.log(`👍 Successfully seeded ${sentencesResult.insertedCount} sentences.`);
    }

    // 7. (Optional but Recommended) Create indexes for faster searching
    console.log("🚀 Creating search indexes...");
    await wordsCollection.createIndex({ lesson: 1 }); // For fast lesson filtering
    await wordsCollection.createIndex({ bangla: "text", japanese: "text", english: "text" }); // For fast text search
    console.log("✅ Indexes created successfully.");

  } catch (err) {
    console.error("❌ An error occurred during seeding:", err);
  } finally {
    // 8. Close the connection to the database
    await client.close();
    console.log("👋 Database connection closed.");
  }
}

// Run the seeder function
seedDatabase();