const ACCESS_TOKEN_KEY = 'access_token';
const REFRESH_TOKEN_KEY = 'refresh_token';

// Safe localStorage access
const safeLocalStorage = typeof window !== 'undefined' && typeof window.localStorage !== 'undefined' ? window.localStorage : null;

// Initialize from localStorage if available
let _accessToken: string | null = safeLocalStorage ? safeLocalStorage.getItem(ACCESS_TOKEN_KEY) : null;
let _refreshToken: string | null = safeLocalStorage ? safeLocalStorage.getItem(REFRESH_TOKEN_KEY) : null;

export const getAccessToken = () => _accessToken;
export const getRefreshToken = () => _refreshToken;

export const setAccessToken = (token: string | null) => {
  _accessToken = token;
  if (safeLocalStorage) {
    if (token) {
      safeLocalStorage.setItem(ACCESS_TOKEN_KEY, token);
    } else {
      safeLocalStorage.removeItem(ACCESS_TOKEN_KEY);
    }
  }
};

export const setRefreshToken = (token: string | null) => {
  _refreshToken = token;
  if (safeLocalStorage) {
    if (token) {
      safeLocalStorage.setItem(REFRESH_TOKEN_KEY, token);
    } else {
      safeLocalStorage.removeItem(REFRESH_TOKEN_KEY);
    }
  }
};

export const clearStoredTokens = () => {
  setAccessToken(null);
  setRefreshToken(null);
};

// No default export to avoid unused export warnings; use named imports.
