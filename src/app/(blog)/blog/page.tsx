import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import Link from "next/link";

export const revalidate = 86400;

type Post = { slug: string; title: string; date: string; excerpt?: string };

function getPosts(): Post[] {
  const dir = path.join(process.cwd(), "content", "blog");
  if (!fs.existsSync(dir)) return [];
  const files = fs.readdirSync(dir).filter((f) => f.endsWith(".md"));
  return files
    .map((file) => {
      const filePath = path.join(dir, file);
      const src = fs.readFileSync(filePath, "utf8");
      const { data } = matter(src);
      const slug = file.replace(/\.md$/, "");
      return { slug, title: data.title || slug, date: data.date || "", excerpt: data.excerpt } as Post;
    })
    .sort((a, b) => (a.date < b.date ? 1 : -1));
}

export default function BlogIndex() {
  const posts = getPosts();
  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <h1 className="text-3xl font-bold mb-6">Blog</h1>
      <div className="space-y-6">
        {posts.map((p) => (
          <article key={p.slug} className="border-b pb-4">
            <h2 className="text-xl font-semibold">
              <Link href={`/blog/${p.slug}`}>{p.title}</Link>
            </h2>
            {p.excerpt && <p className="text-gray-600 mt-1">{p.excerpt}</p>}
            {p.date && <div className="text-xs text-gray-500 mt-1">{new Date(p.date).toLocaleDateString("de-DE")}</div>}
          </article>
        ))}
      </div>
    </div>
  );
}


