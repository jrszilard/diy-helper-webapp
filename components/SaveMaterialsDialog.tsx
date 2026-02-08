'use client';

import React, { useEffect } from 'react';

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
  projects: any[];
  guestProjects: any[];
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
  // Escape key handler for modals
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showAuthPrompt) {
          onCloseAuthPrompt();
        } else if (showCreateProjectDialog) {
          onCloseCreateDialog();
        } else if (showSaveDialog) {
          onCloseSaveDialog();
        }
      }
    };

    if (showSaveDialog || showCreateProjectDialog || showAuthPrompt) {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [showSaveDialog, showCreateProjectDialog, showAuthPrompt, onCloseSaveDialog, onCloseCreateDialog, onCloseAuthPrompt]);

  return (
    <>
      {/* Save to Project Dialog */}
      {showSaveDialog && extractedMaterials && !showCreateProjectDialog && (
        <div className="fixed inset-0 bg-[#3E2723] bg-opacity-50 flex items-center justify-center z-50" role="dialog" aria-modal="true" aria-label="Save materials to project">
          <div className="bg-[#FDFBF7] rounded-lg p-6 max-w-md w-full mx-4 border border-[#D4C8B8]">
            <h3 className="text-xl font-bold mb-4 text-[#3E2723]">Save Materials to Project</h3>
            <p className="text-[#5C4D42] mb-2">
              I found {extractedMaterials.materials.length} items to purchase for &quot;{extractedMaterials.project_description}&quot;.
            </p>
            {extractedMaterials.owned_items && extractedMaterials.owned_items.length > 0 && (
              <p className="text-[#4A7C59] text-sm mb-4">
                {extractedMaterials.owned_items.length} items you already own were excluded from the list.
              </p>
            )}
            {extractedMaterials.total_estimate && (
              <p className="text-[#7D6B5D] text-sm mb-4">
                Estimated total: ${extractedMaterials.total_estimate.toFixed(2)}
              </p>
            )}

            {/* Show authenticated user's projects */}
            {!isGuestMode && projects.length > 0 && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-[#5C4D42] mb-2">
                  Select existing project:
                </label>
                <select
                  className="w-full px-3 py-2 border border-[#D4C8B8] rounded-lg focus:ring-2 focus:ring-[#C67B5C] text-[#3E2723] bg-white"
                  onChange={(e) => e.target.value && onSaveToProject(e.target.value, false)}
                  defaultValue=""
                >
                  <option value="">Choose a project...</option>
                  {projects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.name}
                    </option>
                  ))}
                </select>

                <div className="text-center text-[#A89880] text-sm my-3">or</div>
              </div>
            )}

            {/* Show guest projects */}
            {isGuestMode && guestProjects.length > 0 && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-[#5C4D42] mb-2">
                  Select existing project:
                </label>
                <select
                  className="w-full px-3 py-2 border border-[#D4C8B8] rounded-lg focus:ring-2 focus:ring-[#C67B5C] text-[#3E2723] bg-white"
                  onChange={(e) => e.target.value && onSaveToProject(e.target.value, true)}
                  defaultValue=""
                >
                  <option value="">Choose a project...</option>
                  {guestProjects.map((project: any) => (
                    <option key={project.id} value={project.id}>
                      {project.name}
                    </option>
                  ))}
                </select>

                <div className="text-center text-[#A89880] text-sm my-3">or</div>
              </div>
            )}

            <div className="flex gap-2">
              <button
                onClick={onCreateNewProjectAndSave}
                className="flex-1 bg-[#5D7B93] text-white py-2 px-4 rounded-lg hover:bg-[#4A6275]"
              >
                Create New Project
              </button>
              <button
                onClick={onCloseSaveDialog}
                className="flex-1 bg-[#E8DFD0] text-[#5C4D42] py-2 px-4 rounded-lg hover:bg-[#D4C8B8]"
              >
                Skip for Now
              </button>
            </div>

            {/* Guest mode notice */}
            {isGuestMode && (
              <p className="text-xs text-[#7D6B5D] mt-4 text-center">
                Projects are saved locally. Sign in to sync across devices.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Create New Project Dialog */}
      {showCreateProjectDialog && (
        <div className="fixed inset-0 bg-[#3E2723] bg-opacity-50 flex items-center justify-center z-50" role="dialog" aria-modal="true" aria-label="Create new project">
          <div className="bg-[#FDFBF7] rounded-lg p-6 max-w-md w-full mx-4 border border-[#D4C8B8]">
            <h3 className="text-xl font-bold mb-4 text-[#3E2723]">
              {extractedMaterials ? 'Create New Project' : 'Save to New Project'}
            </h3>
            <p className="text-[#5C4D42] mb-4">
              {extractedMaterials
                ? 'Enter a name for your project:'
                : 'Save this conversation to a new project. You can add materials later.'}
            </p>

            <input
              type="text"
              value={newProjectName}
              onChange={(e) => onNewProjectNameChange(e.target.value)}
              placeholder={extractedMaterials?.project_description || 'My DIY Project'}
              className="w-full px-3 py-2 border border-[#D4C8B8] rounded-lg focus:ring-2 focus:ring-[#C67B5C] text-[#3E2723] placeholder-[#A89880] mb-4 bg-white"
              onKeyPress={(e) => e.key === 'Enter' && onConfirmCreateProject()}
              autoFocus
            />

            <div className="flex gap-2">
              <button
                onClick={onConfirmCreateProject}
                disabled={!newProjectName.trim()}
                className="flex-1 bg-[#C67B5C] text-white py-2 px-4 rounded-lg hover:bg-[#A65D3F] disabled:bg-[#D4C8B8] disabled:cursor-not-allowed"
              >
                {extractedMaterials ? 'Create & Save' : 'Create Project'}
              </button>
              <button
                onClick={onCloseCreateDialog}
                className="flex-1 bg-[#E8DFD0] text-[#5C4D42] py-2 px-4 rounded-lg hover:bg-[#D4C8B8]"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Auth Prompt Dialog */}
      {showAuthPrompt && (
        <div className="fixed inset-0 bg-[#3E2723] bg-opacity-50 flex items-center justify-center z-50" role="dialog" aria-modal="true" aria-label="Sign in required">
          <div className="bg-[#FDFBF7] rounded-lg p-6 max-w-md w-full mx-4 border border-[#D4C8B8]">
            <h3 className="text-xl font-bold mb-4 text-[#3E2723]">Sign In Required</h3>
            <p className="text-[#5C4D42] mb-6">
              You need to be signed in to save materials and create projects.
              Create a free account to get started!
            </p>

            <div className="flex flex-col gap-3">
              <button
                onClick={() => {
                  onCloseAuthPrompt();
                  if (onRequestAuth) {
                    onRequestAuth();
                  }
                }}
                className="bg-[#5D7B93] text-white py-3 px-4 rounded-lg hover:bg-[#4A6275] font-semibold"
              >
                Create Account / Sign In
              </button>
              <button
                onClick={onCloseAuthPrompt}
                className="bg-[#E8DFD0] text-[#5C4D42] py-2 px-4 rounded-lg hover:bg-[#D4C8B8]"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
