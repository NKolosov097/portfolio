import { existsSync } from 'node:fs'
import { resolve } from 'node:path'

for (const file of ['.env.local', '.env']) {
  const path = resolve(file)
  if (existsSync(path)) process.loadEnvFile(path)
}
