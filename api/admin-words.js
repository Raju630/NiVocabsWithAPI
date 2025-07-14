import { MongoClient, ObjectId } from 'mongodb';
import { timingSafeEqual } from 'crypto';

// --- DATABASE CONNECTION ---
let cachedDb = null;
const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri);

async function connectToDatabase() {
    if (cachedDb) return cachedDb;
    const connection = await client.connect();
    cachedDb = connection.db("n5_dictionary_db");
    return cachedDb;
}

// --- AUTHENTICATION HELPER ---
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
    const db = await connectToDatabase();
    const collection = db.collection("words");

    let body = {};
    if (request.method !== 'GET' && request.headers.get('content-type')?.includes('application/json')) {
        try {
            body = await request.json();
        } catch (e) {
            return new Response(JSON.stringify({ error: 'Invalid JSON body' }), { status: 400 });
        }
    }

    // --- LOGIN ACTION ---
    if (request.method === 'POST' && body.action === 'login') {
        if (isAuthorized(body.password)) {
            return new Response(JSON.stringify({ success: true }), { status: 200 });
        } else {
            return new Response(JSON.stringify({ error: 'Invalid credentials.' }), { status: 401 });
        }
    }

    // --- AUTHENTICATION FOR ALL OTHER ACTIONS ---
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.split(' ')[1];
    
    if (!isAuthorized(token)) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    try {
        switch (request.method) {
            case 'GET':
                // --- MODIFIED TO HANDLE FILTERS ---
                const url = new URL(request.url, `http://${request.headers.get('host')}`);
                const lesson = url.searchParams.get('lesson');
                const category = url.searchParams.get('category');
                
                let query = {};
                if (lesson) {
                    query.lesson = parseInt(lesson, 10);
                }
                if (category) {
                    query.category = category;
                }
                
                const words = await collection.find(query).sort({ bangla: 1 }).toArray();
                return new Response(JSON.stringify(words), { status: 200 });

            case 'POST':
                const newWord = {
                    bangla: body.bangla, japanese: body.japanese, english: body.english,
                    category: body.category, lesson: body.lesson,
                };
                await collection.insertOne(newWord);
                return new Response(JSON.stringify({ success: true, newWord }), { status: 201 });

            case 'PUT':
                const { id, ...updateData } = body;
                if (!id) throw new Error("Word ID is required for update.");
                await collection.updateOne({ _id: new ObjectId(id) }, { $set: updateData });
                return new Response(JSON.stringify({ success: true }), { status: 200 });

            case 'DELETE':
                if (!body.id) throw new Error("Word ID is required for deletion.");
                await collection.deleteOne({ _id: new ObjectId(body.id) });
                return new Response(JSON.stringify({ success: true }), { status: 200 });

            default:
                return new Response(JSON.stringify({ error: 'Method Not Allowed' }), { status: 405 });
        }
    } catch (error) {
        console.error("Admin API Error:", error);
        return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }
}