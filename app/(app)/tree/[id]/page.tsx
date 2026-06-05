import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import FamilyTree from './_components/FamilyTree'
import type { TreeMember, FamilyLink } from '@/lib/tree-utils'

export default async function TreePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('users').select('role').eq('id', user.id).single()
  if (!profile) redirect('/login')

  // Fetch household
  const { data: household } = await supabase
    .from('households')
    .select('id, ghar_number, head_name, head_gender, dob_year, sub_caste_id, photo_url')
    .eq('id', id)
    .single()

  if (!household) notFound()

  // Fetch members
  const { data: membersRaw } = await supabase
    .from('members')
    .select('id, name, gender, relation_code, dob_year, photo_url, sub_caste_id, household_id')
    .eq('household_id', id)
    .order('member_number')

  // Fetch family links for all members in this household
  const memberIds = [household.id, ...(membersRaw ?? []).map(m => m.id)]
  const { data: linksRaw } = await supabase
    .from('family_links')
    .select('id, member_id, father_id, mother_id, spouse_id, link_type')
    .in('member_id', memberIds)

  // Build head as TreeMember
  const head: TreeMember = {
    id:           household.id,
    name:         household.head_name,
    gender:       household.head_gender as 'Male' | 'Female',
    relation_code: 'HEAD',
    dob_year:     household.dob_year,
    photo_url:    household.photo_url,
    sub_caste_id: household.sub_caste_id,
    household_id: household.id,
    is_head:      true,
  }

  const members: TreeMember[] = (membersRaw ?? []).map(m => ({
    id:           m.id,
    name:         m.name,
    gender:       m.gender as 'Male' | 'Female',
    relation_code: m.relation_code,
    dob_year:     m.dob_year,
    photo_url:    m.photo_url,
    sub_caste_id: m.sub_caste_id,
    household_id: m.household_id,
  }))

  const links: FamilyLink[] = (linksRaw ?? []).map(l => ({
    id:        l.id,
    member_id: l.member_id,
    father_id: l.father_id,
    mother_id: l.mother_id,
    spouse_id: l.spouse_id,
    link_type: l.link_type,
  }))

  const canEdit = ['chief', 'admin'].includes(profile.role)

  const totalMembers = 1 + (members?.length ?? 0)

  return (
    <div className="flex flex-col h-full -m-4 sm:-m-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 px-4 py-4 border-b border-border bg-background flex-shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Family Tree · {household.head_name}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {(members?.length ?? 0) + 1} generations · {totalMembers} members
          </p>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-3">
          {/* Mode toggle - Segmented Control */}
          <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
            <button className="px-3 py-1.5 text-sm font-medium rounded transition-colors text-foreground hover:bg-accent">
              📊 Graphic
            </button>
            <button className="px-3 py-1.5 text-sm font-medium rounded heritage-gradient text-primary-foreground">
              ◆ Symbols
            </button>
          </div>

          {/* Search */}
          <button className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-accent rounded transition-colors" title="Search">
            🔍
          </button>

          {/* Fullscreen */}
          <button className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-accent rounded transition-colors" title="Fullscreen">
            ⛶
          </button>
        </div>
      </div>

      {/* Tree container with zoom controls */}
      <div className="flex-1 overflow-hidden relative">
        {/* Zoom controls - top right */}
        <div className="absolute top-4 right-4 z-10 flex items-center gap-2 bg-card rounded-lg border border-border p-2 shadow">
          <span className="text-xs font-medium text-muted-foreground px-2">80%</span>
          <button className="w-8 h-8 rounded flex items-center justify-center hover:bg-accent transition-colors text-muted-foreground hover:text-foreground" title="Zoom out">
            −
          </button>
          <button className="w-8 h-8 rounded flex items-center justify-center hover:bg-accent transition-colors text-muted-foreground hover:text-foreground" title="Zoom in">
            +
          </button>
          <button className="px-2 py-1 text-xs font-medium rounded border border-border hover:bg-accent transition-colors text-foreground">
            Reset
          </button>
          <span className="text-xs font-medium text-muted-foreground px-2">100%</span>
        </div>

        {/* Tree */}
        <FamilyTree
          head={head}
          members={members}
          links={links}
          householdId={id}
          canEdit={canEdit}
        />
      </div>
    </div>
  )
}
