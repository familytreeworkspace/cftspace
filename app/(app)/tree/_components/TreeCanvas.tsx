'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  ReactFlow, Background, Controls, Panel,
  Handle, Position,
  useNodesState, useEdgesState,
  type Node, type Edge, type Connection, type NodeTypes, type EdgeTypes, type NodeChange,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'

import { FamilyTreeNode, type FamilyNodeData } from './FamilyTreeNode'
import { FamilyEdge, SpouseEdge } from './FamilyEdge'
import { LinkConfirmModal } from './LinkConfirmModal'
import { AddAncestorModal } from './AddAncestorModal'
import { createHouseholdLink, linkMembers, removeHouseholdLink, setDeathYear } from '@/app/actions/tree'
import type { HouseholdTree, CrossHouseholdLink } from './types'
import type { AncestorTrigger } from './MemberFlowNode'

// ── Layout constants ──────────────────────────────────────────
const CARD_W       = 130   // card width
const CARD_H       = 90    // card visual height (spacing constant)
const CARD_MID     = 53    // junction Y within card row — card vertical centre (matches spouse handle)
const NODE_SLOT    = 115   // card + "+" button height (slot per node row)
const COUPLE_GAP   = 30    // gap between husband and wife cards
const SIBLING_GAP  = 60    // horizontal gap between sibling subtrees
const GEN_GAP      = 120   // vertical gap between parent row and child row
const MEMBER_GAP   = 15    // gap between within-household child members

const COUPLE_W  = CARD_W * 2 + COUPLE_GAP   // width of a couple unit
const SINGLE_W  = CARD_W                     // width of a solo head

// ── Invisible junction node — one per household, at couple-center mid-height ─
// Placed at (cx, y + CARD_MID) — same Y as the spouse line.
// Incoming parent-child edges arrive at jxn-in (top handle).
// Outgoing parent-child edges leave from jxn-out (bottom handle).
// Because it sits exactly on the spouse line, the T-bar visually "hangs" from
// the horizontal line that connects husband and wife — lines look card-to-card.
function JunctionNode() {
  return (
    <div style={{ width: 2, height: 2 }}>
      <Handle
        id="jxn-in"
        type="target"
        position={Position.Top}
        style={{ opacity: 0, width: 4, height: 4, background: 'transparent', border: 'none' }}
      />
      <Handle
        id="jxn-out"
        type="source"
        position={Position.Bottom}
        style={{ opacity: 0, width: 4, height: 4, background: 'transparent', border: 'none' }}
      />
    </div>
  )
}

const nodeTypes: NodeTypes = {
  familyNode:   FamilyTreeNode,
  junctionNode: JunctionNode,
}
const edgeTypes: EdgeTypes = { family: FamilyEdge, spouse: SpouseEdge }

type PendingLink = { sourceId: string; targetId: string; sourceName: string; targetName: string }

interface Props {
  allTrees:      HouseholdTree[]
  canEdit:       boolean
  crossLinks:    CrossHouseholdLink[]
  onTreeUpdated: () => void
}

// ── Relation label helper ─────────────────────────────────────
function relLabel(code: string, isHead: boolean): string {
  const c = (code ?? '').toLowerCase().trim()
  // Father/Mother take precedence — a virtual ancestor is the head of its own household
  // but should still read as "Father"/"Mother" relative to the tree below it
  if (['father','dad','abu','aabu','پيءُ','پيءَ','باپ','پيو'].includes(c)) return 'Father'
  if (['ماءُ','ماء','maa','mother','mom','ماءَ'].includes(c))  return 'Mother'
  if (isHead) return 'Head'
  if (['زال','zal','wife','spouse','w'].includes(c))           return 'Wife'
  if (['ٻت','bt','beta','son','بيٽو','بيٽا'].includes(c))     return 'Son'
  if (['ڏي','di','beti','daughter','بيٽي'].includes(c))        return 'Daughter'
  return code || '—'
}

const WIFE_CODES = new Set(['زال','zal','wife','spouse','w'])
function isWife(code: string) {
  return WIFE_CODES.has(code) || WIFE_CODES.has((code ?? '').toLowerCase())
}

const FATHER_CODES   = new Set(['father','dad','abu','aabu','پيءُ','پيءَ','باپ','پيو'])
const MOTHER_CODES   = new Set(['ماءُ','ماء','maa','mother','mom','ماءَ'])
function isFather(code: string) {
  return FATHER_CODES.has(code) || FATHER_CODES.has((code ?? '').toLowerCase())
}
function isMother(code: string) {
  return MOTHER_CODES.has(code) || MOTHER_CODES.has((code ?? '').toLowerCase())
}
// Father/mother members belong ABOVE the head, not beside the children
function isAncestor(code: string) {
  return isFather(code) || isMother(code)
}

// ── Layout tree node ──────────────────────────────────────────
interface LNode {
  hhId:         string
  gharNumber:   string
  head:         HouseholdTree['head']
  wife?:        HouseholdTree['members'][0]
  ancestors:    HouseholdTree['members']   // father/mother members — shown ABOVE the head
  leafMembers:  HouseholdTree['members']   // sons/daughters with no child household
  children:     LNode[]                    // child household nodes
  // Computed:
  subtreeW:     number
  cx:           number   // center X of this subtree
  y:            number   // Y of this node's card row
  childY:       number   // Y of the children row
  leafLayout:   { member: HouseholdTree['members'][0]; x: number }[]  // positioned leaf members
  wifeHeadId?:  string             // when spouse-merged: the wife card's node id
  wifeChildHhIds?: Set<string>     // child households that belong to the wife (connect from her side)
}

// ── Step 1: build tree ────────────────────────────────────────
function buildTree(
  allTrees: HouseholdTree[],
  crossLinks: CrossHouseholdLink[],
): LNode[] {

  // Separate parent-child links from spouse links (two households married together)
  const parentChildLinks = crossLinks.filter(cl => cl.relation !== 'spouse')
  const spouseLinks      = crossLinks.filter(cl => cl.relation === 'spouse')
  const childHhIds = new Set(parentChildLinks.map(cl => cl.child_household_id))

  const lnodeMap = new Map<string, LNode>()
  allTrees.forEach(t => {
    const wife      = t.members.find(m => isWife(m.relation_code))
    const ancestors = t.members.filter(m => isAncestor(m.relation_code))
    const leaves    = t.members.filter(m => !isWife(m.relation_code) && !isAncestor(m.relation_code))
    lnodeMap.set(t.householdId, {
      hhId:        t.householdId,
      gharNumber:  t.gharNumber,
      head:        t.head,
      wife,
      ancestors,
      leafMembers: leaves,
      children:    [],
      subtreeW:    0,
      cx:          0,
      y:           0,
      childY:      0,
      leafLayout:  [],
    })
  })

  parentChildLinks.forEach(cl => {
    const parent = lnodeMap.get(cl.parent_household_id)
    const child  = lnodeMap.get(cl.child_household_id)
    if (parent && child) parent.children.push(child)
  })

  // Merge two spouse-linked households into one couple: male = head, female = wife.
  // The wife household's children are absorbed so both spouses' kids hang under the couple.
  const absorbed = new Set<string>()
  spouseLinks.forEach(cl => {
    const a = lnodeMap.get(cl.parent_household_id)
    const b = lnodeMap.get(cl.child_household_id)
    if (!a || !b) return
    let headNode = a, wifeNode = b
    if (a.head.gender === 'Female' && b.head.gender === 'Male') { headNode = b; wifeNode = a }
    if (absorbed.has(headNode.hhId) || absorbed.has(wifeNode.hhId)) return
    const wifeRel = parentChildLinks.find(l => l.parent_household_id === wifeNode.hhId)?.relation
    headNode.wife = wifeRel ? { ...wifeNode.head, relation_code: wifeRel } : wifeNode.head
    headNode.wifeHeadId = wifeNode.head.id
    headNode.wifeChildHhIds = new Set(wifeNode.children.map(c => c.hhId))
    headNode.children.push(...wifeNode.children)
    absorbed.add(wifeNode.hhId)
  })

  return allTrees
    .filter(t => !childHhIds.has(t.householdId) && !absorbed.has(t.householdId))
    .map(t => lnodeMap.get(t.householdId)!)
    .filter(Boolean)
}

// ── Step 2: compute subtree widths (bottom-up) ────────────────
function computeWidths(node: LNode): number {
  const coupleW = node.wife ? COUPLE_W : SINGLE_W
  // Ancestors stack vertically above the head — only need a single card's width
  const ancW = node.ancestors.length > 0 ? SINGLE_W : 0

  // All children share ONE row: own member-children (CARD_W each) + linked child-household subtrees
  const unitWidths = [
    ...node.leafMembers.map(() => CARD_W),
    ...node.children.map(ch => computeWidths(ch)),
  ]
  const childrenTotalW = unitWidths.length > 0
    ? unitWidths.reduce((s, w) => s + w, 0) + (unitWidths.length - 1) * SIBLING_GAP
    : 0

  node.subtreeW = Math.max(coupleW, childrenTotalW, ancW)
  return node.subtreeW
}

// ── Step 3: assign positions (top-down) ──────────────────────
function assignPositions(node: LNode, startX: number, y: number) {
  node.cx     = startX + node.subtreeW / 2
  node.y      = y
  node.childY = y + NODE_SLOT + GEN_GAP
  node.leafLayout = []

  const widths = [
    ...node.leafMembers.map(() => CARD_W),
    ...node.children.map(ch => ch.subtreeW),
  ]
  if (widths.length === 0) return

  const totalW = widths.reduce((s, w) => s + w, 0) + (widths.length - 1) * SIBLING_GAP
  let childX = node.cx - totalW / 2

  // Own member-children first
  node.leafMembers.forEach(m => {
    node.leafLayout.push({ member: m, x: childX })
    childX += CARD_W + SIBLING_GAP
  })
  // Then linked child households
  node.children.forEach(ch => {
    assignPositions(ch, childX, node.childY)
    childX += ch.subtreeW + SIBLING_GAP
  })
}

// ── Step 4: build React Flow nodes + edges ────────────────────
function buildFlowElements(
  roots: LNode[],
  graphicMode: boolean,
  canEdit: boolean,
  linkMode: boolean,
  onAddRelative: (id: string, pos: 'top' | 'bottom') => void,
  linkedChildHhIds: Set<string>,
  onUnlink: (householdId: string) => void,
  ancestorRelation: Map<string, string>,
  onMarkDeath: (id: string, isHead: boolean, year: number | null) => void,
): { nodes: Node[]; edges: Edge[] } {

  const nodes: Node[] = []
  const edges: Edge[] = []
  const seenNodes   = new Set<string>()
  const seenEdges   = new Set<string>()
  const walkedHhIds = new Set<string>()

  function addFamilyNode(
    id: string, x: number, y: number,
    person: { name: string; gender: string; dob_year: number | null; death_year?: number | null; photo_url: string | null; relation_code?: string },
    isHead: boolean, hhId: string, isRoot: boolean,
  ) {
    if (seenNodes.has(id)) return
    seenNodes.add(id)
    nodes.push({
      id,
      type: 'familyNode',
      position: { x, y },
      draggable: canEdit,
      data: {
        id,
        name:          person.name,
        gender:        person.gender as 'Male' | 'Female',
        dobYear:       person.dob_year,
        dobDeathYear:  person.death_year ?? null,
        photoUrl:      person.photo_url,
        relationLabel: relLabel(person.relation_code ?? (isHead ? 'HEAD' : ''), isHead),
        graphicMode,
        canEdit,
        linkMode,
        isRoot,
        isHead,
        isLinkedChild: isHead && linkedChildHhIds.has(hhId),
        householdId: hhId,
        onAddRelative,
        onUnlink,
        onMarkDeath,
      } as FamilyNodeData,
    })
  }

  function addJunction(id: string, x: number, y: number) {
    if (seenNodes.has(id)) return
    seenNodes.add(id)
    nodes.push({
      id,
      type: 'junctionNode',
      position: { x, y },
      selectable: false,
      draggable: false,
      connectable: false,
      data: {},
      zIndex: 0,
      style: { width: 2, height: 2, pointerEvents: 'none' },
    })
  }

  function addEdge(
    id: string, source: string, target: string,
    type: 'family' | 'spouse',
    sourceHandle?: string, targetHandle?: string,
  ) {
    if (seenEdges.has(id)) return
    seenEdges.add(id)
    edges.push({
      id, source, target, type,
      selectable: false,
      zIndex: 5,
      ...(sourceHandle ? { sourceHandle } : {}),
      ...(targetHandle ? { targetHandle } : {}),
    })
  }

  function walk(ln: LNode) {
    if (walkedHhIds.has(ln.hhId)) return
    walkedHhIds.add(ln.hhId)

    const isRoot      = roots.includes(ln)
    const hasAncestor = ln.ancestors.length > 0
    const coupleW = ln.wife ? COUPLE_W : SINGLE_W
    const headX   = ln.cx - coupleW / 2
    const wifeX   = ln.cx + COUPLE_GAP / 2

    // Head card — virtual ancestor households read as "Father"/"Mother"; everyone else "Head".
    // Top "+" only when this is a root AND has no in-household ancestor above it.
    const headRel = ancestorRelation.get(ln.hhId) ?? 'HEAD'
    addFamilyNode(ln.head.id, headX, ln.y, { ...ln.head, relation_code: headRel }, true, ln.hhId, isRoot && !hasAncestor)

    // Wife card + horizontal spouse line
    if (ln.wife) {
      addFamilyNode(ln.wife.id, wifeX, ln.y, ln.wife, false, ln.hhId, false)
      addEdge(
        `sp-${ln.head.id}-${ln.wife.id}`,
        ln.head.id, ln.wife.id,
        'spouse',
        'spouse-r', 'spouse-l',
      )
    }

    // Ancestor (father/mother) cards — vertical chain ABOVE the head.
    // ancestors[0] = closest to head, last = topmost (gets the blue "+" to add the next ancestor).
    if (hasAncestor) {
      const headCenterX = headX + CARD_W / 2
      let belowId = ln.head.id
      ln.ancestors.forEach((anc, i) => {
        const ancY  = ln.y - (NODE_SLOT + GEN_GAP) * (i + 1)
        const isTop = i === ln.ancestors.length - 1
        addFamilyNode(anc.id, headCenterX - CARD_W / 2, ancY, anc, false, ln.hhId, isTop)
        addEdge(`anclink-${ln.hhId}-${anc.id}`, anc.id, belowId, 'family', 'bottom', 'top')
        belowId = anc.id
      })
    }

    // Couples route parent-child lines through an invisible junction in the gap between the
    // two cards. A SINGLE head has no gap, so its lines attach to the head card's own
    // bottom/top handles — otherwise the line cuts across the single card.
    const hasWife    = !!ln.wife
    const downId     = hasWife ? `jxn-${ln.hhId}` : ln.head.id
    const downHandle = hasWife ? 'jxn-out' : 'bottom'

    if (hasWife) {
      addJunction(`jxn-${ln.hhId}`, ln.cx - 1, ln.y + CARD_MID - 1)
    }

    // Own member-children — always rendered (even alongside linked child households)
    ln.leafLayout.forEach(({ member, x }) => {
      addFamilyNode(member.id, x, ln.childY, member, false, ln.hhId, false)
      addEdge(`ch-${ln.hhId}-${member.id}`, downId, member.id, 'family', downHandle, 'top')
    })

    // Linked child households — attach to the child's junction (couple) or head top (single)
    ln.children.forEach(ch => {
      walk(ch)
      const chHasWife = !!ch.wife
      const upId      = chHasWife ? `jxn-${ch.hhId}` : ch.head.id
      const upHandle  = chHasWife ? 'jxn-in' : 'top'
      addEdge(`hhlink-${ln.hhId}-${ch.hhId}`, downId, upId, 'family', downHandle, upHandle)
      // Spouse-merged wife's child also gets a SEPARATE line from her card's right-centre
      // straight to the child head's TOP centre
      if (ln.wifeChildHhIds?.has(ch.hhId) && ln.wifeHeadId) {
        addEdge(`wlink-${ln.wifeHeadId}-${ch.hhId}`, ln.wifeHeadId, ch.head.id, 'family', 'spouse-r', 'top')
      }
    })
  }

  roots.forEach(r => walk(r))
  return { nodes, edges }
}

// ── Main component ────────────────────────────────────────────
export default function TreeCanvas({ allTrees, canEdit, crossLinks, onTreeUpdated }: Props) {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([])
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([])
  const [graphicMode, setGraphicMode]   = useState(false)
  const [linkMode, setLinkMode]         = useState(false)
  const [pendingLink, setPendingLink]   = useState<PendingLink | null>(null)
  const [ancestorTrigger, setAncestorTrigger] = useState<AncestorTrigger | null>(null)
  const [actionError, setActionError]   = useState('')

  const nhMap    = useRef<Map<string, string>>(new Map())
  const nnMap    = useRef<Map<string, string>>(new Map())
  const nodesRef = useRef<Node[]>([])
  const savedPos = useRef<Map<string, { x: number; y: number }>>(new Map())
  const rfInstance = useRef<any>(null)

  const handleAddRelative = useCallback((nodeId: string, pos: 'top' | 'bottom') => {
    const hid  = nhMap.current.get(nodeId) ?? ''
    const tree = allTrees.find(t => t.householdId === hid)
    if (!tree) return
    const isHeadClick = nodeId === tree.head.id
    setAncestorTrigger({
      householdId:    hid,
      headName:       nnMap.current.get(nodeId) ?? tree.head.name,
      gharNumber:     tree.gharNumber,
      // Pre-fill the imported father name only when adding above the head itself
      headFatherName: isHeadClick ? tree.headFatherName : null,
      subCasteId:     tree.head.sub_caste_id ?? '',
    })
  }, [allTrees])

  const handleUnlink = useCallback(async (householdId: string) => {
    setActionError('')
    const r = await removeHouseholdLink(householdId)
    if (r.error) { setActionError(r.error); return }
    onTreeUpdated()
  }, [onTreeUpdated])

  const handleMarkDeath = useCallback(async (id: string, isHead: boolean, year: number | null) => {
    setActionError('')
    const r = await setDeathYear(id, isHead ? 'household' : 'member', year)
    if (r.error) { setActionError(r.error); return }
    onTreeUpdated()
  }, [onTreeUpdated])

  useEffect(() => {
    if (allTrees.length === 0) { setNodes([]); setEdges([]); nodesRef.current = []; return }

    const roots = buildTree(allTrees, crossLinks)
    roots.forEach(r => computeWidths(r))

    let startX = 0
    roots.forEach(r => {
      assignPositions(r, startX, 0)
      startX += r.subtreeW + SIBLING_GAP * 2
    })

    const linkedChildHhIds = new Set(crossLinks.map(cl => cl.child_household_id))
    // Virtual ancestor households should display their relation (Father/Mother), not "Head"
    const virtualHhIds = new Set(allTrees.filter(t => t.isVirtual).map(t => t.householdId))
    const ancestorRelation = new Map<string, string>()
    crossLinks.forEach(cl => {
      if (virtualHhIds.has(cl.parent_household_id)) ancestorRelation.set(cl.parent_household_id, cl.relation)
    })
    const { nodes: newNodes, edges: newEdges } = buildFlowElements(
      roots, graphicMode, canEdit, linkMode, handleAddRelative, linkedChildHhIds, handleUnlink, ancestorRelation, handleMarkDeath
    )

    // Restore manually dragged positions — only for family card nodes
    newNodes.forEach(n => {
      if (n.type !== 'familyNode') return
      const saved = savedPos.current.get(n.id)
      if (saved) n.position = saved
    })

    // Build lookup maps for family card nodes only
    const nm = new Map<string, string>()
    const nn = new Map<string, string>()
    newNodes.forEach(n => {
      if (n.type !== 'familyNode') return
      const d = n.data as FamilyNodeData
      nm.set(n.id, d.householdId)
      nn.set(n.id, d.name)
    })
    nhMap.current    = nm
    nnMap.current    = nn
    nodesRef.current = newNodes
    setNodes(newNodes)
    setEdges(newEdges)
  }, [allTrees, crossLinks, graphicMode, canEdit, linkMode, handleAddRelative, handleUnlink, handleMarkDeath, setNodes, setEdges])

  const handleNodesChange = useCallback((changes: NodeChange[]) => {
    onNodesChange(changes)
    changes.forEach(c => {
      if (c.type === 'position' && (c as any).position) {
        const nid = (c as any).id as string
        // Only persist positions for draggable family card nodes
        if (nid.startsWith('jxn-')) return
        savedPos.current.set(nid, (c as any).position)
        nodesRef.current = nodesRef.current.map(n =>
          n.id === nid ? { ...n, position: (c as any).position } : n
        )
      }
    })
  }, [onNodesChange])

  const onNodeDragStop = useCallback((_: unknown, draggedNode: Node) => {
    if (!linkMode || draggedNode.type !== 'familyNode') return
    // Use React Flow's built-in overlap detection — reliable card-on-card hit testing
    const overlaps = rfInstance.current?.getIntersectingNodes(draggedNode) ?? []
    const target = overlaps.find((n: Node) => n.type === 'familyNode' && n.id !== draggedNode.id)
    if (target) {
      setPendingLink({
        sourceId:   draggedNode.id,
        targetId:   target.id,
        sourceName: nnMap.current.get(draggedNode.id) ?? 'Person',
        targetName: nnMap.current.get(target.id)     ?? 'Person',
      })
    }
  }, [linkMode])

  const onConnect = useCallback((c: Connection) => {
    if (!canEdit || !linkMode || !c.source || !c.target || c.source === c.target) return
    setPendingLink({
      sourceId:   c.source,
      targetId:   c.target,
      sourceName: nnMap.current.get(c.source) ?? 'Person',
      targetName: nnMap.current.get(c.target) ?? 'Person',
    })
  }, [canEdit, linkMode])

  async function handleLinkConfirm(relation: 'father' | 'mother' | 'spouse', sourceIsParent: boolean) {
    if (!pendingLink) return
    const { sourceId, targetId } = pendingLink
    const srcH = nhMap.current.get(sourceId)
    const tgtH = nhMap.current.get(targetId)
    if (!srcH || !tgtH) return
    setActionError('')

    if (srcH !== tgtH) {
      const parentH = sourceIsParent ? srcH : tgtH
      const childH  = sourceIsParent ? tgtH : srcH
      if (parentH === childH) { setActionError('Cannot link a family to itself.'); return }
      // Reject parent-child links that would create a loop (skip for spouse links)
      if (relation !== 'spouse') {
        let cur: string | null = parentH
        const seen = new Set<string>()
        while (cur) {
          if (cur === childH) { setActionError('That link would create a loop in the tree.'); return }
          if (seen.has(cur)) break
          seen.add(cur)
          cur = crossLinks.find(cl => cl.child_household_id === cur && cl.relation !== 'spouse')?.parent_household_id ?? null
        }
      }
      const r = await createHouseholdLink({ childHouseholdId: childH, parentHouseholdId: parentH, relation })
      if (r.error) { setActionError(r.error); return }
    } else {
      if (relation === 'spouse') {
        const r = await linkMembers(sourceId, 'spouse', targetId, srcH)
        if (r.error) { setActionError(r.error); return }
      } else {
        const parentId = sourceIsParent ? sourceId : targetId
        const childId  = sourceIsParent ? targetId : sourceId
        const r = await linkMembers(childId, relation, parentId, srcH)
        if (r.error) { setActionError(r.error); return }
      }
    }
    setPendingLink(null)
    onTreeUpdated()
  }

  return (
    <div style={{ width: '100%', height: '100%' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onInit={(inst) => { rfInstance.current = inst }}
        onNodesChange={handleNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeDragStop={onNodeDragStop}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        nodesDraggable={canEdit}
        fitView
        fitViewOptions={{ padding: 0.12, maxZoom: 1 }}
        minZoom={0.05}
        maxZoom={3}
        proOptions={{ hideAttribution: true }}
      >
        <Background color="#c8bfa8" gap={32} size={1} style={{ background: '#faf6ee' }} />
        <Controls showInteractive={false} position="bottom-right" />

        <Panel position="bottom-left">
          <div className="flex items-center gap-2 bg-white/90 backdrop-blur border border-gray-200 rounded-xl shadow px-3 py-1.5 text-xs">
            <div className="flex items-center bg-gray-100 rounded-lg p-0.5">
              <button
                onClick={() => setGraphicMode(false)}
                className={['px-2.5 py-1 rounded-md font-medium transition-colors',
                  !graphicMode ? 'bg-white shadow text-blue-700' : 'text-gray-400 hover:text-gray-600'].join(' ')}
              >
                Symbols
              </button>
              <button
                onClick={() => setGraphicMode(true)}
                className={['px-2.5 py-1 rounded-md font-medium transition-colors',
                  graphicMode ? 'bg-white shadow text-blue-700' : 'text-gray-400 hover:text-gray-600'].join(' ')}
              >
                Photos
              </button>
            </div>

            {canEdit && (
              <>
                <div className="w-px h-5 bg-gray-200" />
                <div
                  onClick={() => setLinkMode(v => !v)}
                  className="flex items-center gap-1.5 cursor-pointer"
                >
                  <div className={['relative w-7 h-4 rounded-full transition-colors',
                    linkMode ? 'bg-blue-500' : 'bg-gray-300'].join(' ')}>
                    <div className={['absolute top-0.5 left-0.5 w-3 h-3 bg-white rounded-full shadow transition-transform',
                      linkMode ? 'translate-x-3' : ''].join(' ')} />
                  </div>
                  <span className={linkMode ? 'text-blue-600 font-semibold text-xs' : 'text-gray-500 text-xs'}>
                    Link Mode
                  </span>
                </div>
              </>
            )}
          </div>
        </Panel>
      </ReactFlow>

      {actionError && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 bg-red-50 border border-red-200 text-red-700 text-xs px-4 py-2 rounded-xl shadow-lg z-50 flex items-center gap-2">
          <span>{actionError}</span>
          <button onClick={() => setActionError('')} className="ml-2 font-bold">×</button>
        </div>
      )}

      {pendingLink && (
        <LinkConfirmModal
          {...pendingLink}
          onConfirm={handleLinkConfirm}
          onCancel={() => setPendingLink(null)}
        />
      )}

      {ancestorTrigger && (
        <AddAncestorModal
          info={ancestorTrigger}
          onCreated={() => { setAncestorTrigger(null); onTreeUpdated() }}
          onCancel={() => setAncestorTrigger(null)}
        />
      )}
    </div>
  )
}
