import sharp from 'sharp'
import { contentManifest, topicContentTimestamp } from './topic-content'
import type { TopicContentAuthority, TopicContentStorage } from '../../src/main/storage/topic-content'
import { contentDigest } from '../../src/main/storage/topic-content-files'

/** Clearly synthetic teaching diagrams, drawn deterministically at native 900×540. */
export async function educationalRasters(): Promise<[Buffer, Buffer]> {
  const diagram = (second: boolean) => `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="540"><rect width="900" height="540" fill="#f6f7fa"/><g font-family="Arial" fill="#263346"><text x="60" y="70" font-size="30">${second ? 'Evidence changes the balance' : 'Different starting beliefs'}</text><text x="60" y="110" font-size="18">Synthetic educational diagram · probabilities are illustrative</text><line x1="100" y1="400" x2="800" y2="400" stroke="#7d8795" stroke-width="3"/><line x1="100" y1="160" x2="100" y2="400" stroke="#7d8795" stroke-width="3"/><rect x="180" y="${second ? 210 : 290}" width="180" height="${second ? 190 : 110}" fill="#8160b3"/><rect x="500" y="${second ? 290 : 210}" width="180" height="${second ? 110 : 190}" fill="#45848d"/><text x="210" y="445" font-size="24">Explanation A</text><text x="530" y="445" font-size="24">Explanation B</text><text x="180" y="490" font-size="20">${second ? 'After a clue favoring A: A becomes more plausible.' : 'Before a clue: B is initially more plausible.'}</text></g></svg>`
  return [await sharp(Buffer.from(diagram(false))).png().toBuffer(), await sharp(Buffer.from(diagram(true))).png().toBuffer()]
}
export async function readerManifest(storage: TopicContentStorage, authority: TopicContentAuthority, title = 'Starting beliefs and new evidence') {
  const manifest = await contentManifest(storage, authority)
  manifest.plan.title = title
  manifest.plan.sections = Array.from({ length: 7 }, (_, index) => ({ id: `reading-${index}`, title: ['Starting with uncertainty', 'Compare explanations', 'Represent a prior', 'Observe a clue', 'Update carefully', 'Check assumptions', 'Apply the idea'][index]!, purpose: 'Explain and apply saved objectives', objectiveIndices: manifest.plan.objectives.map((_, objective) => objective) }))
  const rasters = await educationalRasters()
  manifest.plan.images = rasters.map((_, index) => ({ id: `diagram-${index}`, sectionId: `reading-${index ? 4 : 0}`, placement: 'after', purpose: index ? 'Explain a shift after evidence' : 'Compare priors', prompt: 'Draw the labelled educational comparison.', caption: index ? 'Evidence can change the relative plausibility of explanations.' : 'Two explanations can begin with different plausibility.', alt: index ? 'The illustrative bar for explanation A increases after a clue.' : 'The illustrative bar for explanation B is initially taller.', factualConstraints: ['Illustrative values are not empirical measurements.'], skillVersion: 'educational-images-v1', settings: { n: 1, aspectRatio: '3:2' } }))
  manifest.images = []
  for (const [index, pixels] of rasters.entries()) {
    const imageId = `diagram-${index}`, asset = { imageId, versionId: `version-${index}`, path: `${manifest.outputDirectory}/images/${imageId}-version-${index}.png`, mime: 'image/png' as const, width: 900, height: 540, bytes: pixels.length, digest: contentDigest(pixels), createdAt: topicContentTimestamp, modelId: 'openai/gpt-image-2' as const, returnedModelId: null, callId: `call-${index}`, previousVersionId: null }
    await storage.stageAsset(authority, manifest.plan, manifest.revisionId, asset, pixels)
    manifest.images.push({ imageId, status: 'complete', callId: asset.callId, asset })
  }
  manifest.status = 'illustrated'
  manifest.document.sections = manifest.plan.sections.map(section => ({ id: section.id, markdown: `### ${section.title}\n\nA **prior** makes starting assumptions explicit. Evidence should be compared under competing explanations.\n\n- State the assumption.\n- Compare the clue.\n\n| Explanation | Initial belief |\n| --- | --- |\n| A | Less plausible |\n| B | More plausible |\n\n\`P(A | clue)\` keeps the notation offline and readable.\n\n<script>window.readerExecuted = true</script>\n![remote](https://example.invalid/image.png)\n\n` + 'Use the same clue under both explanations, then examine what changes. '.repeat(18), examples: ['A weather forecast begins with previous observations. A fresh measurement can change the prediction.'], misconceptions: ['A prior is not certainty. These illustrative diagrams do not measure real outcomes.'] }))
  manifest.baseline = await storage.captureBaseline(authority)
  return { manifest, rasters }
}
