import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import StatusBadge from '../components/StatusBadge';
import { Package, ChevronDown, ChevronUp } from 'lucide-react';
import type { Order } from '../lib/types';

export default function MyOrdersPage() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    loadOrders();
  }, [user]);

  async function loadOrders() {
    setLoading(true);
    const { data } = await supabase.from('orders')
      .select('*, provider:users!orders_provider_id_fkey(full_name, phone), package:provider_packages(*)')
      .eq('customer_id', user!.id)
      .order('created_at', { ascending: false });
    setOrders(data || []);
    setLoading(false);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">My Orders</h1>
        <p className="text-gray-500 mt-1">Track your laundry orders</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : orders.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <Package className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-1">No orders yet</h3>
          <p className="text-gray-500">Browse providers and place your first order</p>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map(order => (
            <div key={order.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div
                className="p-4 flex items-center justify-between cursor-pointer hover:bg-gray-50"
                onClick={() => setExpandedOrder(expandedOrder === order.id ? null : order.id)}
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-emerald-50 rounded-lg flex items-center justify-center">
                    <Package className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div>
                    <div className="font-medium text-gray-900">{(order.package as any)?.package_name || 'Order'}</div>
                    <div className="text-sm text-gray-500">{(order.provider as any)?.full_name}</div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <StatusBadge status={order.status} />
                  <span className="font-medium text-gray-900">TSh {order.total_amount_tsh.toLocaleString()}</span>
                  {expandedOrder === order.id ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                </div>
              </div>
              {expandedOrder === order.id && (
                <div className="px-4 pb-4 border-t border-gray-100 pt-4 space-y-3 text-sm">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-gray-500">Order Type</p>
                      <p className="font-medium text-gray-900">{order.order_type.replace(/_/g, ' ')}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Scheduled Date</p>
                      <p className="font-medium text-gray-900">{order.scheduled_date}</p>
                    </div>
                  </div>
                  {order.pickup_address && (
                    <div>
                      <p className="text-gray-500">Address</p>
                      <p className="font-medium text-gray-900">{order.pickup_address}</p>
                    </div>
                  )}
                  {order.notes && (
                    <div>
                      <p className="text-gray-500">Notes</p>
                      <p className="font-medium text-gray-900">{order.notes}</p>
                    </div>
                  )}
                  <div className="pt-2 border-t border-gray-100">
                    <p className="text-gray-500">Provider Contact</p>
                    <p className="font-medium text-gray-900">{(order.provider as any)?.phone || '-'}</p>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
