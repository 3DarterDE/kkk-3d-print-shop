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
	signInReturnToPath: '/auth/popup-complete',
	authorizationParameters: {
		redirect_uri: `${appBaseUrl}/api/auth/callback`,
		// Request only minimal scopes to avoid consent; exclude offline_access
		scope: 'openid profile email',
		// Add custom parameters for branding
		ui_locales: 'de',
		// Add custom state to include return URL
		state: 'return_to_3darter',
		// Force re-auth when requested via popup (frontend uses prompt/max_age)
		prompt: undefined,
	},
	routes: {
		login: '/api/auth/login',
		logout: '/api/auth/logout',
		callback: '/api/auth/callback',
		backChannelLogout: '/api/auth/backchannel-logout',
	},
	// Redirect strategy after Auth0 callback completes
	onCallback: async (error, ctx, session: any) => {
		// Check if this originated from popup (returnTo contains popup-complete)
		const isPopupFlow = typeof ctx.returnTo === 'string' && ctx.returnTo.includes('/auth/popup-complete');
		// Extract inner next from returnTo like /auth/popup-complete?next=/checkout
		let nextFromReturnTo: string | null = null;
		if (typeof ctx.returnTo === 'string') {
			try {
				const u = new URL(ctx.returnTo, appBaseUrl);
				const innerNext = u.searchParams.get('next');
				if (innerNext && innerNext.startsWith('/')) {
					nextFromReturnTo = innerNext;
				}
			} catch {}
		}

		// In case of error, fall back to default behavior
		if (error) {
			const dest = ctx.returnTo || '/';
			return NextResponse.redirect(new URL(dest, appBaseUrl));
		}
		// If user is not present, just go home
		const user: any = session?.user;
		if (!user) {
			const finalDest = isPopupFlow ? '/auth/popup-complete?next=%2F' : '/';
			return NextResponse.redirect(new URL(finalDest, appBaseUrl));
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
			let nextUrl = '/activate?send=1';
			if (user.email) nextUrl += `&email=${encodeURIComponent(user.email)}`;
			// Add returnTo parameter prioritizing inner next if present
			if (nextFromReturnTo) {
				nextUrl += `&returnTo=${encodeURIComponent(nextFromReturnTo)}`;
			} else if (ctx.returnTo && typeof ctx.returnTo === 'string' && !ctx.returnTo.includes('/auth/popup-complete')) {
				nextUrl += `&returnTo=${encodeURIComponent(ctx.returnTo)}`;
			}
			const finalDest = isPopupFlow 
				? `/auth/popup-complete?next=${encodeURIComponent(nextUrl)}`
				: nextUrl;
			return NextResponse.redirect(new URL(finalDest, appBaseUrl));
		}


		// If verified, check if this is a new social login user
		const connection = (user as any).connection || (user as any).identities?.[0]?.connection;
		// Fallback to provider parsed from sub (e.g., "google-oauth2|123...") if connection isn't present
		const sub: string | undefined = (user as any).sub;
		const providerFromSub = typeof sub === 'string' ? sub.split('|')[0] : undefined;
		const socialProviders = new Set(['google-oauth2', 'apple', 'facebook']);
		const isSocialLogin = socialProviders.has(connection) || (providerFromSub ? socialProviders.has(providerFromSub) : false);
		
		if (isSocialLogin && user.email) {
			let shouldShowWelcome = false;
			try {
				const { connectToDatabase } = await import('@/lib/mongodb');
				const { default: User } = await import('@/lib/models/User');
				await connectToDatabase();
				const existing = await User.findOne({ auth0Id: user.sub }).lean();
				shouldShowWelcome = !existing || existing.welcomeEmailSent !== true;
			} catch {
				// If DB lookup fails, still show welcome so the page can trigger sending via API
				shouldShowWelcome = true;
			}

			if (shouldShowWelcome) {
				let welcomeUrl = `/welcome?email=${encodeURIComponent(user.email)}&name=${encodeURIComponent(user.name || user.email)}`;
				if (nextFromReturnTo) {
					welcomeUrl += `&next=${encodeURIComponent(nextFromReturnTo)}`;
				}
				// Send welcome email and ensure user exists in DB before redirect
				try {
					const { connectToDatabase } = await import('@/lib/mongodb');
					const { default: User } = await import('@/lib/models/User');
					const { sendWelcomeEmail } = await import('@/lib/email');
					await connectToDatabase();
					
					// Ensure user exists in DB with full upsert (like /api/auth/me does)
					const dbUser = await User.findOneAndUpdate(
						{ auth0Id: user.sub },
						{
							$setOnInsert: {
								auth0Id: user.sub,
								isAdmin: false
							},
							$set: {
								email: user.email,
								name: user.name,
								isVerified: true,
							}
						},
						{ upsert: true, new: true }
					);
					
					// Send welcome email if not sent yet
					if (!dbUser.welcomeEmailSent) {
						await sendWelcomeEmail({ name: user.name || user.email, email: user.email });
						await User.updateOne({ _id: dbUser._id }, { $set: { welcomeEmailSent: true } });
					}
				} catch {}
				
				// Add small delay to ensure session is fully established
				await new Promise(resolve => setTimeout(resolve, 100));
				
				const finalDest = isPopupFlow
					? `/auth/popup-complete?next=${encodeURIComponent(welcomeUrl)}`
					: welcomeUrl;
				return NextResponse.redirect(new URL(finalDest, appBaseUrl));
			}
		}

		// If verified, respect returnTo or default (prefer inner next)
		const baseReturnTo = nextFromReturnTo
			? nextFromReturnTo
			: (typeof ctx.returnTo === 'string' && !ctx.returnTo.includes('/auth/popup-complete')
				? ctx.returnTo
				: '/');
		const finalDest = isPopupFlow
			? `/auth/popup-complete?next=${encodeURIComponent(baseReturnTo)}`
			: baseReturnTo;
		return NextResponse.redirect(new URL(finalDest, appBaseUrl));
	},
});
