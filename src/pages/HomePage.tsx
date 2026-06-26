import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Search, MapPin, Star, Shirt, Building2, ChevronRight } from 'lucide-react';
import type { User, MamaFuaProfile, LaundryCenterProfile, ProviderPackage } from '../lib/types';

type ProviderResult = {
  user: User;
  profile: MamaFuaProfile | LaundryCenterProfile;
  packages: ProviderPackage[];
  type: 'mama_fua' | 'laundry_center';
};

export default function HomePage() {
  const [providers, setProviders] = useState<ProviderResult[]>([]);
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
      .in('role', ['mama_fua', 'laundry_center'])
      .eq('is_active', true);

    if (!users) { setLoading(false); return; }

    const mamaFuaIds = users.filter(u => u.role === 'mama_fua').map(u => u.id);
    const centerIds = users.filter(u => u.role === 'laundry_center').map(u => u.id);

    const [{ data: mamaFuas }, { data: centers }, { data: packages }] = await Promise.all([
      supabase.from('mama_fua_profiles').select('*').in('id', mamaFuaIds).eq('is_available', true),
      supabase.from('laundry_center_profiles').select('*').in('id', centerIds).eq('is_approved', true).eq('is_available', true),
      supabase.from('provider_packages').select('*').in('provider_id', users.map(u => u.id)).eq('is_active', true),
    ]);

    const pkgMap = new Map<string, ProviderPackage[]>();
    packages?.forEach(p => {
      if (!pkgMap.has(p.provider_id)) pkgMap.set(p.provider_id, []);
      pkgMap.get(p.provider_id)!.push(p);
    });

    const results: ProviderResult[] = [];

    mamaFuas?.forEach(p => {
      const u = users.find(x => x.id === p.id);
      if (u) {
        const pkgs = pkgMap.get(u.id) || [];
        if (pkgs.length > 0) {
          results.push({ user: u, profile: p, packages: pkgs, type: 'mama_fua' });
        }
      }
    });

    centers?.forEach(p => {
      const u = users.find(x => x.id === p.id);
      if (u) {
        const pkgs = pkgMap.get(u.id) || [];
        if (pkgs.length > 0) {
          results.push({ user: u, profile: p, packages: pkgs, type: 'laundry_center' });
        }
      }
    });

    setProviders(results);
    setLoading(false);
  }

  const filtered = providers.filter(p => {
    if (filterType !== 'all' && p.type !== filterType) return false;
    const q = search.toLowerCase();
    return (
      p.user.full_name.toLowerCase().includes(q) ||
      ('business_name' in p.profile && (p.profile as LaundryCenterProfile).business_name.toLowerCase().includes(q)) ||
      ('address_text' in p.profile && (p.profile as LaundryCenterProfile).address_text.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6">
      {/* Hero */}
      <div className="bg-gradient-to-br from-emerald-600 to-teal-700 rounded-2xl p-8 text-white">
        <h1 className="text-3xl font-bold mb-2">Find Laundry Near You</h1>
        <p className="text-emerald-100 mb-6">Connect with trusted Mama Fuas and laundry centers in Dar es Salaam</p>
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name or location..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-3 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-300"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setFilterType('all')}
              className={`px-4 py-3 rounded-xl font-medium transition-colors ${filterType === 'all' ? 'bg-white text-emerald-700' : 'bg-emerald-500/30 text-white hover:bg-emerald-500/50'}`}
            >
              All
            </button>
            <button
              onClick={() => setFilterType('mama_fua')}
              className={`px-4 py-3 rounded-xl font-medium transition-colors ${filterType === 'mama_fua' ? 'bg-white text-emerald-700' : 'bg-emerald-500/30 text-white hover:bg-emerald-500/50'}`}
            >
              Mama Fua
            </button>
            <button
              onClick={() => setFilterType('laundry_center')}
              className={`px-4 py-3 rounded-xl font-medium transition-colors ${filterType === 'laundry_center' ? 'bg-white text-emerald-700' : 'bg-emerald-500/30 text-white hover:bg-emerald-500/50'}`}
            >
              Centers
            </button>
          </div>
        </div>
      </div>

      {/* Results */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map(p => (
            <ProviderCard key={p.user.id} provider={p} />
          ))}
          {filtered.length === 0 && (
            <div className="col-span-full text-center py-12 text-gray-500">
              No providers found matching your search.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ProviderCard({ provider }: { provider: ProviderResult }) {
  const isCenter = provider.type === 'laundry_center';
  const profile = provider.profile as any;
  const minPrice = provider.packages.length > 0
    ? Math.min(...provider.packages.map(p => p.price_tsh))
    : null;

  return (
    <Link to={`/book/${provider.user.id}`} className="block group">
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow">
        <div className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center ${isCenter ? 'bg-blue-100 text-blue-600' : 'bg-amber-100 text-amber-600'}`}>
                {isCenter ? <Building2 className="w-6 h-6" /> : <Shirt className="w-6 h-6" />}
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 group-hover:text-emerald-600 transition-colors">
                  {isCenter ? profile.business_name : provider.user.full_name}
                </h3>
                <div className="flex items-center gap-1 text-sm text-gray-500">
                  <MapPin className="w-3.5 h-3.5" />
                  {isCenter ? profile.address_text : 'Home Service'}
                </div>
              </div>
            </div>
            {profile.average_rating && (
              <div className="flex items-center gap-1 bg-amber-50 px-2 py-1 rounded-lg">
                <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                <span className="text-sm font-medium text-amber-700">{profile.average_rating}</span>
              </div>
            )}
          </div>

          {isCenter && profile.offers_pickup && (
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-medium mb-3">
              Pickup Available
            </div>
          )}

          {provider.packages.length > 0 && (
            <div className="space-y-2 mb-4">
              {provider.packages.slice(0, 2).map(pkg => (
                <div key={pkg.id} className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">{pkg.package_name}</span>
                  <span className="font-medium text-gray-900">TSh {pkg.price_tsh.toLocaleString()}</span>
                </div>
              ))}
              {provider.packages.length > 2 && (
                <p className="text-xs text-gray-400">+{provider.packages.length - 2} more packages</p>
              )}
            </div>
          )}

          <div className="flex items-center justify-between pt-4 border-t border-gray-100">
            {minPrice && (
              <span className="text-sm text-gray-500">
                From <span className="font-semibold text-gray-900">TSh {minPrice.toLocaleString()}</span>
              </span>
            )}
            <span className="flex items-center gap-1 text-sm font-medium text-emerald-600 group-hover:gap-2 transition-all">
              Book Now <ChevronRight className="w-4 h-4" />
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
