import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceKey  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const anonKey     = Deno.env.get('SUPABASE_ANON_KEY')!

    // Verify caller is an authenticated admin
    const authHeader = req.headers.get('Authorization') ?? ''
    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    })
    const { data: { user } } = await callerClient.auth.getUser()
    if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: cors })

    const { data: profile } = await callerClient
      .from('profiles').select('role').eq('id', user.id).single()
    if (profile?.role !== 'admin')
      return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: cors })

    // All writes use service-role client — bypasses RLS
    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    const { action, id, ...payload } = await req.json()

    if (action === 'update') {
      const { error } = await admin
        .from('profiles')
        .update({ name: payload.name, role: payload.role })
        .eq('id', id)
      if (error) return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: cors })
      return new Response(JSON.stringify({ ok: true }), { headers: { ...cors, 'Content-Type': 'application/json' } })
    }

    if (action === 'delete') {
      // Hard delete from auth — cascades to profiles via ON DELETE CASCADE
      const { error } = await admin.auth.admin.deleteUser(id)
      if (error) return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: cors })
      return new Response(JSON.stringify({ ok: true }), { headers: { ...cors, 'Content-Type': 'application/json' } })
    }

    return new Response(JSON.stringify({ error: 'Unknown action' }), { status: 400, headers: cors })
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: cors })
  }
})
