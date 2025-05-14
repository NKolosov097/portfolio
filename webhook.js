'use strict'

const http = require('http')
const crypto = require('crypto')
const { exec } = require('child_process')

const SECRET = 'GITHUB_WEBHOOK_SECRET_KEY_BY_NKOLOSOV'
const PORT = 3001
const APP_DIR = '/root/portfolio' // Исправлено: ~ не работает в Node.js

const server = http.createServer((req, res) => {
  if (req.method === 'POST' && req.url === '/webhook') {
    let body = ''
    req.on('data', (chunk) => (body += chunk))
    req.on('end', () => {
      try {
        const sig = req.headers['x-hub-signature-256'] || ''
        const hmac = crypto.createHmac('sha256', SECRET)
        const digest = hmac.update(body).digest('hex')
        const calculatedSig = `sha256=${digest}`

        if (sig !== calculatedSig) {
          console.error('⚠️ Invalid signature')
          return res.writeHead(403).end('Forbidden')
        }

        const payload = JSON.parse(body)
        if (payload.ref === 'refs/heads/main') {
          console.log('🔔 Received push to main branch, rebuilding...')

          // Добавляем подробное логирование
          const buildProcess = exec(
            `cd ${APP_DIR} && docker-compose down && docker-compose up --build -d`,
            (err, stdout, stderr) => {
              if (err) {
                console.error('❌ Rebuild failed:', err, stderr)
                return res.writeHead(500).end('Rebuild failed')
              }
              console.log('✅ Rebuild successful:', stdout)
              res.writeHead(200).end('Rebuild OK')
            },
          )

          // Логирование в реальном времени
          buildProcess.stdout.on('data', (data) => console.log(data.toString()))
          buildProcess.stderr.on('data', (data) => console.error(data.toString()))
        } else {
          res.writeHead(200).end('Ignoring non-main branch push')
        }
      } catch (e) {
        console.error('⚠️ Error:', e)
        res.writeHead(500).end('Internal error')
      }
    })
  } else {
    res.writeHead(404).end('Not found')
  }
})

server.listen(PORT, () => console.log(`Webhook listener running on port ${PORT}`))
