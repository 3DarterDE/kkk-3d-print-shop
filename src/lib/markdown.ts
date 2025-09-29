import { marked } from 'marked';

// Cache für konvertiertes HTML (Server-side)
const serverHtmlCache = new Map<string, string>();

export async function renderMarkdownToHtml(content: string): Promise<string> {
  if (!content) return '';

  // Check cache first
  if (serverHtmlCache.has(content)) {
    return serverHtmlCache.get(content)!;
  }

  // Configure marked options
  marked.setOptions({
    breaks: true,
    gfm: true, // GitHub Flavored Markdown
  });

  // Convert markdown to HTML
  const rawHtml = await marked(content);
  
  // For server-side, we'll do basic sanitization
  // The client-side will handle full DOMPurify sanitization
  const cleanHtml = rawHtml
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/on\w+="[^"]*"/gi, '')
    .replace(/javascript:/gi, '');

  // Cache the result
  serverHtmlCache.set(content, cleanHtml);
  
  return cleanHtml;
}

// Client-side version (for useMemo)
export async function renderMarkdownToHtmlClient(content: string): Promise<string> {
  if (!content) return '';

  // Configure marked options
  marked.setOptions({
    breaks: true,
    gfm: true,
  });

  // Convert markdown to HTML
  const rawHtml = await marked(content);
  
  // For client-side, we'll do basic sanitization
  // DOMPurify can be added later if needed
  const cleanHtml = rawHtml
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/on\w+="[^"]*"/gi, '')
    .replace(/javascript:/gi, '');
  
  return cleanHtml;
}
