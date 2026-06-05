// Tree building utilities for CFTSpace Family Tree

export interface TreeMember {
  id: string
  name: string
  gender: 'Male' | 'Female'
  relation_code: string
  dob_year: number | null
  photo_url: string | null
  sub_caste_id: string | null
  household_id: string
  is_head?: boolean
}

export interface FamilyLink {
  id: string
  member_id: string
  father_id: string | null
  mother_id: string | null
  spouse_id: string | null
  link_type: string
}

export interface TreeNode {
  member: TreeMember
  spouses: TreeNode[]
  children: TreeNode[]
  generation: number
  x?: number
  y?: number
}

// Determine age category from birth year
export function getAgeCategory(dobYear: number | null): 'child' | 'adult' | 'elder' | 'unknown' {
  if (!dobYear) return 'unknown'
  const age = new Date().getFullYear() - dobYear
  if (age <= 12) return 'child'
  if (age <= 59) return 'adult'
  return 'elder'
}

// Build a tree structure from flat members + links
export function buildTree(
  members: TreeMember[],
  links: FamilyLink[],
  rootId: string
): TreeNode | null {
  const memberMap = new Map(members.map(m => [m.id, m]))
  const visited = new Set<string>()

  // Build lookup maps
  const childrenOf = new Map<string, string[]>()   // parentId → childIds
  const spousesOf  = new Map<string, string[]>()   // memberId → spouseIds

  for (const link of links) {
    if (link.father_id) {
      const kids = childrenOf.get(link.father_id) ?? []
      kids.push(link.member_id)
      childrenOf.set(link.father_id, kids)
    }
    if (link.mother_id) {
      const kids = childrenOf.get(link.mother_id) ?? []
      if (!kids.includes(link.member_id)) kids.push(link.member_id)
      childrenOf.set(link.mother_id, kids)
    }
    if (link.spouse_id) {
      const sp1 = spousesOf.get(link.member_id) ?? []
      if (!sp1.includes(link.spouse_id)) sp1.push(link.spouse_id)
      spousesOf.set(link.member_id, sp1)

      const sp2 = spousesOf.get(link.spouse_id) ?? []
      if (!sp2.includes(link.member_id)) sp2.push(link.member_id)
      spousesOf.set(link.spouse_id, sp2)
    }
  }

  function buildNode(id: string, generation: number): TreeNode | null {
    if (visited.has(id)) return null
    visited.add(id)

    const member = memberMap.get(id)
    if (!member) return null

    const spouseIds  = spousesOf.get(id) ?? []
    const childIds   = childrenOf.get(id) ?? []

    const spouseNodes: TreeNode[] = spouseIds
      .flatMap(sid => {
        if (visited.has(sid)) {
          const sm = memberMap.get(sid)
          if (!sm) return []
          const n: TreeNode = { member: sm, spouses: [], children: [], generation }
          return [n]
        }
        visited.add(sid)
        const sm = memberMap.get(sid)
        if (!sm) return []
        const n: TreeNode = { member: sm, spouses: [], children: [], generation }
        return [n]
      })

    const childNodes: TreeNode[] = childIds
      .flatMap(cid => {
        const n = buildNode(cid, generation + 1)
        return n ? [n] : []
      })

    return { member, spouses: spouseNodes, children: childNodes, generation }
  }

  return buildNode(rootId, 0)
}

// Flatten tree into generations for layout
export function flattenByGeneration(root: TreeNode): TreeNode[][] {
  const generations: TreeNode[][] = []

  function walk(node: TreeNode) {
    const gen = node.generation
    if (!generations[gen]) generations[gen] = []
    generations[gen].push(node)
    for (const spouse of node.spouses) {
      if (!generations[gen]) generations[gen] = []
      if (!generations[gen].find(n => n.member.id === spouse.member.id)) {
        generations[gen].push(spouse)
      }
    }
    for (const child of node.children) walk(child)
  }

  walk(root)
  return generations
}

// Get all unique links for drawing lines
export interface DrawLink {
  type: 'spouse' | 'parent-child'
  fromId: string
  toId: string
}

export function extractDrawLinks(root: TreeNode): DrawLink[] {
  const links: DrawLink[] = []
  const seen = new Set<string>()

  function walk(node: TreeNode) {
    for (const spouse of node.spouses) {
      const key = [node.member.id, spouse.member.id].sort().join('-')
      if (!seen.has(key)) {
        seen.add(key)
        links.push({ type: 'spouse', fromId: node.member.id, toId: spouse.member.id })
      }
    }
    for (const child of node.children) {
      links.push({ type: 'parent-child', fromId: node.member.id, toId: child.member.id })
      walk(child)
    }
  }

  walk(root)
  return links
}

// Build flat member list from household (for within-household tree)
export function buildHouseholdTree(
  head: TreeMember,
  members: TreeMember[],
  links: FamilyLink[]
): TreeNode {
  const allMembers = [head, ...members]

  const built = buildTree(allMembers, links, head.id)
  if (built) return built

  // Fallback: no links yet, just show head with members as children
  const children: TreeNode[] = members.map(m => ({
    member: m,
    spouses: [],
    children: [],
    generation: 1,
  }))

  return { member: head, spouses: [], children, generation: 0 }
}
