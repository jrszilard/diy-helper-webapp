// Guest project management using localStorage
// Allows users to save projects without authentication

import { SupabaseClient } from '@supabase/supabase-js';

const GUEST_PROJECTS_KEY = 'diy-helper-guest-projects';

export interface GuestMaterial {
  id: string;
  product_name: string;
  quantity: number;
  category: string;
  required: boolean;
  price: number | null;
  purchased: boolean;
  notes?: string;
}

export interface GuestProject {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
  materials: GuestMaterial[];
}

// Generate a UUID for guest items
const generateId = (): string => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback for older browsers
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

export const guestStorage = {
  // Get all guest projects
  getProjects(): GuestProject[] {
    if (typeof window === 'undefined') return [];
    try {
      const stored = localStorage.getItem(GUEST_PROJECTS_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
      console.error('Error loading guest projects:', error);
    }
    return [];
  },

  // Get a single project by ID
  getProject(id: string): GuestProject | null {
    const projects = this.getProjects();
    return projects.find(p => p.id === id) || null;
  },

  // Save a new project
  saveProject(project: Omit<GuestProject, 'id' | 'createdAt' | 'updatedAt'>): GuestProject {
    const projects = this.getProjects();
    const now = new Date().toISOString();

    const newProject: GuestProject = {
      ...project,
      id: generateId(),
      createdAt: now,
      updatedAt: now,
    };

    projects.push(newProject);
    localStorage.setItem(GUEST_PROJECTS_KEY, JSON.stringify(projects));

    return newProject;
  },

  // Update an existing project
  updateProject(id: string, updates: Partial<Omit<GuestProject, 'id' | 'createdAt'>>): GuestProject | null {
    const projects = this.getProjects();
    const index = projects.findIndex(p => p.id === id);

    if (index < 0) return null;

    projects[index] = {
      ...projects[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    localStorage.setItem(GUEST_PROJECTS_KEY, JSON.stringify(projects));
    return projects[index];
  },

  // Delete a project
  deleteProject(id: string): boolean {
    const projects = this.getProjects();
    const filtered = projects.filter(p => p.id !== id);

    if (filtered.length === projects.length) return false;

    localStorage.setItem(GUEST_PROJECTS_KEY, JSON.stringify(filtered));
    return true;
  },

  // Add materials to a project
  addMaterials(projectId: string, materials: Omit<GuestMaterial, 'id' | 'purchased'>[]): GuestMaterial[] {
    const project = this.getProject(projectId);
    if (!project) return [];

    const newMaterials: GuestMaterial[] = materials.map(mat => ({
      ...mat,
      id: generateId(),
      purchased: false,
    }));

    this.updateProject(projectId, {
      materials: [...project.materials, ...newMaterials],
    });

    return newMaterials;
  },

  // Update a material in a project
  updateMaterial(projectId: string, materialId: string, updates: Partial<GuestMaterial>): boolean {
    const project = this.getProject(projectId);
    if (!project) return false;

    const materialIndex = project.materials.findIndex(m => m.id === materialId);
    if (materialIndex < 0) return false;

    project.materials[materialIndex] = {
      ...project.materials[materialIndex],
      ...updates,
    };

    this.updateProject(projectId, { materials: project.materials });
    return true;
  },

  // Delete a material from a project
  deleteMaterial(projectId: string, materialId: string): boolean {
    const project = this.getProject(projectId);
    if (!project) return false;

    const filtered = project.materials.filter(m => m.id !== materialId);
    if (filtered.length === project.materials.length) return false;

    this.updateProject(projectId, { materials: filtered });
    return true;
  },

  // Toggle purchased status for a material
  togglePurchased(projectId: string, materialId: string): boolean {
    const project = this.getProject(projectId);
    if (!project) return false;

    const material = project.materials.find(m => m.id === materialId);
    if (!material) return false;

    return this.updateMaterial(projectId, materialId, { purchased: !material.purchased });
  },

  // Migrate guest projects to authenticated user account
  async migrateToUser(userId: string, supabase: SupabaseClient): Promise<{ migrated: number; failed: number; partialMigration: boolean; projectNames: string[] }> {
    const guestProjects = this.getProjects();
    let migrated = 0;
    let failed = 0;
    const projectNames: string[] = [];

    for (const project of guestProjects) {
      try {
        // Create project in Supabase
        const { data: newProject, error: projectError } = await supabase
          .from('projects')
          .insert({
            name: project.name,
            description: project.description,
            user_id: userId,
          })
          .select()
          .single();

        if (projectError || !newProject) {
          console.error('Failed to migrate project:', project.name, projectError);
          failed++;
          continue;
        }

        // Migrate materials if any
        if (project.materials.length > 0) {
          const materialsToInsert = project.materials.map(m => ({
            project_id: newProject.id,
            user_id: userId,
            product_name: m.product_name,
            quantity: m.quantity,
            category: m.category,
            required: m.required,
            price: m.price,
            purchased: m.purchased,
            notes: m.notes,
          }));

          const { error: materialsError } = await supabase
            .from('shopping_list_items')
            .insert(materialsToInsert);

          if (materialsError) {
            console.error('Failed to migrate materials for project:', project.name, materialsError);
            // Rollback: delete the project if materials failed
            await supabase.from('projects').delete().eq('id', newProject.id);
            failed++;
            continue;
          }
        }

        migrated++;
        projectNames.push(project.name);
      } catch (error) {
        console.error('Error migrating project:', project.name, error);
        failed++;
      }
    }

    // Only clear guest storage when ALL projects migrated successfully
    if (migrated > 0 && failed === 0) {
      localStorage.removeItem(GUEST_PROJECTS_KEY);
    }

    return { migrated, failed, partialMigration: migrated > 0 && failed > 0, projectNames };
  },

  // Check if there are any guest projects
  hasProjects(): boolean {
    return this.getProjects().length > 0;
  },

  // Get count of guest projects
  getProjectCount(): number {
    return this.getProjects().length;
  },

  // Clear all guest data
  clearAll(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(GUEST_PROJECTS_KEY);
    }
  },
};
