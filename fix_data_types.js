// fix_data_types.js
// This script converts any 'lesson' fields stored as strings to numbers.

import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config();

async function normalizeLessonData() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error("❌ Error: MONGODB_URI not found in .env file.");
    return;
  }

  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log("✅ Successfully connected to MongoDB Atlas!");

    const db = client.db("n5_dictionary_db");
    const wordsCollection = db.collection("words");

    console.log("\n🔍 Finding words with 'lesson' field stored as a string...");

    // Find all documents where 'lesson' is of type 'string'
    const wordsToUpdate = await wordsCollection.find({ lesson: { $type: "string" } }).toArray();

    if (wordsToUpdate.length === 0) {
      console.log("✅ No words with string-based lessons found. Your data is already clean!");
      return;
    }

    console.log(`Found ${wordsToUpdate.length} words to update.`);

    let updatedCount = 0;
    // Create an array of update operations
    const bulkOperations = wordsToUpdate.map(word => {
        const lessonAsNumber = parseInt(word.lesson, 10);
        // Check if parsing was successful (is a valid number)
        if (!isNaN(lessonAsNumber)) {
            updatedCount++;
            return {
                updateOne: {
                    filter: { _id: word._id },
                    update: { $set: { lesson: lessonAsNumber } }
                }
            };
        }
        return null; // Return null for invalid conversions
    }).filter(op => op !== null); // Filter out any null operations

    if (bulkOperations.length > 0) {
      console.log(`\n🚀 Performing bulk update on ${updatedCount} words...`);
      const result = await wordsCollection.bulkWrite(bulkOperations);
      console.log(`   - Modified ${result.modifiedCount} documents.`);
    }

    console.log("\n✅ Data normalization complete.");

  } catch (err) {
    console.error("\n❌ An error occurred during the process:", err);
  } finally {
    await client.close();
    console.log("\n👋 Database connection closed.");
  }
}

// Run the script
normalizeLessonData();