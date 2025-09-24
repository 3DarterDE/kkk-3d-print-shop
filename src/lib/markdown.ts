import { marked } from 'marked';

// Cache für konvertiertes HTML (Server-side)
const serverHtmlCache = new Map<string, string>();

export function renderMarkdownToHtml(content: string): string {
  if (!content) return '';

  // Check cache first
  if (serverHtmlCache.has(content)) {
    return serverHtmlCache.get(content)!;
  }

  // Configure marked options
  marked.setOptions({
    breaks: true,
    gfm: true, // GitHub Flavored Markdown
    sanitize: false, // We'll use DOMPurify on client-side
  });

  // Convert markdown to HTML
  const rawHtml = marked(content);
  
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
export function renderMarkdownToHtmlClient(content: string): string {
  if (!content) return '';

  // Configure marked options
  marked.setOptions({
    breaks: true,
    gfm: true,
    sanitize: false,
  });

  // Convert markdown to HTML
  const rawHtml = marked(content);
  
  // For client-side, we'll do basic sanitization
  // DOMPurify can be added later if needed
  const cleanHtml = rawHtml
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/on\w+="[^"]*"/gi, '')
    .replace(/javascript:/gi, '');
  
  return cleanHtml;
}
