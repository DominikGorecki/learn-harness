import type { ReactNode } from 'react'

/** All model/source content stays React text. Links and image syntax are inert. */
function inline(text: string): ReactNode[] {
  const parts = text.split(/(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*|!?\[[^[\]]*\]\([^()]*\))/g)
  if (parts.length > 2048) return [text]
  return parts.map((part, index) => {
    if (part.startsWith('`') && part.endsWith('`')) return <code key={index}>{part.slice(1, -1)}</code>
    if (part.startsWith('**') && part.endsWith('**')) return <strong key={index}>{part.slice(2, -2)}</strong>
    if (part.startsWith('*') && part.endsWith('*')) return <em key={index}>{part.slice(1, -1)}</em>
    if (part.startsWith('![')) return <span key={index}>{part.slice(2, part.indexOf(']'))} (external image omitted)</span>
    return part
  })
}
export function ReadableMarkdown({ text }: { text: string }) {
  const lines = text.replace(/\r\n?/g, '\n').split('\n'), blocks: ReactNode[] = []
  const fallback = () => <div className="chapter-prose"><pre>{text}</pre></div>
  if (lines.length > 4096) return fallback()
  let formattingTokens = 0
  for (const character of text) if ('`*[]|'.includes(character) && ++formattingTokens > 2048) return fallback()
  let i = 0
  while (i < lines.length) {
    if (blocks.length >= 1024) return fallback()
    const line = lines[i]!, key = i
    if (!line.trim()) { i++; continue }
    if (/^\s*```/.test(line)) {
      const code: string[] = []; i++
      while (i < lines.length && !/^\s*```/.test(lines[i]!)) code.push(lines[i++]!)
      i++; blocks.push(<pre key={key}><code>{code.join('\n')}</code></pre>); continue
    }
    const heading = /^(#{1,6})\s+(.+)$/.exec(line)
    if (heading) { const Tag = heading[1]!.length <= 2 ? 'h3' : 'h4'; blocks.push(<Tag key={key}>{inline(heading[2]!)}</Tag>); i++; continue }
    if (line.includes('|') && /^\s*\|?\s*:?-+/.test(lines[i + 1] ?? '')) {
      const cells = (row: string) => row.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map(value => value.trim())
      const headers = cells(line), rows: string[][] = []; i += 2
      while (i < lines.length && lines[i]!.includes('|') && lines[i]!.trim()) rows.push(cells(lines[i++]!))
      if (headers.length * (rows.length + 1) > 2048) return fallback()
      blocks.push(<div className="chapter-table-scroll" key={key}><table><thead><tr>{headers.map((cell, index) => <th key={index}>{inline(cell)}</th>)}</tr></thead><tbody>{rows.map((row, index) => <tr key={index}>{headers.map((_, column) => <td key={column}>{inline(row[column] ?? '')}</td>)}</tr>)}</tbody></table></div>); continue
    }
    if (/^\s*(?:[-*+] |\d+\. )/.test(line)) {
      const ordered = /^\s*\d+\./.test(line), items: string[] = []
      while (i < lines.length && (ordered ? /^\s*\d+\. / : /^\s*[-*+] /).test(lines[i]!)) items.push(lines[i++]!.replace(/^\s*(?:[-*+] |\d+\. )/, ''))
      const Tag = ordered ? 'ol' : 'ul'; blocks.push(<Tag key={key}>{items.map((item, index) => <li key={index}>{inline(item)}</li>)}</Tag>); continue
    }
    if (line.startsWith('>')) { const quotes: string[] = []; while (i < lines.length && lines[i]!.startsWith('>')) quotes.push(lines[i++]!.replace(/^>\s?/, '')); blocks.push(<blockquote key={key}>{inline(quotes.join(' '))}</blockquote>); continue }
    const paragraph: string[] = [line]; i++
    while (i < lines.length && lines[i]!.trim() && !/^(?:#|>|```|[-*+] |\d+\. )/.test(lines[i]!)) paragraph.push(lines[i++]!)
    blocks.push(<p key={key}>{inline(paragraph.join('\n'))}</p>)
  }
  return <div className="chapter-prose">{blocks}</div>
}
