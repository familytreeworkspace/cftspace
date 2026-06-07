import type { TreeMember, FamilyLink } from '@/lib/tree-utils'

export interface HouseholdTree {
  householdId: string
  gharNumber: string
  isVirtual?: boolean
  headFatherName?: string | null
  head: TreeMember
  members: TreeMember[]
  links: FamilyLink[]
}

export interface CrossHouseholdLink {
  id: string
  child_household_id: string
  parent_household_id: string
  relation: string
  link_type: string
}
