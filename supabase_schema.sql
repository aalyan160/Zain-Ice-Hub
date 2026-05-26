-- Zain Ice Hub - Complete Multi-Branch Supabase Schema

-- 1. Create Branches Table
CREATE TABLE IF NOT EXISTS public.branches (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    location TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Seed default branches
INSERT INTO public.branches (name) VALUES ('Seetpur'), ('Khangarh') ON CONFLICT DO NOTHING;

-- 2. Create Users Table (for staff and admin credentials)
CREATE TABLE IF NOT EXISTS public.users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    pin TEXT NOT NULL UNIQUE,
    role TEXT DEFAULT 'staff',
    avatar_url TEXT,
    branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Create Products Table
CREATE TABLE IF NOT EXISTS public.products (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    price NUMERIC NOT NULL DEFAULT 0,
    category TEXT DEFAULT 'Regular',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Create Branch Inventory Table (Option B: Separate stock per branch)
CREATE TABLE IF NOT EXISTS public.branch_inventory (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    branch_id UUID REFERENCES public.branches(id) ON DELETE CASCADE,
    product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
    stock INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(branch_id, product_id)
);

-- 5. Create Shifts Table (for drawer session management)
CREATE TABLE IF NOT EXISTS public.shifts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL,
    opening_balance NUMERIC NOT NULL DEFAULT 0,
    closing_balance NUMERIC,
    expected_balance NUMERIC,
    opened_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    closed_at TIMESTAMP WITH TIME ZONE
);

-- 6. Create Sales Table (linked to products, optional active shifts, and branches)
CREATE TABLE IF NOT EXISTS public.sales (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
    shift_id UUID REFERENCES public.shifts(id) ON DELETE SET NULL,
    branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    total_price NUMERIC NOT NULL DEFAULT 0,
    sale_date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Insert a default admin user (pin: 1234)
INSERT INTO public.users (name, pin, role) VALUES ('Admin', '1234', 'admin') ON CONFLICT DO NOTHING;

-- Set up Row Level Security (RLS)
ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.branch_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shifts ENABLE ROW LEVEL SECURITY;

-- Allow anonymous access for simple POS operations using public client
CREATE POLICY "Allow anonymous select on branches" ON public.branches FOR SELECT USING (true);
CREATE POLICY "Allow anonymous insert on branches" ON public.branches FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anonymous update on branches" ON public.branches FOR UPDATE USING (true);
CREATE POLICY "Allow anonymous delete on branches" ON public.branches FOR DELETE USING (true);

CREATE POLICY "Allow anonymous select on products" ON public.products FOR SELECT USING (true);
CREATE POLICY "Allow anonymous insert on products" ON public.products FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anonymous update on products" ON public.products FOR UPDATE USING (true);
CREATE POLICY "Allow anonymous delete on products" ON public.products FOR DELETE USING (true);

CREATE POLICY "Allow anonymous select on branch_inventory" ON public.branch_inventory FOR SELECT USING (true);
CREATE POLICY "Allow anonymous insert on branch_inventory" ON public.branch_inventory FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anonymous update on branch_inventory" ON public.branch_inventory FOR UPDATE USING (true);
CREATE POLICY "Allow anonymous delete on branch_inventory" ON public.branch_inventory FOR DELETE USING (true);

CREATE POLICY "Allow anonymous select on sales" ON public.sales FOR SELECT USING (true);
CREATE POLICY "Allow anonymous insert on sales" ON public.sales FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anonymous update on sales" ON public.sales FOR UPDATE USING (true);
CREATE POLICY "Allow anonymous delete on sales" ON public.sales FOR DELETE USING (true);

CREATE POLICY "Allow anonymous select on users" ON public.users FOR SELECT USING (true);
CREATE POLICY "Allow anonymous insert on users" ON public.users FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anonymous update on users" ON public.users FOR UPDATE USING (true);
CREATE POLICY "Allow anonymous delete on users" ON public.users FOR DELETE USING (true);

CREATE POLICY "Allow anonymous select on shifts" ON public.shifts FOR SELECT USING (true);
CREATE POLICY "Allow anonymous insert on shifts" ON public.shifts FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anonymous update on shifts" ON public.shifts FOR UPDATE USING (true);
CREATE POLICY "Allow anonymous delete on shifts" ON public.shifts FOR DELETE USING (true);

