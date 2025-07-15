import { MongoClient } from 'mongodb';
import { timingSafeEqual } from 'crypto';

// Reusable connection and auth logic
let cachedDb = null;
const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri);
async function connectToDatabase() { if (cachedDb) return cachedDb; const c = await client.connect(); cachedDb = c.db("n5_dictionary_db"); return cachedDb; }
const isAuthorized = (p) => { const a = process.env.ADMIN_PASSWORD; if (!a || !p) return false; const b1 = Buffer.from(p, 'utf8'), b2 = Buffer.from(a, 'utf8'); if (b1.length !== b2.length) return false; return timingSafeEqual(b1, b2); };

export default async function handler(request) {
    if (request.method !== 'POST') {
        return new Response(JSON.stringify({ error: 'Method Not Allowed' }), { status: 405 });
    }

    const token = request.headers.get('authorization')?.split(' ')[1];
    if (!isAuthorized(token)) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    try {
        const body = await request.json();
        const dictionary = body.dictionary;

        if (!dictionary || typeof dictionary !== 'object') {
            throw new Error('Invalid JSON format. Expected a top-level "dictionary" object.');
        }

        const wordsToInsert = Object.keys(dictionary).map(banglaWord => ({
            bangla: banglaWord,
            japanese: dictionary[banglaWord].meaning,
            english: dictionary[banglaWord].en,
            category: dictionary[banglaWord].category,
            lesson: dictionary[banglaWord].lesson
        }));

        if (wordsToInsert.length === 0) {
            return new Response(JSON.stringify({ success: true, insertedCount: 0, message: 'No words to insert.' }), { status: 200 });
        }

        const db = await connectToDatabase();
        const collection = db.collection("words");
        
        // Note: This will add new words. It won't update existing ones.
        // For a more robust solution, one might check for duplicates before inserting.
        const result = await collection.insertMany(wordsToInsert, { ordered: false }); // ordered:false continues on duplicate errors

        return new Response(JSON.stringify({ success: true, insertedCount: result.insertedCount }), { status: 201 });

    } catch (error) {
        console.error("Bulk Words Upload API Error:", error);
        return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }
}