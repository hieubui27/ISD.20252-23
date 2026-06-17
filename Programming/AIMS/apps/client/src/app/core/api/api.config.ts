const LOCAL_API_BASE_URL = 'http://localhost:3000/api';
const RENDER_API_BASE_URL = 'https://api.aims.io.vn/api';

export const AIMS_API_BASE_URL =
  window.location.hostname === 'localhost' ||
  window.location.hostname === '127.0.0.1'
    ? LOCAL_API_BASE_URL
    : RENDER_API_BASE_URL;
