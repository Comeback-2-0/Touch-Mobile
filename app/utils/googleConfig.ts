import { GoogleSignin } from '@react-native-google-signin/google-signin';

export function configureGoogleSignIn(): void {
  try {
    GoogleSignin.configure({
      webClientId: '160562514921-n7apc9k12tliqgni4ri10k5901qpvpmr.apps.googleusercontent.com',
      iosClientId: '160562514921-isdeqtar93be8vnu4eoqql8b2gtgicrk.apps.googleusercontent.com',
    });
  } catch (error) {
    console.warn('Failed to configure Google Sign-In:', error);
  }
}
