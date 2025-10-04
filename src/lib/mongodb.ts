import mongoose from "mongoose";

type Cached = {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
};

declare global {
  // eslint-disable-next-line no-var
  var mongooseConn: Cached | undefined;
}

const g = globalThis as unknown as { mongooseConn?: Cached };

const cached: Cached = g.mongooseConn ?? { conn: null, promise: null };
if (!g.mongooseConn) {
  g.mongooseConn = cached;
}

export async function connectToDatabase(): Promise<typeof mongoose> {
  if (cached.conn) {
    return cached.conn;
  }
  const uri = process.env.MONGODB_URI as string | undefined;
  if (!uri) {
    throw new Error("MONGODB_URI is not set in environment variables");
  }
  if (!cached.promise) {
    cached.promise = mongoose.connect(uri, {
      dbName: process.env.MONGODB_DB || undefined,
      maxPoolSize: 10,
      minPoolSize: 2,
      maxIdleTimeMS: 30000,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      connectTimeoutMS: 10000,
      bufferCommands: false,
    });
  }
  cached.conn = await cached.promise;
  return cached.conn;
}