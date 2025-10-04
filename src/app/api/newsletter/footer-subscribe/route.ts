import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    // Mailchimp API configuration
    const MAILCHIMP_API_KEY = process.env.MAILCHIMP_API_KEY;
    const MAILCHIMP_LIST_ID = process.env.MAILCHIMP_LIST_ID;
    const MAILCHIMP_SERVER_PREFIX = process.env.MAILCHIMP_SERVER_PREFIX;

    if (!MAILCHIMP_API_KEY || !MAILCHIMP_LIST_ID || !MAILCHIMP_SERVER_PREFIX) {
      console.error('Mailchimp configuration missing');
      return NextResponse.json({ error: 'Newsletter service not configured' }, { status: 500 });
    }

    // Prepare Mailchimp API request
    const mailchimpUrl = `https://${MAILCHIMP_SERVER_PREFIX}.api.mailchimp.com/3.0/lists/${MAILCHIMP_LIST_ID}/members`;
    
    const memberData = {
      email_address: email.toLowerCase(),
      status: 'subscribed',
      tags: ['footer-signup'],
    };

    const response = await fetch(mailchimpUrl, {
      method: 'POST',
      headers: {
        'Authorization': `apikey ${MAILCHIMP_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(memberData),
    });

    if (!response.ok) {
      const errorData = await response.json();
      
      // Handle already subscribed users
      if (response.status === 400 && errorData.title === 'Member Exists') {
        return NextResponse.json({ 
          success: true, 
          message: 'Email is already subscribed to newsletter' 
        });
      }
      
      console.error('Mailchimp API error:', errorData);
      return NextResponse.json({ 
        error: 'Failed to subscribe to newsletter' 
      }, { status: 500 });
    }

    const result = await response.json();
    
    return NextResponse.json({ 
      success: true, 
      message: 'Successfully subscribed to newsletter',
      data: result 
    });

  } catch (error) {
    console.error('Newsletter subscription error:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}
