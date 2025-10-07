import { connectToDatabase } from '@/lib/mongodb';
import User from '@/lib/models/User';
import NewsletterSubscription from '@/lib/models/NewsletterSubscription';

/**
 * Ensures the `User.newsletterSubscribed` flag reflects an active subscription
 * in `NewsletterSubscription` for the given email. Also links the subscription
 * document to the user via `userId` if missing.
 */
export async function syncNewsletterStatusForEmail(userId: string, email?: string | null) {
  if (!userId || !email) return false;

  try {
    await connectToDatabase();

    const lowerEmail = String(email).toLowerCase();

    const activeSub = await NewsletterSubscription.findOne({
      email: lowerEmail,
      isActive: true,
    }).lean();

    if (!activeSub) {
      // No active subscription for this email; do not force unsubscribe automatically
      return false;
    }

    // Update user flag if needed
    const update: any = { newsletterSubscribed: true };
    if (!('newsletterSubscribedAt' in update)) {
      // Only set when we flip to true and user did not have it yet
    }

    await User.updateOne(
      { _id: userId },
      {
        $set: {
          newsletterSubscribed: true,
          newsletterSubscribedAt: new Date(),
        },
      }
    );

    // Back-link subscription to user if missing (avoid direct property access)
    await NewsletterSubscription.updateMany(
      {
        email: lowerEmail,
        isActive: true,
        $or: [
          { userId: { $exists: false } },
          { userId: null },
          { userId: '' }
        ]
      },
      { $set: { userId } }
    );

    return true;
  } catch (e) {
    console.error('syncNewsletterStatusForEmail error:', e);
    return false;
  }
}


