import { headers as nextHeaders } from 'next/headers';

export default async function JsonLd({ data }: { data: unknown }) {
  const headers = await nextHeaders();
  const nonce = headers.get('x-csp-nonce') || undefined;
  return (
    <script
      type="application/ld+json"
      nonce={nonce}
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}


