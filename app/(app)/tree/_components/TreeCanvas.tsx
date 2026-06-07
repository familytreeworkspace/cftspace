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
import { createHouseholdLink, linkMembers } from '@/app/actions/tree'
import type { HouseholdTree, CrossHouseholdLink } from './types'
import type { AncestorTrigger } from './MemberFlowNode'

// ── Layout constants ──────────────────────────────────────────
const CARD_W       = 130   // card width
const CARD_H       = 90    // card visual height (spacing constant)
const CARD_MID     = 53    // junction Y within card row — matches spouse handle & actual rendered card mid
const NODE_SLOT    = 115   // card + "+" button height (slot per node row)
const COUPLE_GAP   = 20    // gap between husband and wife cards
const SIBLING_GAP  = 60    // horizontal gap between sibling subtrees
const GEN_GAP      = 90    // vertical gap between parent row and child row
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
  if (isHead) return 'Head'
  const c = (code ?? '').toLowerCase().trim()
  if (['زال','zal','wife','spouse','w'].includes(c))           return 'Wife'
  if (['ٻت','bt','beta','son','بيٽو','بيٽا'].includes(c))     return 'Son'
  if (['ڏي','di','beti','daughter','بيٽي'].includes(c))        return 'Daughter'
  if (['ماءُ','ماء','maa','mother','mom','ماءَ'].includes(c))  return 'Mother'
  if (['father','dad','abu','پيءُ','پيءَ','باپ','پيو'].includes(c)) return 'Father'
  return code || '—'
}

const WIFE_CODES = new Set(['زال','zal','wife','spouse','w'])
function isWife(code: string) {
  return WIFE_CODES.has(code) || WIFE_CODES.has((code ?? '').toLowerCase())
}

// ── Layout tree node ──────────────────────────────────────────
interface LNode {
  hhId:         string
  gharNumber:   string
  head:         HouseholdTree['head']
  wife?:        HouseholdTree['members'][0]
  leafMembers:  HouseholdTree['members']   // sons/daughters with no child household
  children:     LNode[]                    // child household nodes
  // Computed:
  subtreeW:     number
  cx:           number   // center X of this subtree
  y:            number   // Y of this node's card row
}

// ── Step 1: build tree ────────────────────────────────────────
function buildTree(
  allTrees: HouseholdTree[],
  crossLinks: CrossHouseholdLink[],
): LNode[] {

  const childHhIds = new Set(crossLinks.map(cl => cl.child_household_id))

  const lnodeMap = new Map<string, LNode>()
  allTrees.forEach(t => {
    const wife     = t.members.find(m => isWife(m.relation_code))
    const nonWives = t.members.filter(m => !isWife(m.relation_code))
    lnodeMap.set(t.householdId, {
      hhId:        t.householdId,
      gharNumber:  t.gharNumber,
      head:        t.head,
      wife,
      leafMembers: nonWives,
      children:    [],
      subtreeW:    0,
      cx:          0,
      y:           0,
    })
  })

  crossLinks.forEach(cl => {
    const parent = lnodeMap.get(cl.parent_household_id)
    const child  = lnodeMap.get(cl.child_household_id)
    if (parent && child) parent.children.push(child)
  })

  return allTrees
    .filter(t => !childHhIds.has(t.householdId))
    .map(t => lnodeMap.get(t.householdId)!)
    .filter(Boolean)
}

// ── Step 2: compute subtree widths (bottom-up) ────────────────
function computeWidths(node: LNode): number {
  const coupleW = node.wife ? COUPLE_W : SINGLE_W

  if (node.children.length === 0) {
    const membersW = node.leafMembers.length > 0
      ? node.leafMembers.length * CARD_W + (node.leafMembers.length - 1) * MEMBER_GAP
      : 0
    node.subtreeW = Math.max(coupleW, membersW)
    return node.subtreeW
  }

  const childrenTotalW =
    node.children.reduce((s, ch) => s + computeWidths(ch), 0)
    + (node.children.length - 1) * SIBLING_GAP

  node.subtreeW = Math.max(coupleW, childrenTotalW)
  return node.subtreeW
}

// ── Step 3: assign positions (top-down) ──────────────────────
function assignPositions(node: LNode, startX: number, y: number) {
  node.cx = startX + node.subtreeW / 2
  node.y  = y

  if (node.children.length === 0) return

  const childrenTotalW =
    node.children.reduce((s, ch) => s + ch.subtreeW, 0)
    + (node.children.length - 1) * SIBLING_GAP

  let childX = node.cx - childrenTotalW / 2
  node.children.forEach(ch => {
    assignPositions(ch, childX, y + NODE_SLOT + GEN_GAP)
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
): { nodes: Node[]; edges: Edge[] } {

  const nodes: Node[] = []
  const edges: Edge[] = []
  const seenNodes   = new Set<string>()
  const seenEdges   = new Set<string>()
  const walkedHhIds = new Set<string>()

  function addFamilyNode(
    id: string, x: number, y: number,
    person: { name: string; gender: string; dob_year: number | null; photo_url: string | null; relation_code?: string },
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
        photoUrl:      person.photo_url,
        relationLabel: relLabel(person.relation_code ?? (isHead ? 'HEAD' : ''), isHead),
        graphicMode,
        canEdit,
        linkMode,
        isRoot,
        isHead,
        householdId: hhId,
        onAddRelative,
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

    const isRoot  = roots.includes(ln)
    const coupleW = ln.wife ? COUPLE_W : SINGLE_W
    const headX   = ln.cx - coupleW / 2
    const wifeX   = ln.cx + COUPLE_GAP / 2

    // Head card
    addFamilyNode(ln.head.id, headX, ln.y, { ...ln.head, relation_code: 'HEAD' }, true, ln.hhId, isRoot)

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

    const hasChildren = ln.children.length > 0 || ln.leafMembers.length > 0

    // One junction per household at CARD_MID height — same Y as the spouse line.
    // Top handle "jxn-in"  receives incoming parent→this edges.
    // Bottom handle "jxn-out" sends outgoing this→child edges.
    // Both are at the couple center X so lines appear between husband and wife.
    addJunction(`jxn-${ln.hhId}`, ln.cx - 1, ln.y + CARD_MID - 1)

    // Within-household leaf members (shown when no child households)
    if (ln.children.length === 0 && ln.leafMembers.length > 0) {
      const membersW = ln.leafMembers.length * CARD_W + (ln.leafMembers.length - 1) * MEMBER_GAP
      let mx = ln.cx - membersW / 2
      const memberY = ln.y + NODE_SLOT + GEN_GAP

      ln.leafMembers.forEach(m => {
        addFamilyNode(m.id, mx, memberY, m, false, ln.hhId, false)
        // Depart from parent couple-center (jxn-out) → arrive at member card top
        addEdge(`ch-${ln.hhId}-${m.id}`, `jxn-${ln.hhId}`, m.id, 'family', 'jxn-out', 'top')
        mx += CARD_W + MEMBER_GAP
      })
    }

    // Child households — jxn-out of parent → jxn-in of child
    ln.children.forEach(ch => {
      walk(ch)
      addEdge(
        `hhlink-${ln.hhId}-${ch.hhId}`,
        `jxn-${ln.hhId}`,
        `jxn-${ch.hhId}`,
        'family',
        'jxn-out',
        'jxn-in',
      )
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

  const handleAddRelative = useCallback((nodeId: string, pos: 'top' | 'bottom') => {
    const hid  = nhMap.current.get(nodeId) ?? ''
    const tree = allTrees.find(t => t.householdId === hid)
    if (!tree) return
    setAncestorTrigger({
      householdId:    hid,
      headName:       tree.head.name,
      gharNumber:     tree.gharNumber,
      headFatherName: tree.headFatherName,
      subCasteId:     tree.head.sub_caste_id ?? '',
    })
  }, [allTrees])

  useEffect(() => {
    if (allTrees.length === 0) { setNodes([]); setEdges([]); nodesRef.current = []; return }

    const roots = buildTree(allTrees, crossLinks)
    roots.forEach(r => computeWidths(r))

    let startX = 0
    roots.forEach(r => {
      assignPositions(r, startX, 0)
      startX += r.subtreeW + SIBLING_GAP * 2
    })

    const { nodes: newNodes, edges: newEdges } = buildFlowElements(
      roots, graphicMode, canEdit, linkMode, handleAddRelative
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
  }, [allTrees, crossLinks, graphicMode, canEdit, linkMode, handleAddRelative, setNodes, setEdges])

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
    if (!linkMode) return
    const target = nodesRef.current.find(n => {
      if (n.id === draggedNode.id || n.type !== 'familyNode') return false
      const dx = Math.abs(n.position.x - draggedNode.position.x)
      const dy = Math.abs(n.position.y - draggedNode.position.y)
      return dx < CARD_W * 0.8 && dy < CARD_H * 0.8
    })
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
