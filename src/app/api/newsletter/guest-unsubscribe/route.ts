import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { connectToDatabase } from '@/lib/mongodb';
import NewsletterSubscription from '@/lib/models/NewsletterSubscription';

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json({ error: 'E-Mail-Adresse ist erforderlich' }, { status: 400 });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: 'Ungültige E-Mail-Adresse' }, { status: 400 });
    }

    await connectToDatabase();

    // Find active newsletter subscription
    const subscription = await NewsletterSubscription.findOne({
      email: email.toLowerCase(),
      isActive: true
    });

    if (!subscription) {
      return NextResponse.json({ 
        error: 'Diese E-Mail-Adresse ist nicht für den Newsletter angemeldet' 
      }, { status: 404 });
    }

    // Delete newsletter subscription completely (DSGVO compliance)
    await NewsletterSubscription.findByIdAndDelete(subscription._id);

    console.log('Deleted newsletter subscription:', {
      email: subscription.email,
      source: subscription.source,
      id: subscription._id
    });

    // Unsubscribe from Mailchimp
    try {
      const mailchimpApiKey = process.env.MAILCHIMP_API_KEY;
      const mailchimpListId = process.env.MAILCHIMP_LIST_ID;
      const mailchimpServer = process.env.MAILCHIMP_SERVER_PREFIX;

      if (mailchimpApiKey && mailchimpListId && mailchimpServer) {
        const memberHash = crypto.createHash('md5').update(email.toLowerCase()).digest('hex');
        
        console.log('Unsubscribing from Mailchimp:', {
          email: email.toLowerCase(),
          memberHash: memberHash,
          url: `https://${mailchimpServer}.api.mailchimp.com/3.0/lists/${mailchimpListId}/members/${memberHash}`
        });

        const mailchimpResponse = await fetch(`https://${mailchimpServer}.api.mailchimp.com/3.0/lists/${mailchimpListId}/members/${memberHash}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `apikey ${mailchimpApiKey}`,
          },
        });

        console.log('Mailchimp DELETE response status:', mailchimpResponse.status);

        if (mailchimpResponse.ok) {
          console.log('Successfully deleted from Mailchimp');
        } else if (mailchimpResponse.status === 404) {
          console.log('Member not found in Mailchimp - already deleted');
        } else {
          const errorData = await mailchimpResponse.json();
          console.error('Mailchimp deletion error:', errorData);
          // Don't fail the deletion if Mailchimp fails
        }
      } else {
        console.warn('Mailchimp configuration missing, skipping Mailchimp deletion');
      }
    } catch (mailchimpError) {
      console.error('Error deleting from Mailchimp:', mailchimpError);
      // Don't fail the deletion if Mailchimp fails
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Erfolgreich vom Newsletter abgemeldet und alle Daten gelöscht'
    });

  } catch (error) {
    console.error('Error in guest newsletter unsubscription:', error);
    return NextResponse.json({ 
      error: 'Interner Serverfehler beim Newsletter-Abmelden' 
    }, { status: 500 });
  }
}
