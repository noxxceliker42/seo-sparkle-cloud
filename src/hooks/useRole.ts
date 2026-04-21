import { useEffect, useState } from 'react'
import { supabase } from '@/integrations/supabase/client'

export type AppRole = 'admin' | 'editor' | 'viewer'

export function useRole() {
  const [role, setRole] = useState<AppRole | null>(null)
  const [firmId, setFirmId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoading(false); return }

      const [roleRes, profileRes] = await Promise.all([
        supabase.from('user_roles')
          .select('role').eq('user_id', user.id).maybeSingle(),
        supabase.from('profiles')
          .select('firm_id').eq('id', user.id).maybeSingle()
      ])

      setRole((roleRes.data?.role as AppRole) ?? null)
      setFirmId(profileRes.data?.firm_id ?? null)
      setLoading(false)
    }
    load()
  }, [])

  return {
    role,
    firmId,
    loading,
    canEdit: ['admin', 'editor'].includes(role ?? ''),
    canUseAI: ['admin', 'editor'].includes(role ?? ''),
    canManageTemplates: role === 'admin',
    isReadOnly: role === 'viewer'
  }
}
