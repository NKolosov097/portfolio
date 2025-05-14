import { createServer } from 'http'
import { createHmac } from 'crypto'
import { exec } from 'child_process'

const SECRET = 'GITHUB_WEBHOOK_SECRET_KEY_BY_NKOLOSOV' // Должен совпадать с GitHub Webhook Secret
const PORT = 3001 // Порт для вебхука (не должен конфликтовать с Next.js)
const APP_DIR = '~/portfolio' // Путь к проекту

const server = createServer((req, res) => {
  if (req.method === 'POST' && req.url === '/webhook') {
    let body = ''
    req.on('data', (chunk) => (body += chunk))
    req.on('end', () => {
      const sig = req.headers['x-hub-signature-256'] || ''
      const hmac = createHmac('sha256', SECRET)
      const digest = hmac.update(body).digest('hex')
      const calculatedSig = `sha256=${digest}`

      if (sig !== calculatedSig) {
        console.error('⚠️ Invalid signature')
        res.writeHead(403, { 'Content-Type': 'text/plain' })
        return res.end('Forbidden')
      }

      const payload = JSON.parse(body)
      if (payload.ref === 'refs/heads/main') {
        console.log('🔔 Received push to main branch, rebuilding...')

        exec(
          `cd ${APP_DIR} && docker-compose down && docker-compose up --build -d`,
          (err, stdout) => {
            if (err) {
              console.error('❌ Rebuild failed:', err)
              res.writeHead(500, { 'Content-Type': 'text/plain' })
              return res.end('Rebuild failed')
            }
            console.log('✅ Rebuild successful:', stdout)
            res.writeHead(200, { 'Content-Type': 'text/plain' })
            res.end('Rebuild OK')
          },
        )
      } else {
        res.writeHead(200, { 'Content-Type': 'text/plain' })
        res.end('Ignoring non-main branch push')
      }
    })
  } else {
    res.writeHead(404, { 'Content-Type': 'text/plain' })
    res.end('Not found')
  }
})

server.listen(PORT, () => console.log(`Webhook listener running on port ${PORT}`))
