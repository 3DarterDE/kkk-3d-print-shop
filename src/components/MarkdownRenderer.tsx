"use client";

import { useMemo } from 'react';
import { marked } from 'marked';
import createDOMPurify from 'isomorphic-dompurify';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

export default function MarkdownRenderer({ content, className = "" }: MarkdownRendererProps) {
  if (!content) return null;

  // Memoized HTML conversion with caching
  const htmlContent = useMemo(() => {
    // Configure marked options
    marked.setOptions({
      breaks: true,
      gfm: true,
      sanitize: false,
    });

    // Convert markdown to HTML
    const rawHtml = marked(content);
    const DOMPurify = createDOMPurify();
    return DOMPurify.sanitize(rawHtml, { USE_PROFILES: { html: true } });
  }, [content]);

  return (
    <div 
      className={`prose prose-lg max-w-none ${className}`}
      dangerouslySetInnerHTML={{ __html: htmlContent }}
    />
  );
}
