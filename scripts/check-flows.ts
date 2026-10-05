import { resolve } from 'node:path'
import { checkFlowReferences } from '../tests/flows/artifacts.ts'

await checkFlowReferences(resolve('ref/flows'))
console.log('Flow indexes, manifests and screenshot links are consistent.')
