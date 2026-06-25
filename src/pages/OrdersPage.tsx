import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import StatusBadge from '../components/StatusBadge';
import { Search, ChevronDown, ChevronUp } from 'lucide-react';
import type { Order, OrderStatus } from '../lib/types';

const statusOptions: OrderStatus[] = ['pending', 'confirmed', 'collected', 'washing', 'ready', 'delivered', 'cancelled'];

export default function OrdersPage() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<OrderStatus | 'all'>('all');
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    loadOrders();
  }, [user]);

  async function loadOrders() {
    setLoading(true);
    let query = supabase.from('orders')
      .select('*, provider:users!orders_provider_id_fkey(full_name, phone), customer:users!orders_customer_id_fkey(full_name, phone), package:provider_packages(*)')
      .order('created_at', { ascending: false });

    if (user!.role === 'mama_fua' || user!.role === 'laundry_center') {
      query = query.eq('provider_id', user!.id);
    } else if (user!.role === 'customer') {
      query = query.eq('customer_id', user!.id);
    }

    const { data } = await query;
    setOrders(data || []);
    setLoading(false);
  }

  async function updateStatus(orderId: string, newStatus: OrderStatus) {
    const { error } = await supabase.from('orders').update({ status: newStatus }).eq('id', orderId);
    if (!error) {
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
    }
  }

  const filtered = orders.filter(o => {
    const matchesSearch = (
      o.customer_name.toLowerCase().includes(search.toLowerCase()) ||
      (o.customer_phone || '').includes(search) ||
      ((o.provider as any)?.full_name || '').toLowerCase().includes(search.toLowerCase())
    );
    const matchesStatus = statusFilter === 'all' || o.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Orders</h1>
          <p className="text-gray-500 mt-1">Manage and track all orders</p>
        </div>
        <div className="flex gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search orders..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 pr-4 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value as OrderStatus | 'all')}
            className="px-4 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="all">All Status</option>
            {statusOptions.map(s => (
              <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
            ))}
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
                  <th className="px-6 py-3 text-left font-medium text-gray-500">Order</th>
                  <th className="px-6 py-3 text-left font-medium text-gray-500">Customer</th>
                  <th className="px-6 py-3 text-left font-medium text-gray-500">Provider</th>
                  <th className="px-6 py-3 text-left font-medium text-gray-500">Amount</th>
                  <th className="px-6 py-3 text-left font-medium text-gray-500">Status</th>
                  <th className="px-6 py-3 text-left font-medium text-gray-500">Date</th>
                  <th className="px-6 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map(order => (
                  <>
                    <tr key={order.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => setExpandedOrder(expandedOrder === order.id ? null : order.id)}>
                      <td className="px-6 py-3">
                        <div className="font-mono text-xs text-gray-500">{order.id.slice(0, 8)}</div>
                        <div className="text-xs text-gray-400">{(order.package as any)?.package_name}</div>
                      </td>
                      <td className="px-6 py-3">
                        <div className="text-gray-900">{order.customer_name}</div>
                        <div className="text-xs text-gray-500">{order.customer_phone}</div>
                      </td>
                      <td className="px-6 py-3 text-gray-900">{(order.provider as any)?.full_name || '-'}</td>
                      <td className="px-6 py-3 font-medium text-gray-900">TSh {order.total_amount_tsh.toLocaleString()}</td>
                      <td className="px-6 py-3"><StatusBadge status={order.status} /></td>
                      <td className="px-6 py-3 text-gray-500">{new Date(order.created_at).toLocaleDateString()}</td>
                      <td className="px-6 py-3">
                        {expandedOrder === order.id ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                      </td>
                    </tr>
                    {expandedOrder === order.id && (
                      <tr>
                        <td colSpan={7} className="px-6 py-4 bg-gray-50">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                            <div>
                              <p className="text-gray-500">Order Type</p>
                              <p className="font-medium text-gray-900">{order.order_type.replace(/_/g, ' ')}</p>
                            </div>
                            <div>
                              <p className="text-gray-500">Scheduled Date</p>
                              <p className="font-medium text-gray-900">{order.scheduled_date}</p>
                            </div>
                            {order.pickup_address && (
                              <div className="sm:col-span-2">
                                <p className="text-gray-500">Address</p>
                                <p className="font-medium text-gray-900">{order.pickup_address}</p>
                              </div>
                            )}
                            {order.notes && (
                              <div className="sm:col-span-2">
                                <p className="text-gray-500">Notes</p>
                                <p className="font-medium text-gray-900">{order.notes}</p>
                              </div>
                            )}
                            {(user?.role === 'mama_fua' || user?.role === 'laundry_center') && order.provider_id === user?.id && (
                              <div className="sm:col-span-2">
                                <p className="text-gray-500 mb-2">Update Status</p>
                                <div className="flex flex-wrap gap-2">
                                  {statusOptions.map(s => (
                                    <button
                                      key={s}
                                      onClick={() => updateStatus(order.id, s)}
                                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                                        order.status === s
                                          ? 'bg-emerald-50 border-emerald-500 text-emerald-700'
                                          : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
                                      }`}
                                    >
                                      {s.charAt(0).toUpperCase() + s.slice(1)}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-6 py-8 text-center text-gray-500">No orders found</td>
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
