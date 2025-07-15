import { MongoClient } from 'mongodb';

let cachedDb = null;
const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri);

async function connectToDatabase() {
    if (cachedDb) return cachedDb;
    const connection = await client.connect();
    cachedDb = connection.db("n5_dictionary_db");
    return cachedDb;
}

export default async function handler(request) {
    if (request.method !== 'POST') {
        return new Response(JSON.stringify({ error: 'Method Not Allowed' }), { status: 405 });
    }

    try {
        const body = await request.json();
        // Expect the full word object now
        const { bangla, japanese, english } = body;

        if (!bangla || !japanese) {
            return new Response(JSON.stringify({ error: 'Bangla and Japanese words are required.' }), { status: 400 });
        }

        const db = await connectToDatabase();
        const collection = db.collection("requests");

        // Use the Japanese word as the key to check for existing pending requests
        const existingRequest = await collection.findOne({ japanese: japanese.trim(), status: 'pending' });
        if (existingRequest) {
            return new Response(JSON.stringify({ message: 'Request already exists.' }), { status: 200 });
        }
        
        const newRequest = {
            bangla: bangla.trim(),
            japanese: japanese.trim(),
            english: (english || '').trim(), // English is optional
            status: 'pending',
            requestedAt: new Date(),
        };

        await collection.insertOne(newRequest);

        return new Response(JSON.stringify({ success: true, message: 'Request submitted successfully!' }), { status: 201 });

    } catch (error) {
        console.error("Request Sentence API Error:", error);
        return new Response(JSON.stringify({ error: 'Server error while submitting request.' }), { status: 500 });
    }
}