import { Sparkles, Copy, Calendar, RefreshCw } from 'lucide-react';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';

export function AISummaryWidget() {
  const [summaryType, setSummaryType] = useState<'daily' | 'weekly'>('daily');
  const [summary, setSummary] = useState('');
  const [generating, setGenerating] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const { toast } = useToast();

  const generateSummary = async () => {
    setGenerating(true);
    try {
      const response = await fetch('/api/summaries/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: localStorage.getItem('userId'),
          type: summaryType,
        }),
      });
      const data = await response.json();
      if (response.ok) {
        setSummary(data.summary || '');
        setExpanded(true);
        toast({ title: 'Summary generated!' });
      } else {
        toast({ title: 'Failed to generate summary', description: data.error || undefined, variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Failed to generate summary', variant: 'destructive' });
    } finally {
      setGenerating(false);
    }
  };

  const copySummary = () => {
    navigator.clipboard.writeText(summary);
    toast({ title: 'Copied to clipboard!' });
  };

  return (
    <div className="bg-gradient-to-br from-purple-900/20 to-blue-900/20 rounded-lg border border-purple-800/30 p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-purple-400" />
          <h3 className="font-medium">AI Summary</h3>
        </div>
        <div className="flex bg-gray-800 rounded-lg p-0.5">
          <button
            onClick={() => setSummaryType('daily')}
            className={`px-2 py-1 text-xs rounded ${summaryType === 'daily' ? 'bg-purple-600 text-white' : 'text-gray-400'}`}
          >
            Daily
          </button>
          <button
            onClick={() => setSummaryType('weekly')}
            className={`px-2 py-1 text-xs rounded ${summaryType === 'weekly' ? 'bg-purple-600 text-white' : 'text-gray-400'}`}
          >
            Weekly
          </button>
        </div>
      </div>

      {!expanded || !summary ? (
        <button
          onClick={generateSummary}
          disabled={generating}
          className="w-full py-3 bg-purple-600/20 hover:bg-purple-600/30 border border-purple-600 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-all disabled:opacity-50"
        >
          {generating ? (
            <>
              <Sparkles className="w-4 h-4 animate-pulse" />
              Generating...
            </>
          ) : (
            <>
              <Calendar className="w-4 h-4" />
              Generate {summaryType === 'daily' ? 'Standup' : 'Report'}
            </>
          )}
        </button>
      ) : (
        <div className="space-y-3">
          <div className="bg-gray-900/50 rounded-lg p-3 max-h-64 overflow-y-auto">
            <div className="text-xs text-gray-500 mb-2">
              {summaryType === 'daily' ? "Today's Standup" : 'Weekly Report'}
            </div>
            <div className="text-sm text-gray-200 whitespace-pre-wrap">{summary}</div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={copySummary}
              className="flex-1 px-3 py-2 bg-gray-800 hover:bg-gray-700 rounded text-xs flex items-center justify-center gap-1"
            >
              <Copy className="w-3 h-3" />
              Copy
            </button>
            <button
              onClick={generateSummary}
              className="flex-1 px-3 py-2 bg-gray-800 hover:bg-gray-700 rounded text-xs flex items-center justify-center gap-1"
            >
              <RefreshCw className="w-3 h-3" />
              Regenerate
            </button>
          </div>
        </div>
      )}
    </div>
  );
}


