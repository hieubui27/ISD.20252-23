const RENDER_API_BASE_URL = 'https://isd-20252-23.onrender.com/api';

export const AIMS_API_BASE_URL =
  window.location.hostname === 'localhost' ? '/api' : RENDER_API_BASE_URL;
