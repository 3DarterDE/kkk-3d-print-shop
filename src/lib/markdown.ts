import { marked } from 'marked';
import createDOMPurify from 'isomorphic-dompurify';

// Cache für konvertiertes HTML (Server-side)
const serverHtmlCache = new Map<string, string>();

export async function renderMarkdownToHtml(content: string): Promise<string> {
  if (!content) return '';

  if (serverHtmlCache.has(content)) {
    return serverHtmlCache.get(content)!;
  }

  marked.setOptions({
    breaks: true,
    gfm: true,
  });

  const rawHtml = await marked(content);
  const DOMPurify = createDOMPurify();
  const cleanHtml = DOMPurify.sanitize(rawHtml, { USE_PROFILES: { html: true } });

  serverHtmlCache.set(content, cleanHtml);
  return cleanHtml;
}

export async function renderMarkdownToHtmlClient(content: string): Promise<string> {
  if (!content) return '';
  marked.setOptions({ breaks: true, gfm: true });
  const rawHtml = await marked(content);
  const DOMPurify = createDOMPurify();
  return DOMPurify.sanitize(rawHtml, { USE_PROFILES: { html: true } });
}
