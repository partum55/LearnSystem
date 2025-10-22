let _accessToken: string | null = null;

export const getAccessToken = () => _accessToken;
export const setAccessToken = (token: string | null) => {
  _accessToken = token;
};

export default { getAccessToken, setAccessToken };
