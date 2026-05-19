import axios from 'axios';

describe('GET /api', () => {
  it('should return a message', async () => {
    if (process.env.API_SERVER_UP !== 'true') {
      console.warn(
        '\n[INFO] Skipping E2E API tests because API server is not running on port 3000.\n',
      );
      return;
    }
    const res = await axios.get(`/api`);

    expect(res.status).toBe(200);
    expect(res.data).toEqual({ message: 'Hello API' });
  });
});
