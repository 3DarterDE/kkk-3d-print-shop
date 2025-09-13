import { fetchAllProducts } from "@/lib/products";

export const revalidate = 86400;

export async function GET() {
  const base = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const staticPaths = ["/", "/shop", "/blog", "/agb", "/datenschutz", "/impressum", "/kontakt"];

  const products = await fetchAllProducts().catch(() => []);
  const urls = [
    ...staticPaths.map((p) => `${base}${p}`),
    ...products.map((p) => `${base}/shop/${p.slug}`),
  ];

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map((u) => `<url><loc>${u}</loc><changefreq>weekly</changefreq><priority>0.7</priority></url>`)
  .join("\n")}
</urlset>`;

  return new Response(body, { headers: { "Content-Type": "application/xml" } });
}


