'use client'

import { useEffect, useRef, useMemo, useCallback } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import { TextStyle } from '@tiptap/extension-text-style'
import { Color } from '@tiptap/extension-color'
import Underline from '@tiptap/extension-underline'

interface TiptapEditorProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
}

export default function TiptapEditor({ value, onChange, placeholder }: TiptapEditorProps) {
  const placeholderText = placeholder || 'Enter content here...'
  
  const extensions = useMemo(() => [
    StarterKit.configure({
      heading: {
        levels: [1, 2, 3, 4, 5, 6],
      },
    }),
    Underline,
    TextStyle,
    Color,
    Placeholder.configure({
      placeholder: placeholderText,
    }),
  ], [placeholderText])

  const handleUpdate = useCallback(({ editor }: { editor: any }) => {
    onChange(editor.getHTML())
  }, [onChange])

  const editor = useEditor({
    extensions,
    content: value,
    immediatelyRender: false,
    onUpdate: handleUpdate,
    editorProps: {
      attributes: {
        class: 'prose prose-invert max-w-none focus:outline-none min-h-[300px] p-4',
      },
    },
  })

  const isUpdatingFromProps = useRef(false)
  
  useEffect(() => {
    if (editor && value !== editor.getHTML() && !isUpdatingFromProps.current) {
      isUpdatingFromProps.current = true
      editor.commands.setContent(value || '', { emitUpdate: false })
      setTimeout(() => {
        isUpdatingFromProps.current = false
      }, 0)
    }
  }, [editor, value])

  const toggleBold = useCallback(() => editor?.chain().focus().toggleBold().run(), [editor])
  const toggleItalic = useCallback(() => editor?.chain().focus().toggleItalic().run(), [editor])
  const toggleUnderline = useCallback(() => editor?.chain().focus().toggleUnderline().run(), [editor])
  const toggleHeading1 = useCallback(() => editor?.chain().focus().toggleHeading({ level: 1 }).run(), [editor])
  const toggleHeading2 = useCallback(() => editor?.chain().focus().toggleHeading({ level: 2 }).run(), [editor])
  const toggleHeading3 = useCallback(() => editor?.chain().focus().toggleHeading({ level: 3 }).run(), [editor])
  const toggleBulletList = useCallback(() => editor?.chain().focus().toggleBulletList().run(), [editor])
  const toggleOrderedList = useCallback(() => editor?.chain().focus().toggleOrderedList().run(), [editor])
  const toggleBlockquote = useCallback(() => editor?.chain().focus().toggleBlockquote().run(), [editor])
  const setHorizontalRule = useCallback(() => editor?.chain().focus().setHorizontalRule().run(), [editor])
  const undo = useCallback(() => editor?.chain().focus().undo().run(), [editor])
  const redo = useCallback(() => editor?.chain().focus().redo().run(), [editor])

  if (!editor) {
    return (
      <div className="h-64 bg-[#1a1a1a] border-2 border-[#404040] rounded-lg flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#ffd700] mb-2" />
          <p className="text-[#888] text-sm">Loading editor...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="tiptap-editor-wrapper w-full">
      <div className="bg-[#252525] border-2 border-[#404040] border-b-0 rounded-t-lg p-2 flex flex-wrap gap-1">
        <button
          onClick={toggleBold}
          className={`px-3 py-1.5 rounded text-sm font-semibold transition-colors ${
            editor?.isActive('bold')
              ? 'bg-[#ffd700] text-[#0a0a0a]'
              : 'bg-[#1a1a1a] text-[#e0e0e0] hover:bg-[#2a2a2a]'
          }`}
          title="Bold"
        >
          <strong>B</strong>
        </button>
        <button
          onClick={toggleItalic}
          className={`px-3 py-1.5 rounded text-sm font-semibold transition-colors ${
            editor?.isActive('italic')
              ? 'bg-[#ffd700] text-[#0a0a0a]'
              : 'bg-[#1a1a1a] text-[#e0e0e0] hover:bg-[#2a2a2a]'
          }`}
          title="Italic"
        >
          <em>I</em>
        </button>
        <button
          onClick={toggleUnderline}
          className={`px-3 py-1.5 rounded text-sm font-semibold transition-colors ${
            editor?.isActive('underline')
              ? 'bg-[#ffd700] text-[#0a0a0a]'
              : 'bg-[#1a1a1a] text-[#e0e0e0] hover:bg-[#2a2a2a]'
          }`}
          title="Underline"
        >
          <u>U</u>
        </button>
        <div className="w-px h-6 bg-[#404040] mx-1" />
        <button
          onClick={toggleHeading1}
          className={`px-3 py-1.5 rounded text-sm font-semibold transition-colors ${
            editor?.isActive('heading', { level: 1 })
              ? 'bg-[#ffd700] text-[#0a0a0a]'
              : 'bg-[#1a1a1a] text-[#e0e0e0] hover:bg-[#2a2a2a]'
          }`}
          title="Heading 1"
        >
          H1
        </button>
        <button
          onClick={toggleHeading2}
          className={`px-3 py-1.5 rounded text-sm font-semibold transition-colors ${
            editor?.isActive('heading', { level: 2 })
              ? 'bg-[#ffd700] text-[#0a0a0a]'
              : 'bg-[#1a1a1a] text-[#e0e0e0] hover:bg-[#2a2a2a]'
          }`}
          title="Heading 2"
        >
          H2
        </button>
        <button
          onClick={toggleHeading3}
          className={`px-3 py-1.5 rounded text-sm font-semibold transition-colors ${
            editor?.isActive('heading', { level: 3 })
              ? 'bg-[#ffd700] text-[#0a0a0a]'
              : 'bg-[#1a1a1a] text-[#e0e0e0] hover:bg-[#2a2a2a]'
          }`}
          title="Heading 3"
        >
          H3
        </button>
        <div className="w-px h-6 bg-[#404040] mx-1" />
        <button
          onClick={toggleBulletList}
          className={`px-3 py-1.5 rounded text-sm font-semibold transition-colors ${
            editor?.isActive('bulletList')
              ? 'bg-[#ffd700] text-[#0a0a0a]'
              : 'bg-[#1a1a1a] text-[#e0e0e0] hover:bg-[#2a2a2a]'
          }`}
          title="Bullet List"
        >
          •
        </button>
        <button
          onClick={toggleOrderedList}
          className={`px-3 py-1.5 rounded text-sm font-semibold transition-colors ${
            editor?.isActive('orderedList')
              ? 'bg-[#ffd700] text-[#0a0a0a]'
              : 'bg-[#1a1a1a] text-[#e0e0e0] hover:bg-[#2a2a2a]'
          }`}
          title="Ordered List"
        >
          1.
        </button>
        <button
          onClick={toggleBlockquote}
          className={`px-3 py-1.5 rounded text-sm font-semibold transition-colors ${
            editor?.isActive('blockquote')
              ? 'bg-[#ffd700] text-[#0a0a0a]'
              : 'bg-[#1a1a1a] text-[#e0e0e0] hover:bg-[#2a2a2a]'
          }`}
          title="Blockquote"
        >
          "
        </button>
        <div className="w-px h-6 bg-[#404040] mx-1" />
        <button
          onClick={setHorizontalRule}
          className="px-3 py-1.5 rounded text-sm font-semibold bg-[#1a1a1a] text-[#e0e0e0] hover:bg-[#2a2a2a] transition-colors"
          title="Horizontal Rule"
        >
          ─
        </button>
        <button
          onClick={undo}
          className="px-3 py-1.5 rounded text-sm font-semibold bg-[#1a1a1a] text-[#e0e0e0] hover:bg-[#2a2a2a] transition-colors"
          title="Undo"
        >
          ↶
        </button>
        <button
          onClick={redo}
          className="px-3 py-1.5 rounded text-sm font-semibold bg-[#1a1a1a] text-[#e0e0e0] hover:bg-[#2a2a2a] transition-colors"
          title="Redo"
        >
          ↷
        </button>
      </div>

      <div className="bg-[#1a1a1a] border-2 border-[#404040] border-t-0 rounded-b-lg min-h-[300px]">
        <EditorContent editor={editor} />
      </div>

      <style jsx global>{`
        .tiptap-editor-wrapper .ProseMirror {
          outline: none;
          min-height: 300px;
          padding: 1rem;
          color: #e0e0e0;
        }
        .tiptap-editor-wrapper .ProseMirror p.is-editor-empty:first-child::before {
          content: attr(data-placeholder);
          float: left;
          color: #666;
          pointer-events: none;
          height: 0;
        }
        .tiptap-editor-wrapper .ProseMirror h1 {
          font-size: 2em;
          font-weight: bold;
          margin-top: 0.5em;
          margin-bottom: 0.5em;
          color: #ffd700;
        }
        .tiptap-editor-wrapper .ProseMirror h2 {
          font-size: 1.5em;
          font-weight: bold;
          margin-top: 0.5em;
          margin-bottom: 0.5em;
          color: #ffd700;
        }
        .tiptap-editor-wrapper .ProseMirror h3 {
          font-size: 1.25em;
          font-weight: bold;
          margin-top: 0.5em;
          margin-bottom: 0.5em;
          color: #ffd700;
        }
        .tiptap-editor-wrapper .ProseMirror ul,
        .tiptap-editor-wrapper .ProseMirror ol {
          padding-left: 1.5rem;
          margin: 0.5rem 0;
        }
        .tiptap-editor-wrapper .ProseMirror ul {
          list-style-type: disc;
        }
        .tiptap-editor-wrapper .ProseMirror ol {
          list-style-type: decimal;
        }
        .tiptap-editor-wrapper .ProseMirror blockquote {
          border-left: 4px solid #ffd700;
          padding-left: 1rem;
          margin: 1rem 0;
          font-style: italic;
          color: #d4d4d4;
        }
        .tiptap-editor-wrapper .ProseMirror hr {
          border: none;
          border-top: 2px solid #404040;
          margin: 1rem 0;
        }
        .tiptap-editor-wrapper .ProseMirror strong {
          font-weight: bold;
          color: #ffd700;
        }
        .tiptap-editor-wrapper .ProseMirror em {
          font-style: italic;
        }
        .tiptap-editor-wrapper .ProseMirror u {
          text-decoration: underline;
        }
      `}</style>
    </div>
  )
}

