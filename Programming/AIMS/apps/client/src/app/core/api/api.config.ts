const LOCAL_API_BASE_URL = 'http://localhost:3000/api';
const RENDER_API_BASE_URL = 'https://isd-20252-23.onrender.com/api';

export const AIMS_API_BASE_URL =
  typeof window !== 'undefined' &&
  ['localhost', '127.0.0.1'].includes(window.location.hostname)
    ? LOCAL_API_BASE_URL
    : RENDER_API_BASE_URL;
