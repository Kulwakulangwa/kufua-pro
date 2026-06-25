import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import StatCard from '../components/StatCard';
import StatusBadge from '../components/StatusBadge';
import {
  Package, DollarSign, Users, Star, TrendingUp, AlertCircle
} from 'lucide-react';
import type { Order, DashboardStats } from '../lib/types';

export default function DashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    totalOrders: 0, totalRevenue: 0, activeProviders: 0, pendingApprovals: 0, newCustomers: 0, avgRating: 0
  });
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    loadDashboard();
  }, [user]);

  async function loadDashboard() {
    setLoading(true);
    const role = user?.role;

    if (role === 'admin') {
      const [{ count: totalOrders }, { count: activeProviders }, { count: pendingApprovals }, { count: newCustomers }, { data: revenueData }] = await Promise.all([
        supabase.from('orders').select('*', { count: 'exact', head: true }),
        supabase.from('users').select('*', { count: 'exact', head: true }).in('role', ['mama_fua', 'laundry_center']).eq('is_active', true),
        supabase.from('laundry_center_profiles').select('*', { count: 'exact', head: true }).eq('is_approved', false),
        supabase.from('users').select('*', { count: 'exact', head: true }).eq('role', 'customer'),
        supabase.from('orders').select('total_amount_tsh').eq('status', 'delivered'),
      ]);

      const totalRevenue = revenueData?.reduce((sum, o) => sum + (o.total_amount_tsh || 0), 0) || 0;

      setStats({
        totalOrders: totalOrders || 0,
        totalRevenue,
        activeProviders: activeProviders || 0,
        pendingApprovals: pendingApprovals || 0,
        newCustomers: newCustomers || 0,
        avgRating: 4.6,
      });

      const { data: orders } = await supabase.from('orders')
        .select('*, provider:users!orders_provider_id_fkey(full_name), customer:users!orders_customer_id_fkey(full_name), package:provider_packages(*)')
        .order('created_at', { ascending: false })
        .limit(10);
      setRecentOrders(orders || []);
    } else if (role === 'mama_fua' || role === 'laundry_center') {
      const [{ count: totalOrders }, { data: revenueData }, { data: orders }] = await Promise.all([
        supabase.from('orders').select('*', { count: 'exact', head: true }).eq('provider_id', user!.id),
        supabase.from('orders').select('total_amount_tsh').eq('provider_id', user!.id).eq('status', 'delivered'),
        supabase.from('orders')
          .select('*, customer:users!orders_customer_id_fkey(full_name, phone), package:provider_packages(*)')
          .eq('provider_id', user!.id)
          .order('created_at', { ascending: false })
          .limit(10),
      ]);

      const totalRevenue = revenueData?.reduce((sum, o) => sum + (o.total_amount_tsh || 0), 0) || 0;

      setStats({
        totalOrders: totalOrders || 0,
        totalRevenue,
        activeProviders: 0,
        pendingApprovals: 0,
        newCustomers: 0,
        avgRating: 0,
      });
      setRecentOrders(orders || []);
    }

    setLoading(false);
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="w-8 h-8 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const isAdmin = user?.role === 'admin';

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          {isAdmin ? 'Admin Dashboard' : 'My Dashboard'}
        </h1>
        <p className="text-gray-500 mt-1">
          {isAdmin ? 'Overview of platform performance' : 'Your laundry business at a glance'}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Orders" value={stats.totalOrders} icon={Package} color="emerald" />
        <StatCard title="Total Revenue" value={`TSh ${stats.totalRevenue.toLocaleString()}`} icon={DollarSign} color="blue" />
        {isAdmin && (
          <>
            <StatCard title="Active Providers" value={stats.activeProviders} icon={Users} color="violet" />
            <StatCard title="Pending Approvals" value={stats.pendingApprovals} icon={AlertCircle} color="amber" />
          </>
        )}
        {!isAdmin && (
          <>
            <StatCard title="This Month" value={`TSh ${stats.totalRevenue.toLocaleString()}`} icon={TrendingUp} color="violet" />
            <StatCard title="Avg Rating" value={`${stats.avgRating || '-'}`} icon={Star} color="amber" />
          </>
        )}
      </div>

      {/* Recent Orders */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">Recent Orders</h2>
          <a href="/orders" className="text-sm text-emerald-600 font-medium hover:text-emerald-700">View All</a>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left font-medium text-gray-500">Order ID</th>
                <th className="px-6 py-3 text-left font-medium text-gray-500">Customer</th>
                <th className="px-6 py-3 text-left font-medium text-gray-500">Package</th>
                <th className="px-6 py-3 text-left font-medium text-gray-500">Amount</th>
                <th className="px-6 py-3 text-left font-medium text-gray-500">Status</th>
                <th className="px-6 py-3 text-left font-medium text-gray-500">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {recentOrders.map(order => (
                <tr key={order.id} className="hover:bg-gray-50">
                  <td className="px-6 py-3 font-mono text-xs text-gray-500">{order.id.slice(0, 8)}</td>
                  <td className="px-6 py-3 text-gray-900">{(order.customer as any)?.full_name || order.customer_name}</td>
                  <td className="px-6 py-3 text-gray-600">{(order.package as any)?.package_name || '-'}</td>
                  <td className="px-6 py-3 font-medium text-gray-900">TSh {order.total_amount_tsh.toLocaleString()}</td>
                  <td className="px-6 py-3"><StatusBadge status={order.status} /></td>
                  <td className="px-6 py-3 text-gray-500">{new Date(order.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
              {recentOrders.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500">No orders yet</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
