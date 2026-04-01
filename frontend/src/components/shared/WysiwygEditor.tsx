'use client'

import React, { useState } from 'react'

// Note: In production, install and use react-quill for full rich-text functionality
// npm install react-quill
import dynamic from 'next/dynamic'
const ReactQuill = dynamic(() => import('react-quill'), { ssr: false, loading: () => <div className="p-4 text-center">Loading Editor...</div> })
// import 'react-quill/dist/quill.snow.css' -> Requires package installation

interface WysiwygEditorProps {
  initialContent?: string
  onChange?: (content: string) => void
  placeholder?: string
}

export default function WysiwygEditor({ initialContent = '', onChange, placeholder = 'Start typing...' }: WysiwygEditorProps) {
  const [value, setValue] = useState(initialContent)

  const handleChange = (content: string) => {
    setValue(content)
    if (onChange) onChange(content)
  }

  const modules = {
    toolbar: [
      [{ header: [1, 2, 3, false] }],
      ['bold', 'italic', 'underline', 'strike', 'blockquote'],
      [{ list: 'ordered' }, { list: 'bullet' }],
      ['link', 'image', 'video'],
      ['clean'],
      ['code-block']
    ]
  }

  return (
    <div className="w-full bg-white dark:bg-zinc-900 rounded-xl shadow-sm border border-zinc-200 dark:border-zinc-800 overflow-hidden">
      {/* Fallback styling since quill CSS isn't loaded without the package */}
      <ReactQuill 
        theme="snow" 
        value={value} 
        onChange={handleChange} 
        modules={modules}
        placeholder={placeholder}
        className="min-h-[400px] prose dark:prose-invert max-w-none p-4 focus:outline-none"
      />
    </div>
  )
}
