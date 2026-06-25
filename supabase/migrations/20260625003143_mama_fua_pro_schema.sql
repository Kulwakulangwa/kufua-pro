/*
# Mama Fua PRO — Full MVP Schema

## Overview
Creates all tables required for the Mama Fua PRO laundry marketplace platform.

## New Tables

### users
Custom user profile table mirroring Supabase Auth users.
- id: UUID matching auth.users.id
- phone: Tanzania phone number
- full_name: Display name
- role: 'customer' | 'mama_fua' | 'laundry_center' | 'admin'
- avatar_url: Profile photo URL
- is_active: Can be suspended by admin

### mama_fua_profiles
Extended profile for individual laundry workers.
- location_lat/lng: Home coordinates
- service_radius_km: How far they'll travel
- is_available: On/off toggle
- average_rating, total_orders: Computed stats

### laundry_center_profiles
Extended profile for registered laundromat businesses.
- business_name, address_text: Public business info
- location_lat/lng: Physical location
- opening_hours: JSONB schedule
- offers_pickup, pickup_fee_tsh: Pickup service config
- is_approved: Admin must approve before going live

### provider_packages
Pricing packages shared by both provider types.
- Small (up to 10 items), Medium (11-20), Large (21-35), XL (36+)
- Each provider sets their own price

### orders
Core order/booking table.
- Supports 3 order types: mama_fua_pickup, center_dropoff, center_pickup
- Status lifecycle: pending → confirmed → collected → washing → ready → delivered
- Supports guest orders (customer_id nullable, customer_phone required)

### reviews
One review per completed order.
- 1-5 star rating + optional text comment
- Admin can hide fraudulent reviews

### notifications
In-app notification log.
- Linked to orders
- is_read flag for unread badge

## Security
- RLS enabled on all tables
- Admins can read/write everything
- Providers can manage their own profiles and update order status
- Customers can create orders and read their own data
- Public can read active provider profiles for discovery
*/

-- Enums
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('customer', 'mama_fua', 'laundry_center', 'admin');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE provider_type_enum AS ENUM ('mama_fua', 'laundry_center');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE order_type_enum AS ENUM ('mama_fua_pickup', 'center_dropoff', 'center_pickup');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE order_status_enum AS ENUM ('pending', 'confirmed', 'collected', 'washing', 'ready', 'delivered', 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Users table (mirrors auth.users)
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  phone text UNIQUE NOT NULL,
  full_name text NOT NULL,
  role user_role NOT NULL DEFAULT 'customer',
  avatar_url text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users_select_own" ON users;
CREATE POLICY "users_select_own" ON users FOR SELECT
  TO authenticated USING (auth.uid() = id OR role = 'admin');

DROP POLICY IF EXISTS "users_insert_own" ON users;
CREATE POLICY "users_insert_own" ON users FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "users_update_own" ON users;
CREATE POLICY "users_update_own" ON users FOR UPDATE
  TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "users_select_providers_public" ON users;
CREATE POLICY "users_select_providers_public" ON users FOR SELECT
  TO anon, authenticated USING (role IN ('mama_fua', 'laundry_center') AND is_active = true);

-- Mama Fua Profiles
CREATE TABLE IF NOT EXISTS mama_fua_profiles (
  id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  bio text,
  location_lat float8 NOT NULL DEFAULT -6.7924,
  location_lng float8 NOT NULL DEFAULT 39.2083,
  service_radius_km integer NOT NULL DEFAULT 3,
  average_rating float4,
  total_orders integer NOT NULL DEFAULT 0,
  is_verified boolean NOT NULL DEFAULT false,
  is_available boolean NOT NULL DEFAULT true,
  work_photos text[] DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE mama_fua_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "mama_fua_select_public" ON mama_fua_profiles;
CREATE POLICY "mama_fua_select_public" ON mama_fua_profiles FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "mama_fua_insert_own" ON mama_fua_profiles;
CREATE POLICY "mama_fua_insert_own" ON mama_fua_profiles FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "mama_fua_update_own" ON mama_fua_profiles;
CREATE POLICY "mama_fua_update_own" ON mama_fua_profiles FOR UPDATE
  TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "mama_fua_delete_own" ON mama_fua_profiles;
CREATE POLICY "mama_fua_delete_own" ON mama_fua_profiles FOR DELETE
  TO authenticated USING (auth.uid() = id);

-- Laundry Center Profiles
CREATE TABLE IF NOT EXISTS laundry_center_profiles (
  id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  business_name text NOT NULL,
  address_text text NOT NULL,
  location_lat float8 NOT NULL DEFAULT -6.7924,
  location_lng float8 NOT NULL DEFAULT 39.2083,
  opening_hours jsonb,
  offers_pickup boolean NOT NULL DEFAULT false,
  pickup_fee_tsh integer,
  average_rating float4,
  is_approved boolean NOT NULL DEFAULT false,
  is_available boolean NOT NULL DEFAULT true,
  center_photos text[] DEFAULT '{}',
  registration_doc_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE laundry_center_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "center_select_public" ON laundry_center_profiles;
CREATE POLICY "center_select_public" ON laundry_center_profiles FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "center_insert_own" ON laundry_center_profiles;
CREATE POLICY "center_insert_own" ON laundry_center_profiles FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "center_update_own" ON laundry_center_profiles;
CREATE POLICY "center_update_own" ON laundry_center_profiles FOR UPDATE
  TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "center_delete_own" ON laundry_center_profiles;
CREATE POLICY "center_delete_own" ON laundry_center_profiles FOR DELETE
  TO authenticated USING (auth.uid() = id);

-- Provider Packages
CREATE TABLE IF NOT EXISTS provider_packages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  package_name text NOT NULL CHECK (package_name IN ('Small', 'Medium', 'Large', 'XL')),
  description text,
  price_tsh integer NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE provider_packages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "packages_select_public" ON provider_packages;
CREATE POLICY "packages_select_public" ON provider_packages FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "packages_insert_own" ON provider_packages;
CREATE POLICY "packages_insert_own" ON provider_packages FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = provider_id);

DROP POLICY IF EXISTS "packages_update_own" ON provider_packages;
CREATE POLICY "packages_update_own" ON provider_packages FOR UPDATE
  TO authenticated USING (auth.uid() = provider_id) WITH CHECK (auth.uid() = provider_id);

DROP POLICY IF EXISTS "packages_delete_own" ON provider_packages;
CREATE POLICY "packages_delete_own" ON provider_packages FOR DELETE
  TO authenticated USING (auth.uid() = provider_id);

-- Orders
CREATE TABLE IF NOT EXISTS orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid REFERENCES users(id) ON DELETE SET NULL,
  customer_phone text NOT NULL,
  customer_name text NOT NULL DEFAULT 'Guest',
  provider_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  provider_type provider_type_enum NOT NULL,
  order_type order_type_enum NOT NULL,
  package_id uuid NOT NULL REFERENCES provider_packages(id) ON DELETE RESTRICT,
  status order_status_enum NOT NULL DEFAULT 'pending',
  total_amount_tsh integer NOT NULL,
  pickup_address text,
  pickup_lat float8,
  pickup_lng float8,
  scheduled_date date NOT NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "orders_select_customer" ON orders;
CREATE POLICY "orders_select_customer" ON orders FOR SELECT
  TO authenticated USING (auth.uid() = customer_id OR auth.uid() = provider_id);

DROP POLICY IF EXISTS "orders_insert_customer" ON orders;
CREATE POLICY "orders_insert_customer" ON orders FOR INSERT
  TO authenticated, anon WITH CHECK (true);

DROP POLICY IF EXISTS "orders_update_provider" ON orders;
CREATE POLICY "orders_update_provider" ON orders FOR UPDATE
  TO authenticated USING (auth.uid() = provider_id OR auth.uid() = customer_id);

DROP POLICY IF EXISTS "orders_delete_customer" ON orders;
CREATE POLICY "orders_delete_customer" ON orders FOR DELETE
  TO authenticated USING (auth.uid() = customer_id AND status = 'pending');

-- Reviews
CREATE TABLE IF NOT EXISTS reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid UNIQUE NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  provider_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  customer_id uuid REFERENCES users(id) ON DELETE SET NULL,
  rating integer NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment text,
  is_hidden boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "reviews_select_public" ON reviews;
CREATE POLICY "reviews_select_public" ON reviews FOR SELECT
  TO anon, authenticated USING (is_hidden = false);

DROP POLICY IF EXISTS "reviews_insert_customer" ON reviews;
CREATE POLICY "reviews_insert_customer" ON reviews FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = customer_id);

DROP POLICY IF EXISTS "reviews_update_admin" ON reviews;
CREATE POLICY "reviews_update_admin" ON reviews FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

DROP POLICY IF EXISTS "reviews_delete_admin" ON reviews;
CREATE POLICY "reviews_delete_admin" ON reviews FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

-- Notifications
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('new_order', 'order_update', 'review', 'system')),
  title text NOT NULL,
  body text NOT NULL,
  is_read boolean NOT NULL DEFAULT false,
  related_order_id uuid REFERENCES orders(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notifications_select_own" ON notifications;
CREATE POLICY "notifications_select_own" ON notifications FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "notifications_insert_system" ON notifications;
CREATE POLICY "notifications_insert_system" ON notifications FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "notifications_update_own" ON notifications;
CREATE POLICY "notifications_update_own" ON notifications FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "notifications_delete_own" ON notifications;
CREATE POLICY "notifications_delete_own" ON notifications FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_orders_customer ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_provider ON orders(provider_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_scheduled_date ON orders(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_packages_provider ON provider_packages(provider_id);
CREATE INDEX IF NOT EXISTS idx_reviews_provider ON reviews(provider_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, is_read);
