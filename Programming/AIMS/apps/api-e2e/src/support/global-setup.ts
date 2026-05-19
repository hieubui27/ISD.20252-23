import * as net from 'net';

/* eslint-disable */
var __TEARDOWN_MESSAGE__: string;

function checkPortFast(port: number, host: string): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(200); // 200ms max timeout
    socket.on('connect', () => {
      socket.destroy();
      resolve(true);
    });
    socket.on('timeout', () => {
      socket.destroy();
      resolve(false);
    });
    socket.on('error', () => {
      socket.destroy();
      resolve(false);
    });
    socket.connect(port, host);
  });
}

module.exports = async function () {
  console.log('\nSetting up...\n');

  const host = process.env.HOST ?? 'localhost';
  const port = process.env.PORT ? Number(process.env.PORT) : 3000;

  const isUp = await checkPortFast(port, host);
  if (isUp) {
    process.env.API_SERVER_UP = 'true';
  } else {
    process.env.API_SERVER_UP = 'false';
    console.warn(
      `\n[WARNING] API server is not running on port ${port}. Real E2E tests (like api.spec.ts) will fail, but unit tests will run normally.\n`,
    );
  }

  // Hint: Use `globalThis` to pass variables to global teardown.
  globalThis.__TEARDOWN_MESSAGE__ = '\nTearing down...\n';
};
