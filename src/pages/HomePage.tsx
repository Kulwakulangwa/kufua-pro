async function loadProviders() {
  setLoading(true);
  const { data: users } = await supabase
    .from('users')
    .select('*')
    .in('role', ['mama_fua', 'laundry_center'])
    .eq('is_active', true);

  if (!users) { setLoading(false); return; }

  const mamaFuaIds = users.filter(u => u.role === 'mama_fua').map(u => u.id);
  const centerIds = users.filter(u => u.role === 'laundry_center').map(u => u.id);

  const [{ data: mamaFuas }, { data: centers }, { data: packages }] = await Promise.all([
    supabase.from('mama_fua_profiles').select('*').in('id', mamaFuaIds),
    supabase.from('laundry_center_profiles').select('*').in('id', centerIds).eq('is_approved', true),  // ✅ added filter
    supabase.from('provider_packages').select('*').in('provider_id', users.map(u => u.id)).eq('is_active', true),
  ]);

  // Rest of the function unchanged...
}
