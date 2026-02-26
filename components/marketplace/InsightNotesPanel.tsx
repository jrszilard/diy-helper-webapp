'use client';

import { useState, useEffect, useCallback } from 'react';
import { Loader2, Lightbulb, Wrench, Clock, AlertOctagon, MapPin, Save, ChevronDown, ChevronUp, Plus, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface InsightNotesPanelProps {
  questionId: string;
  userRole: 'diyer' | 'expert';
}

interface ExpertNotes {
  tools_needed?: string[];
  estimated_time?: string;
  common_mistakes?: string[];
  local_code_notes?: string;
  additional?: string;
}

export default function InsightNotesPanel({ questionId, userRole }: InsightNotesPanelProps) {
  const [notes, setNotes] = useState<ExpertNotes | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Edit state
  const [toolsNeeded, setToolsNeeded] = useState<string[]>([]);
  const [newTool, setNewTool] = useState('');
  const [estimatedTime, setEstimatedTime] = useState('');
  const [commonMistakes, setCommonMistakes] = useState<string[]>([]);
  const [newMistake, setNewMistake] = useState('');
  const [localCodeNotes, setLocalCodeNotes] = useState('');
  const [additional, setAdditional] = useState('');

  const fetchNotes = useCallback(async () => {
    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      if (!token) return;

      const res = await fetch(`/api/qa/${questionId}/notes`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setNotes(data.notes || null);
        if (data.notes) {
          setToolsNeeded(data.notes.tools_needed || []);
          setEstimatedTime(data.notes.estimated_time || '');
          setCommonMistakes(data.notes.common_mistakes || []);
          setLocalCodeNotes(data.notes.local_code_notes || '');
          setAdditional(data.notes.additional || '');
        }
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [questionId]);

  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  const handleSave = async () => {
    setSaving(true);
    setError(null);

    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      if (!token) {
        setError('Please sign in.');
        return;
      }

      const res = await fetch(`/api/qa/${questionId}/notes`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          toolsNeeded: toolsNeeded.filter(Boolean),
          estimatedTime: estimatedTime.trim() || undefined,
          commonMistakes: commonMistakes.filter(Boolean),
          localCodeNotes: localCodeNotes.trim() || undefined,
          additional: additional.trim() || undefined,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setNotes(data.notes);
        setEditing(false);
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error || 'Failed to save notes.');
      }
    } catch {
      setError('Something went wrong.');
    } finally {
      setSaving(false);
    }
  };

  const addTool = () => {
    if (newTool.trim() && toolsNeeded.length < 20) {
      setToolsNeeded([...toolsNeeded, newTool.trim()]);
      setNewTool('');
    }
  };

  const addMistake = () => {
    if (newMistake.trim() && commonMistakes.length < 10) {
      setCommonMistakes([...commonMistakes, newMistake.trim()]);
      setNewMistake('');
    }
  };

  const hasNotes = notes && Object.keys(notes).length > 0;
  const hasContent = toolsNeeded.length > 0 || estimatedTime || commonMistakes.length > 0 || localCodeNotes || additional;

  // Don't show panel if no notes and user is DIYer (expert can always see it to add)
  if (!loading && !hasNotes && userRole === 'diyer') return null;

  return (
    <div className="bg-white border border-[#D4C8B8] rounded-lg overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-4 py-3 flex items-center justify-between bg-[#5D7B93]/5 hover:bg-[#5D7B93]/10 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Lightbulb size={14} className="text-[#5D7B93]" />
          <h4 className="text-sm font-semibold text-[#3E2723]">
            Expert Insights
          </h4>
          {!hasNotes && userRole === 'expert' && (
            <span className="text-xs text-[#B0A696]">(add notes for the DIYer)</span>
          )}
        </div>
        {expanded ? <ChevronUp size={14} className="text-[#7D6B5D]" /> : <ChevronDown size={14} className="text-[#7D6B5D]" />}
      </button>

      {expanded && (
        <div className="px-4 py-3">
          {loading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 size={16} className="animate-spin text-[#C67B5C]" />
            </div>
          ) : editing ? (
            /* Edit mode */
            <div className="space-y-4">
              {/* Tools needed */}
              <div>
                <label className="flex items-center gap-1.5 text-xs font-medium text-[#7D6B5D] mb-1">
                  <Wrench size={12} />
                  Tools Needed
                </label>
                <div className="flex flex-wrap gap-1.5 mb-1.5">
                  {toolsNeeded.map((tool, i) => (
                    <span key={i} className="flex items-center gap-1 text-xs bg-[#E8DFD0] text-[#3E2723] px-2 py-1 rounded-full">
                      {tool}
                      <button onClick={() => setToolsNeeded(toolsNeeded.filter((_, j) => j !== i))}>
                        <X size={10} className="text-[#7D6B5D]" />
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-1.5">
                  <input
                    value={newTool}
                    onChange={e => setNewTool(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addTool())}
                    placeholder="Add tool..."
                    className="flex-1 px-2 py-1.5 border border-[#D4C8B8] rounded text-xs text-[#3E2723] focus:outline-none focus:ring-1 focus:ring-[#C67B5C]/50"
                    maxLength={200}
                  />
                  <button onClick={addTool} className="text-xs text-[#5D7B93] hover:text-[#4A6578]">
                    <Plus size={14} />
                  </button>
                </div>
              </div>

              {/* Estimated time */}
              <div>
                <label className="flex items-center gap-1.5 text-xs font-medium text-[#7D6B5D] mb-1">
                  <Clock size={12} />
                  Estimated Time
                </label>
                <input
                  value={estimatedTime}
                  onChange={e => setEstimatedTime(e.target.value)}
                  placeholder="e.g., 2-3 hours for an experienced DIYer"
                  className="w-full px-2 py-1.5 border border-[#D4C8B8] rounded text-xs text-[#3E2723] focus:outline-none focus:ring-1 focus:ring-[#C67B5C]/50"
                  maxLength={200}
                />
              </div>

              {/* Common mistakes */}
              <div>
                <label className="flex items-center gap-1.5 text-xs font-medium text-[#7D6B5D] mb-1">
                  <AlertOctagon size={12} />
                  Common Mistakes to Avoid
                </label>
                <div className="space-y-1 mb-1.5">
                  {commonMistakes.map((mistake, i) => (
                    <div key={i} className="flex items-start gap-1.5">
                      <span className="text-xs text-[#3E2723] flex-1 bg-red-50 px-2 py-1 rounded">{mistake}</span>
                      <button onClick={() => setCommonMistakes(commonMistakes.filter((_, j) => j !== i))}>
                        <X size={10} className="text-[#7D6B5D] mt-1" />
                      </button>
                    </div>
                  ))}
                </div>
                <div className="flex gap-1.5">
                  <input
                    value={newMistake}
                    onChange={e => setNewMistake(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addMistake())}
                    placeholder="Add common mistake..."
                    className="flex-1 px-2 py-1.5 border border-[#D4C8B8] rounded text-xs text-[#3E2723] focus:outline-none focus:ring-1 focus:ring-[#C67B5C]/50"
                    maxLength={500}
                  />
                  <button onClick={addMistake} className="text-xs text-[#5D7B93] hover:text-[#4A6578]">
                    <Plus size={14} />
                  </button>
                </div>
              </div>

              {/* Local code notes */}
              <div>
                <label className="flex items-center gap-1.5 text-xs font-medium text-[#7D6B5D] mb-1">
                  <MapPin size={12} />
                  Local Code Notes
                </label>
                <textarea
                  value={localCodeNotes}
                  onChange={e => setLocalCodeNotes(e.target.value)}
                  placeholder="Any local building code considerations..."
                  rows={2}
                  className="w-full px-2 py-1.5 border border-[#D4C8B8] rounded text-xs text-[#3E2723] focus:outline-none focus:ring-1 focus:ring-[#C67B5C]/50 resize-none"
                  maxLength={2000}
                />
              </div>

              {/* Additional notes */}
              <div>
                <label className="text-xs font-medium text-[#7D6B5D] mb-1 block">Additional Notes</label>
                <textarea
                  value={additional}
                  onChange={e => setAdditional(e.target.value)}
                  placeholder="Any other helpful info for the DIYer..."
                  rows={2}
                  className="w-full px-2 py-1.5 border border-[#D4C8B8] rounded text-xs text-[#3E2723] focus:outline-none focus:ring-1 focus:ring-[#C67B5C]/50 resize-none"
                  maxLength={2000}
                />
              </div>

              {error && <p className="text-xs text-red-600">{error}</p>}

              <div className="flex items-center gap-2">
                <button
                  onClick={handleSave}
                  disabled={saving || !hasContent}
                  className="flex items-center gap-1.5 px-4 py-2 bg-[#5D7B93] text-white text-sm font-semibold rounded-lg hover:bg-[#4A6578] transition-colors disabled:opacity-50"
                >
                  {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                  Save Notes
                </button>
                <button
                  onClick={() => {
                    setEditing(false);
                    // Reset to stored notes
                    if (notes) {
                      setToolsNeeded(notes.tools_needed || []);
                      setEstimatedTime(notes.estimated_time || '');
                      setCommonMistakes(notes.common_mistakes || []);
                      setLocalCodeNotes(notes.local_code_notes || '');
                      setAdditional(notes.additional || '');
                    }
                  }}
                  className="px-4 py-2 text-sm text-[#7D6B5D] hover:text-[#3E2723] transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : hasNotes ? (
            /* Display mode */
            <div className="space-y-3">
              {notes!.tools_needed && notes!.tools_needed.length > 0 && (
                <div>
                  <span className="flex items-center gap-1.5 text-xs font-medium text-[#7D6B5D] mb-1">
                    <Wrench size={12} />
                    Tools Needed
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {notes!.tools_needed.map((tool, i) => (
                      <span key={i} className="text-xs bg-[#E8DFD0] text-[#3E2723] px-2 py-1 rounded-full">{tool}</span>
                    ))}
                  </div>
                </div>
              )}

              {notes!.estimated_time && (
                <div className="flex items-center gap-1.5">
                  <Clock size={12} className="text-[#7D6B5D]" />
                  <span className="text-xs font-medium text-[#7D6B5D]">Est. Time:</span>
                  <span className="text-xs text-[#3E2723]">{notes!.estimated_time}</span>
                </div>
              )}

              {notes!.common_mistakes && notes!.common_mistakes.length > 0 && (
                <div>
                  <span className="flex items-center gap-1.5 text-xs font-medium text-[#7D6B5D] mb-1">
                    <AlertOctagon size={12} />
                    Watch Out For
                  </span>
                  <ul className="space-y-1">
                    {notes!.common_mistakes.map((mistake, i) => (
                      <li key={i} className="text-xs text-[#3E2723] bg-red-50 px-2 py-1 rounded">
                        {mistake}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {notes!.local_code_notes && (
                <div>
                  <span className="flex items-center gap-1.5 text-xs font-medium text-[#7D6B5D] mb-1">
                    <MapPin size={12} />
                    Local Code Notes
                  </span>
                  <p className="text-xs text-[#3E2723] bg-blue-50 px-2 py-1.5 rounded">{notes!.local_code_notes}</p>
                </div>
              )}

              {notes!.additional && (
                <div>
                  <span className="text-xs font-medium text-[#7D6B5D] mb-1 block">Additional</span>
                  <p className="text-xs text-[#3E2723]">{notes!.additional}</p>
                </div>
              )}

              {userRole === 'expert' && (
                <button
                  onClick={() => setEditing(true)}
                  className="text-xs text-[#5D7B93] hover:text-[#4A6578] font-medium transition-colors"
                >
                  Edit notes
                </button>
              )}

              {userRole === 'diyer' && (
                <p className="text-[10px] text-[#B0A696]">
                  These expert insights stay with your project forever — not lost after a phone call.
                </p>
              )}
            </div>
          ) : (
            /* No notes yet — expert prompt */
            <div className="text-center py-2">
              {userRole === 'expert' ? (
                <button
                  onClick={() => setEditing(true)}
                  className="flex items-center gap-1.5 mx-auto text-xs font-medium text-[#5D7B93] hover:text-[#4A6578] transition-colors"
                >
                  <Plus size={12} />
                  Add insight notes (tools, time estimate, tips)
                </button>
              ) : (
                <p className="text-xs text-[#B0A696]">No expert insights yet.</p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
