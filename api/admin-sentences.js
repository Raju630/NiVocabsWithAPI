import { MongoClient, ObjectId } from 'mongodb';
import { timingSafeEqual } from 'crypto';

// --- DATABASE CONNECTION (reusable logic) ---
let cachedDb = null;
const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri);
async function connectToDatabase() {
    if (cachedDb) return cachedDb;
    const connection = await client.connect();
    cachedDb = connection.db("n5_dictionary_db");
    return cachedDb;
}

// --- AUTHENTICATION HELPER (reusable logic) ---
const isAuthorized = (password) => {
    const adminPassword = process.env.ADMIN_PASSWORD;
    if (!adminPassword || !password) return false;
    const passBuffer = Buffer.from(password, 'utf8');
    const adminPassBuffer = Buffer.from(adminPassword, 'utf8');
    if (passBuffer.length !== adminPassBuffer.length) return false;
    return timingSafeEqual(passBuffer, adminPassBuffer);
};

// --- MAIN API HANDLER ---
export default async function handler(request) {
    // Authenticate every request
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.split(' ')[1];
    if (!isAuthorized(token)) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    const db = await connectToDatabase();
    const collection = db.collection("sentences"); // Work with the 'sentences' collection

    try {
        switch (request.method) {
            case 'GET':
                // --- MODIFIED: Fetch ALL sentences, sorted by Japanese ---
                const sentences = await collection.find({}).sort({ jp: 1 }).toArray();
                return new Response(JSON.stringify(sentences), { status: 200 });

            case 'POST': {
                // Add a new sentence
                const body = await request.json();
                const newSentence = {
                    jp: body.jp,
                    en: body.en,
                    bn: body.bn,
                };
                if (!newSentence.jp || !newSentence.en) throw new Error("Japanese and English sentences are required.");

                await collection.insertOne(newSentence);
                return new Response(JSON.stringify({ success: true, newSentence }), { status: 201 });
            }
            case 'DELETE': {
                // Delete a sentence
                const body = await request.json();
                if (!body.id) throw new Error("Sentence ID is required for deletion.");
                
                await collection.deleteOne({ _id: new ObjectId(body.id) });
                return new Response(JSON.stringify({ success: true }), { status: 200 });
            }
            default:
                return new Response(JSON.stringify({ error: 'Method Not Allowed' }), { status: 405 });
        }
    } catch (error) {
        console.error("Admin Sentences API Error:", error);
        return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }
}