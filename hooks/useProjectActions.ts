'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { guestStorage, GuestProject } from '@/lib/guestStorage';
import { Project } from '@/types';

interface UseProjectActionsOptions {
  userId?: string;
}

export function useProjectActions({ userId }: UseProjectActionsOptions = {}) {
  const [projects, setProjects] = useState<Array<{ id: string; name: string }>>([]);
  const [guestProjects, setGuestProjects] = useState<GuestProject[]>([]);
  const [isGuestMode, setIsGuestMode] = useState(false);

  useEffect(() => {
    if (userId) {
      loadProjects();
      setIsGuestMode(false);
    } else {
      setGuestProjects(guestStorage.getProjects());
      setIsGuestMode(true);
    }
  }, [userId]);

  const loadProjects = useCallback(async () => {
    try {
      let currentUserId = userId;
      if (!currentUserId) {
        const { data: { user } } = await supabase.auth.getUser();
        currentUserId = user?.id;
      }
      if (!currentUserId) return;

      const { data } = await supabase
        .from('projects')
        .select('*')
        .eq('user_id', currentUserId)
        .order('created_at', { ascending: false });

      if (data) setProjects(data);
    } catch (error) {
      console.error('Error loading projects:', error);
    }
  }, [userId]);

  const refreshGuestProjects = useCallback(() => {
    setGuestProjects(guestStorage.getProjects());
  }, []);

  const deleteProject = useCallback(async (id: string, isGuest: boolean = false) => {
    if (isGuest) {
      guestStorage.deleteProject(id);
      refreshGuestProjects();
    } else {
      await supabase.from('projects').delete().eq('id', id);
      await loadProjects();
    }
  }, [loadProjects, refreshGuestProjects]);

  const updateProject = useCallback(async (id: string, updates: { name?: string; description?: string; status?: string }, isGuest: boolean = false) => {
    if (isGuest) {
      guestStorage.updateProject(id, updates);
      refreshGuestProjects();
    } else {
      await supabase
        .from('projects')
        .update(updates)
        .eq('id', id);
      await loadProjects();
    }
  }, [loadProjects, refreshGuestProjects]);

  const createProject = useCallback(async (name: string, description: string): Promise<{ id: string; name: string } | null> => {
    if (isGuestMode) {
      const guestProject = guestStorage.saveProject({
        name,
        description,
        materials: [],
      });
      refreshGuestProjects();
      return { id: guestProject.id, name: guestProject.name };
    }

    let currentUserId = userId;
    if (!currentUserId) {
      const { data: { user } } = await supabase.auth.getUser();
      currentUserId = user?.id;
    }
    if (!currentUserId) return null;

    const { data: newProject, error } = await supabase
      .from('projects')
      .insert({ name: name.trim(), description, user_id: currentUserId })
      .select()
      .single();

    if (error || !newProject) {
      console.error('Failed to create project:', error?.message);
      return null;
    }

    await loadProjects();
    return { id: newProject.id, name: newProject.name };
  }, [isGuestMode, userId, loadProjects, refreshGuestProjects]);

  const saveMaterials = useCallback(async (
    projectId: string,
    materials: Array<{ name: string; quantity: string; category: string; estimated_price: string; required: boolean }>,
    isGuest: boolean = false
  ): Promise<number> => {
    if (isGuest || isGuestMode) {
      const newMaterials = materials.map(mat => ({
        product_name: mat.name,
        quantity: parseInt(mat.quantity) || 1,
        category: mat.category || 'general',
        required: mat.required !== false,
        price: mat.estimated_price ? parseFloat(mat.estimated_price) : null,
      }));
      const addedMaterials = guestStorage.addMaterials(projectId, newMaterials);
      refreshGuestProjects();
      return addedMaterials.length;
    }

    let currentUserId = userId;
    if (!currentUserId) {
      const { data: { user } } = await supabase.auth.getUser();
      currentUserId = user?.id;
    }
    if (!currentUserId) return 0;

    const itemsToInsert = materials.map((mat) => ({
      project_id: projectId,
      user_id: currentUserId,
      product_name: mat.name,
      quantity: parseInt(mat.quantity) || 1,
      category: mat.category || 'general',
      required: mat.required !== false,
      price: mat.estimated_price ? parseFloat(mat.estimated_price) : null
    }));

    const { data, error } = await supabase
      .from('shopping_list_items')
      .insert(itemsToInsert)
      .select();

    if (error) {
      console.error('Supabase error:', error);
      throw error;
    }

    return data?.length || 0;
  }, [isGuestMode, userId, refreshGuestProjects]);

  return {
    projects,
    guestProjects,
    isGuestMode,
    loadProjects,
    refreshGuestProjects,
    deleteProject,
    updateProject,
    createProject,
    saveMaterials,
  };
}
