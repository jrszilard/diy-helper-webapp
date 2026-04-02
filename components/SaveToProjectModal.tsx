'use client';

import { useState, useEffect } from 'react';
import { ArrowRight, Check } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import TextInput from '@/components/ui/TextInput';
import Spinner from '@/components/ui/Spinner';
import ContextualHint from '@/components/ui/ContextualHint';

interface Project {
  id: string;
  name: string;
}

interface SaveToProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  defaultName?: string;
  onSaved: (projectId: string) => void;
}

export default function SaveToProjectModal({
  isOpen,
  onClose,
  userId,
  defaultName = '',
  onSaved,
}: SaveToProjectModalProps) {
  const [newProjectName, setNewProjectName] = useState(defaultName);
  const [existingProjects, setExistingProjects] = useState<Project[]>([]);
  const [saving, setSaving] = useState(false);
  const [savedProjectId, setSavedProjectId] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  // Sync default name and reset state when modal opens
  useEffect(() => {
    if (!isOpen) {
      // Reset loaded so we re-fetch next time (picks up newly created projects)
      setLoaded(false);
      return;
    }
    setNewProjectName(defaultName);
    setSavedProjectId(null);
  }, [isOpen, defaultName]);

  // Fetch existing projects when modal opens (and userId/loaded changes)
  useEffect(() => {
    if (!isOpen || loaded) return;
    supabase
      .from('projects')
      .select('id, name')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(10)
      .then(({ data }) => {
        setExistingProjects(data ?? []);
        setLoaded(true);
      });
  }, [isOpen, userId, loaded]);

  const saveToNewProject = async () => {
    if (!newProjectName.trim()) return;
    setSaving(true);
    try {
      const { data, error } = await supabase
        .from('projects')
        .insert({ user_id: userId, name: newProjectName.trim() })
        .select('id')
        .single();
      if (!error && data) {
        setSavedProjectId(data.id);
        onSaved(data.id);
      }
    } finally {
      setSaving(false);
    }
  };

  const saveToExistingProject = (projectId: string) => {
    setSavedProjectId(projectId);
    onSaved(projectId);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
    >
      {savedProjectId ? (
        <div className="text-center space-y-4 py-2">
          <div className="w-12 h-12 bg-forest-green/15 rounded-full flex items-center justify-center mx-auto">
            <Check className="w-6 h-6 text-forest-green" />
          </div>
          <div>
            <p className="font-bold text-lg text-foreground">Saved!</p>
            <p className="text-sm text-earth-brown mt-1">Your project has been saved.</p>
            <ContextualHint hintKey="tools">
              Your tools in <strong>My Tools</strong> ↑ are auto-excluded from future shopping lists
            </ContextualHint>
          </div>
          <div className="flex gap-2 justify-center">
            <Button variant="primary" href="/" rightIcon={ArrowRight} iconSize={16}>
              Open in chat
            </Button>
            <Button variant="ghost" onClick={onClose}>Done</Button>
          </div>
        </div>
      ) : (
        <div className="space-y-5">
          <div>
            <h3 className="font-bold text-lg text-foreground">Save to Project</h3>
            <p className="text-sm text-earth-brown mt-0.5">Keep track of this plan and add materials later.</p>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-semibold text-foreground">Create new project</p>
            <div className="flex gap-2">
              <TextInput
                id="save-to-project-name"
                value={newProjectName}
                onChange={e => setNewProjectName(e.target.value)}
                placeholder="Project name"
                fullWidth
                onKeyDown={e => { if (e.key === 'Enter') saveToNewProject(); }}
              />
              <Button variant="primary" onClick={saveToNewProject} disabled={!newProjectName.trim() || saving}>
                {saving ? <Spinner size="sm" /> : 'Create'}
              </Button>
            </div>
          </div>

          {existingProjects.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-semibold text-foreground">Or add to existing</p>
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {existingProjects.map(project => (
                  <button
                    key={project.id}
                    onClick={() => saveToExistingProject(project.id)}
                    className="w-full text-left px-3 py-2.5 rounded-lg border border-earth-sand bg-earth-cream hover:bg-earth-tan transition-colors text-sm font-medium text-foreground"
                  >
                    {project.name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
