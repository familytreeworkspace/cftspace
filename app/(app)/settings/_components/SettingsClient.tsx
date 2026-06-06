'use client'

import { useState, useTransition } from 'react'
import { saveAiCredential, deleteAiCredential } from '@/app/actions/settings'

interface AiCredential {
  id: string
  provider: string
  auth_type: string
  is_active: boolean
  created_at: string
}

export default function SettingsClient({
  userEmail,
  existingCredentials,
}: {
  userEmail: string
  existingCredentials: AiCredential[]
}) {
  const [credentialInput, setCredentialInput] = useState('')
  const [providerInput, setProviderInput] = useState('anthropic')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const AI_PROVIDERS = [
    {
      id: 'anthropic',
      label: 'Anthropic (Claude)',
      placeholder: 'sk-ant-api03-...',
      note: '$5 free credits on new account — console.anthropic.com',
      badge: 'Recommended',
    },
    {
      id: 'openai',
      label: 'OpenAI (GPT)',
      placeholder: 'sk-proj-...',
      note: 'Requires billing — platform.openai.com',
      badge: 'Paid',
    },
    {
      id: 'gemini',
      label: 'Google Gemini',
      placeholder: 'AIza...',
      note: 'Free tier available — aistudio.google.com',
      badge: 'Free',
    },
  ]

  const currentProvider = AI_PROVIDERS.find(p => p.id === providerInput) ?? AI_PROVIDERS[0]

  async function handleSaveCredential() {
    if (!providerInput.trim()) {
      setError('Provider name cannot be empty')
      return
    }
    if (!credentialInput.trim()) {
      setError('Credential value cannot be empty')
      return
    }

    setError(null)
    setSuccess(null)

    startTransition(async () => {
      const result = await saveAiCredential(providerInput, 'api_key', credentialInput)
      if (result.error) {
        setError(result.error)
      } else {
        setSuccess(`${currentProvider.label} API Key saved successfully`)
        setCredentialInput('')
        setProviderInput('anthropic')
      }
    })
  }

  async function handleDeleteCredential(
    credentialId: string,
    provider: string
  ) {
    if (!confirm(`Delete ${provider} credential?`)) return

    setError(null)
    setSuccess(null)

    startTransition(async () => {
      const result = await deleteAiCredential(credentialId)
      if (result.error) {
        setError(result.error)
      } else {
        setSuccess(`${provider} credential deleted`)
      }
    })
  }

  return (
    <div className="space-y-6">
      {/* Account Section */}
      <div className="bg-card rounded-xl border border-border p-6">
        <h2 className="text-lg font-semibold text-foreground mb-4">Account</h2>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground">
              Email Address
            </label>
            <div className="mt-1.5 px-3 py-2 bg-muted text-muted-foreground rounded-lg text-sm">
              {userEmail}
            </div>
          </div>
        </div>
      </div>

      {/* AI Credentials Section */}
      <div className="bg-card rounded-xl border border-border p-6">
        <h2 className="text-lg font-semibold text-foreground mb-4">
          🤖 AI Service Credentials
        </h2>
        <p className="text-sm text-muted-foreground mb-4">
          Add an API Key for any AI provider. Used for Sindhi/Hindi transliteration suggestions.
        </p>

        {/* Add New Credential */}
        <div className="bg-muted/30 border border-border rounded-lg p-4 mb-6">
          <h3 className="font-medium text-foreground mb-4">Add AI Provider API Key</h3>

          <div className="space-y-3">
            {/* Provider Dropdown */}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                AI Provider <span className="text-destructive">*</span>
              </label>
              <div className="grid grid-cols-3 gap-2">
                {AI_PROVIDERS.map(p => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => { setProviderInput(p.id); setCredentialInput('') }}
                    className={`flex flex-col items-start p-3 rounded-lg border text-left transition-all ${
                      providerInput === p.id
                        ? 'border-primary bg-primary/10'
                        : 'border-border bg-background hover:border-primary/50'
                    }`}
                  >
                    <div className="flex items-center gap-2 w-full mb-1">
                      <span className="text-sm font-semibold text-foreground truncate">
                        {p.id === 'anthropic' ? '🟠' : p.id === 'openai' ? '🟢' : '🔵'} {p.label.split(' ')[0]}
                      </span>
                      <span className={`ml-auto text-[10px] px-1.5 py-0.5 rounded font-medium ${
                        p.badge === 'Free' ? 'bg-success/15 text-success' :
                        p.badge === 'Recommended' ? 'bg-primary/15 text-primary' :
                        'bg-muted text-muted-foreground'
                      }`}>
                        {p.badge}
                      </span>
                    </div>
                    <p className="text-[10px] text-muted-foreground leading-tight">{p.note}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* API Key Input */}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                {currentProvider.label} — API Key <span className="text-destructive">*</span>
              </label>
              <input
                type="password"
                value={credentialInput}
                onChange={e => setCredentialInput(e.target.value)}
                placeholder={currentProvider.placeholder}
                className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Stored securely (encrypted). Never shared or logged.
              </p>
            </div>

            {/* Messages */}
            {error && (
              <div className="bg-destructive/10 border border-destructive/30 rounded-lg px-3 py-2 text-sm text-destructive">
                {error}
              </div>
            )}

            {success && (
              <div className="bg-success/10 border border-success/30 rounded-lg px-3 py-2 text-sm text-success">
                ✓ {success}
              </div>
            )}

            {/* Save Button */}
            <button
              onClick={handleSaveCredential}
              disabled={isPending}
              className="w-full px-4 py-2.5 text-sm font-semibold heritage-gradient text-primary-foreground rounded-lg hover:opacity-90 disabled:opacity-50 transition-opacity"
            >
              {isPending ? 'Saving...' : '💾 Save Credential'}
            </button>
          </div>
        </div>

        {/* Existing Credentials */}
        {existingCredentials.length > 0 && (
          <div>
            <h3 className="font-medium text-foreground mb-3">
              Configured Credentials
            </h3>
            <div className="space-y-2">
              {existingCredentials.map(cred => {
                return (
                  <div
                    key={cred.id}
                    className="flex items-center justify-between p-3 bg-muted/30 border border-border rounded-lg"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-foreground text-sm capitalize">
                          {cred.provider === 'anthropic' ? '🟠' : cred.provider === 'openai' ? '🟢' : cred.provider === 'gemini' ? '🔵' : '🤖'}
                          {' '}{AI_PROVIDERS.find(p => p.id === cred.provider)?.label ?? cred.provider}
                        </span>
                        {cred.is_active && (
                          <span className="px-2 py-0.5 bg-success/15 text-success rounded text-xs font-medium">
                            Active
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        API Key · Added {new Date(cred.created_at).toLocaleDateString()}
                      </div>
                    </div>
                    <button
                      onClick={() =>
                        handleDeleteCredential(cred.id, cred.provider)
                      }
                      disabled={isPending}
                      className="px-3 py-1.5 text-xs font-semibold text-destructive bg-destructive/10 rounded-lg hover:bg-destructive/20 disabled:opacity-50 transition-colors"
                    >
                      🗑️ Delete
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
