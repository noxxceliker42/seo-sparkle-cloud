import { useEffect, useState } from 'react'
import { supabase } from '@/integrations/supabase/client'

export type AppRole = 'admin' | 'editor' | 'viewer'

export function useRole() {
  const [role, setRole] = useState<AppRole | null>(null)
  const [firmId, setFirmId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user || cancelled) {
          if (!cancelled) setLoading(false)
          return
        }

        const [roleRes, profileRes] = await Promise.all([
          supabase.from('user_roles')
            .select('role').eq('user_id', user.id).maybeSingle(),
          supabase.from('profiles')
            .select('firm_id').eq('id', user.id).maybeSingle()
        ])

        if (cancelled) return

        setRole((roleRes.data?.role as AppRole) ?? null)
        setFirmId(profileRes.data?.firm_id ?? null)
      } catch (err) {
        console.error('useRole error:', err)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  return {
    role,
    firmId,
    loading,
    canEdit: role === 'admin' || role === 'editor',
    canUseAI: role === 'admin' || role === 'editor',
    canManageTemplates: role === 'admin',
    isReadOnly: role === 'viewer' || role === null,
  }
}
