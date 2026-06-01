import { useState } from 'react';
import { authService } from '../../../services/auth.service';

export function useAuthForm() {
  const [isCheckingUsername, setIsCheckingUsername] = useState(false);
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);

  const checkUsername = async (username: string) => {
    if (username.length < 3) {
      setUsernameAvailable(null);
      return;
    }
    setIsCheckingUsername(true);
    try {
      const available = await authService.checkUsernameAvailability(username);
      setUsernameAvailable(available);
    } finally {
      setIsCheckingUsername(false);
    }
  };

  return { checkUsername, isCheckingUsername, usernameAvailable };
}
