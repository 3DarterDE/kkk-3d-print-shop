import { Auth0Client } from '@auth0/nextjs-auth0/server';
import { NextResponse } from 'next/server';

const domain = process.env.AUTH0_DOMAIN || process.env.AUTH0_ISSUER_BASE_URL?.replace(/^https?:\/\//, '') || '';
const appBaseUrl = process.env.APP_BASE_URL || process.env.AUTH0_BASE_URL || process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

export const auth0 = new Auth0Client({
	domain,
	clientId: process.env.AUTH0_CLIENT_ID,
	clientSecret: process.env.AUTH0_CLIENT_SECRET,
	appBaseUrl,
	secret: process.env.AUTH0_SECRET,
	signInReturnToPath: '/activate?send=1',
	authorizationParameters: {
		redirect_uri: `${appBaseUrl}/api/auth/callback`,
		// Request only minimal scopes to avoid consent; exclude offline_access
		scope: 'openid profile email',
	},
	routes: {
		login: '/api/auth/login',
		logout: '/api/auth/logout',
		callback: '/api/auth/callback',
		backChannelLogout: '/api/auth/backchannel-logout',
	},
	// Redirect strategy after Auth0 callback completes
	onCallback: async (error, ctx, session) => {
		// In case of error, fall back to default behavior
		if (error) {
			const dest = ctx.returnTo || '/';
			return NextResponse.redirect(new URL(dest, appBaseUrl));
		}
		// If user is not present, just go home
		const user: any = session?.user;
		if (!user) {
			return NextResponse.redirect(new URL('/', appBaseUrl));
		}

		// Check verification status from Auth0 session
		let isVerified = Boolean(user.email_verified);
		
		// If Auth0 says not verified, check database via API
		if (!isVerified && user.sub) {
			try {
				const response = await fetch(`${appBaseUrl}/api/check-verification`, {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
					},
					body: JSON.stringify({ auth0Id: user.sub }),
				});
				
				if (response.ok) {
					const data = await response.json();
					if (data.isVerified) {
						isVerified = true;
						// Update the session to reflect database verification status
						user.email_verified = true;
					}
				}
			} catch (error) {
				console.error('Error checking user verification status:', error);
				// Fall back to Auth0 status on error
			}
		}
		
		if (!isVerified) {
			let url = '/activate?send=1';
			if (user.email) url += `&email=${encodeURIComponent(user.email)}`;
			return NextResponse.redirect(new URL(url, appBaseUrl));
		}


		// If verified, check if this is a new social login user
		const connection = (user as any).connection || (user as any).identities?.[0]?.connection;
		// Fallback to provider parsed from sub (e.g., "google-oauth2|123...") if connection isn't present
		const sub: string | undefined = (user as any).sub;
		const providerFromSub = typeof sub === 'string' ? sub.split('|')[0] : undefined;
		const socialProviders = new Set(['google-oauth2', 'apple', 'facebook']);
		const isSocialLogin = socialProviders.has(connection) || (providerFromSub ? socialProviders.has(providerFromSub) : false);
		
		if (isSocialLogin && user.email) {
			// For social logins, always redirect to welcome page
			// The welcome page will check if user exists and only send email for new users
			return NextResponse.redirect(new URL(`/welcome?email=${encodeURIComponent(user.email)}&name=${encodeURIComponent(user.name || user.email)}`, appBaseUrl));
		}

		// If verified, respect returnTo or default
		const dest = ctx.returnTo || '/';
		return NextResponse.redirect(new URL(dest, appBaseUrl));
	},
});
