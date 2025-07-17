import { MongoClient, ObjectId } from 'mongodb';
import { timingSafeEqual } from 'crypto';

let cachedDb = null;
const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri);
async function connectToDatabase() { if (cachedDb) return cachedDb; const c = await client.connect(); cachedDb = c.db("n5_dictionary_db"); return cachedDb; }
const isAuthorized = (p) => { const a = process.env.ADMIN_PASSWORD; if (!a || !p) return false; const b1 = Buffer.from(p, 'utf8'), b2 = Buffer.from(a, 'utf8'); if (b1.length !== b2.length) return false; return timingSafeEqual(b1, b2); };

function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export default async function handler(request) {
    const token = request.headers.get('authorization')?.split(' ')[1];
    if (!isAuthorized(token)) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    const db = await connectToDatabase();
    const collection = db.collection("sentences");

    try {
        switch (request.method) {
            case 'GET': {
                const url = new URL(request.url, `http://${request.headers.get('host')}`);
                const search = url.searchParams.get('search'); // Get search term
                const page = parseInt(url.searchParams.get('page') || '1', 10);
                const limit = parseInt(url.searchParams.get('limit') || '30', 10);
                const skip = (page - 1) * limit;
                
                let query = {};
                // --- MODIFIED: Add search logic ---
                if (search) {
                    const searchRegex = new RegExp(escapeRegExp(search), 'i');
                    query = {
                        $or: [
                            { jp: { $regex: searchRegex } },
                            { en: { $regex: searchRegex } },
                            { bn: { $regex: searchRegex } }
                        ]
                    };
                }

                const total = await collection.countDocuments(query);
                const sentences = await collection.find(query).sort({ jp: 1 }).skip(skip).limit(limit).toArray();
                return new Response(JSON.stringify({ data: sentences, total, page, limit }), { status: 200 });
            }

            case 'POST': {
                const body = await request.json();
                const newSentence = { jp: body.jp, en: body.en, bn: body.bn };
                if (!newSentence.jp || !newSentence.en) throw new Error("Japanese and English sentences are required.");
                await collection.insertOne(newSentence);
                return new Response(JSON.stringify({ success: true, newSentence }), { status: 201 });
            }
            case 'PUT': {
                const body = await request.json();
                const { id, ...updateData } = body;
                if (!id) throw new Error("Sentence ID is required for update.");
                await collection.updateOne({ _id: new ObjectId(id) }, { $set: { jp: updateData.jp, en: updateData.en, bn: updateData.bn } });
                return new Response(JSON.stringify({ success: true }), { status: 200 });
            }
            case 'DELETE': {
                const body = await request.json();
                const { ids, id: singleId } = body;
                if (!ids && !singleId) throw new Error("An array of 'ids' or a single 'id' is required for deletion.");
                let deleteQuery;
                if (ids && Array.isArray(ids) && ids.length > 0) {
                    deleteQuery = { _id: { $in: ids.map(i => new ObjectId(i)) } };
                } else if (singleId) {
                    deleteQuery = { _id: new ObjectId(singleId) };
                } else {
                    throw new Error("Invalid deletion request.");
                }
                const deleteResult = await collection.deleteMany(deleteQuery);
                return new Response(JSON.stringify({ success: true, deletedCount: deleteResult.deletedCount }), { status: 200 });
            }
            default:
                return new Response(JSON.stringify({ error: 'Method Not Allowed' }), { status: 405 });
        }
    } catch (error) {
        console.error("Admin Sentences API Error:", error);
        return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }
}