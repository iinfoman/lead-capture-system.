// Static server with SPA fallback, mirroring the netlify.toml redirect so the
// test exercises deep routes the way production serves them.
import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import { join, extname } from 'node:path'

const DIST = process.argv[2]
const PORT = Number(process.argv[3] ?? 4173)
const TYPES = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.svg': 'image/svg+xml',
  '.json': 'application/json',
  '.woff2': 'font/woff2',
}

createServer(async (req, res) => {
  const url = req.url.split('?')[0]
  let file = join(DIST, url === '/' ? 'index.html' : url)
  let body
  try {
    body = await readFile(file)
  } catch {
    file = join(DIST, 'index.html')
    body = await readFile(file)
  }
  res.writeHead(200, { 'Content-Type': TYPES[extname(file)] ?? 'application/octet-stream' })
  res.end(body)
}).listen(PORT, '127.0.0.1', () => console.log(`static server on ${PORT}`))
