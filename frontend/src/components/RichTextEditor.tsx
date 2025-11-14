import { useState, useRef, useEffect } from 'react'
import { AtSign, Bold, Italic, Code, Link, List, Image } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'

interface RichTextEditorProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
  rows?: number
  showToolbar?: boolean
  onMentionSearch?: (query: string) => Promise<Array<{ id: string; name: string; avatar?: string }>>
  maxLength?: number
}

export function RichTextEditor({
  value,
  onChange,
  placeholder = 'Write a comment...',
  className,
  rows = 4,
  showToolbar = true,
  onMentionSearch,
  maxLength,
}: RichTextEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [mentionQuery, setMentionQuery] = useState('')
  const [mentionResults, setMentionResults] = useState<Array<{ id: string; name: string; avatar?: string }>>([])
  const [showMentions, setShowMentions] = useState(false)
  const [mentionPosition, setMentionPosition] = useState(0)
  const [cursorPosition, setCursorPosition] = useState(0)

  useEffect(() => {
    if (mentionQuery && onMentionSearch) {
      onMentionSearch(mentionQuery).then(results => {
        setMentionResults(results)
        setShowMentions(results.length > 0)
      })
    } else {
      setShowMentions(false)
    }
  }, [mentionQuery, onMentionSearch])

  const insertText = (before: string, after: string = '') => {
    const textarea = textareaRef.current
    if (!textarea) return

    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const selectedText = value.substring(start, end)
    const newText = value.substring(0, start) + before + selectedText + after + value.substring(end)
    
    onChange(newText)
    
    // Reset cursor position
    setTimeout(() => {
      textarea.focus()
      const newPosition = start + before.length + selectedText.length + after.length
      textarea.setSelectionRange(newPosition, newPosition)
      setCursorPosition(newPosition)
    }, 0)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const textarea = textareaRef.current
    if (!textarea) return

    const position = textarea.selectionStart
    setCursorPosition(position)

    // Check for @ mention trigger
    if (e.key === '@') {
      setMentionPosition(position)
      setMentionQuery('')
    } else if (showMentions) {
      // Handle mention selection
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        // Could implement selection cycling here
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        // Could implement selection cycling here
      } else if (e.key === 'Enter' && mentionResults.length > 0) {
        e.preventDefault()
        insertMention(mentionResults[0])
      } else if (e.key === 'Escape') {
        setShowMentions(false)
      } else {
        // Update mention query
        const textBeforeCursor = value.substring(0, position)
        const atIndex = textBeforeCursor.lastIndexOf('@', mentionPosition)
        if (atIndex !== -1) {
          const query = textBeforeCursor.substring(atIndex + 1, position)
          setMentionQuery(query)
        } else {
          setShowMentions(false)
        }
      }
    } else {
      // Check if we're typing after @
      const textBeforeCursor = value.substring(0, position)
      const atIndex = textBeforeCursor.lastIndexOf('@')
      if (atIndex !== -1 && /^@[\w]*$/.test(textBeforeCursor.substring(atIndex))) {
        setMentionPosition(atIndex)
        const query = textBeforeCursor.substring(atIndex + 1)
        if (query.length > 0) {
          setMentionQuery(query)
        }
      }
    }
  }

  const insertMention = (user: { id: string; name: string }) => {
    const textarea = textareaRef.current
    if (!textarea) return

    const start = mentionPosition
    const end = cursorPosition
    const before = value.substring(0, start)
    const after = value.substring(end)
    const newText = before + `@${user.name} ` + after
    
    onChange(newText)
    setShowMentions(false)
    setMentionQuery('')
    
    setTimeout(() => {
      textarea.focus()
      const newPosition = start + `@${user.name} `.length
      textarea.setSelectionRange(newPosition, newPosition)
    }, 0)
  }

  const markdownShortcuts = {
    bold: () => insertText('**', '**'),
    italic: () => insertText('*', '*'),
    code: () => insertText('`', '`'),
    codeBlock: () => insertText('```\n', '\n```'),
    link: () => {
      const textarea = textareaRef.current
      if (!textarea) return
      const selectedText = value.substring(textarea.selectionStart, textarea.selectionEnd) || 'link text'
      insertText(`[${selectedText}](`, ')')
    },
    list: () => insertText('- ', ''),
    image: () => insertText('![alt text](', ')'),
  }

  return (
    <div className={cn('relative', className)}>
      {showToolbar && (
        <div className="flex items-center gap-1 p-2 bg-gray-800/50 border-b border-gray-700 rounded-t-lg">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={markdownShortcuts.bold}
            className="h-8 w-8 p-0"
            title="Bold (Ctrl+B)"
          >
            <Bold className="w-4 h-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={markdownShortcuts.italic}
            className="h-8 w-8 p-0"
            title="Italic (Ctrl+I)"
          >
            <Italic className="w-4 h-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={markdownShortcuts.code}
            className="h-8 w-8 p-0"
            title="Inline code"
          >
            <Code className="w-4 h-4" />
          </Button>
          <div className="w-px h-6 bg-gray-700" />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={markdownShortcuts.link}
            className="h-8 w-8 p-0"
            title="Insert link"
          >
            <Link className="w-4 h-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={markdownShortcuts.list}
            className="h-8 w-8 p-0"
            title="Bullet list"
          >
            <List className="w-4 h-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={markdownShortcuts.image}
            className="h-8 w-8 p-0"
            title="Insert image"
          >
            <Image className="w-4 h-4" />
          </Button>
          {onMentionSearch && (
            <>
              <div className="w-px h-6 bg-gray-700" />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => insertText('@')}
                className="h-8 w-8 p-0"
                title="Mention (@)"
              >
                <AtSign className="w-4 h-4" />
              </Button>
            </>
          )}
        </div>
      )}

      <div className="relative">
        <Textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => {
            onChange(e.target.value)
            setCursorPosition(e.target.selectionStart)
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          rows={rows}
          className={cn(
            'font-mono text-sm',
            showToolbar && 'rounded-t-none',
            !showToolbar && 'rounded-lg',
            maxLength && value.length >= maxLength * 0.9 && 'border-yellow-500'
          )}
          maxLength={maxLength}
        />

        {showMentions && mentionResults.length > 0 && (
          <div className="absolute z-50 w-full mt-1 bg-gray-900 border border-gray-700 rounded-lg shadow-lg max-h-48 overflow-auto">
            {mentionResults.map((user) => (
              <button
                key={user.id}
                type="button"
                onClick={() => insertMention(user)}
                className="w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-800 text-left"
              >
                {user.avatar && (
                  <img src={user.avatar} alt={user.name} className="w-6 h-6 rounded-full" />
                )}
                <span className="text-sm text-gray-200">{user.name}</span>
              </button>
            ))}
          </div>
        )}

        {maxLength && (
          <div className="absolute bottom-2 right-2 text-xs text-gray-500">
            {value.length} / {maxLength}
          </div>
        )}
      </div>

      {/* Preview button could go here */}
      {value && (
        <div className="mt-2 text-xs text-gray-500">
          Tip: Use markdown for formatting. Type @ to mention someone.
        </div>
      )}
    </div>
  )
}

