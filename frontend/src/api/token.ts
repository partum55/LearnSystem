const TOKEN_KEY = 'access_token';

// Safe localStorage access
const safeLocalStorage = typeof window !== 'undefined' && typeof window.localStorage !== 'undefined' ? window.localStorage : null;

// Initialize from localStorage if available
let _accessToken: string | null = safeLocalStorage ? safeLocalStorage.getItem(TOKEN_KEY) : null;

export const getAccessToken = () => _accessToken;

export const setAccessToken = (token: string | null) => {
  _accessToken = token;
  if (safeLocalStorage) {
    if (token) {
      safeLocalStorage.setItem(TOKEN_KEY, token);
    } else {
      safeLocalStorage.removeItem(TOKEN_KEY);
    }
  }
};

// No default export to avoid unused export warnings; use named imports: { getAccessToken, setAccessToken }
