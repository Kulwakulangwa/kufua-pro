import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { MapPin, Calendar, Phone, User, CreditCard, ChevronLeft } from 'lucide-react';
import type { User as UserType, MamaFuaProfile, LaundryCenterProfile, ProviderPackage, OrderType } from '../lib/types';

export default function BookPage() {
  const { providerId } = useParams<{ providerId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [provider, setProvider] = useState<UserType | null>(null);
  const [profile, setProfile] = useState<MamaFuaProfile | LaundryCenterProfile | null>(null);
  const [packages, setPackages] = useState<ProviderPackage[]>([]);
  const [selectedPackage, setSelectedPackage] = useState<ProviderPackage | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    customerName: user?.full_name || '',
    customerPhone: user?.phone || '',
    pickupAddress: '',
    scheduledDate: '',
    notes: '',
    orderType: 'mama_fua_pickup' as OrderType,
  });

  useEffect(() => {
    if (!providerId) return;
    loadProvider();
  }, [providerId]);

  async function loadProvider() {
    const { data: u } = await supabase.from('users').select('*').eq('id', providerId).single();
    if (!u) { setLoading(false); return; }
    setProvider(u);

    if (u.role === 'mama_fua') {
      const { data: p } = await supabase.from('mama_fua_profiles').select('*').eq('id', providerId).single();
      setProfile(p || null);
      setForm(f => ({ ...f, orderType: 'mama_fua_pickup' }));
    } else {
      const { data: p } = await supabase.from('laundry_center_profiles').select('*').eq('id', providerId).single();
      setProfile(p || null);
      setForm(f => ({ ...f, orderType: p?.offers_pickup ? 'center_pickup' : 'center_dropoff' }));
    }

    const { data: pkgs } = await supabase.from('provider_packages').select('*').eq('provider_id', providerId).eq('is_active', true);
    setPackages(pkgs || []);
    if (pkgs && pkgs.length > 0) setSelectedPackage(pkgs[0]);
    setLoading(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedPackage || !provider) return;

    setSubmitting(true);
    const total = selectedPackage.price_tsh + (form.orderType === 'center_pickup' && (profile as LaundryCenterProfile)?.pickup_fee_tsh ? (profile as LaundryCenterProfile).pickup_fee_tsh! : 0);

    const { error } = await supabase.from('orders').insert({
      customer_id: user?.id || null,
      customer_phone: form.customerPhone,
      customer_name: form.customerName || 'Guest',
      provider_id: provider.id,
      provider_type: provider.role === 'mama_fua' ? 'mama_fua' : 'laundry_center',
      order_type: form.orderType,
      package_id: selectedPackage.id,
      status: 'pending',
      total_amount_tsh: total,
      pickup_address: form.pickupAddress || null,
      scheduled_date: form.scheduledDate,
      notes: form.notes || null,
    });

    setSubmitting(false);
    if (error) {
      alert('Failed to place order: ' + error.message);
    } else {
      navigate('/my-orders');
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="w-8 h-8 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!provider || !profile) {
    return <div className="text-center py-12 text-gray-500">Provider not found</div>;
  }

  const isCenter = provider.role === 'laundry_center';
  const centerProfile = isCenter ? profile as LaundryCenterProfile : null;

  return (
    <div className="max-w-2xl mx-auto">
      <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900 mb-4">
        <ChevronLeft className="w-4 h-4" /> Back
      </button>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-100">
          <h1 className="text-xl font-bold text-gray-900">
            Book {isCenter ? centerProfile!.business_name : provider.full_name}
          </h1>
          <div className="flex items-center gap-1 text-sm text-gray-500 mt-1">
            <MapPin className="w-4 h-4" />
            {isCenter ? centerProfile!.address_text : 'Home Service Provider'}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Package Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Select Package</label>
            <div className="grid grid-cols-2 gap-3">
              {packages.map(pkg => (
                <button
                  key={pkg.id}
                  type="button"
                  onClick={() => setSelectedPackage(pkg)}
                  className={`p-4 rounded-lg border text-left transition-all ${
                    selectedPackage?.id === pkg.id
                      ? 'border-emerald-500 bg-emerald-50 ring-1 ring-emerald-500'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="font-medium text-gray-900">{pkg.package_name}</div>
                  <div className="text-sm text-gray-500">{pkg.description}</div>
                  <div className="text-lg font-bold text-emerald-600 mt-1">TSh {pkg.price_tsh.toLocaleString()}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Order Type */}
          {isCenter && centerProfile?.offers_pickup && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Service Type</label>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setForm(f => ({ ...f, orderType: 'center_dropoff' }))}
                  className={`flex-1 py-3 px-4 rounded-lg border text-sm font-medium transition-all ${
                    form.orderType === 'center_dropoff'
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                      : 'border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}
                >
                  Drop-off at Center
                </button>
                <button
                  type="button"
                  onClick={() => setForm(f => ({ ...f, orderType: 'center_pickup' }))}
                  className={`flex-1 py-3 px-4 rounded-lg border text-sm font-medium transition-all ${
                    form.orderType === 'center_pickup'
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                      : 'border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}
                >
                  Pickup (+TSh {centerProfile.pickup_fee_tsh?.toLocaleString()})
                </button>
              </div>
            </div>
          )}

          {/* Customer Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Your Name</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  required
                  type="text"
                  value={form.customerName}
                  onChange={e => setForm(f => ({ ...f, customerName: e.target.value }))}
                  className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  placeholder="John Doe"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  required
                  type="tel"
                  value={form.customerPhone}
                  onChange={e => setForm(f => ({ ...f, customerPhone: e.target.value }))}
                  className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  placeholder="+255..."
                />
              </div>
            </div>
          </div>

          {/* Pickup Address */}
          {(form.orderType === 'mama_fua_pickup' || form.orderType === 'center_pickup') && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Pickup/Delivery Address</label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  required
                  type="text"
                  value={form.pickupAddress}
                  onChange={e => setForm(f => ({ ...f, pickupAddress: e.target.value }))}
                  className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  placeholder="Enter your address..."
                />
              </div>
            </div>
          )}

          {/* Scheduled Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Preferred Date</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                required
                type="date"
                value={form.scheduledDate}
                onChange={e => setForm(f => ({ ...f, scheduledDate: e.target.value }))}
                min={new Date().toISOString().split('T')[0]}
                className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Special Instructions (optional)</label>
            <textarea
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              rows={3}
              className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent resize-none"
              placeholder="Any special requests..."
            />
          </div>

          {/* Total */}
          {selectedPackage && (
            <div className="bg-gray-50 rounded-lg p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-gray-400" />
                <span className="text-sm text-gray-600">Total Amount</span>
              </div>
              <span className="text-xl font-bold text-gray-900">
                TSh {(
                  selectedPackage.price_tsh +
                  (form.orderType === 'center_pickup' && centerProfile?.pickup_fee_tsh ? centerProfile.pickup_fee_tsh : 0)
                ).toLocaleString()}
              </span>
            </div>
          )}

          <button
            type="submit"
            disabled={submitting || !selectedPackage}
            className="w-full py-3 px-4 bg-emerald-600 text-white font-medium rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {submitting ? 'Placing Order...' : 'Place Order'}
          </button>
        </form>
      </div>
    </div>
  );
}
