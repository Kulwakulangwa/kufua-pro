import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Search, CheckCircle, XCircle, Star, Shirt, Building2 } from 'lucide-react';
import type { User, MamaFuaProfile, LaundryCenterProfile } from '../lib/types';

interface ProviderRow {
  user: User;
  profile: MamaFuaProfile | LaundryCenterProfile;
  type: 'mama_fua' | 'laundry_center';
}

export default function ProvidersPage() {
  const [providers, setProviders] = useState<ProviderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'mama_fua' | 'laundry_center'>('all');

  useEffect(() => {
    loadProviders();
  }, []);

  async function loadProviders() {
    setLoading(true);
    const { data: users } = await supabase
      .from('users')
      .select('*')
      .in('role', ['mama_fua', 'laundry_center']);

    if (!users) { setLoading(false); return; }

    const mamaIds = users.filter(u => u.role === 'mama_fua').map(u => u.id);
    const centerIds = users.filter(u => u.role === 'laundry_center').map(u => u.id);

    const [{ data: mamaFuas }, { data: centers }] = await Promise.all([
      supabase.from('mama_fua_profiles').select('*').in('id', mamaIds),
      supabase.from('laundry_center_profiles').select('*').in('id', centerIds),
    ]);

    const results: ProviderRow[] = [];
    mamaFuas?.forEach(p => {
      const u = users.find(x => x.id === p.id);
      if (u) results.push({ user: u, profile: p, type: 'mama_fua' });
    });
    centers?.forEach(p => {
      const u = users.find(x => x.id === p.id);
      if (u) results.push({ user: u, profile: p, type: 'laundry_center' });
    });

    setProviders(results);
    setLoading(false);
  }

  async function toggleApproval(id: string, current: boolean) {
    await supabase.from('laundry_center_profiles').update({ is_approved: !current }).eq('id', id);
    loadProviders();
  }

  async function toggleActive(id: string, current: boolean) {
    await supabase.from('users').update({ is_active: !current }).eq('id', id);
    loadProviders();
  }

  const filtered = providers.filter(p => {
    if (filterType !== 'all' && p.type !== filterType) return false;
    const q = search.toLowerCase();
    return (
      p.user.full_name.toLowerCase().includes(q) ||
      ('business_name' in p.profile && (p.profile as LaundryCenterProfile).business_name.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Providers</h1>
          <p className="text-gray-500 mt-1">Manage Mama Fuas and Laundry Centers</p>
        </div>
        <div className="flex gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search providers..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 pr-4 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <select
            value={filterType}
            onChange={e => setFilterType(e.target.value as any)}
            className="px-4 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="all">All Types</option>
            <option value="mama_fua">Mama Fua</option>
            <option value="laundry_center">Laundry Center</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left font-medium text-gray-500">Provider</th>
                  <th className="px-6 py-3 text-left font-medium text-gray-500">Type</th>
                  <th className="px-6 py-3 text-left font-medium text-gray-500">Rating</th>
                  <th className="px-6 py-3 text-left font-medium text-gray-500">Status</th>
                  <th className="px-6 py-3 text-left font-medium text-gray-500">Approved</th>
                  <th className="px-6 py-3 text-right font-medium text-gray-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map(p => {
                  const isCenter = p.type === 'laundry_center';
                  const centerProfile = isCenter ? p.profile as LaundryCenterProfile : null;
                  return (
                    <tr key={p.user.id} className="hover:bg-gray-50">
                      <td className="px-6 py-3">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${isCenter ? 'bg-blue-100 text-blue-600' : 'bg-amber-100 text-amber-600'}`}>
                            {isCenter ? <Building2 className="w-4 h-4" /> : <Shirt className="w-4 h-4" />}
                          </div>
                          <div>
                            <div className="font-medium text-gray-900">
                              {isCenter ? centerProfile!.business_name : p.user.full_name}
                            </div>
                            <div className="text-xs text-gray-500">{p.user.phone}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${isCenter ? 'bg-blue-50 text-blue-700' : 'bg-amber-50 text-amber-700'}`}>
                          {isCenter ? 'Laundry Center' : 'Mama Fua'}
                        </span>
                      </td>
                      <td className="px-6 py-3">
                        <div className="flex items-center gap-1">
                          <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                          <span className="font-medium">{p.profile.average_rating || '-'}</span>
                        </div>
                      </td>
                      <td className="px-6 py-3">
                        <button
                          onClick={() => toggleActive(p.user.id, p.user.is_active)}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
                            p.user.is_active
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-red-50 text-red-700 border-red-200'
                          }`}
                        >
                          {p.user.is_active ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                          {p.user.is_active ? 'Active' : 'Inactive'}
                        </button>
                      </td>
                      <td className="px-6 py-3">
                        {isCenter ? (
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${centerProfile!.is_approved ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-600'}`}>
                            {centerProfile!.is_approved ? 'Approved' : 'Pending'}
                          </span>
                        ) : (
                          <span className="text-gray-400 text-xs">N/A</span>
                        )}
                      </td>
                      <td className="px-6 py-3 text-right">
                        {isCenter && (
                          <button
                            onClick={() => toggleApproval(p.user.id, centerProfile!.is_approved)}
                            className="text-xs font-medium text-emerald-600 hover:text-emerald-700"
                          >
                            {centerProfile!.is_approved ? 'Revoke' : 'Approve'}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-gray-500">No providers found</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
