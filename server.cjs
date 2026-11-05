const http = require('node:http');
const fs = require('node:fs/promises');
const path = require('node:path');
const { spawn } = require('node:child_process');

const root = __dirname;
const port = 4173;
const address = `http://localhost:${port}`;
const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2'
};

const server = http.createServer(async (request, response) => {
  if (!['GET', 'HEAD'].includes(request.method)) {
    response.writeHead(405, { Allow: 'GET, HEAD' });
    response.end();
    return;
  }
  try {
    const pathname = decodeURIComponent(new URL(request.url, address).pathname);
    const relative = pathname === '/' ? 'index.html' : pathname.slice(1);
    const isPublic = ['index.html', 'styles.css', 'script.js'].includes(relative)
      || (relative.startsWith('assets/') && Boolean(mimeTypes[path.extname(relative).toLowerCase()]));
    if (!isPublic || relative.includes('\\')) {
      response.writeHead(404);
      response.end('Not found');
      return;
    }
    const file = await fs.realpath(path.resolve(root, relative));
    if (!file.startsWith(root + path.sep)) {
      response.writeHead(403);
      response.end('Forbidden');
      return;
    }
    const body = await fs.readFile(file);
    response.writeHead(200, {
      'Content-Type': mimeTypes[path.extname(file).toLowerCase()],
      'Content-Length': body.length,
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'X-Content-Type-Options': 'nosniff'
    });
    response.end(request.method === 'HEAD' ? undefined : body);
  } catch (error) {
    response.writeHead(error instanceof URIError ? 400 : 404);
    response.end('Not found');
  }
});

server.on('error', error => {
  console.error(error.code === 'EADDRINUSE'
    ? `Port ${port} is in use. If the site is already running, open ${address}. Otherwise close the app using this port and try again.`
    : error.message);
  process.exitCode = 1;
});

// Bind only to this computer; the server is not exposed to the local network.
server.listen(port, '127.0.0.1', () => {
  console.log(`Site: ${address}`);
  console.log('Keep this window open. Press Ctrl+C to stop.');
  if (process.argv.includes('--open') && process.platform === 'win32') {
    const browser = spawn('rundll32.exe', ['url.dll,FileProtocolHandler', address], {
      detached: true,
      stdio: 'ignore',
      windowsHide: true
    });
    browser.on('error', () => console.log(`Open ${address} in your browser.`));
    browser.unref();
  }
});
