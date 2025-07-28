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
    const db = await connectToDatabase();
    const collection = db.collection("words");
    let body = {};
    if (request.method !== 'GET' && request.headers.get('content-type')?.includes('application/json')) { try { body = await request.json(); } catch (e) { return new Response(JSON.stringify({ error: 'Invalid JSON body' }), { status: 400 }); } }
    if (request.method === 'POST' && body.action === 'login') { if (isAuthorized(body.password)) return new Response(JSON.stringify({ success: true }), { status: 200 }); return new Response(JSON.stringify({ error: 'Invalid credentials.' }), { status: 401 }); }
    const token = request.headers.get('authorization')?.split(' ')[1];
    if (!isAuthorized(token)) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });

    try {
        switch (request.method) {
            case 'GET': {
                const url = new URL(request.url, `http://${request.headers.get('host')}`);
                const lesson = url.searchParams.get('lesson');
                const category = url.searchParams.get('category');
                const search = url.searchParams.get('search');
                const page = parseInt(url.searchParams.get('page') || '1', 10);
                const limit = parseInt(url.searchParams.get('limit') || '30', 10);
                const skip = (page - 1) * limit;

                let query = {};
                
                if (search) {
                    const searchRegex = new RegExp(escapeRegExp(search), 'i');
                    query = {
                        $or: [
                            { bangla: { $regex: searchRegex } },
                            { japanese: { $regex: searchRegex } },
                            { english: { $regex: searchRegex } }
                        ]
                    };
                } else {
                    if (lesson) query.lesson = parseInt(lesson, 10);
                    // --- FIX: Change category filter to be a case-insensitive regex match ---
                    if (category) {
                        query.category = { $regex: `^${escapeRegExp(category)}$`, $options: 'i' };
                    }
                }

                const total = await collection.countDocuments(query);
                const words = await collection.find(query).sort({ bangla: 1 }).skip(skip).limit(limit).toArray();
                return new Response(JSON.stringify({ data: words, total, page, limit }), { status: 200 });
            }

            case 'POST': {
                const newWord = { bangla: body.bangla, japanese: body.japanese, english: body.english, category: body.category, lesson: body.lesson };
                await collection.insertOne(newWord);
                return new Response(JSON.stringify({ success: true, newWord }), { status: 201 });
            }
            case 'PUT': {
                const { id, ...updateData } = body;
                if (!id) throw new Error("Word ID is required for update.");
                await collection.updateOne({ _id: new ObjectId(id) }, { $set: updateData });
                return new Response(JSON.stringify({ success: true }), { status: 200 });
            }
            case 'DELETE': {
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
        console.error("Admin Words API Error:", error);
        return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }
}