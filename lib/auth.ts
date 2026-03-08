import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { NextRequest } from 'next/server';
import { logger } from '@/lib/logger';

export interface AuthResult {
  userId: string | null;
  isAuthenticated: boolean;
  supabaseClient: SupabaseClient;
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

function createAnonClient(): SupabaseClient {
  return createClient(supabaseUrl, supabaseAnonKey);
}

export async function getAuthFromRequest(req: NextRequest): Promise<AuthResult> {
  const authHeader = req.headers.get('authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return {
      userId: null,
      isAuthenticated: false,
      supabaseClient: createAnonClient(),
    };
  }

  const token = authHeader.slice(7);

  if (!token) {
    return {
      userId: null,
      isAuthenticated: false,
      supabaseClient: createAnonClient(),
    };
  }

  try {
    // Create a client scoped to the user's JWT for RLS enforcement
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    });

    const { data: { user }, error } = await userClient.auth.getUser(token);

    if (error || !user) {
      logger.warn('Invalid auth token', { error: error?.message });
      return {
        userId: null,
        isAuthenticated: false,
        supabaseClient: createAnonClient(),
      };
    }

    return {
      userId: user.id,
      isAuthenticated: true,
      supabaseClient: userClient,
    };
  } catch (error) {
    logger.warn('Auth verification error', { error: error instanceof Error ? error.message : 'unknown' });
    return {
      userId: null,
      isAuthenticated: false,
      supabaseClient: createAnonClient(),
    };
  }
}
