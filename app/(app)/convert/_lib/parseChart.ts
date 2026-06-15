/**
 * Old descent-chart → import-format parser (PURE, browser-safe).
 * Ported from tools/chart-converter/convert.js. No fs / process / xlsx here —
 * the caller passes a trimmed 2-D string grid (from the uploaded sheet) and gets
 * back household / member / beti_data rows. Completely separate from the app's
 * family-tree system; this only transforms data.
 */

export interface HouseholdRow {
  ghar_number: number
  head_name: string
  head_gender: 'Male' | 'Female'
  sub_caste: string
  address: string
  review: string
}
export interface MemberRow {
  ghar_number: number
  member_number: number
  name: string
  gender: string
  relation: string
  father_name: string
  father_subcaste: string
  father_address: string
  raw_annotation: string
  review: string
}
export interface BetiRow {
  beti_name: string
  beti_father_ghar: number | string
  name: string
  gender: string
  relation: string
  parent_name: string
  assoc_father_name: string
  assoc_father_subcaste: string
  assoc_father_address: string
  raw_annotation: string
}
export interface ConvertResult {
  households: HouseholdRow[]
  members: MemberRow[]
  betiData: BetiRow[]
  flags: string[]
  stats: { names: number; households: number; members: number; betiData: number; roots: string[] }
}

interface Node {
  id: string
  row: number
  col: number
  name: string
  alt: string
  annotations: string[]
  children: Node[]
  parent?: Node
  gharNumber?: number
  _conflict?: string
  _orphanHead?: boolean
}

// A cell is a "line" (connector / decorative mark), NOT a name, when it carries no
// actual letters. This covers the lineage line in all its forms — "|", "!", multi-pipe
// "||" / "| |" / "|\n|", the common mistyped pipes "I" / "l" / "1" — and the stray
// brace / dot / dash marks some hand-made charts use ("{", "}", ".", "-", "·"). Treating
// these as lines (instead of names) stops a stray mark from swallowing the real name below
// it, which used to break a sibling run and orphan everyone after the gap.
// A cell with ANY letter (any script) is a real name/annotation, never a line.
const PIPE_RE = /^[|!Il1]+$/
const isConn = (v: string) => {
  const t = v.replace(/\s+/g, '')
  if (t === '') return false
  if (PIPE_RE.test(t)) return true   // pipes + common mistyped pipes
  return !/\p{L}/u.test(t)            // any other letterless cell = a line / decorative mark
}

function colName(i: number): string {
  let s = ''
  let n = i
  while (n >= 0) { s = String.fromCharCode(65 + (n % 26)) + s; n = Math.floor(n / 26) - 1 }
  return s
}

const FEMALE_SUFFIX = /(BAI|DEVI|KUMARI|BEN)$/
function isFemale(name: string): boolean {
  const n = name.toUpperCase().replace(/[^A-Z]/g, '')
  if (n === 'GIRL') return true
  if (n === 'BOY')  return false
  return FEMALE_SUFFIX.test(n)
}

// "DUJO SALOON DHAKLO" → { father, sub, addr, raw, clean3 }. Strips a leading "1." / "2.".
function splitAnno(raw: string) {
  const clean = raw.replace(/^\s*\d+\s*[.\-)]\s*/, '').replace(/\s+/g, ' ').trim()
  const toks = clean ? clean.split(' ') : []
  if (toks.length === 3) return { father: toks[0], sub: toks[1], addr: toks[2], raw, clean3: true }
  return { father: toks[0] || '', sub: toks[1] || '', addr: toks.slice(2).join(' '), raw, clean3: false }
}

export function parseChart(grid: string[][], subCaste: string): ConvertResult {
  const maxRow = grid.length
  const maxCol = grid.reduce((m, r) => Math.max(m, r.length), 0)
  const cell = (r: number, c: number) => (grid[r] && grid[r][c] != null ? grid[r][c] : '')

  // Address = the title/origin text in the top-left corner (column A), e.g. "MAKWANA SENHAR".
  // Every household in this file gets this same address.
  const address = grid.map(r => (r[0] || '').trim()).filter(Boolean).join(' ')

  // ── 1. Classify cells → names (with their annotation lines) ──────────────
  const names: Node[] = []
  const nameAt = new Map<string, Node>()
  const keyOf = (r: number, c: number) => r + ',' + c

  for (let c = 1; c < maxCol; c++) {       // c=0 is the title column — skip
    let current: Node | null = null
    let prevRow = -99
    for (let r = 0; r < maxRow; r++) {
      const v = cell(r, c)
      if (v === '') { current = null; continue }
      if (isConn(v)) { current = null; continue }
      if (current && r === prevRow + 1) {
        current.annotations.push(v)
        prevRow = r
      } else {
        const [name, alt] = v.split('=').map(s => s.trim())
        const obj: Node = { id: keyOf(r, c), row: r, col: c, name, alt: alt || '', annotations: [], children: [] }
        names.push(obj)
        nameAt.set(obj.id, obj)
        current = obj
        prevRow = r
      }
    }
  }

  // ── 2. parent → children via the "|" line geometry ───────────────────────
  function findChildRow(p: Node): number {
    const c = p.col
    let r = p.row + 1 + p.annotations.length
    let sawConn = false
    while (r < maxRow) {
      const v = cell(r, c)
      if (isConn(v)) { sawConn = true; r++; continue }
      if (v === '') {
        let rr = r + 1
        while (rr < maxRow && cell(rr, c) === '') rr++
        if (rr >= maxRow) return -1
        if (isConn(cell(rr, c))) { r = rr; continue }
        if (nameAt.has(keyOf(rr, c))) return sawConn ? rr : -1
        return -1
      }
      if (nameAt.has(keyOf(r, c))) return sawConn ? r : -1
      return -1
    }
    return -1
  }

  for (const p of names) {
    const childRow = findChildRow(p)
    if (childRow < 0) continue
    for (let cc = p.col; cc < maxCol; cc++) {
      const k = nameAt.get(keyOf(childRow, cc))
      if (!k) break
      if (k.parent) { k._conflict = p.id; continue }
      k.parent = p
      p.children.push(k)
    }
  }

  // ── 3. Bridge daughters → beti_data ──────────────────────────────────────
  const excluded = new Map<string, Node>()
  function markSubtree(node: Node, beti: Node) {
    for (const ch of node.children) {
      if (excluded.has(ch.id)) continue
      excluded.set(ch.id, beti)
      markSubtree(ch, beti)
    }
  }
  const bridgeDaughters = names.filter(n => isFemale(n.name) && n.children.length)
  for (const bd of bridgeDaughters) markSubtree(bd, bd)

  // ── 4. Households + numbering ────────────────────────────────────────────
  const roots = names.filter(n => !n.parent)
  const isHousehold = (n: Node) =>
    !isFemale(n.name) && (n.children.length > 0 || n.annotations.length > 0)
  const sonHeads = (n: Node) =>
    n.children.filter(k => !isFemale(k.name) && isHousehold(k) && !excluded.has(k.id))

  const households: Node[] = []
  const queue = roots.filter(isHousehold).sort((a, b) => a.row - b.row || a.col - b.col)
  while (queue.length) {
    const head = queue.shift()!
    head.gharNumber = households.length + 1
    households.push(head)
    sonHeads(head).forEach(s => queue.push(s))
  }
  for (const n of names) {
    if (isHousehold(n) && !n.gharNumber && !excluded.has(n.id)) {
      n._orphanHead = true
      n.gharNumber = households.length + 1
      households.push(n)
    }
  }

  // ── 5. Build rows ────────────────────────────────────────────────────────
  const householdRows: HouseholdRow[] = []
  const memberRows: MemberRow[] = []
  const flags: string[] = []

  for (const head of households) {
    householdRows.push({
      ghar_number: head.gharNumber!,
      head_name: head.name,
      head_gender: isFemale(head.name) ? 'Female' : 'Male',
      sub_caste: subCaste,
      address,
      review: [head._orphanHead ? 'DISCONNECTED' : '', isFemale(head.name) ? 'FEMALE-HEAD' : '']
        .filter(Boolean).join(' '),
    })

    let mno = 0
    const wifeAnnos = head.annotations.length ? head.annotations : ['']
    for (const a of wifeAnnos) {
      const s = a ? splitAnno(a) : { father: '', sub: '', addr: '', raw: '', clean3: true }
      memberRows.push({
        ghar_number: head.gharNumber!, member_number: ++mno,
        name: 'Unknown', gender: 'Female', relation: 'Wife',
        father_name: s.father || 'Unknown', father_subcaste: s.sub, father_address: s.addr,
        raw_annotation: s.raw, review: s.raw && !s.clean3 ? 'CHECK-SPLIT' : '',
      })
    }

    for (const ch of head.children) {
      const female = isFemale(ch.name)
      const annoRaw = ch.annotations[0] || ''
      const s = annoRaw ? splitAnno(annoRaw) : null
      memberRows.push({
        ghar_number: head.gharNumber!, member_number: ++mno,
        name: ch.name + (ch.alt ? ` (=${ch.alt})` : ''),
        gender: female ? 'Female' : 'Male',
        relation: female ? 'Daughter' : 'Son',
        father_name: female && s ? s.father : '',
        father_subcaste: female && s ? s.sub : '',
        father_address: female && s ? s.addr : '',
        raw_annotation: female ? annoRaw : '',
        review: ch._conflict ? 'PARENT-CONFLICT' : (female && s && !s.clean3 ? 'CHECK-SPLIT' : ''),
      })
    }
  }

  // ── 6. beti_data ─────────────────────────────────────────────────────────
  const betiData: BetiRow[] = []
  for (const n of names) {
    if (!excluded.has(n.id)) continue
    const beti = excluded.get(n.id)!
    const female = isFemale(n.name)
    const s = n.annotations[0] ? splitAnno(n.annotations[0]) : null
    betiData.push({
      beti_name: beti.name,
      beti_father_ghar: beti.parent ? (beti.parent.gharNumber ?? '') : '',
      name: n.name + (n.alt ? ` (=${n.alt})` : ''),
      gender: female ? 'Female' : 'Male',
      relation: female ? 'Daughter' : 'Son',
      parent_name: n.parent ? n.parent.name : '',
      assoc_father_name: s ? s.father : '',
      assoc_father_subcaste: s ? s.sub : '',
      assoc_father_address: s ? s.addr : '',
      raw_annotation: n.annotations[0] || '',
    })
  }
  for (const bd of bridgeDaughters) {
    flags.push(`BETI-WITH-CHILDREN → beti_data: ${bd.name} @${colName(bd.col)}${bd.row + 1} (father ghar ${bd.parent ? bd.parent.gharNumber : '?'}) — ${bd.children.map(c => c.name).join(', ')}`)
  }

  return {
    households: householdRows,
    members: memberRows,
    betiData,
    flags,
    stats: {
      names: names.length,
      households: householdRows.length,
      members: memberRows.length,
      betiData: betiData.length,
      roots: roots.map(r => r.name),
    },
  }
}
