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
      <div className="flex items-center gap-4 px-4 py-3 border-b border-border bg-background flex-shrink-0">
        <div className="min-w-0 flex-1">
          <h1 className="text-lg font-bold text-foreground truncate">
            Family Tree · {household.head_name}
          </h1>
          <p className="text-xs text-muted-foreground">
            Ghar #{household.ghar_number} · {totalMembers} members
          </p>
        </div>
      </div>

      {/* Tree — full height */}
      <div className="flex-1 overflow-hidden">
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
