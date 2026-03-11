
'use server';

import { auth } from '@/lib/firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';

// This function is no longer used by the login form but is kept
// for potential other server-side auth needs.
export async function login(formData: FormData) {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    // The userCredential.user object is a complex class.
    // We must return a plain, JSON-serializable object to avoid
    // an infinite loop in the React Server Components decoder.
    const plainUser = {
      uid: userCredential.user.uid,
      email: userCredential.user.email,
      displayName: userCredential.user.displayName,
      photoURL: userCredential.user.photoURL,
      emailVerified: userCredential.user.emailVerified,
    };
    return { user: plainUser };
  } catch (error: any) {
    // Return a serializable error object
    return { error: { code: error.code, message: error.message } };
  }
}
