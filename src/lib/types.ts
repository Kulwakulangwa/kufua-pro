export type UserRole = 'customer' | 'mama_fua' | 'laundry_center' | 'admin';
export type OrderType = 'mama_fua_pickup' | 'center_dropoff' | 'center_pickup';
export type OrderStatus = 'pending' | 'confirmed' | 'collected' | 'washing' | 'ready' | 'delivered' | 'cancelled';
export type ProviderType = 'mama_fua' | 'laundry_center';

export interface User {
  id: string;
  phone: string;
  full_name: string;
  role: UserRole;
  avatar_url?: string;
  is_active: boolean;
  created_at: string;
}

export interface MamaFuaProfile {
  id: string;
  bio?: string;
  location_lat: number;
  location_lng: number;
  service_radius_km: number;
  average_rating?: number;
  total_orders: number;
  is_verified: boolean;
  is_available: boolean;
  work_photos: string[];
}

export interface LaundryCenterProfile {
  id: string;
  business_name: string;
  address_text: string;
  location_lat: number;
  location_lng: number;
  opening_hours?: Record<string, string>;
  offers_pickup: boolean;
  pickup_fee_tsh?: number;
  average_rating?: number;
  is_approved: boolean;
  is_available: boolean;
  center_photos: string[];
}

export interface ProviderPackage {
  id: string;
  provider_id: string;
  package_name: string;
  description?: string;
  price_tsh: number;
  is_active: boolean;
}

export interface Order {
  id: string;
  customer_id?: string;
  customer_phone: string;
  customer_name: string;
  provider_id: string;
  provider_type: ProviderType;
  order_type: OrderType;
  package_id: string;
  status: OrderStatus;
  total_amount_tsh: number;
  pickup_address?: string;
  pickup_lat?: number;
  pickup_lng?: number;
  scheduled_date: string;
  notes?: string;
  created_at: string;
  completed_at?: string;
  provider?: User;
  customer?: User;
  package?: ProviderPackage;
}

export interface Review {
  id: string;
  order_id: string;
  provider_id: string;
  customer_id?: string;
  rating: number;
  comment?: string;
  is_hidden: boolean;
  created_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  type: 'new_order' | 'order_update' | 'review' | 'system';
  title: string;
  body: string;
  is_read: boolean;
  related_order_id?: string;
  created_at: string;
}

export interface DashboardStats {
  totalOrders: number;
  totalRevenue: number;
  activeProviders: number;
  pendingApprovals: number;
  newCustomers: number;
  avgRating: number;
}
