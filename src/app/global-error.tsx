'use client';
import * as Sentry from '@sentry/nextjs';

export default function GlobalError({
  error,
  reset,
}: { error: Error & { digest?: string }; reset: () => void }) {
  Sentry.captureException(error);
  return (
    <html>
      <body>
        <h2>Es ist ein Fehler aufgetreten.</h2>
        <button onClick={() => reset()}>Nochmal versuchen</button>
      </body>
    </html>
  );
}