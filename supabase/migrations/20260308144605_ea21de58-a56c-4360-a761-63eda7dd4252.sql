
-- Tighten the guest insert policy with basic validation
DROP POLICY "Anyone can create purchase intents" ON public.purchase_intents;
CREATE POLICY "Anyone can create guest purchase intents"
  ON public.purchase_intents FOR INSERT TO anon, authenticated
  WITH CHECK (
    intent_type = 'guest_buy' 
    AND actor_type IN ('guest', 'user')
    AND phone_number IS NOT NULL 
    AND length(phone_number) >= 10
    AND amount_expected > 0
  );
