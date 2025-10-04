import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { connectToDatabase } from '@/lib/mongodb';
import NewsletterSubscription from '@/lib/models/NewsletterSubscription';

export async function POST(request: NextRequest) {
  try {
    const { email, firstName, lastName, source = 'checkout' } = await request.json();

    if (!email) {
      return NextResponse.json({ error: 'E-Mail-Adresse ist erforderlich' }, { status: 400 });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: 'Ungültige E-Mail-Adresse' }, { status: 400 });
    }

    await connectToDatabase();

    // Check if email is already subscribed
    const existingSubscription = await NewsletterSubscription.findOne({
      email: email.toLowerCase(),
      isActive: true
    });

    if (existingSubscription) {
      return NextResponse.json({ 
        success: true, 
        message: 'E-Mail ist bereits für den Newsletter angemeldet' 
      });
    }

    // Create new newsletter subscription
    const subscription = await NewsletterSubscription.create({
      email: email.toLowerCase(),
      firstName: firstName?.trim() || undefined,
      lastName: lastName?.trim() || undefined,
      source: source as 'checkout' | 'footer' | 'profile',
      subscribedAt: new Date(),
      isActive: true
    });

    console.log('Created newsletter subscription:', {
      email: subscription.email,
      source: subscription.source,
      id: subscription._id
    });

    // Subscribe to Mailchimp
    try {
      const mailchimpApiKey = process.env.MAILCHIMP_API_KEY;
      const mailchimpListId = process.env.MAILCHIMP_LIST_ID;
      const mailchimpServer = process.env.MAILCHIMP_SERVER_PREFIX;

      if (mailchimpApiKey && mailchimpListId && mailchimpServer) {
        const memberHash = crypto.createHash('md5').update(email.toLowerCase()).digest('hex');
        
        console.log('Subscribing to Mailchimp:', {
          email: email.toLowerCase(),
          memberHash: memberHash,
          url: `https://${mailchimpServer}.api.mailchimp.com/3.0/lists/${mailchimpListId}/members/${memberHash}`
        });

        const mailchimpResponse = await fetch(`https://${mailchimpServer}.api.mailchimp.com/3.0/lists/${mailchimpListId}/members/${memberHash}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `apikey ${mailchimpApiKey}`,
          },
          body: JSON.stringify({
            email_address: email.toLowerCase(),
            status: 'subscribed',
            merge_fields: {
              FNAME: firstName?.trim() || '',
              LNAME: lastName?.trim() || '',
            },
            tags: ['website-signup'],
          }),
        });

        console.log('Mailchimp response status:', mailchimpResponse.status);

        if (mailchimpResponse.ok) {
          const mailchimpData = await mailchimpResponse.json();
          console.log('Successfully subscribed to Mailchimp:', mailchimpData.id);
          
          // Update subscription with Mailchimp ID
          await NewsletterSubscription.findByIdAndUpdate(subscription._id, {
            mailchimpId: mailchimpData.id
          });
        } else {
          const errorData = await mailchimpResponse.json();
          console.error('Mailchimp subscription error:', errorData);
          // Don't fail the subscription if Mailchimp fails
        }
      } else {
        console.warn('Mailchimp configuration missing, skipping Mailchimp subscription');
      }
    } catch (mailchimpError) {
      console.error('Error subscribing to Mailchimp:', mailchimpError);
      // Don't fail the subscription if Mailchimp fails
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Erfolgreich für den Newsletter angemeldet',
      subscriptionId: subscription._id
    });

  } catch (error) {
    console.error('Newsletter subscription error:', error);
    return NextResponse.json({ 
      error: 'Interner Serverfehler beim Newsletter-Abonnement' 
    }, { status: 500 });
  }
}
