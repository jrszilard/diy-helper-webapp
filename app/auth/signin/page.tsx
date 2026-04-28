import { redirect } from 'next/navigation';

/**
 * Sign-in is modal-only on /. This route exists because external links
 * (marketing, copy-pasted URLs) commonly hit /auth/signin. Redirect to
 * the homepage with ?signIn=true so AuthButton auto-opens the modal.
 */
export default function SignInRedirect() {
  redirect('/?signIn=true');
}
