/**
 * CFTSpace — Old Chart → Import Format Converter  (STANDALONE TOOL)
 * ------------------------------------------------------------------
 * This tool is COMPLETELY SEPARATE from the CFTSpace app / family-tree system.
 * It does NOT touch any app code. Its only job:
 *
 *   Read an old hand-drawn descent chart (.xls grid, e.g. Makwana.xls) and
 *   produce two import-ready sheets — "household" and "member" — with auto
 *   ghar_number + member_number, exactly like the app's import expects.
 *
 * The chart encodes:
 *   • a NAME in a cell
 *   • directly BELOW it, the marriage annotation(s):  father-name  sub-caste  village
 *       (for a man = his wife's father; for a woman = her husband's family)
 *       (two wives shown as two lines: "1.… / 2.…")
 *   • "|" or "!" cells = the vertical line that drops to that person's household
 *
 * Household rules (confirmed with the user):
 *   - Every MARRIED man, or any man who HAS children (a "|" line below), = a household head.
 *   - A son appears twice: a MEMBER (Son) under his father, AND the HEAD of his own household.
 *   - Wife = member #1 (name Unknown if not recorded); children follow, eldest-first.
 *   - Daughters & wives never become households.
 *   - Eldest son = the one whose "|" line continues in the parent's own column.
 *   - ghar_number is assigned generation-by-generation, eldest son first (BFS).
 *
 * Usage:  node tools/chart-converter/convert.js [path-to-chart.xls] [sub_caste_name]
 *   defaults: Makwana.xls  /  Makwana
 */

const path = require('path')
const XLSX = require(path.join(__dirname, '..', '..', 'node_modules', 'xlsx'))

const INPUT      = process.argv[2] || 'Makwana.xls'
const SUB_CASTE  = process.argv[3] || 'Makwana'
const OUT_DIR    = path.join(__dirname, 'out')

// ── Helpers ───────────────────────────────────────────────────────────────
// A cell is a "line" (connector / decorative mark), NOT a name, when it carries no actual
// letters: the lineage line "|"/"!"/multi-pipe/"|\n|", the mistyped pipes "I"/"l"/"1", and
// stray brace/dot/dash marks ("{", "}", ".", "-"). This stops a stray mark from swallowing
// the real name below it (which used to break a sibling run and orphan everyone after it).
const PIPE_RE = /^[|!Il1]+$/
const isConn = v => {
  const t = String(v).replace(/\s+/g, '')
  if (t === '') return false
  if (PIPE_RE.test(t)) return true   // pipes + common mistyped pipes
  return !/\p{L}/u.test(t)            // any other letterless cell = a line / decorative mark
}
const colName = i => XLSX.utils.encode_col(i)

// Female if name ends in a known female marker, or is the literal "GIRL".
const FEMALE_SUFFIX = /(BAI|DEVI|KUMARI|BEN)$/
function isFemale(name) {
  const n = name.toUpperCase().replace(/[^A-Z]/g, '')
  if (n === 'GIRL') return true
  if (n === 'BOY')  return false
  return FEMALE_SUFFIX.test(n)
}

// Split "DUJO SALOON DHAKLO" → { father, sub, addr, raw, clean3 }.
// Strips a leading wife index like "1." / "2.".
function splitAnno(raw) {
  const clean = raw.replace(/^\s*\d+\s*[.\-)]\s*/, '').replace(/\s+/g, ' ').trim()
  const toks = clean ? clean.split(' ') : []
  if (toks.length === 3) {
    return { father: toks[0], sub: toks[1], addr: toks[2], raw, clean3: true }
  }
  // Not exactly 3 → best guess (father, sub-caste, then everything else = village) + flag.
  // Most off-cases are a 2-word village, e.g. "PARU BHADRECHA RANA TARAI".
  return {
    father: toks[0] || '',
    sub:    toks[1] || '',
    addr:   toks.slice(2).join(' '),
    raw, clean3: false,
  }
}

// ── 1. Read grid ──────────────────────────────────────────────────────────
const wb   = XLSX.readFile(INPUT)
const SHEET = wb.SheetNames[0]
const ws   = wb.Sheets[SHEET]
const grid = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' })
  .map(row => row.map(c => String(c == null ? '' : c).trim()))

const maxRow = grid.length
const maxCol = grid.reduce((m, r) => Math.max(m, r.length), 0)
const cell = (r, c) => (grid[r] && grid[r][c] != null ? grid[r][c] : '')

// The chart's title block (sub-caste + village, e.g. "MAKWANA SENHAR") sits in the
// TOP CORNER above the genealogy. In most files it's in column A, but in some it's
// shifted into column B/C — where the old "skip column A" rule let it leak in as a
// fake name+annotation and get counted as a household. Detect the title by ROW instead:
// the root ancestor sits one row above the FIRST vertical connector "|", so every row
// strictly above that is the title block (in whatever column it happens to be written).
let firstPipeRow = -1
for (let r = 0; r < maxRow && firstPipeRow < 0; r++) {
  for (let c = 0; c < maxCol; c++) {
    if (PIPE_RE.test(String(cell(r, c)).replace(/\s+/g, ''))) { firstPipeRow = r; break }
  }
}
const headerEndRow = firstPipeRow > 0 ? firstPipeRow - 1 : 0   // root ancestor row; title is above it

// Address = all title text above the root ancestor (any column), e.g. "MAKWANA SENHAR".
const ADDRESS = grid.slice(0, headerEndRow)
  .flatMap(row => row.map(v => String(v || '').trim()))
  .filter(v => v && !isConn(v))
  .join(' ')

// ── 2. Classify cells → names (with their annotation lines) ─────────────────
// Per column, top→bottom. A name "owns" the consecutive text rows directly below
// it (its annotation lines) until a connector / blank breaks the run.
const names  = []                 // { id, row, col, name, alt, annotations:[] }
const nameAt = new Map()          // "r,c" → name object
const keyOf  = (r, c) => r + ',' + c

for (let c = 1; c < maxCol; c++) {   // c=0 is the legacy title column — never holds tree names
  let current = null      // name currently collecting annotations
  let prevRow = -99       // last row consumed for `current`
  for (let r = 0; r < maxRow; r++) {
    if (r < headerEndRow) continue   // title block (sub-caste + village) — not a person, in any column
    const v = cell(r, c)
    if (v === '')        { current = null; continue }
    if (isConn(v))       { current = null; continue }
    // text cell
    if (current && r === prevRow + 1) {
      current.annotations.push(v)   // consecutive line below a name → annotation
      prevRow = r
    } else {
      const [name, alt] = v.split('=').map(s => s.trim())   // "MEERANBAI=DURGA" alias
      const obj = { id: keyOf(r, c), row: r, col: c, name, alt: alt || '', annotations: [] }
      names.push(obj)
      nameAt.set(obj.id, obj)
      current = obj
      prevRow = r
    }
  }
}

// ── 3. Build parent → children via the "|" line geometry ────────────────────
// For a name at (r,c): skip its annotation rows, then ride the vertical line down
// column c to the first NAME row R (the eldest child, same column). The line is a
// run of "|"/"!" cells that may have small BLANK gaps (the chart leaves spacer rows,
// e.g. when a sibling needs a 2nd wife line). We bridge a blank ONLY when a connector
// resumes after it — so a leaf (blank-then-name with no line) never steals a child.
function findChildRow(p) {
  const c = p.col
  let r = p.row + 1 + p.annotations.length
  let sawConn = false
  while (r < maxRow) {
    const v = cell(r, c)
    if (isConn(v)) { sawConn = true; r++; continue }
    if (v === '') {
      let rr = r + 1
      while (rr < maxRow && cell(rr, c) === '') rr++      // skip the blank gap
      if (rr >= maxRow) return -1
      if (isConn(cell(rr, c))) { r = rr; continue }       // line resumes → keep riding
      if (nameAt.has(keyOf(rr, c))) return sawConn ? rr : -1
      return -1
    }
    // a name cell: it's a child only if we actually rode a line to reach it
    if (nameAt.has(keyOf(r, c))) return sawConn ? r : -1
    return -1
  }
  return -1
}

for (const p of names) {
  p.children = []
  const childRow = findChildRow(p)
  if (childRow < 0) continue
  for (let cc = p.col; cc < maxCol; cc++) {
    const k = nameAt.get(keyOf(childRow, cc))
    if (!k) break                                  // blank / connector ends the sibling run
    if (k.parent) { k._conflict = p.id; continue } // already claimed → flag, don't steal
    k.parent = p
    p.children.push(k)
  }
}

// ── 3b. Bridge daughters → beti_data ────────────────────────────────────────
// In a patrilineal chart a daughter marries out, so her children belong to her
// HUSBAND's family — not to this Makwana lineage. When the chart still draws a
// daughter's children, we keep the daughter as a Daughter MEMBER in her father's
// household, but move her whole descendant subtree out into a separate beti_data
// sheet (the daughter herself is NOT repeated there).
const excluded = new Map()       // node.id → the bridge-daughter it hangs under
function markSubtree(node, beti) {
  for (const ch of (node.children || [])) {
    if (excluded.has(ch.id)) continue
    excluded.set(ch.id, beti)
    markSubtree(ch, beti)
  }
}
const bridgeDaughters = names.filter(n => isFemale(n.name) && n.children && n.children.length)
for (const bd of bridgeDaughters) markSubtree(bd, bd)

// ── 4. Roots + ordering ─────────────────────────────────────────────────────
const roots = names.filter(n => !n.parent)

// Children are already in left→right (= eldest→youngest) column order.
const sonHeads = n => n.children
  ? n.children.filter(k => !isFemale(k.name) && isHousehold(k) && !excluded.has(k.id))
  : []

// A name is a household head if it's male AND (has children OR is married/has annotation).
function isHousehold(n) {
  if (isFemale(n.name)) return false
  return (n.children && n.children.length > 0) || n.annotations.length > 0
}

// ── 5. BFS assign ghar_number (generation-wise, eldest-first) ───────────────
const households = []            // ordered list of head name-objects
// Seed from real roots (top→bottom). BFS appends each head's son-heads at the end,
// so numbering comes out generation-by-generation, eldest son first.
const queue = roots
  .filter(isHousehold)
  .sort((a, b) => a.row - b.row || a.col - b.col)

while (queue.length) {
  const head = queue.shift()
  head.gharNumber = households.length + 1
  households.push(head)
  sonHeads(head).forEach(s => queue.push(s))
}

// Any household-eligible person not reached by BFS (disconnected) → append + flag
// (skip anyone who lives inside a beti_data subtree)
for (const n of names) {
  if (isHousehold(n) && !n.gharNumber && !excluded.has(n.id)) {
    n._orphanHead = true
    n.gharNumber = households.length + 1
    households.push(n)
  }
}

// ── 6. Build household rows + member rows ───────────────────────────────────
const householdRows = []
const memberRows = []
const flags = []

for (const head of households) {
  householdRows.push({
    ghar_number: head.gharNumber,
    head_name:   head.name,
    // The head's father = his parent node in the tree (blank for the root).
    head_father_name: head.parent ? head.parent.name : '',
    head_gender: isFemale(head.name) ? 'Female' : 'Male',
    sub_caste:   SUB_CASTE,
    address:     ADDRESS,
    review:      [head._orphanHead ? 'DISCONNECTED' : '', isFemale(head.name) ? 'FEMALE-HEAD' : '']
                  .filter(Boolean).join(' '),
  })

  let mno = 0

  // Wives — one per annotation line; if married/has-kids but no annotation → 1 Unknown wife
  const wifeAnnos = head.annotations.length ? head.annotations : ['']
  for (const a of wifeAnnos) {
    const s = a ? splitAnno(a) : { father: '', sub: '', addr: '', raw: '', clean3: true }
    memberRows.push({
      ghar_number: head.gharNumber, member_number: ++mno,
      name: 'Unknown', gender: 'Female', relation: 'Wife',
      father_name: s.father || 'Unknown',
      father_subcaste: s.sub, father_address: s.addr,
      raw_annotation: s.raw, review: s.raw && !s.clean3 ? 'CHECK-SPLIT' : '',
    })
  }

  // Children — eldest-first (column order). Daughters carry their husband-side annotation.
  for (const ch of (head.children || [])) {
    const female = isFemale(ch.name)
    const annoRaw = ch.annotations[0] || ''
    const s = annoRaw ? splitAnno(annoRaw) : null
    memberRows.push({
      ghar_number: head.gharNumber, member_number: ++mno,
      name: ch.name + (ch.alt ? ` (=${ch.alt})` : ''),
      gender: female ? 'Female' : 'Male',
      relation: female ? 'Daughter' : 'Son',
      // Daughter → husband-side info in the father columns; Son → blank (his wife lives in his own household)
      father_name:     female && s ? s.father : '',
      father_subcaste: female && s ? s.sub : '',
      father_address:  female && s ? s.addr : '',
      raw_annotation:  female ? annoRaw : '',
      review: ch._conflict ? 'PARENT-CONFLICT' : (female && s && !s.clean3 ? 'CHECK-SPLIT' : ''),
    })
  }
}

// ── 6b. beti_data — descendants of bridge daughters (kept OUT of the main sheets) ─
const betiRows = []
for (const n of names) {
  if (!excluded.has(n.id)) continue
  const beti   = excluded.get(n.id)
  const female = isFemale(n.name)
  const s = n.annotations[0] ? splitAnno(n.annotations[0]) : null
  betiRows.push({
    beti_name:        beti.name,
    beti_father_ghar: beti.parent ? beti.parent.gharNumber : '',
    name:             n.name + (n.alt ? ` (=${n.alt})` : ''),
    gender:           female ? 'Female' : 'Male',
    relation:         female ? 'Daughter' : 'Son',
    parent_name:      n.parent ? n.parent.name : '',
    assoc_father_name:     s ? s.father : '',
    assoc_father_subcaste: s ? s.sub : '',
    assoc_father_address:  s ? s.addr : '',
    raw_annotation:   n.annotations[0] || '',
  })
}

// Bridge-daughter summary → report
for (const bd of bridgeDaughters) {
  flags.push(`BETI-WITH-CHILDREN → beti_data: ${bd.name} @${colName(bd.col)}${bd.row + 1} (father ghar ${bd.parent ? bd.parent.gharNumber : '?'}) — ${bd.children.map(c => c.name).join(', ')}`)
}

// ── 7. Report ───────────────────────────────────────────────────────────────
console.log(`\n================  CHART CONVERTER REPORT  ================`)
console.log(`Input        : ${INPUT}  (sheet "${SHEET}")`)
console.log(`Sub-caste    : ${SUB_CASTE}`)
console.log(`Names found  : ${names.length}`)
console.log(`Households    : ${householdRows.length}`)
console.log(`Members       : ${memberRows.length}`)
console.log(`beti_data rows: ${betiRows.length}  (from ${bridgeDaughters.length} daughter${bridgeDaughters.length === 1 ? '' : 's'} with children)`)
console.log(`Roots         : ${roots.length} (${roots.map(r => r.name).join(', ')})`)

console.log(`\n--- First 5 households (full) ---`)
for (const h of householdRows.slice(0, 5)) {
  console.log(`\n[Ghar ${h.ghar_number}] ${h.head_name} (${h.head_gender})${h.review ? '  ⚠ ' + h.review : ''}`)
  memberRows.filter(m => m.ghar_number === h.ghar_number).forEach(m => {
    const fa = [m.father_name, m.father_subcaste, m.father_address].filter(Boolean).join(' / ')
    console.log(`   #${m.member_number} ${m.name.padEnd(22)} ${m.relation.padEnd(9)} ${fa}${m.review ? '   ⚠ ' + m.review : ''}`)
  })
}

const splitFlags  = memberRows.filter(m => m.review === 'CHECK-SPLIT').length
const conflicts   = memberRows.filter(m => m.review === 'PARENT-CONFLICT').length
console.log(`\n--- Flags for review ---`)
console.log(`CHECK-SPLIT (annotation not 3 words): ${splitFlags}`)
console.log(`PARENT-CONFLICT (claimed by 2 parents): ${conflicts}`)
flags.slice(0, 20).forEach(f => console.log('  • ' + f))
if (flags.length > 20) console.log(`  …and ${flags.length - 20} more`)

// ── 8. Write the two import sheets ──────────────────────────────────────────
const fs = require('fs')
fs.mkdirSync(OUT_DIR, { recursive: true })

function writeSheet(rows, headers, file, sheetName) {
  const ws = XLSX.utils.json_to_sheet(rows, { header: headers })
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, sheetName)
  XLSX.writeFile(wb, path.join(OUT_DIR, file))
}

writeSheet(
  householdRows,
  ['ghar_number', 'head_name', 'head_father_name', 'head_gender', 'sub_caste', 'address', 'review'],
  'household.xlsx', 'household',
)
writeSheet(
  memberRows,
  ['ghar_number', 'member_number', 'name', 'gender', 'relation',
   'father_name', 'father_subcaste', 'father_address', 'raw_annotation', 'review'],
  'member.xlsx', 'member',
)
writeSheet(
  betiRows,
  ['beti_name', 'beti_father_ghar', 'name', 'gender', 'relation', 'parent_name',
   'assoc_father_name', 'assoc_father_subcaste', 'assoc_father_address', 'raw_annotation'],
  'beti_data.xlsx', 'beti_data',
)

console.log(`\n✔ Wrote  ${path.join(OUT_DIR, 'household.xlsx')}`)
console.log(`✔ Wrote  ${path.join(OUT_DIR, 'member.xlsx')}`)
console.log(`✔ Wrote  ${path.join(OUT_DIR, 'beti_data.xlsx')}`)
console.log(`==========================================================\n`)
