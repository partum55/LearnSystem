const TOKEN_KEY = 'access_token';

// Initialize from localStorage
let _accessToken: string | null = localStorage.getItem(TOKEN_KEY);

export const getAccessToken = () => _accessToken;

export const setAccessToken = (token: string | null) => {
  _accessToken = token;
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_KEY);
  }
};

export default { getAccessToken, setAccessToken };
