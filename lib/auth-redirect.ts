import type { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime';

export function redirectToSignIn(router: AppRouterInstance, returnTo: string) {
  sessionStorage.setItem('authReturnTo', returnTo);
  router.push('/?signIn=true');
}
