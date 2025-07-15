// seed.js (SAFE VERSION - With optional re-seeding)

import { MongoClient } from 'mongodb';
import fs from 'fs/promises';
import path from 'path';
import dotenv from 'dotenv';

// Load the secret connection string from the .env file
dotenv.config();

// --- Main Seeder Function ---
async function seedDatabase() {
  // Check for the --reseed flag to determine if we should wipe data
  const shouldReseed = process.argv.includes('--reseed');

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error("❌ Error: MONGODB_URI not found in .env file.");
    return;
  }

  const client = new MongoClient(uri);

  try {
    // 1. Connect to the MongoDB cluster
    await client.connect();
    console.log("✅ Successfully connected to MongoDB Atlas!");

    const db = client.db("n5_dictionary_db");
    const wordsCollection = db.collection("words");
    const sentencesCollection = db.collection("sentences");

    // --- SAFETY CHECK ---
    // Only proceed with data deletion and insertion if the --reseed flag is present
    if (shouldReseed) {
      console.log("\n⚠️ --reseed flag detected. Wiping and re-seeding all data...");

      // 2. Clear existing data to prevent duplicates
      await wordsCollection.deleteMany({});
      await sentencesCollection.deleteMany({});
      console.log("   - Cleared existing 'words' and 'sentences' collections.");

      // 3. Read your local full_data.json file
      const dataPath = path.join(process.cwd(), 'data', 'full_data.json');
      const fileContent = await fs.readFile(dataPath, 'utf8');
      const data = JSON.parse(fileContent);

      if (!data.dictionary || !data.exampleSentences) {
        throw new Error("'dictionary' or 'exampleSentences' not found in full_data.json");
      }

      // 4. Prepare the data for insertion
      const wordsToInsert = Object.keys(data.dictionary).map(banglaWord => ({
        bangla: banglaWord,
        japanese: data.dictionary[banglaWord].meaning,
        english: data.dictionary[banglaWord].en,
        category: data.dictionary[banglaWord].category,
        lesson: data.dictionary[banglaWord].lesson
      }));

      const sentencesToInsert = data.exampleSentences;

      // 5. Insert the data into the collections
      if (wordsToInsert.length > 0) {
        const wordsResult = await wordsCollection.insertMany(wordsToInsert);
        console.log(`   - Successfully seeded ${wordsResult.insertedCount} words.`);
      }

      if (sentencesToInsert.length > 0) {
        const sentencesResult = await sentencesCollection.insertMany(sentencesToInsert);
        console.log(`   - Successfully seeded ${sentencesResult.insertedCount} sentences.`);
      }
      console.log("✅ Data re-seeding complete.");
    } else {
      console.log("\nℹ️ Running in 'indexes-only' mode. No data will be deleted or inserted.");
      console.log("   To wipe and re-seed all data, run with the --reseed flag: node seed.js --reseed");
    }

    // --- 6. CREATE/UPDATE INDEXES (This runs every time for safety) ---
    console.log("\n🚀 Ensuring all database indexes are up to date...");

    // Indexes for the 'words' collection
    await wordsCollection.createIndex({ lesson: 1, category: 1 }, { name: "lesson_category_filter_idx" });
    await wordsCollection.createIndex({ bangla: "text", japanese: "text", english: "text" }, { name: "word_search_text_idx" });
    console.log("   - Indexes for 'words' collection verified.");

    // Indexes for the 'sentences' collection
    await sentencesCollection.createIndex({ jp: 1 }, { name: "sentence_sort_jp_idx" });
    await sentencesCollection.createIndex({ jp: "text", en: "text" }, { name: "sentence_search_text_idx" });
    console.log("   - Indexes for 'sentences' collection verified.");

    console.log("✅ All indexes are created and up to date.");

  } catch (err) {
    if (err.code === 'ENOENT') {
        console.error(`\n❌ Error: Seeder could not find file at '${err.path}'.`);
        console.error("   Please make sure 'full_data.json' exists inside the 'data' directory.");
    } else {
        console.error("\n❌ An error occurred during the process:", err);
    }
  } finally {
    // 7. Close the connection to the database
    await client.close();
    console.log("\n👋 Database connection closed.");
  }
}

// Run the seeder function
seedDatabase();