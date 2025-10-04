import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { requireUser } from '@/lib/auth';
import { connectToDatabase } from '@/lib/mongodb';
import User from '@/lib/models/User';
import NewsletterSubscription from '@/lib/models/NewsletterSubscription';

export async function POST(request: NextRequest) {
  try {
    const { user, response } = await requireUser();
    
    if (!user) {
      return response!;
    }

    const { action } = await request.json();
    
    if (!action || !['subscribe', 'unsubscribe'].includes(action)) {
      return NextResponse.json({ error: 'Invalid action. Must be "subscribe" or "unsubscribe"' }, { status: 400 });
    }

    await connectToDatabase();
    
    // Update newsletter subscription status in database
    const updatedUser = await User.findByIdAndUpdate(
      user._id.toString(),
      { newsletterSubscribed: action === 'subscribe' },
      { new: true }
    );

    if (!updatedUser || !updatedUser.email) {
      return NextResponse.json({ error: 'User not found or email missing' }, { status: 404 });
    }

    // Also update NewsletterSubscriptions collection
    if (action === 'subscribe') {
      // Create or update newsletter subscription
      await NewsletterSubscription.findOneAndUpdate(
        { email: updatedUser.email.toLowerCase(), isActive: true },
        {
          email: updatedUser.email.toLowerCase(),
          firstName: updatedUser.firstName,
          lastName: updatedUser.lastName,
          source: 'profile',
          subscribedAt: new Date(),
          isActive: true,
          userId: updatedUser._id.toString()
        },
        { upsert: true, new: true }
      );
    } else {
      // Delete newsletter subscription completely (DSGVO compliance)
      await NewsletterSubscription.deleteMany(
        { email: updatedUser.email.toLowerCase() }
      );
    }

    // Handle Mailchimp subscription/unsubscription
    try {
      const mailchimpApiKey = process.env.MAILCHIMP_API_KEY;
      const mailchimpListId = process.env.MAILCHIMP_LIST_ID;
      const mailchimpServer = process.env.MAILCHIMP_SERVER_PREFIX;

      if (!mailchimpApiKey || !mailchimpListId || !mailchimpServer) {
        console.warn('Mailchimp configuration missing, skipping Mailchimp update');
        return NextResponse.json({ 
          success: true, 
          message: `Newsletter ${action === 'subscribe' ? 'subscription' : 'unsubscription'} updated in database`,
          mailchimpUpdated: false
        });
      }

      // Subscribe or unsubscribe from Mailchimp
      if (action === 'subscribe') {
        // Correct Mailchimp member hash is MD5 of lowercase email
        const memberHash = crypto.createHash('md5').update(updatedUser.email.toLowerCase()).digest('hex');
        console.log('Attempting to subscribe Mailchimp member via PUT:', {
          email: updatedUser.email.toLowerCase(),
          url: `https://${mailchimpServer}.api.mailchimp.com/3.0/lists/${mailchimpListId}/members/${memberHash}`,
          method: 'PUT'
        });

        const mailchimpResponse = await fetch(`https://${mailchimpServer}.api.mailchimp.com/3.0/lists/${mailchimpListId}/members/${memberHash}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `apikey ${mailchimpApiKey}`,
          },
          body: JSON.stringify({
            email_address: updatedUser.email.toLowerCase(),
            status: 'subscribed',
            merge_fields: {
              FNAME: updatedUser.firstName || '',
              LNAME: updatedUser.lastName || '',
            },
          }),
        });

        console.log('Mailchimp PUT response status:', mailchimpResponse.status);

        if (!mailchimpResponse.ok) {
          const errorData = await mailchimpResponse.json();
          console.error('Mailchimp subscription error:', errorData);
          
          // With PUT this shouldn't happen, but handle just in case
          if (mailchimpResponse.status === 400 && errorData.detail?.includes('already a list member')) {
            console.log('Member already exists, checking current status...');
            
            // Try to get the member's current status
            const memberHash = crypto.createHash('md5').update(updatedUser.email.toLowerCase()).digest('hex');
            const getMemberResponse = await fetch(`https://${mailchimpServer}.api.mailchimp.com/3.0/lists/${mailchimpListId}/members/${memberHash}`, {
              method: 'GET',
              headers: {
                'Authorization': `apikey ${mailchimpApiKey}`,
              },
            });
            
            if (getMemberResponse.ok) {
              const memberData = await getMemberResponse.json();
              console.log('Current member status:', memberData.status);
              
              if (memberData.status === 'subscribed') {
                console.log('Member is already subscribed - success');
                return NextResponse.json({ 
                  success: true, 
                  message: 'Newsletter subscription updated successfully (member was already subscribed in Mailchimp)',
                  mailchimpUpdated: true
                });
              } else {
                console.log('Member is not subscribed, trying to subscribe with PUT...');
                // Try PUT to update status to subscribed
                const putResponse = await fetch(`https://${mailchimpServer}.api.mailchimp.com/3.0/lists/${mailchimpListId}/members/${memberHash}`, {
                  method: 'PUT',
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `apikey ${mailchimpApiKey}`,
                  },
                  body: JSON.stringify({
                    email_address: updatedUser.email.toLowerCase(),
                    status: 'subscribed',
                    merge_fields: {
                      FNAME: updatedUser.firstName || '',
                      LNAME: updatedUser.lastName || '',
                    },
                  }),
                });
                
                if (putResponse.ok) {
                  console.log('Successfully subscribed member with PUT');
                  return NextResponse.json({ 
                    success: true, 
                    message: 'Newsletter subscription updated successfully',
                    mailchimpUpdated: true
                  });
                }
              }
            }
          }
          
          return NextResponse.json({ 
            success: true, 
            message: 'Newsletter subscription updated in database, but Mailchimp subscription failed',
            mailchimpUpdated: false,
            mailchimpError: errorData.detail || 'Unknown error'
          });
        }
      } else {
        // Unsubscribe from Mailchimp using correct MD5 subscriber hash
        const memberHash = crypto.createHash('md5').update(updatedUser.email.toLowerCase()).digest('hex');
        console.log('Attempting to unsubscribe Mailchimp member:', {
          email: updatedUser.email.toLowerCase(),
          memberHash: memberHash,
          url: `https://${mailchimpServer}.api.mailchimp.com/3.0/lists/${mailchimpListId}/members/${memberHash}`
        });
        
        // Delete member from Mailchimp completely (DSGVO compliance)
        const mailchimpResponse = await fetch(`https://${mailchimpServer}.api.mailchimp.com/3.0/lists/${mailchimpListId}/members/${memberHash}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `apikey ${mailchimpApiKey}`,
          },
        });

        console.log('Mailchimp DELETE response status:', mailchimpResponse.status);

        if (!mailchimpResponse.ok) {
          const errorData = await mailchimpResponse.json();
          console.error('Mailchimp unsubscription error:', errorData);
          
          // If member not found (404), that's actually fine - they're already deleted
          if (mailchimpResponse.status === 404) {
            console.log('Member not found in Mailchimp - already deleted');
            return NextResponse.json({ 
              success: true, 
              message: 'Newsletter unsubscription updated successfully (member was already deleted in Mailchimp)',
              mailchimpUpdated: true
            });
          }
          
          return NextResponse.json({ 
            success: true, 
            message: 'Newsletter unsubscription updated in database, but Mailchimp deletion failed',
            mailchimpUpdated: false,
            mailchimpError: errorData.detail || 'Unknown error',
            debug: {
              email: updatedUser.email.toLowerCase(),
              memberHash: memberHash,
              status: mailchimpResponse.status,
              error: errorData
            }
          });
        }
        
        console.log('Successfully deleted Mailchimp member');
      }

      return NextResponse.json({ 
        success: true, 
        message: `Newsletter ${action === 'subscribe' ? 'subscription' : 'unsubscription'} updated successfully`,
        mailchimpUpdated: true
      });

    } catch (mailchimpError) {
      console.error('Mailchimp error:', mailchimpError);
      return NextResponse.json({ 
        success: true, 
        message: `Newsletter ${action === 'subscribe' ? 'subscription' : 'unsubscription'} updated in database, but Mailchimp update failed`,
        mailchimpUpdated: false,
        mailchimpError: 'Network error'
      });
    }

  } catch (error) {
    console.error('Error in newsletter toggle API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
