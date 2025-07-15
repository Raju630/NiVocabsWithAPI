import fs from 'fs/promises';
import path from 'path';

async function removeDuplicateSentences() {
  try {
    // 1. Define file paths (MODIFIED to look inside the 'data' folder)
    const dataDir = path.join(process.cwd(), 'data');
    const inputFilePath = path.join(dataDir, 'full_data.json');
    const outputFilePath = path.join(dataDir, 'full_data_cleaned.json');

    console.log(`Reading data from: ${inputFilePath}`);

    // 2. Read the original data file
    const fileContent = await fs.readFile(inputFilePath, 'utf8');
    const data = JSON.parse(fileContent);

    if (!data.exampleSentences || !Array.isArray(data.exampleSentences)) {
      console.error("Error: 'exampleSentences' array not found in the JSON file.");
      return;
    }

    const originalCount = data.exampleSentences.length;
    console.log(`Found ${originalCount} sentences originally.`);

    // 3. Process and remove duplicates
    const uniqueSentences = [];
    const seenJpSentences = new Set(); 

    for (const sentence of data.exampleSentences) {
      const jpKey = sentence.jp.trim();
      if (!seenJpSentences.has(jpKey)) {
        seenJpSentences.add(jpKey);
        uniqueSentences.push(sentence);
      }
    }

    const newCount = uniqueSentences.length;
    const duplicatesRemoved = originalCount - newCount;

    console.log(`\nFound ${newCount} unique sentences.`);
    console.log(`Removed ${duplicatesRemoved} duplicate sentences.`);

    // 4. Update the data object
    data.exampleSentences = uniqueSentences;

    // 5. Write the cleaned data to a new file
    await fs.writeFile(outputFilePath, JSON.stringify(data, null, 2), 'utf8');

    console.log(`\n✅ Successfully wrote cleaned data to: ${outputFilePath}`);
    console.log("Please review 'full_data_cleaned.json' and, if it looks correct, you can rename it to 'full_data.json'.");

  } catch (error) {
    // This will catch the ENOENT error now and give a more helpful message
    if (error.code === 'ENOENT') {
        console.error(`\n❌ Error: File not found at '${error.path}'.`);
        console.error("Please make sure 'full_data.json' exists inside the 'data' directory.");
    } else {
        console.error("An error occurred during the cleanup process:", error);
    }
  }
}

// Run the function
removeDuplicateSentences();