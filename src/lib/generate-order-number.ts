import { connectToDatabase } from '@/lib/mongodb';
import Order from '@/lib/models/Order';
import OrderCounter from '@/lib/models/OrderCounter';
import { randomInt } from 'crypto';

/**
 * Generates a unique order number using atomic operations with random factor
 * Format: 3DS-YYXXX-RRRR (Year + Sequential + Random)
 * This prevents duplicate key errors and adds security through randomization
 */
export async function generateUniqueOrderNumber(): Promise<string> {
  await connectToDatabase();
  
  let orderNumber: string;
  let attempts = 0;
  const maxAttempts = 5;
  
  do {
    attempts++;
    
    // Get the current year suffix
    const yearSuffix = new Date().getFullYear().toString().slice(-2);
    
    // Atomically increment yearly sequence (ensures 001, 002, 003, ... per year)
    const counterDoc = await OrderCounter.findOneAndUpdate(
      { yearSuffix },
      { $inc: { seq: 1 } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    ).lean();
    const nextNumber = counterDoc?.seq ?? 1;
    
    // Generate crypto-secure 4-digit random number in range 1000–9999
    const randomSuffix = randomInt(1000, 10000).toString();
    
    orderNumber = `3DS-${yearSuffix}${String(nextNumber).padStart(3, '0')}-${randomSuffix}`;
    
    // Check if this order number already exists (double-check for race conditions)
    const existingOrder = await Order.findOne({ orderNumber });
    if (!existingOrder) {
      break; // Order number is unique
    }
    
    if (attempts >= maxAttempts) {
      throw new Error('Failed to generate unique order number after maximum attempts');
    }
    
    // Add small delay to avoid rapid retries
    await new Promise(resolve => setTimeout(resolve, 10));
  } while (attempts < maxAttempts);
  
  return orderNumber;
}
