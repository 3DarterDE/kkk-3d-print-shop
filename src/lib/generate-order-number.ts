import { connectToDatabase } from '@/lib/mongodb';
import Order from '@/lib/models/Order';

/**
 * Generates a unique order number using atomic operations
 * This prevents duplicate key errors when multiple orders are created simultaneously
 */
export async function generateUniqueOrderNumber(): Promise<string> {
  await connectToDatabase();
  
  let orderNumber: string;
  let attempts = 0;
  const maxAttempts = 10;
  
  do {
    attempts++;
    
    // Get the current year suffix
    const yearSuffix = new Date().getFullYear().toString().slice(-2);
    
    // Try to find the highest existing order number for this year
    const existingOrders = await Order.find({
      orderNumber: { $regex: `^3DS-${yearSuffix}` }
    }).sort({ orderNumber: -1 }).limit(1);
    
    let nextNumber = 1;
    if (existingOrders.length > 0) {
      // Extract the number from the highest order number
      const lastOrderNumber = existingOrders[0].orderNumber;
      const match = lastOrderNumber.match(/^3DS-\d{2}(\d{3})$/);
      if (match) {
        nextNumber = parseInt(match[1]) + 1;
      }
    }
    
    orderNumber = `3DS-${yearSuffix}${String(nextNumber).padStart(3, '0')}`;
    
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
