import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { Save, Phone, Plus, X } from 'lucide-react';  // added Plus, X
import type { MamaFuaProfile, LaundryCenterProfile, ProviderPackage } from '../lib/types';

export default function ProfilePage() {
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [profile, setProfile] = useState<Partial<MamaFuaProfile & LaundryCenterProfile>>({});
  const [packages, setPackages] = useState<ProviderPackage[]>([]);
  const [loading, setLoading] = useState(true);

  // --- New state for adding a package ---
  const [showAddForm, setShowAddForm] = useState(false);
  const [newPackage, setNewPackage] = useState({
    package_name: '',
    description: '',
    price_tsh: 0,
  });
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    if (!user) return;
    loadProfile();
  }, [user]);

  async function loadProfile() {
    setLoading(true);
    if (user!.role === 'mama_fua') {
      const { data } = await supabase.from('mama_fua_profiles').select('*').eq('id', user!.id).single();
      if (data) setProfile(data);
    } else if (user!.role === 'laundry_center') {
      const { data } = await supabase.from('laundry_center_profiles').select('*').eq('id', user!.id).single();
      if (data) setProfile(data);
    }

    const { data: pkgs } = await supabase.from('provider_packages').select('*').eq('provider_id', user!.id);
    setPackages(pkgs || []);
    setLoading(false);
  }

  async function handleSave() {
    setSaving(true);
    if (user!.role === 'mama_fua') {
      await supabase.from('mama_fua_profiles').update({
        bio: profile.bio,
        service_radius_km: profile.service_radius_km,
        is_available: profile.is_available,
      }).eq('id', user!.id);
    } else if (user!.role === 'laundry_center') {
      await supabase.from('laundry_center_profiles').update({
        business_name: profile.business_name,
        address_text: profile.address_text,
        offers_pickup: profile.offers_pickup,
        pickup_fee_tsh: profile.pickup_fee_tsh,
        is_available: profile.is_available,
      }).eq('id', user!.id);
    }
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  async function updatePackage(pkg: ProviderPackage) {
    await supabase.from('provider_packages').update({ price_tsh: pkg.price_tsh, is_active: pkg.is_active }).eq('id', pkg.id);
    loadProfile();
  }

  // --- New function to add a package ---
  async function handleAddPackage() {
    if (!newPackage.package_name.trim() || newPackage.price_tsh <= 0) {
      alert('Please fill in package name and price.');
      return;
    }
    setAdding(true);
    const { error } = await supabase.from('provider_packages').insert({
      provider_id: user!.id,
      package_name: newPackage.package_name.trim(),
      description: newPackage.description.trim() || null,
      price_tsh: newPackage.price_tsh,
      is_active: true,
    });
    setAdding(false);
    if (error) {
      alert('Failed to add package: ' + error.message);
      return;
    }
    // Reset form and reload
    setNewPackage({ package_name: '', description: '', price_tsh: 0 });
    setShowAddForm(false);
    loadProfile();
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="w-8 h-8 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const isProvider = user?.role === 'mama_fua' || user?.role === 'laundry_center';

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Profile</h1>
        <p className="text-gray-500 mt-1">Manage your account settings</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-6">
        {/* Basic Info */}
        <div className="flex items-center gap-4 pb-6 border-b border-gray-100">
          <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold text-xl">
            {user?.full_name?.charAt(0) || 'U'}
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">{user?.full_name}</h2>
            <div className="flex items-center gap-4 text-sm text-gray-500 mt-1">
              <span className="flex items-center gap-1"><Phone className="w-3.5 h-3.5" /> {user?.phone}</span>
              <span className="capitalize">{user?.role.replace('_', ' ')}</span>
            </div>
          </div>
        </div>

        {isProvider && (
          <>
            {/* Availability */}
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-gray-900">Availability</h3>
                <p className="text-sm text-gray-500">Toggle to accept new orders</p>
              </div>
              <button
                onClick={() => setProfile(p => ({ ...p, is_available: !p.is_available }))}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${profile.is_available ? 'bg-emerald-600' : 'bg-gray-200'}`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${profile.is_available ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
            </div>

            {user?.role === 'mama_fua' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Bio</label>
                  <textarea
                    value={profile.bio || ''}
                    onChange={e => setProfile(p => ({ ...p, bio: e.target.value }))}
                    rows={3}
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Service Radius (km)</label>
                  <input
                    type="number"
                    value={profile.service_radius_km || 3}
                    onChange={e => setProfile(p => ({ ...p, service_radius_km: parseInt(e.target.value) }))}
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>
            )}

            {user?.role === 'laundry_center' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Business Name</label>
                  <input
                    type="text"
                    value={profile.business_name || ''}
                    onChange={e => setProfile(p => ({ ...p, business_name: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                  <input
                    type="text"
                    value={profile.address_text || ''}
                    onChange={e => setProfile(p => ({ ...p, address_text: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Offers Pickup</label>
                    <button
                      onClick={() => setProfile(p => ({ ...p, offers_pickup: !p.offers_pickup }))}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${profile.offers_pickup ? 'bg-emerald-600' : 'bg-gray-200'}`}
                    >
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${profile.offers_pickup ? 'translate-x-6' : 'translate-x-1'}`} />
                    </button>
                  </div>
                  {profile.offers_pickup && (
                    <div className="flex-1">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Pickup Fee (TSh)</label>
                      <input
                        type="number"
                        value={profile.pickup_fee_tsh || 0}
                        onChange={e => setProfile(p => ({ ...p, pickup_fee_tsh: parseInt(e.target.value) }))}
                        className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Packages */}
            <div className="pt-4 border-t border-gray-100">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-medium text-gray-900">Pricing Packages</h3>
                <button
                  onClick={() => setShowAddForm(!showAddForm)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-lg hover:bg-emerald-100 transition-colors text-sm font-medium"
                >
                  <Plus className="w-4 h-4" />
                  Add Package
                </button>
              </div>

              {/* Add Package Form */}
              {showAddForm && (
                <div className="bg-gray-50 rounded-lg p-4 mb-4 space-y-3 border border-gray-200">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Package Name *</label>
                    <input
                      type="text"
                      value={newPackage.package_name}
                      onChange={e => setNewPackage(p => ({ ...p, package_name: e.target.value }))}
                      placeholder="e.g. Wash & Fold"
                      className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                    <input
                      type="text"
                      value={newPackage.description}
                      onChange={e => setNewPackage(p => ({ ...p, description: e.target.value }))}
                      placeholder="e.g. Up to 5 kg clothes"
                      className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Price (TSh) *</label>
                    <input
                      type="number"
                      value={newPackage.price_tsh}
                      onChange={e => setNewPackage(p => ({ ...p, price_tsh: parseInt(e.target.value) || 0 }))}
                      placeholder="5000"
                      className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <div className="flex gap-2 justify-end">
                    <button
                      onClick={() => setShowAddForm(false)}
                      className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleAddPackage}
                      disabled={adding}
                      className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition-colors flex items-center gap-1"
                    >
                      {adding ? 'Adding...' : 'Add Package'}
                    </button>
                  </div>
                </div>
              )}

              {/* Package List */}
              <div className="space-y-3">
                {packages.map(pkg => (
                  <div key={pkg.id} className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">{pkg.package_name}</div>
                      <div className="text-xs text-gray-500">{pkg.description}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-500">TSh</span>
                      <input
                        type="number"
                        value={pkg.price_tsh}
                        onChange={e => {
                          const updated = { ...pkg, price_tsh: parseInt(e.target.value) || 0 };
                          updatePackage(updated);
                        }}
                        className="w-20 px-2 py-1 rounded border border-gray-200 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>
                    <button
                      onClick={() => updatePackage({ ...pkg, is_active: !pkg.is_active })}
                      className={`px-2.5 py-1 rounded text-xs font-medium ${pkg.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-200 text-gray-500'}`}
                    >
                      {pkg.is_active ? 'Active' : 'Inactive'}
                    </button>
                  </div>
                ))}
                {packages.length === 0 && (
                  <p className="text-sm text-gray-500">No packages configured yet. Add one above.</p>
                )}
              </div>
            </div>

            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full py-2.5 bg-emerald-600 text-white font-medium rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Saving...' : saved ? 'Saved!' : 'Save Changes'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
