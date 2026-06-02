import mongoose from 'mongoose';

let isConnected = false;

/**
 * Connect to MongoDB using the URI from environment variables.
 */
export async function connectDatabase(): Promise<void> {
  if (isConnected) return;

  const uri = process.env['MONGODB_URI'];
  if (!uri) throw new Error('MONGODB_URI is not defined in environment');

  await mongoose.connect(uri);
  isConnected = true;
  console.log('✅ MongoDB connected');
}

/**
 * Disconnect from MongoDB.
 */
export async function disconnectDatabase(): Promise<void> {
  if (!isConnected) return;
  await mongoose.disconnect();
  isConnected = false;
  console.log('MongoDB disconnected');
}
