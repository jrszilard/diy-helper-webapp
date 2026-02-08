import { GuestProject } from '@/lib/guestStorage';

export interface Project {
  id: string;
  name: string;
  description?: string;
  category?: string;
  status?: string;
  created_at: string;
  isGuest?: boolean;
  materials?: unknown[];
}

export interface Material {
  name: string;
  quantity: string;
  category: string;
  estimated_price: string;
  required: boolean;
}

export interface ExtractedMaterials {
  project_description: string;
  materials: Material[];
  owned_items?: Array<{
    name: string;
    quantity: string;
    category: string;
    ownedAs: string;
  }>;
  total_estimate?: number;
}

export interface Video {
  title: string;
  description: string;
  url: string;
  thumbnail: string | null;
  duration: string | null;
  channel: string;
  views: string | null;
  published: string | null;
}

export type { GuestProject };
