import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { remark } from "remark";
import html from "remark-html";
import DOMPurify from "isomorphic-dompurify";
import { notFound } from "next/navigation";

export const revalidate = 86400;

function getPostSlugs(): string[] {
  const dir = path.join(process.cwd(), "content", "blog");
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter((f) => f.endsWith(".md")).map((f) => f.replace(/\.md$/, ""));
}

export async function generateStaticParams() {
  return getPostSlugs().map((slug) => ({ slug }));
}

export default async function BlogPost({ params }: { params: { slug: string } }) {
  const { slug } = params;
  const filePath = path.join(process.cwd(), "content", "blog", `${slug}.md`);
  if (!fs.existsSync(filePath)) return notFound();
  const src = fs.readFileSync(filePath, "utf8");
  const { content, data } = matter(src);
  const processed = await remark().use(html).process(content);
  const rawHtml = processed.toString();
  const contentHtml = DOMPurify.sanitize(rawHtml, { USE_PROFILES: { html: true } });
  return (
    <article className="prose mx-auto px-4 py-10">
      <h1>{data.title || slug}</h1>
      {data.date && <p className="text-sm text-gray-500">{new Date(data.date).toLocaleDateString("de-DE")}</p>}
      <div dangerouslySetInnerHTML={{ __html: contentHtml }} />
    </article>
  );
}


