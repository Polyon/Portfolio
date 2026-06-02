import mongoose from 'mongoose';

/**
 * Create all required compound indexes after models are loaded.
 */
export async function createIndexes(): Promise<void> {
  const collections = mongoose.connection.collections;
  const names = Object.keys(collections);
  if (names.length > 0) {
    await Promise.all(names.map((n) => (collections[n] as unknown as { syncIndexes(): Promise<void> })?.syncIndexes()));
    console.log('✅ Indexes synchronized');
  }
}
