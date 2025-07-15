import { MongoClient, ObjectId } from 'mongodb';
import { timingSafeEqual } from 'crypto';

// Reusable connection and auth logic...
let cachedDb = null;
const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri);
async function connectToDatabase() { if (cachedDb) return cachedDb; const c = await client.connect(); cachedDb = c.db("n5_dictionary_db"); return cachedDb; }
const isAuthorized = (p) => { const a = process.env.ADMIN_PASSWORD; if (!a || !p) return false; const b1 = Buffer.from(p, 'utf8'), b2 = Buffer.from(a, 'utf8'); if (b1.length !== b2.length) return false; return timingSafeEqual(b1, b2); };

export default async function handler(request) {
    const token = request.headers.get('authorization')?.split(' ')[1];
    if (!isAuthorized(token)) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    const db = await connectToDatabase();
    const collection = db.collection("requests");

    try {
        switch (request.method) {
            case 'GET':
                // Fetch all pending requests, sorted by date
                const requests = await collection.find({ status: 'pending' }).sort({ requestedAt: 1 }).toArray();
                return new Response(JSON.stringify(requests), { status: 200 });

            case 'DELETE': {
                // To "resolve" a request, we'll delete it.
                const body = await request.json();
                if (!body.id) throw new Error("Request ID is required for deletion.");
                
                await collection.deleteOne({ _id: new ObjectId(body.id) });
                return new Response(JSON.stringify({ success: true }), { status: 200 });
            }
            default:
                return new Response(JSON.stringify({ error: 'Method Not Allowed' }), { status: 405 });
        }
    } catch (error) {
        console.error("Admin Requests API Error:", error);
        return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }
}