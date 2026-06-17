-- Redefine public.validate_system_setting to remove delivery_speed enum check
-- allowing arbitrary strings/text to be saved as the delivery speed.

CREATE OR REPLACE FUNCTION public.validate_system_setting()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE
  v_key text := NEW.setting_key;
  v_val text := NEW.setting_value;
  v_num numeric;
BEGIN
  IF v_key IS NULL OR length(btrim(v_key)) = 0 THEN
    RAISE EXCEPTION 'setting_key cannot be empty';
  END IF;
  IF v_val IS NULL THEN
    RAISE EXCEPTION 'setting_value cannot be NULL';
  END IF;

  -- Boolean-style keys
  IF v_key IN (
    'maintenance_mode',
    'order_submission_enabled',
    'payment_enabled',
    'wallet_purchase_enabled',
    'paystack_enabled',
    'agent_signup_enabled',
    'agent_withdrawals_enabled',
    'special_offers_enabled'
  ) THEN
    IF lower(v_val) NOT IN ('true','false') THEN
      RAISE EXCEPTION '% must be "true" or "false" (got "%")', v_key, v_val;
    END IF;
    NEW.setting_value := lower(v_val);
  END IF;

  -- Percentage 0-100
  IF v_key IN ('agent_commission_rate_percent','paystack_fee_percent') THEN
    BEGIN v_num := v_val::numeric; EXCEPTION WHEN OTHERS THEN
      RAISE EXCEPTION '% must be numeric', v_key;
    END;
    IF v_num < 0 OR v_num > 100 THEN
      RAISE EXCEPTION '% must be between 0 and 100', v_key;
    END IF;
  END IF;

  -- Non-negative monetary thresholds
  IF v_key IN ('agent_withdrawal_min_amount','wallet_min_deposit','wallet_max_deposit') THEN
    BEGIN v_num := v_val::numeric; EXCEPTION WHEN OTHERS THEN
      RAISE EXCEPTION '% must be numeric', v_key;
    END;
    IF v_num < 0 THEN
      RAISE EXCEPTION '% cannot be negative', v_key;
    END IF;
  END IF;

  NEW.updated_at := now();
  NEW.updated_by := COALESCE(NEW.updated_by, auth.uid());
  RETURN NEW;
END; $$;
