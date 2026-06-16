import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const nodeBin = process.execPath
const extraArgs = process.argv.slice(2)

function hasMongoBinary() {
  const result = spawnSync('where', ['mongod'], { stdio: 'ignore', shell: true })
  return result.status === 0
}

const testFiles = [path.join(currentDir, 'aiUseCaseCriteria.test.js')]
if (hasMongoBinary()) {
  testFiles.push(path.join(currentDir, 'inventory.test.js'))
} else {
  console.log('[test-runner] mongod khong co san, bo qua inventory integration test va chay bo test AI thuan.')
}

const result = spawnSync(process.execPath, ['--test', ...extraArgs, ...testFiles], {
  stdio: 'inherit',
  shell: false,
})

process.exit(result.status === null ? 1 : result.status)
