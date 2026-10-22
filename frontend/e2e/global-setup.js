import { execFileSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

export default async function globalSetup() {
  const backend = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../backend')
  execFileSync(process.execPath, ['scripts/seedE2E.js'], {
    cwd: backend,
    env: { ...process.env, MONGODB_URI: process.env.E2E_MONGODB_URI },
    stdio: 'inherit',
  })
}