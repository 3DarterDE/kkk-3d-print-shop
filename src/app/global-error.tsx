'use client';

export default function GlobalError({
  error,
  reset,
}: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html>
      <body>
        <h2>Es ist ein Fehler aufgetreten.</h2>
        <button onClick={() => reset()}>Nochmal versuchen</button>
      </body>
    </html>
  );
}