import { connectToDatabase } from '@/lib/mongodb';
import User from '@/lib/models/User';
import Order from '@/lib/models/Order';

/**
 * Links guest orders to a user account based on email address
 * This function can be called manually or automatically during user registration
 */
export async function linkGuestOrdersToUser(userId: string, email: string): Promise<number> {
  try {
    await connectToDatabase();
    
    // Find all guest orders with this email
    const guestOrders = await Order.find({
      userId: null, // Guest orders
      guestEmail: email.toLowerCase()
    }).lean();
    
    if (guestOrders.length === 0) {
      console.log(`No guest orders found for email: ${email}`);
      return 0;
    }
    
    // Update all guest orders to link them to this user
    const result = await Order.updateMany(
      { 
        userId: null, 
        guestEmail: email.toLowerCase() 
      },
      { 
        $set: { 
          userId: userId,
          updatedAt: new Date()
        } 
      }
    );
    
    console.log(`Linked ${result.modifiedCount} guest orders to user ${userId} for email ${email}`);
    return result.modifiedCount;
    
  } catch (error) {
    console.error('Error linking guest orders to user:', error);
    throw error;
  }
}

/**
 * Get all guest orders for a specific email address
 */
export async function getGuestOrdersByEmail(email: string) {
  try {
    await connectToDatabase();
    
    const guestOrders = await Order.find({
      userId: null, // Guest orders
      guestEmail: email.toLowerCase()
    }).lean();
    
    return guestOrders;
  } catch (error) {
    console.error('Error fetching guest orders:', error);
    throw error;
  }
}
