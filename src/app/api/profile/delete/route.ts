import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import crypto from 'crypto';
import { connectToDatabase } from '@/lib/mongodb';
import { User } from '@/lib/models/User';
import Order from '@/lib/models/Order';
import Review from '@/lib/models/Review';
import ReturnRequest from '@/lib/models/Return';
import VerificationCode from '@/lib/models/VerificationCode';
import NewsletterSubscription from '@/lib/models/NewsletterSubscription';
import { auth0 } from '@/lib/auth0';
import DeletedIdentity from '@/lib/models/DeletedIdentity';

// Newsletter deletion function for Mailchimp
async function deleteNewsletterSubscription(userEmail: string) {
  try {
    const mailchimpApiKey = process.env.MAILCHIMP_API_KEY;
    const mailchimpListId = process.env.MAILCHIMP_LIST_ID;
    const mailchimpServer = process.env.MAILCHIMP_SERVER_PREFIX;

    if (!mailchimpApiKey || !mailchimpListId || !mailchimpServer) {
      console.warn('Mailchimp configuration missing, skipping newsletter deletion');
      return { success: false, reason: 'Mailchimp not configured' };
    }

    // Calculate MD5 hash for Mailchimp member ID
    const memberHash = crypto.createHash('md5').update(userEmail.toLowerCase()).digest('hex');
    
    console.log('Attempting to delete newsletter subscription from Mailchimp:', {
      email: userEmail.toLowerCase(),
      memberHash: memberHash,
      url: `https://${mailchimpServer}.api.mailchimp.com/3.0/lists/${mailchimpListId}/members/${memberHash}`
    });

    // Delete member from Mailchimp audience
    const mailchimpResponse = await fetch(`https://${mailchimpServer}.api.mailchimp.com/3.0/lists/${mailchimpListId}/members/${memberHash}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `apikey ${mailchimpApiKey}`,
      },
    });

    console.log('Mailchimp DELETE response status:', mailchimpResponse.status);

    if (mailchimpResponse.ok) {
      console.log('Successfully deleted newsletter subscription from Mailchimp');
      return { success: true, reason: 'Deleted from Mailchimp' };
    } else if (mailchimpResponse.status === 404) {
      console.log('Newsletter subscription not found in Mailchimp (already deleted or never subscribed)');
      return { success: true, reason: 'Not found in Mailchimp' };
    } else {
      const errorData = await mailchimpResponse.json();
      console.error('Mailchimp deletion error:', errorData);
      return { success: false, reason: errorData.detail || 'Unknown error' };
    }

  } catch (error) {
    console.error('Error deleting newsletter subscription:', error);
    return { success: false, reason: 'Network error' };
  }
}

// Auth0 Management API function to delete user
async function deleteAuth0User(auth0UserId: string) {
  const domain = process.env.AUTH0_DOMAIN;
  const clientId = process.env.AUTH0_CLIENT_ID;
  const clientSecret = process.env.AUTH0_CLIENT_SECRET;
  
  if (!domain || !clientId || !clientSecret) {
    throw new Error('Auth0 Management API credentials not configured');
  }

  // Get Management API access token
  const tokenResponse = await fetch(`https://${domain}/oauth/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      audience: `https://${domain}/api/v2/`,
      grant_type: 'client_credentials',
    }),
  });

  if (!tokenResponse.ok) {
    throw new Error('Failed to get Auth0 Management API token');
  }

  const tokenData = await tokenResponse.json();
  const accessToken = tokenData.access_token;

  // Delete user from Auth0
  const deleteResponse = await fetch(`https://${domain}/api/v2/users/${auth0UserId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  if (!deleteResponse.ok) {
    const errorText = await deleteResponse.text();
    throw new Error(`Failed to delete Auth0 user: ${errorText}`);
  }

  return true;
}

export async function DELETE(request: NextRequest) {
  try {
    await cookies();
    const session = await auth0.getSession();
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();

    // Find user in database
    const user = await User.findOne({ auth0Id: session.user.sub });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const userId = user._id.toString();
    const userEmail = user.email;
    const auth0UserId = session.user.sub;

    console.log(`Starting account deletion for user: ${userEmail} (${userId})`);

    // Store user data before deletion
    const userData = {
      id: userId,
      email: userEmail,
      auth0Id: auth0UserId
    };

    // DSGVO-konforme Löschung aller Nutzerdaten
    try {
      // 1. Anonymize all user orders (for business records)
      const orders = await Order.find({ userId }).select('_id').lean();
      console.log(`Found ${orders.length} orders to anonymize`);

      const anonymizedAddress = {
        firstName: 'Gelöscht',
        lastName: 'Gelöscht',
        street: 'Gelöscht',
        houseNumber: '0',
        city: 'Gelöscht',
        postalCode: '00000',
        country: 'Deutschland'
      };

      // Use updateMany to avoid triggering full document validation on legacy orders
      if (orders.length > 0) {
        await Order.updateMany(
          { userId },
          {
            $set: {
              shippingAddress: anonymizedAddress,
              billingAddress: anonymizedAddress
            }
          }
        );
      }

      // 2. Delete all user reviews
      const reviews = await Review.find({ userId });
      console.log(`Found ${reviews.length} reviews to delete`);
      await Review.deleteMany({ userId });

      // 3. Anonymize all return requests (for business records)
      const returns = await ReturnRequest.find({ userId });
      console.log(`Found ${returns.length} return requests to anonymize`);
      if (returns.length > 0) {
        await ReturnRequest.updateMany(
          { userId },
          {
            $set: {
              'customer.name': 'Gelöscht',
              'customer.email': 'geloescht@geloescht.de'
            }
          }
        );
      }

      // 4. Delete all verification codes for this email
      const verificationCodes = await VerificationCode.find({ email: user.email });
      console.log(`Found ${verificationCodes.length} verification codes to delete`);
      await VerificationCode.deleteMany({ email: user.email });

      // 5. Delete newsletter subscriptions (DSGVO compliance)
      if (user.email) {
        console.log(`Deleting newsletter subscriptions for: ${user.email}`);
        
        // Delete all newsletter subscriptions for this email (DSGVO compliance)
        const newsletterSubscriptions = await NewsletterSubscription.find({
          email: user.email.toLowerCase()
        });
        
        if (newsletterSubscriptions.length > 0) {
          await NewsletterSubscription.deleteMany({
            email: user.email.toLowerCase()
          });
          console.log(`Deleted ${newsletterSubscriptions.length} newsletter subscriptions`);
        }
        
        // Also delete from Mailchimp
        const newsletterResult = await deleteNewsletterSubscription(user.email);
        console.log(`Newsletter deletion result:`, newsletterResult);
      }

      // 6. Delete user from Auth0 using Management API FIRST
      try {
        await deleteAuth0User(userData.auth0Id);
        console.log(`Auth0 user ${userData.auth0Id} deleted successfully`);
      } catch (auth0Error) {
        console.error('Error deleting Auth0 user:', auth0Error);
        // Don't fail the entire process if Auth0 deletion fails
        // Log the Auth0 user ID for manual deletion
        console.log(`Manual Auth0 deletion required for user: ${userData.auth0Id}`);
      }

      // 7. Delete user from database LAST
      console.log(`Attempting to delete user with ID: ${userData.id}`);
      const deleteResult = await User.findByIdAndDelete(userData.id);
      console.log(`User ${userData.email} deleted from database:`, deleteResult ? 'SUCCESS' : 'FAILED');
      
      // Verify deletion
      const verifyDeletion = await User.findById(userData.id);
      console.log(`Verification - User still exists:`, verifyDeletion ? 'YES' : 'NO');
      
      if (verifyDeletion) {
        console.log(`Force deleting user ${userData.id}...`);
        await User.deleteOne({ _id: userData.id });
        const finalCheck = await User.findById(userData.id);
        console.log(`Final check - User still exists:`, finalCheck ? 'YES' : 'NO');
      }

      console.log(`Account deletion completed for user: ${userData.email}`);

      // Persist a suppression record to prevent passive, automatic recreation
      try {
        // Suppress for 24 hours; user can still explicitly log in again
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
        await DeletedIdentity.create({
          auth0Id: userData.auth0Id,
          // email removed for DSGVO compliance
          reason: 'user_deleted',
          expiresAt,
        });
      } catch (e) {
        console.log('Failed to write DeletedIdentity suppression (non-fatal):', e);
      }

      // Create response with cleared cookies
      const response = NextResponse.json({
        success: true,
        message: 'Account erfolgreich gelöscht'
      });

      // Clear ALL Auth0 session cookies with different paths and domains
      const cookieOptions = {
        expires: new Date(0),
        path: '/',
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax' as const
      };

      // Clear all possible Auth0 session cookies
      response.cookies.set('appSession', '', cookieOptions);
      response.cookies.set('appSession.0', '', cookieOptions);
      response.cookies.set('appSession.1', '', cookieOptions);
      response.cookies.set('appSession.2', '', cookieOptions);
      response.cookies.set('appSession.3', '', cookieOptions);
      response.cookies.set('appSession.4', '', cookieOptions);

      // Also clear with domain variants (root and dot-prefixed) to cover www/non-www
      const host = request.headers.get('host')?.split(':')[0] || '';
      const baseDomain = host.replace(/^www\./, '');
      const domains = Array.from(new Set([baseDomain, host, baseDomain ? `.${baseDomain}` : ''])).filter(Boolean);
      for (const domain of domains) {
        const domainOpts = { ...cookieOptions, domain } as any;
        response.cookies.set('appSession', '', domainOpts);
        response.cookies.set('appSession.0', '', domainOpts);
        response.cookies.set('appSession.1', '', domainOpts);
        response.cookies.set('appSession.2', '', domainOpts);
        response.cookies.set('appSession.3', '', domainOpts);
        response.cookies.set('appSession.4', '', domainOpts);
      }
      
      // Also try to delete cookies
      response.cookies.delete('appSession');
      response.cookies.delete('appSession.0');
      response.cookies.delete('appSession.1');
      response.cookies.delete('appSession.2');
      response.cookies.delete('appSession.3');
      response.cookies.delete('appSession.4');

      // Mark account as deleted for follow-up requests to avoid DB resurrection (scoped to this Auth0 user)
      response.cookies.set('accountDeletedFor', auth0UserId, {
        path: '/',
        httpOnly: true,
        sameSite: 'lax',
        // Match suppression TTL: 24 hours
        maxAge: 24 * 60 * 60,
        secure: process.env.NODE_ENV === 'production'
      });
      // Do NOT store email in cookies for DSGVO compliance
      
      // Set additional headers to prevent caching
      response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');
      response.headers.set('Pragma', 'no-cache');
      response.headers.set('Expires', '0');

      return response;

    } catch (deletionError) {
      console.error('Error during account deletion:', deletionError);
      return NextResponse.json(
        { error: 'Fehler beim Löschen des Accounts' },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Account deletion error:', error);
    return NextResponse.json(
      { error: 'Interner Serverfehler' },
      { status: 500 }
    );
  }
}
