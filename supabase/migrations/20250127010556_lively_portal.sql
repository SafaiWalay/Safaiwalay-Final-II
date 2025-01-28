/*
  # Consolidate Earnings and Policies

  This migration consolidates functionality from previous migrations and updates the earnings calculation.

  1. Functions
    - restore_user: Restores soft-deleted records
    - verify_payment_and_update_earnings: Handles payment verification and earnings (60% of booking amount)
  
  2. Policies
    - Updated cleaner booking policies
    - Storage policies for payment proofs
  
  3. Indexes
    - Optimized indexes for bookings and payments
    - Performance indexes for soft-deleted records
*/

-- Start transaction
BEGIN;

-- Add payment verification status to booking_status if not exists
DO $$ 
BEGIN
    ALTER TYPE booking_status ADD VALUE IF NOT EXISTS 'payment_verified' AFTER 'completed';
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create or replace restore_user function
CREATE OR REPLACE FUNCTION restore_user(target_user_id uuid)
RETURNS void AS $$
BEGIN
    -- Restore related records first
    UPDATE bookings
    SET 
        is_deleted = false,
        deleted_at = NULL
    WHERE user_id = target_user_id;

    UPDATE reviews
    SET 
        is_deleted = false,
        deleted_at = NULL
    WHERE user_id = target_user_id;

    UPDATE payments
    SET 
        is_deleted = false,
        deleted_at = NULL
    WHERE user_id = target_user_id;

    -- Finally restore the user
    UPDATE users
    SET 
        is_deleted = false,
        deleted_at = NULL
    WHERE id = target_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create or replace payment verification and earnings function
CREATE OR REPLACE FUNCTION verify_payment_and_update_earnings()
RETURNS TRIGGER AS $$
DECLARE
    service_name text;
    earning_amount numeric(10,2);
    earnings_entry jsonb;
BEGIN
    -- Log trigger execution
    RAISE NOTICE 'Trigger executing for booking %', NEW.id;
    
    -- Only proceed if payment_proof_url is being set
    IF NEW.payment_proof_url IS NOT NULL AND OLD.payment_proof_url IS NULL THEN
        -- Set payment collection timestamp
        NEW.payment_collected_at = CURRENT_TIMESTAMP;
        NEW.status = 'payment_verified'::booking_status;

        -- Get service name
        SELECT name INTO service_name
        FROM services
        WHERE id = NEW.service_id;

        -- Calculate earnings (60% of booking amount)
        earning_amount := NEW.amount * 0.60;

        -- Log earnings calculation
        RAISE NOTICE 'Calculating earnings for booking %. Amount: %, Earnings: %', NEW.id, NEW.amount, earning_amount;

        -- Create earnings entry
        earnings_entry := jsonb_build_object(
            'booking_id', NEW.id,
            'amount', earning_amount,
            'service', service_name,
            'earned_at', CURRENT_TIMESTAMP
        );

        -- Log earnings entry
        RAISE NOTICE 'Created earnings entry: %', earnings_entry;

        -- Update cleaner earnings
        UPDATE cleaners
        SET 
            earnings_balance = COALESCE(earnings_balance, 0) + earning_amount,
            earnings_history = COALESCE(earnings_history, '[]'::jsonb) || earnings_entry
        WHERE id = NEW.cleaner_id;
        
        -- Log update
        RAISE NOTICE 'Updated earnings for cleaner %', NEW.cleaner_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop any existing triggers first
DROP TRIGGER IF EXISTS verify_payment_trigger ON bookings;

-- Create trigger for payment verification
CREATE TRIGGER verify_payment_trigger
    BEFORE UPDATE OF payment_proof_url ON bookings
    FOR EACH ROW
    EXECUTE FUNCTION verify_payment_and_update_earnings();


-- Drop existing policies to avoid conflicts
DO $$ 
BEGIN
    DROP POLICY IF EXISTS "Cleaners can view pending bookings" ON bookings;
    DROP POLICY IF EXISTS "Cleaners can pick pending bookings" ON bookings;
    DROP POLICY IF EXISTS "Cleaners can update assigned bookings" ON bookings;
    DROP POLICY IF EXISTS "Cleaners can upload payment proofs" ON storage.objects;
    DROP POLICY IF EXISTS "Anyone can view payment proofs" ON storage.objects;
END $$;

-- Update booking policies for cleaners
CREATE POLICY "Cleaners can view pending bookings"
    ON bookings FOR SELECT
    TO authenticated
    USING (
        status = 'pending'
        AND EXISTS (
            SELECT 1 FROM cleaners c
            JOIN users u ON u.id = c.user_id
            WHERE u.auth_id = auth.uid()
            AND NOT u.is_deleted
        )
    );

CREATE POLICY "Cleaners can pick pending bookings"
    ON bookings FOR UPDATE
    TO authenticated
    USING (
        status = 'pending'
        AND EXISTS (
            SELECT 1 FROM cleaners c
            JOIN users u ON u.id = c.user_id
            WHERE u.auth_id = auth.uid()
            AND NOT u.is_deleted
        )
    )
    WITH CHECK (
        status = 'picked'
        AND cleaner_id IN (
            SELECT id FROM cleaners 
            WHERE user_id IN (
                SELECT id FROM users 
                WHERE auth_id = auth.uid()
                AND NOT is_deleted
            )
        )
    );

CREATE POLICY "Cleaners can update assigned bookings"
    ON bookings FOR UPDATE
    TO authenticated
    USING (
        cleaner_id IN (
            SELECT id FROM cleaners 
            WHERE user_id IN (
                SELECT id FROM users 
                WHERE auth_id = auth.uid()
                AND NOT is_deleted
            )
        )
        AND status IN ('picked', 'in_progress', 'paused')
        AND NOT is_deleted
    )
    WITH CHECK (
        status IN ('in_progress', 'paused', 'completed')
    );

-- Create storage policies for payment proofs
CREATE POLICY "Cleaners can upload payment proofs"
    ON storage.objects FOR INSERT TO authenticated
    WITH CHECK (
        bucket_id = 'receipts' AND
        EXISTS (
            SELECT 1 FROM cleaners c
            JOIN users u ON u.id = c.user_id
            WHERE u.auth_id = auth.uid()
            AND NOT u.is_deleted
        )
    );

CREATE POLICY "Anyone can view payment proofs"
    ON storage.objects FOR SELECT TO authenticated
    USING (bucket_id = 'receipts');

-- Create optimized indexes
DROP INDEX IF EXISTS idx_bookings_cleaner_status_active;
DROP INDEX IF EXISTS idx_bookings_payment_active;
DROP INDEX IF EXISTS idx_cleaners_user_active;
DROP INDEX IF EXISTS idx_bookings_payment_verification;
DROP INDEX IF EXISTS idx_users_is_deleted_active;

CREATE INDEX idx_bookings_cleaner_status_active 
    ON bookings(cleaner_id, status, is_deleted);

CREATE INDEX idx_bookings_payment_active
    ON bookings(payment_collected_at, status, is_deleted);

CREATE INDEX idx_cleaners_user_active
    ON cleaners(user_id);

CREATE INDEX idx_bookings_payment_verification
    ON bookings(payment_proof_url, payment_collected_at, status)
    WHERE status IN ('completed'::booking_status, 'payment_verified'::booking_status);

CREATE INDEX idx_users_is_deleted_active
    ON users(id, is_deleted)
    WHERE NOT is_deleted;

-- Add comments for documentation
COMMENT ON FUNCTION restore_user(uuid) IS 
    'Restores a soft-deleted user and all related records by setting is_deleted to false';

COMMENT ON FUNCTION verify_payment_and_update_earnings() IS 
    'Handles payment verification and updates cleaner earnings (60% of booking amount) when payment proof is uploaded';

COMMENT ON POLICY "Cleaners can view pending bookings" ON bookings IS 
    'Allows cleaners to view available pending bookings';

COMMENT ON POLICY "Cleaners can pick pending bookings" ON bookings IS 
    'Allows cleaners to pick up pending bookings';

COMMENT ON POLICY "Cleaners can update assigned bookings" ON bookings IS 
    'Allows cleaners to update status of their assigned bookings';

COMMENT ON POLICY "Cleaners can upload payment proofs" ON storage.objects IS 
    'Allows cleaners to upload payment proof images';

COMMENT ON POLICY "Anyone can view payment proofs" ON storage.objects IS 
    'Allows authenticated users to view payment proofs';

COMMIT;