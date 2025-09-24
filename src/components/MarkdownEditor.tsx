"use client";

import { useState } from 'react';
import MDEditor from '@uiw/react-md-editor';

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  height?: number;
}

export default function MarkdownEditor({ 
  value, 
  onChange, 
  placeholder = "Markdown-Beschreibung eingeben...",
  height = 300 
}: MarkdownEditorProps) {
  const [showPreview, setShowPreview] = useState(false);

  return (
    <div className="markdown-editor">
      <div className="flex justify-between items-center mb-2">
        <label className="block text-sm font-medium text-gray-700">Beschreibung</label>
        <div className="flex space-x-2">
          <button
            type="button"
            onClick={() => setShowPreview(!showPreview)}
            className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded border"
          >
            {showPreview ? 'Editor' : 'Vorschau'}
          </button>
        </div>
      </div>

      <div className="border border-gray-300 rounded-md overflow-hidden">
        <MDEditor
          value={value}
          onChange={(val) => onChange(val || '')}
          height={height}
          data-color-mode="light"
          preview={showPreview ? 'preview' : 'edit'}
          hideToolbar={false}
          textareaProps={{
            placeholder: placeholder,
            style: {
              fontSize: 14,
              fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Consolas, "Liberation Mono", Menlo, monospace',
            },
          }}
        />
      </div>
    </div>
  );
}
