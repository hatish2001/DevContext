import { useState, useEffect, useRef } from 'react';
import { Search, X, Loader2 } from 'lucide-react';
import { useDebounce } from '../hooks/useDebounce';

interface SearchResult {
  id: string;
  title: string;
  titleHighlighted: string;
  content: string;
  contentHighlighted: string;
  source: string;
  url: string;
  metadata: any;
}

interface SearchBarProps {
  userId: string;
  onSelectResult?: (result: SearchResult) => void;
  onResultsChange?: (count: number) => void;
}

export function SearchBar({ userId, onSelectResult, onResultsChange }: SearchBarProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [showHints, setShowHints] = useState(false);
  const [searchType, setSearchType] = useState<string>('');
  const debouncedQuery = useDebounce(query, 300);
  const searchRef = useRef<HTMLDivElement>(null);

  // Close results when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowResults(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Perform search
  useEffect(() => {
    if (debouncedQuery.length < 2) {
      setResults([]);
      setSearchType('');
      if (onResultsChange) onResultsChange(0);
      return;
    }

    const performSearch = async () => {
      setLoading(true);
      try {
        const response = await fetch(
          `http://localhost:3000/api/contexts/search?userId=${userId}&query=${encodeURIComponent(debouncedQuery)}`,
          { credentials: 'include' }
        );
        const data = await response.json();
        setResults(data.results || []);
        setSearchType(data.type || '');
        setShowResults(true);
        setShowHints(false);
        if (onResultsChange) onResultsChange(data.results?.length || 0);
      } catch (error) {
        console.error('Search failed:', error);
        setResults([]);
        setSearchType('');
        if (onResultsChange) onResultsChange(0);
      } finally {
        setLoading(false);
      }
    };

    performSearch();
  }, [debouncedQuery, userId, onResultsChange]);

  const handleSelect = (result: SearchResult) => {
    if (onSelectResult) {
      onSelectResult(result);
    }
    // Open in new tab if it has a URL
    if (result.url) {
      window.open(result.url, '_blank');
    }
    setQuery('');
    setShowResults(false);
  };

  const getSourceIcon = (source: string) => {
    const icons: Record<string, string> = {
      'github_pr': '🔀',
      'github_issue': '🐛',
      'github_commit': '💾',
      'github_review': '👀'
    };
    return icons[source] || '📄';
  };

  // Get search type badge
  const getSearchTypeBadge = () => {
    if (!searchType || searchType === 'text') return null;
    
    const badges: Record<string, { label: string; color: string }> = {
      'date': { label: 'Date Filter', color: 'bg-blue-500/20 text-blue-400' },
      'author': { label: 'By Author', color: 'bg-green-500/20 text-green-400' },
      'status': { label: 'By Status', color: 'bg-yellow-500/20 text-yellow-400' },
      'repo': { label: 'By Repo', color: 'bg-purple-500/20 text-purple-400' },
      'combined': { label: 'Advanced Search', color: 'bg-pink-500/20 text-pink-400' }
    };
    
    return badges[searchType];
  };

  return (
    <div ref={searchRef} className="relative w-full max-w-2xl">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />

        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => {
            if (query.length >= 2) {
              setShowResults(true);
            } else {
              setShowHints(true);
            }
          }}
          onBlur={() => {
            // Delay hiding hints to allow click on examples
            setTimeout(() => setShowHints(false), 200);
          }}
          placeholder="Search: try 'today', '@author', 'repo:name', 'is:open', or any text..."
          className="w-full pl-10 pr-10 py-2 bg-background border border-input rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />

        {loading && (
          <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground animate-spin" />
        )}

        {query && !loading && (
          <button
            onClick={() => {
              setQuery('');
              setResults([]);
              setShowResults(false);
            }}
            className="absolute right-3 top-1/2 transform -translate-y-1/2"
          >
            <X className="w-5 h-5 text-muted-foreground hover:text-foreground" />
          </button>
        )}
      </div>

      {/* Search Hints */}
      {showHints && !query && (
        <div className="absolute top-full mt-2 w-full bg-card border border-border rounded-lg shadow-xl p-4 z-50">
          <div className="text-sm font-medium text-foreground mb-3">Search Tips</div>
          <div className="space-y-2">
            <div className="flex items-start gap-2">
              <span className="text-blue-400 text-xs mt-0.5">📅</span>
              <div className="flex-1">
                <div className="text-xs text-muted-foreground">
                  <code className="bg-accent px-1.5 py-0.5 rounded text-xs">today</code>{' '}
                  <code className="bg-accent px-1.5 py-0.5 rounded text-xs">yesterday</code>{' '}
                  <code className="bg-accent px-1.5 py-0.5 rounded text-xs">this week</code>{' '}
                  <code className="bg-accent px-1.5 py-0.5 rounded text-xs">last week</code>
                  <span className="ml-1">- Filter by date</span>
                </div>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-green-400 text-xs mt-0.5">👤</span>
              <div className="flex-1">
                <div className="text-xs text-muted-foreground">
                  <code className="bg-accent px-1.5 py-0.5 rounded text-xs">@username</code>{' '}
                  or{' '}
                  <code className="bg-accent px-1.5 py-0.5 rounded text-xs">john's</code>
                  <span className="ml-1">- Find by author</span>
                </div>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-yellow-400 text-xs mt-0.5">🔖</span>
              <div className="flex-1">
                <div className="text-xs text-muted-foreground">
                  <code className="bg-accent px-1.5 py-0.5 rounded text-xs">is:open</code>{' '}
                  <code className="bg-accent px-1.5 py-0.5 rounded text-xs">is:closed</code>{' '}
                  <code className="bg-accent px-1.5 py-0.5 rounded text-xs">is:merged</code>
                  <span className="ml-1">- Filter by status</span>
                </div>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-purple-400 text-xs mt-0.5">📦</span>
              <div className="flex-1">
                <div className="text-xs text-muted-foreground">
                  <code className="bg-accent px-1.5 py-0.5 rounded text-xs">repo:name</code>
                  <span className="ml-1">- Search in specific repository</span>
                </div>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-pink-400 text-xs mt-0.5">✨</span>
              <div className="flex-1">
                <div className="text-xs text-muted-foreground">
                  Combine filters: <code className="bg-accent px-1.5 py-0.5 rounded text-xs">@john is:open yesterday</code>
                </div>
              </div>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-border">
            <div className="text-xs font-medium text-foreground mb-2">Try these:</div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setQuery('today')}
                className="text-xs bg-accent hover:bg-accent/80 px-2 py-1 rounded"
              >
                today
              </button>
              <button
                onClick={() => setQuery('is:open')}
                className="text-xs bg-accent hover:bg-accent/80 px-2 py-1 rounded"
              >
                is:open
              </button>
              <button
                onClick={() => setQuery('bug')}
                className="text-xs bg-accent hover:bg-accent/80 px-2 py-1 rounded"
              >
                bug
              </button>
              <button
                onClick={() => setQuery('TODO')}
                className="text-xs bg-accent hover:bg-accent/80 px-2 py-1 rounded"
              >
                TODO
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Search Results Dropdown */}
      {showResults && results.length > 0 && (
        <div className="absolute top-full mt-2 w-full bg-card border border-border rounded-lg shadow-xl max-h-96 overflow-y-auto z-50">
          {/* Search Type Badge */}
          {getSearchTypeBadge() && (
            <div className="px-4 py-2 border-b border-border bg-accent/50">
              <span className={`text-xs px-2 py-1 rounded ${getSearchTypeBadge()?.color}`}>
                {getSearchTypeBadge()?.label}
              </span>
              <span className="text-xs text-muted-foreground ml-2">
                {results.length} result{results.length !== 1 ? 's' : ''}
              </span>
            </div>
          )}
          {results.map((result) => (
            <button
              key={result.id}
              onClick={() => handleSelect(result)}
              className="w-full px-4 py-3 hover:bg-accent text-left border-b border-border last:border-b-0"
            >
              <div className="flex items-start gap-3">
                <span className="text-lg mt-1">{getSourceIcon(result.source)}</span>
                <div className="flex-1 min-w-0">
                  <div
                    className="font-medium text-foreground truncate"
                    dangerouslySetInnerHTML={{ __html: result.titleHighlighted }}
                  />
                  {result.content && (
                    <div
                      className="text-sm text-muted-foreground mt-1 line-clamp-2"
                      dangerouslySetInnerHTML={{ __html: result.contentHighlighted }}
                    />
                  )}
                  <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                    {result.metadata?.repo && <span>{result.metadata.repo}</span>}
                    {result.metadata?.repo && <span>•</span>}
                    <span>{result.source.replace('github_', '').replace('_', ' ')}</span>
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* No Results */}
      {showResults && query.length >= 2 && !loading && results.length === 0 && (
        <div className="absolute top-full mt-2 w-full bg-card border border-border rounded-lg shadow-xl p-4 z-50">
          <p className="text-muted-foreground text-center">No results found for "{query}"</p>
        </div>
      )}
    </div>
  );
}

