import { defaultDevPort, stopDevPort } from './dev-processes.ts'

try {
  const args = process.argv.slice(2)
  let port = defaultDevPort
  let dryRun = false
  let help = false
  for (let index = 0; index < args.length; index++) {
    const arg = args[index]
    if (arg === '--dry-run') dryRun = true
    else if (arg === '--help') help = true
    else if (arg === '--port' && /^\d+$/.test(args[index + 1] ?? '')) port = Number(args[++index])
    else throw new Error(`Unknown or incomplete option: ${arg}. Use --help for usage.`)
  }
  if (help) console.log('Usage: npm run kill-dev -- [--dry-run] [--port 5173]\nStops the TCP listener on the selected port and its child processes, including another program using that port.')
  else await stopDevPort({ port, dryRun })
} catch (error) {
  console.error(`kill-dev: ${error instanceof Error ? error.message : String(error)}`)
  process.exitCode = 1
}
