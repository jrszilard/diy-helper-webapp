'use client';

import React from 'react';
import { GuestProject } from '@/lib/guestStorage';
import Button from '@/components/ui/Button';
import TextInput from '@/components/ui/TextInput';
import Select from '@/components/ui/Select';
import Modal from '@/components/ui/Modal';

interface ExtractedMaterials {
  project_description: string;
  materials: Array<{
    name: string;
    quantity: string;
    category: string;
    estimated_price: string;
    required: boolean;
  }>;
  owned_items?: Array<{
    name: string;
    quantity: string;
    category: string;
    ownedAs: string;
  }>;
  total_estimate?: number;
}

interface SaveMaterialsDialogProps {
  showSaveDialog: boolean;
  showCreateProjectDialog: boolean;
  showAuthPrompt: boolean;
  extractedMaterials: ExtractedMaterials | null;
  projects: Array<{ id: string; name: string }>;
  guestProjects: GuestProject[];
  isGuestMode: boolean;
  newProjectName: string;
  onNewProjectNameChange: (name: string) => void;
  onSaveToProject: (projectId: string, isGuest: boolean) => void;
  onCreateNewProjectAndSave: () => void;
  onConfirmCreateProject: () => void;
  onCloseSaveDialog: () => void;
  onCloseCreateDialog: () => void;
  onCloseAuthPrompt: () => void;
  onRequestAuth?: () => void;
}

export default function SaveMaterialsDialog({
  showSaveDialog,
  showCreateProjectDialog,
  showAuthPrompt,
  extractedMaterials,
  projects,
  guestProjects,
  isGuestMode,
  newProjectName,
  onNewProjectNameChange,
  onSaveToProject,
  onCreateNewProjectAndSave,
  onConfirmCreateProject,
  onCloseSaveDialog,
  onCloseCreateDialog,
  onCloseAuthPrompt,
  onRequestAuth,
}: SaveMaterialsDialogProps) {
  return (
    <>
      {/* Save to Project Dialog */}
      <Modal
        isOpen={showSaveDialog && !!extractedMaterials && !showCreateProjectDialog}
        onClose={onCloseSaveDialog}
        title="Save Materials to Project"
      >
        {extractedMaterials && (
          <div>
            <p className="text-warm-brown mb-2">
              I found {extractedMaterials.materials.length} items to purchase for &quot;{extractedMaterials.project_description}&quot;.
            </p>
            {extractedMaterials.owned_items && extractedMaterials.owned_items.length > 0 && (
              <p className="text-forest-green text-sm mb-4">
                {extractedMaterials.owned_items.length} items you already own were excluded from the list.
              </p>
            )}
            {extractedMaterials.total_estimate && (
              <p className="text-earth-brown text-sm mb-4">
                Estimated total: ${extractedMaterials.total_estimate.toFixed(2)}
              </p>
            )}

            {/* Show authenticated user's projects */}
            {!isGuestMode && projects.length > 0 && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-warm-brown mb-2">
                  Select existing project:
                </label>
                <Select
                  onChange={(e) => e.target.value && onSaveToProject(e.target.value, false)}
                  defaultValue=""
                  fullWidth
                >
                  <option value="">Choose a project...</option>
                  {projects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.name}
                    </option>
                  ))}
                </Select>
                <div className="text-center text-earth-brown-light text-sm my-3">or</div>
              </div>
            )}

            {/* Show guest projects */}
            {isGuestMode && guestProjects.length > 0 && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-warm-brown mb-2">
                  Select existing project:
                </label>
                <Select
                  onChange={(e) => e.target.value && onSaveToProject(e.target.value, true)}
                  defaultValue=""
                  fullWidth
                >
                  <option value="">Choose a project...</option>
                  {guestProjects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.name}
                    </option>
                  ))}
                </Select>
                <div className="text-center text-earth-brown-light text-sm my-3">or</div>
              </div>
            )}

            <div className="flex gap-2">
              <Button variant="tertiary" fullWidth onClick={onCreateNewProjectAndSave}>
                Create New Project
              </Button>
              <Button variant="ghost" fullWidth onClick={onCloseSaveDialog}>
                Skip for Now
              </Button>
            </div>

            {/* Guest mode notice */}
            {isGuestMode && (
              <p className="text-xs text-earth-brown mt-4 text-center">
                Projects are saved locally. Sign in to sync across devices.
              </p>
            )}
          </div>
        )}
      </Modal>

      {/* Create New Project Dialog */}
      <Modal
        isOpen={showCreateProjectDialog}
        onClose={onCloseCreateDialog}
        title={extractedMaterials ? 'Create New Project' : 'Save to New Project'}
      >
        <div>
          <p className="text-warm-brown mb-4">
            {extractedMaterials
              ? 'Enter a name for your project:'
              : 'Save this conversation to a new project. You can add materials later.'}
          </p>

          <TextInput
            type="text"
            value={newProjectName}
            onChange={(e) => onNewProjectNameChange(e.target.value)}
            placeholder={extractedMaterials?.project_description || 'My DIY Project'}
            fullWidth
            className="mb-4"
            onKeyPress={(e) => e.key === 'Enter' && onConfirmCreateProject()}
            autoFocus
          />

          <div className="flex gap-2">
            <Button variant="primary" fullWidth onClick={onConfirmCreateProject} disabled={!newProjectName.trim()}>
              {extractedMaterials ? 'Create & Save' : 'Create Project'}
            </Button>
            <Button variant="ghost" fullWidth onClick={onCloseCreateDialog}>
              Cancel
            </Button>
          </div>
        </div>
      </Modal>

      {/* Auth Prompt Dialog */}
      <Modal isOpen={showAuthPrompt} onClose={onCloseAuthPrompt} title="Sign In Required">
        <div>
          <p className="text-warm-brown mb-6">
            You need to be signed in to save materials and create projects.
            Create a free account to get started!
          </p>

          <div className="flex flex-col gap-3">
            <Button
              variant="tertiary"
              fullWidth
              onClick={() => {
                onCloseAuthPrompt();
                if (onRequestAuth) {
                  onRequestAuth();
                }
              }}
            >
              Create Account / Sign In
            </Button>
            <Button variant="ghost" fullWidth onClick={onCloseAuthPrompt}>
              Cancel
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
