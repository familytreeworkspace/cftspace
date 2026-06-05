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
  const [authTypeInput, setAuthTypeInput] = useState('api_key')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const authTypes = [
    { id: 'api_key', label: 'API Key', placeholder: 'sk_... or api_key_...' },
    { id: 'user_id', label: 'User ID', placeholder: 'user_12345 or username' },
    { id: 'email', label: 'Email', placeholder: 'admin@company.com' },
    { id: 'token', label: 'Access Token', placeholder: 'token_xxxxx...' },
    { id: 'custom', label: 'Custom Credential', placeholder: 'Enter your credential' },
  ]

  const currentAuthType = authTypes.find(a => a.id === authTypeInput)

  async function handleSaveCredential() {
    if (!providerInput.trim()) {
      setError('Provider name cannot be empty')
      return
    }
    if (!authTypeInput.trim()) {
      setError('Authentication type is required')
      return
    }
    if (!credentialInput.trim()) {
      setError('Credential value cannot be empty')
      return
    }

    setError(null)
    setSuccess(null)

    startTransition(async () => {
      const result = await saveAiCredential(
        providerInput.trim(),
        authTypeInput,
        credentialInput
      )
      if (result.error) {
        setError(result.error)
      } else {
        setSuccess(
          `${providerInput} (${currentAuthType?.label}) saved successfully`
        )
        setCredentialInput('')
        setProviderInput('anthropic')
        setAuthTypeInput('api_key')
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
          Add credentials for any AI service. Support API Keys, User IDs, Emails, Tokens, or custom credentials.
        </p>

        {/* Add New Credential */}
        <div className="bg-muted/30 border border-border rounded-lg p-4 mb-6">
          <h3 className="font-medium text-foreground mb-4">
            Add New AI Service Credential
          </h3>

          <div className="space-y-3">
            {/* Provider Name */}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                AI Provider Name <span className="text-destructive">*</span>
              </label>
              <input
                type="text"
                value={providerInput}
                onChange={e => setProviderInput(e.target.value)}
                placeholder="e.g. anthropic, openai, gemini, custom-service"
                className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Examples: anthropic, openai, gemini, huggingface, etc.
              </p>
            </div>

            {/* Authentication Type */}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                Authentication Type <span className="text-destructive">*</span>
              </label>
              <select
                value={authTypeInput}
                onChange={e => setAuthTypeInput(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              >
                {authTypes.map(auth => (
                  <option key={auth.id} value={auth.id}>
                    {auth.label}
                  </option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground mt-1">
                Choose how you authenticate with {providerInput || 'this service'}
              </p>
            </div>

            {/* Credential Value */}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                {currentAuthType?.label} <span className="text-destructive">*</span>
              </label>
              <input
                type="password"
                value={credentialInput}
                onChange={e => setCredentialInput(e.target.value)}
                placeholder={currentAuthType?.placeholder}
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
                const authLabel =
                  authTypes.find(a => a.id === cred.auth_type)?.label ||
                  cred.auth_type
                return (
                  <div
                    key={cred.id}
                    className="flex items-center justify-between p-3 bg-muted/30 border border-border rounded-lg"
                  >
                    <div className="flex-1">
                      <div className="font-medium text-foreground text-sm capitalize">
                        {cred.provider}
                        <span className="ml-2 text-xs bg-primary/15 text-primary px-2 py-0.5 rounded">
                          {authLabel}
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        Added {new Date(cred.created_at).toLocaleDateString()}
                        {cred.is_active && (
                          <span className="ml-2 inline-block px-2 py-0.5 bg-success/15 text-success rounded text-xs font-medium">
                            Active
                          </span>
                        )}
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
