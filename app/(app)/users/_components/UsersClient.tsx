'use client'

import { useState, useTransition } from 'react'
import { updateUserRole, toggleUserActive, createUser, updateUserPassword, deleteUser } from '@/app/actions/users'

type UserRole = 'chief' | 'admin' | 'verifier' | 'viewer'

interface Caste { id: string; name: string }
interface AppUser {
  id: string
  name: string
  email: string
  role: UserRole
  caste_id: string | null
  is_active: boolean
  created_at: string
}

const ROLE_COLORS: Record<UserRole, string> = {
  chief:    'bg-gold/15 text-gold',
  admin:    'bg-primary/15 text-primary',
  verifier: 'bg-success/15 text-success',
  viewer:   'bg-muted/40 text-muted-foreground',
}

const ROLES: UserRole[] = ['chief', 'admin', 'verifier', 'viewer']

export default function UsersClient({
  users,
  castes,
  currentUserId,
  isChief,
  isAdmin = false,
  adminCasteId,
}: {
  users: AppUser[]
  castes: Caste[]
  currentUserId: string
  isChief: boolean
  isAdmin?: boolean
  adminCasteId?: string
}) {
  const [selectedId, setSelectedId] = useState<string | 'new' | null>(null)
  const [formData, setFormData] = useState<{
    name: string
    email: string
    password: string
    role: UserRole
    caste_id: string
  }>({
    name: '',
    email: '',
    password: '',
    role: 'viewer',
    caste_id: '',
  })
  const [error, setError] = useState<string | null>(null)
  const [successPassword, setSuccessPassword] = useState<string | null>(null)
  const [successEmail, setSuccessEmail] = useState<string | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [generatedPassword, setGeneratedPassword] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const casteMap = new Map(castes.map(c => [c.id, c.name]))
  const selectedUser = users.find(u => u.id === selectedId)

  function openUser(u: AppUser) {
    setSelectedId(u.id)
    setFormData({
      name: u.name,
      email: u.email,
      password: '',
      role: u.role,
      caste_id: u.caste_id ?? '',
    })
    setError(null)
  }

  function openNewUserForm() {
    setSelectedId('new')
    setFormData({
      name: '',
      email: '',
      password: '',
      role: 'viewer',
      caste_id: adminCasteId || '',
    })
    setError(null)
  }

  function getInitial(name: string) {
    return name.charAt(0).toUpperCase()
  }

  function generatePasswordClient() {
    const upper = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
    const lower = 'abcdefghijklmnopqrstuvwxyz'
    const numbers = '0123456789'
    const special = '@#$%&*!'

    let password = ''
    password += upper[Math.floor(Math.random() * upper.length)]
    password += lower[Math.floor(Math.random() * lower.length)]
    password += numbers[Math.floor(Math.random() * numbers.length)]
    password += special[Math.floor(Math.random() * special.length)]

    const all = upper + lower + numbers + special
    for (let i = 0; i < 8; i++) {
      password += all[Math.floor(Math.random() * all.length)]
    }

    const shuffled = password.split('').sort(() => Math.random() - 0.5).join('')
    setFormData(f => ({ ...f, password: shuffled }))
    setGeneratedPassword(shuffled)
  }

  async function handleDelete(userId: string) {
    setError(null)
    startTransition(async () => {
      const result = await deleteUser(userId)
      if (result.error) {
        setError(result.error)
      } else {
        setDeleteConfirm(null)
        setSelectedId(null)
        setFormData({
          name: '',
          email: '',
          password: '',
          role: 'viewer',
          caste_id: '',
        })
      }
    })
  }

  async function handleSave() {
    if (!formData.name.trim()) {
      setError('Full name is required')
      return
    }

    if (selectedId === 'new' && !formData.email.trim()) {
      setError('Email is required for new users')
      return
    }

    setError(null)
    startTransition(async () => {
      let result: { error?: string; password?: string } | null = null

      if (selectedId === 'new') {
        // Create new user
        result = await createUser(
          formData.name,
          formData.email,
          formData.role,
          formData.caste_id || undefined,
          formData.password || undefined
        )
      } else if (selectedUser) {
        // Update existing user
        result = await updateUserRole(
          selectedUser.id,
          formData.role,
          formData.caste_id || undefined,
          formData.name || undefined,
          isChief ? formData.email || undefined : undefined
        )

        // If password provided and Chief, update password
        if (!result.error && isChief && formData.password.trim()) {
          const pwdResult = await updateUserPassword(selectedUser.id, formData.password)
          if (pwdResult.error) {
            result = pwdResult
          }
        }
      } else {
        setError('Please select a user to edit')
        return
      }

      if (result?.error) {
        setError(result.error)
      } else if (result) {
        setError(null)
        if (selectedId === 'new' && result.password) {
          // Show success modal with password
          setSuccessPassword(result.password)
          setSuccessEmail(formData.email)
        } else {
          // Edit mode - just close form
          setSelectedId(null)
          setFormData({
            name: '',
            email: '',
            password: '',
            role: 'viewer',
            caste_id: '',
          })
        }
      }
    })
  }

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      {/* Left - Users list */}
      <div className="lg:col-span-2">
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          {/* Header */}
          <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-muted/40">
            <h2 className="font-semibold text-foreground">Users ({users.length})</h2>
            <button onClick={openNewUserForm} className="px-3 py-1.5 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity">
              ➕ Add user
            </button>
          </div>

          {/* Users list */}
          <div className="divide-y divide-border">
            {users.map(user => (
              <button
                key={user.id}
                onClick={() => openUser(user)}
                className={`w-full px-6 py-4 text-left transition-colors hover:bg-muted/40 ${
                  selectedId === user.id ? 'bg-primary/5 border-l-2 border-l-primary' : ''
                } ${!user.is_active ? 'opacity-60' : ''}`}
              >
                <div className="flex items-start gap-3">
                  {/* Avatar */}
                  <div className="w-10 h-10 rounded-full heritage-gradient text-primary-foreground font-bold flex items-center justify-center flex-shrink-0">
                    {getInitial(user.name)}
                  </div>

                  {/* User info */}
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-foreground">{user.name}</div>
                    <div className="text-sm text-muted-foreground">{user.email}</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {user.caste_id ? casteMap.get(user.caste_id) ?? '—' : '—'}
                    </div>
                  </div>

                  {/* Role badge & Edit */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span
                      className={`px-2.5 py-1 text-xs font-semibold rounded-full capitalize ${ROLE_COLORS[user.role]}`}
                    >
                      ◆ {user.role}
                    </span>
                    <span
                      onClick={e => {
                        e.stopPropagation()
                        openUser(user)
                      }}
                      className="text-sm text-primary hover:underline cursor-pointer"
                    >
                      Edit
                    </span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Right - Edit form */}
      <div className="lg:col-span-1">
        {(selectedId === 'new' || selectedUser) && (
          <div className="bg-card rounded-xl border border-border p-6 h-fit">
            <h3 className="text-lg font-semibold text-foreground mb-4">👤 {selectedId === 'new' ? 'Add' : 'Edit'} user</h3>

            {error && (
              <div className="mb-4 bg-destructive/10 border border-destructive/30 rounded-lg px-3 py-2 text-sm text-destructive">
                {error}
              </div>
            )}

            <div className="space-y-4">
              {/* Full name */}
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                  Full name
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={e => setFormData(f => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. Mahadev Harchand Rai"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              {/* Email */}
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                  Email
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={selectedId === 'new' || isChief ? e => setFormData(f => ({ ...f, email: e.target.value })) : undefined}
                  placeholder="user@community.org"
                  disabled={selectedId !== 'new' && !isChief}
                  className={`w-full px-3 py-2 text-sm rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary ${selectedId !== 'new' && !isChief ? 'bg-muted text-muted-foreground opacity-60 cursor-not-allowed' : ''}`}
                  title={selectedId !== 'new' && !isChief ? 'Email can only be edited by Chief' : ''}
                />
              </div>

              {/* Password */}
              {(isChief || isAdmin) && (
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                    Password
                  </label>

                  <div>
                    {generatedPassword ? (
                      <div className="space-y-2">
                        <input
                          type="text"
                          value={formData.password}
                          readOnly
                          className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-muted text-foreground font-mono font-bold"
                        />
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(formData.password)
                              alert('Password copied to clipboard!')
                            }}
                            className="flex-1 px-3 py-1.5 text-xs font-semibold bg-primary/10 text-primary rounded hover:bg-primary/20 transition-colors"
                          >
                            📋 Copy Password
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setGeneratedPassword(null)
                              setFormData(f => ({ ...f, password: '' }))
                            }}
                            className="flex-1 px-3 py-1.5 text-xs font-semibold bg-muted text-foreground rounded hover:bg-muted/80 transition-colors"
                          >
                            ✨ Regenerate
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <input
                          type="text"
                          value={formData.password}
                          onChange={e => {
                            setFormData(f => ({ ...f, password: e.target.value }))
                            setGeneratedPassword(null)
                          }}
                          placeholder="Enter password manually or generate one"
                          className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                        <button
                          type="button"
                          onClick={generatePasswordClient}
                          className="w-full px-3 py-1.5 text-xs font-semibold bg-primary/10 text-primary rounded hover:bg-primary/20 transition-colors"
                        >
                          ✨ Generate Password
                        </button>
                      </div>
                    )}
                  </div>

                  <p className="text-xs text-muted-foreground mt-2">
                    {selectedId === 'new'
                      ? 'Click "Generate" to create a strong secure password'
                      : 'Click "Generate" to reset user\'s password'}
                  </p>
                </div>
              )}

              {/* Role */}
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                  Role
                </label>
                <select
                  value={formData.role}
                  onChange={e => setFormData(f => ({ ...f, role: e.target.value as UserRole }))}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  {ROLES.filter(r => {
                    // Chief: can assign all roles
                    if (isChief) return true
                    // Admin: can only assign verifier and viewer
                    return r !== 'chief' && r !== 'admin'
                  }).map(r => (
                    <option key={r} value={r} className="capitalize">
                      {r.charAt(0).toUpperCase() + r.slice(1)}
                    </option>
                  ))}
                </select>
              </div>

              {/* Assigned caste */}
              {isChief ? (
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                    Assigned caste
                  </label>
                  <select
                    value={formData.caste_id}
                    onChange={e => setFormData(f => ({ ...f, caste_id: e.target.value }))}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="">— None —</option>
                    {castes.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                    Assigned caste
                  </label>
                  <div className="px-3 py-2 text-sm rounded-lg border border-border bg-muted text-foreground">
                    {adminCasteId ? (
                      castes.find(c => c.id === adminCasteId)?.name || 'Unknown'
                    ) : (
                      '— None —'
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Auto-assigned to your caste
                  </p>
                </div>
              )}

              {/* Buttons */}
              <div className="flex gap-2">
                <button
                  onClick={handleSave}
                  disabled={isPending}
                  className="flex-1 px-4 py-2.5 text-sm font-semibold rounded-lg heritage-gradient text-primary-foreground hover:opacity-90 disabled:opacity-50 transition-opacity"
                >
                  {isPending ? 'Saving...' : 'Save user'}
                </button>

                {/* Delete button - only for editing non-Chief users */}
                {selectedId !== 'new' && selectedUser && selectedUser.role !== 'chief' && (
                  <button
                    onClick={() => setDeleteConfirm(selectedUser.id)}
                    disabled={isPending}
                    className="px-4 py-2.5 text-sm font-semibold rounded-lg bg-destructive/10 text-destructive hover:bg-destructive/20 disabled:opacity-50 transition-colors"
                    title="Delete this user"
                  >
                    🗑️
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Success Modal - Show Password */}
      {successPassword && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-xl p-6 shadow-xl max-w-sm w-full border border-border">
            <h3 className="text-lg font-semibold text-foreground mb-2">✅ User Created Successfully!</h3>
            <p className="text-sm text-muted-foreground mb-5">
              Share these credentials with the new user. They can change their password after first login.
            </p>

            {/* Email */}
            <div className="mb-4 p-3 bg-muted/30 rounded-lg border border-border">
              <p className="text-xs text-muted-foreground mb-1">Email:</p>
              <p className="text-sm font-medium text-foreground break-all">{successEmail}</p>
            </div>

            {/* Password */}
            <div className="mb-5 p-3 bg-muted/30 rounded-lg border border-border">
              <p className="text-xs text-muted-foreground mb-1">Temporary Password:</p>
              <p className="text-sm font-mono font-bold text-primary mb-2">{successPassword}</p>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(successPassword)
                  alert('Password copied to clipboard!')
                }}
                className="w-full px-2 py-1.5 text-xs font-medium bg-primary/10 text-primary rounded hover:bg-primary/20 transition-colors"
              >
                📋 Copy Password
              </button>
            </div>

            {/* Close Button */}
            <button
              onClick={() => {
                setSuccessPassword(null)
                setSuccessEmail(null)
                setSelectedId(null)
                setFormData({
                  name: '',
                  email: '',
                  password: '',
                  role: 'viewer',
                  caste_id: '',
                })
              }}
              className="w-full px-4 py-2 text-sm font-semibold heritage-gradient text-primary-foreground rounded-lg hover:opacity-90 transition-opacity"
            >
              Done
            </button>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && selectedUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-xl p-6 shadow-xl max-w-sm w-full border border-border">
            <h3 className="text-lg font-semibold text-foreground mb-2">Delete User?</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Are you sure you want to delete <strong>{selectedUser.name}</strong>? This action cannot be undone.
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => handleDelete(deleteConfirm)}
                disabled={isPending}
                className="flex-1 px-4 py-2 text-sm font-semibold bg-destructive text-destructive-foreground rounded-lg hover:opacity-90 disabled:opacity-50 transition-opacity"
              >
                {isPending ? 'Deleting...' : 'Delete'}
              </button>
              <button
                onClick={() => setDeleteConfirm(null)}
                disabled={isPending}
                className="flex-1 px-4 py-2 text-sm font-semibold text-foreground border border-border rounded-lg hover:bg-muted disabled:opacity-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
