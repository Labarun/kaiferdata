export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      admin_user_notes: {
        Row: {
          admin_id: string
          created_at: string
          id: string
          note: string
          user_id: string
        }
        Insert: {
          admin_id: string
          created_at?: string
          id?: string
          note: string
          user_id: string
        }
        Update: {
          admin_id?: string
          created_at?: string
          id?: string
          note?: string
          user_id?: string
        }
        Relationships: []
      }
      agent_applications: {
        Row: {
          acknowledged_subscription: boolean
          admin_note: string | null
          agreed_to_terms: boolean
          business_name: string | null
          city: string | null
          created_at: string
          email: string | null
          expected_customer_base: string | null
          full_name: string | null
          has_sold_data_before: boolean | null
          id: string
          internal_note: string | null
          motivation: string | null
          phone: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          selling_channels: string | null
          social_link: string | null
          status: Database["public"]["Enums"]["agent_application_status"]
          store_logo_url: string | null
          store_name: string | null
          store_slug: string | null
          store_tagline: string | null
          submitted_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          acknowledged_subscription?: boolean
          admin_note?: string | null
          agreed_to_terms?: boolean
          business_name?: string | null
          city?: string | null
          created_at?: string
          email?: string | null
          expected_customer_base?: string | null
          full_name?: string | null
          has_sold_data_before?: boolean | null
          id?: string
          internal_note?: string | null
          motivation?: string | null
          phone?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          selling_channels?: string | null
          social_link?: string | null
          status?: Database["public"]["Enums"]["agent_application_status"]
          store_logo_url?: string | null
          store_name?: string | null
          store_slug?: string | null
          store_tagline?: string | null
          submitted_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          acknowledged_subscription?: boolean
          admin_note?: string | null
          agreed_to_terms?: boolean
          business_name?: string | null
          city?: string | null
          created_at?: string
          email?: string | null
          expected_customer_base?: string | null
          full_name?: string | null
          has_sold_data_before?: boolean | null
          id?: string
          internal_note?: string | null
          motivation?: string | null
          phone?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          selling_channels?: string | null
          social_link?: string | null
          status?: Database["public"]["Enums"]["agent_application_status"]
          store_logo_url?: string | null
          store_name?: string | null
          store_slug?: string | null
          store_tagline?: string | null
          submitted_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      agent_bundle_prices: {
        Row: {
          agent_profile_id: string
          created_at: string
          id: string
          is_published: boolean
          package_id: string
          selling_price: number
          updated_at: string
        }
        Insert: {
          agent_profile_id: string
          created_at?: string
          id?: string
          is_published?: boolean
          package_id: string
          selling_price: number
          updated_at?: string
        }
        Update: {
          agent_profile_id?: string
          created_at?: string
          id?: string
          is_published?: boolean
          package_id?: string
          selling_price?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_bundle_prices_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "data_packages"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_customers: {
        Row: {
          agent_profile_id: string
          created_at: string
          id: string
          name: string | null
          network: string
          phone_number: string
          updated_at: string
        }
        Insert: {
          agent_profile_id: string
          created_at?: string
          id?: string
          name?: string | null
          network: string
          phone_number: string
          updated_at?: string
        }
        Update: {
          agent_profile_id?: string
          created_at?: string
          id?: string
          name?: string | null
          network?: string
          phone_number?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_customers_agent_profile_id_fkey"
            columns: ["agent_profile_id"]
            isOneToOne: false
            referencedRelation: "agent_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_earnings: {
        Row: {
          agent_profile_id: string
          commission_amount: number
          commission_rate: number
          created_at: string
          id: string
          order_amount: number
          order_id: string
          status: string
          user_id: string
          wallet_transaction_id: string | null
        }
        Insert: {
          agent_profile_id: string
          commission_amount: number
          commission_rate: number
          created_at?: string
          id?: string
          order_amount: number
          order_id: string
          status?: string
          user_id: string
          wallet_transaction_id?: string | null
        }
        Update: {
          agent_profile_id?: string
          commission_amount?: number
          commission_rate?: number
          created_at?: string
          id?: string
          order_amount?: number
          order_id?: string
          status?: string
          user_id?: string
          wallet_transaction_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agent_earnings_agent_profile_id_fkey"
            columns: ["agent_profile_id"]
            isOneToOne: false
            referencedRelation: "agent_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_earnings_wallets: {
        Row: {
          agent_profile_id: string
          created_at: string
          current_balance: number
          id: string
          status: string
          total_earned: number
          total_withdrawn: number
          updated_at: string
          user_id: string
        }
        Insert: {
          agent_profile_id: string
          created_at?: string
          current_balance?: number
          id?: string
          status?: string
          total_earned?: number
          total_withdrawn?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          agent_profile_id?: string
          created_at?: string
          current_balance?: number
          id?: string
          status?: string
          total_earned?: number
          total_withdrawn?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      agent_profiles: {
        Row: {
          application_id: string | null
          approved_at: string
          business_name: string | null
          city: string | null
          contact_phone: string | null
          created_at: string
          id: string
          status: Database["public"]["Enums"]["agent_profile_status"]
          store_logo_url: string | null
          store_name: string
          store_slug: string
          store_tagline: string | null
          storefront_enabled: boolean
          suspended_at: string | null
          suspension_reason: string | null
          total_orders: number
          total_profit: number
          total_sales: number
          updated_at: string
          user_id: string
        }
        Insert: {
          application_id?: string | null
          approved_at?: string
          business_name?: string | null
          city?: string | null
          contact_phone?: string | null
          created_at?: string
          id?: string
          status?: Database["public"]["Enums"]["agent_profile_status"]
          store_logo_url?: string | null
          store_name: string
          store_slug: string
          store_tagline?: string | null
          storefront_enabled?: boolean
          suspended_at?: string | null
          suspension_reason?: string | null
          total_orders?: number
          total_profit?: number
          total_sales?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          application_id?: string | null
          approved_at?: string
          business_name?: string | null
          city?: string | null
          contact_phone?: string | null
          created_at?: string
          id?: string
          status?: Database["public"]["Enums"]["agent_profile_status"]
          store_logo_url?: string | null
          store_name?: string
          store_slug?: string
          store_tagline?: string | null
          storefront_enabled?: boolean
          suspended_at?: string | null
          suspension_reason?: string | null
          total_orders?: number
          total_profit?: number
          total_sales?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_profiles_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "agent_applications"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_subscriptions: {
        Row: {
          agent_profile_id: string
          amount_paid: number
          created_at: string
          currency: string
          expires_at: string | null
          id: string
          intent_id: string | null
          payment_record_id: string | null
          plan: Database["public"]["Enums"]["agent_subscription_plan"]
          starts_at: string | null
          status: Database["public"]["Enums"]["agent_subscription_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          agent_profile_id: string
          amount_paid: number
          created_at?: string
          currency?: string
          expires_at?: string | null
          id?: string
          intent_id?: string | null
          payment_record_id?: string | null
          plan: Database["public"]["Enums"]["agent_subscription_plan"]
          starts_at?: string | null
          status?: Database["public"]["Enums"]["agent_subscription_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          agent_profile_id?: string
          amount_paid?: number
          created_at?: string
          currency?: string
          expires_at?: string | null
          id?: string
          intent_id?: string | null
          payment_record_id?: string | null
          plan?: Database["public"]["Enums"]["agent_subscription_plan"]
          starts_at?: string | null
          status?: Database["public"]["Enums"]["agent_subscription_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_subscriptions_agent_profile_id_fkey"
            columns: ["agent_profile_id"]
            isOneToOne: false
            referencedRelation: "agent_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_subscriptions_intent_id_fkey"
            columns: ["intent_id"]
            isOneToOne: false
            referencedRelation: "purchase_intents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_subscriptions_payment_record_id_fkey"
            columns: ["payment_record_id"]
            isOneToOne: false
            referencedRelation: "payment_records"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_wallet_transactions: {
        Row: {
          agent_wallet_id: string
          amount: number
          closing_balance: number
          created_at: string
          created_by: string | null
          direction: string
          id: string
          linked_record_id: string | null
          linked_record_type: string | null
          narration: string | null
          opening_balance: number
          reference: string | null
          status: string
          txn_type: string
          user_id: string
        }
        Insert: {
          agent_wallet_id: string
          amount: number
          closing_balance: number
          created_at?: string
          created_by?: string | null
          direction: string
          id?: string
          linked_record_id?: string | null
          linked_record_type?: string | null
          narration?: string | null
          opening_balance: number
          reference?: string | null
          status?: string
          txn_type: string
          user_id: string
        }
        Update: {
          agent_wallet_id?: string
          amount?: number
          closing_balance?: number
          created_at?: string
          created_by?: string | null
          direction?: string
          id?: string
          linked_record_id?: string | null
          linked_record_type?: string | null
          narration?: string | null
          opening_balance?: number
          reference?: string | null
          status?: string
          txn_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_wallet_transactions_agent_wallet_id_fkey"
            columns: ["agent_wallet_id"]
            isOneToOne: false
            referencedRelation: "agent_earnings_wallets"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          actor_id: string | null
          actor_role: string | null
          created_at: string
          id: string
          metadata: Json | null
          target_id: string | null
          target_type: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          actor_role?: string | null
          created_at?: string
          id?: string
          metadata?: Json | null
          target_id?: string | null
          target_type?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          actor_role?: string | null
          created_at?: string
          id?: string
          metadata?: Json | null
          target_id?: string | null
          target_type?: string | null
        }
        Relationships: []
      }
      blog_posts: {
        Row: {
          category: string
          content: string
          cover_image_url: string | null
          created_at: string
          excerpt: string
          id: string
          is_published: boolean
          meta_description: string | null
          meta_title: string | null
          published_at: string | null
          slug: string
          title: string
          updated_at: string
        }
        Insert: {
          category?: string
          content: string
          cover_image_url?: string | null
          created_at?: string
          excerpt: string
          id?: string
          is_published?: boolean
          meta_description?: string | null
          meta_title?: string | null
          published_at?: string | null
          slug: string
          title: string
          updated_at?: string
        }
        Update: {
          category?: string
          content?: string
          cover_image_url?: string | null
          created_at?: string
          excerpt?: string
          id?: string
          is_published?: boolean
          meta_description?: string | null
          meta_title?: string | null
          published_at?: string | null
          slug?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      data_packages: {
        Row: {
          agent_base_price: number
          buying_enabled: boolean | null
          category: string | null
          created_at: string
          currency: string
          display_order: number
          id: string
          is_active: boolean
          is_agent_resaleable: boolean
          network: string
          package_code: string
          package_name: string
          package_size_label: string
          package_type: string
          package_volume_value: string | null
          selling_price: number
          source_metadata: Json | null
          source_type: string
          supplier_price: number
          supplier_source_id: string | null
          updated_at: string
          validity_label: string | null
          visible_for_logged_in: boolean
          visible_on_public: boolean
        }
        Insert: {
          agent_base_price?: number
          buying_enabled?: boolean | null
          category?: string | null
          created_at?: string
          currency?: string
          display_order?: number
          id?: string
          is_active?: boolean
          is_agent_resaleable?: boolean
          network: string
          package_code: string
          package_name: string
          package_size_label: string
          package_type?: string
          package_volume_value?: string | null
          selling_price?: number
          source_metadata?: Json | null
          source_type?: string
          supplier_price?: number
          supplier_source_id?: string | null
          updated_at?: string
          validity_label?: string | null
          visible_for_logged_in?: boolean
          visible_on_public?: boolean
        }
        Update: {
          agent_base_price?: number
          buying_enabled?: boolean | null
          category?: string | null
          created_at?: string
          currency?: string
          display_order?: number
          id?: string
          is_active?: boolean
          is_agent_resaleable?: boolean
          network?: string
          package_code?: string
          package_name?: string
          package_size_label?: string
          package_type?: string
          package_volume_value?: string | null
          selling_price?: number
          source_metadata?: Json | null
          source_type?: string
          supplier_price?: number
          supplier_source_id?: string | null
          updated_at?: string
          validity_label?: string | null
          visible_for_logged_in?: boolean
          visible_on_public?: boolean
        }
        Relationships: []
      }
      data_plans: {
        Row: {
          amount: number
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          metadata: Json | null
          network: string
          plan_code: string
          plan_name: string
          sort_order: number
          updated_at: string
          volume: string
        }
        Insert: {
          amount: number
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          metadata?: Json | null
          network: string
          plan_code: string
          plan_name: string
          sort_order?: number
          updated_at?: string
          volume: string
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          metadata?: Json | null
          network?: string
          plan_code?: string
          plan_name?: string
          sort_order?: number
          updated_at?: string
          volume?: string
        }
        Relationships: []
      }
      express_data_packages: {
        Row: {
          agent_price_ghs: number
          created_at: string
          id: string
          is_active: boolean
          regular_price_ghs: number
          size_gb: string
          updated_at: string
          validity_days: string
        }
        Insert: {
          agent_price_ghs: number
          created_at?: string
          id?: string
          is_active?: boolean
          regular_price_ghs: number
          size_gb: string
          updated_at?: string
          validity_days: string
        }
        Update: {
          agent_price_ghs?: number
          created_at?: string
          id?: string
          is_active?: boolean
          regular_price_ghs?: number
          size_gb?: string
          updated_at?: string
          validity_days?: string
        }
        Relationships: []
      }
      express_orders: {
        Row: {
          created_at: string
          data_size: string
          id: string
          order_id: string
          phone_number: string
          price_paid_ghs: number
          status: string
          updated_at: string
          user_id: string
          user_role: string
        }
        Insert: {
          created_at?: string
          data_size: string
          id?: string
          order_id: string
          phone_number: string
          price_paid_ghs: number
          status?: string
          updated_at?: string
          user_id: string
          user_role: string
        }
        Update: {
          created_at?: string
          data_size?: string
          id?: string
          order_id?: string
          phone_number?: string
          price_paid_ghs?: number
          status?: string
          updated_at?: string
          user_id?: string
          user_role?: string
        }
        Relationships: []
      }
      notices: {
        Row: {
          audience: Database["public"]["Enums"]["notice_audience"]
          body: string
          created_at: string
          created_by: string | null
          ends_at: string | null
          id: string
          is_active: boolean
          notice_type: Database["public"]["Enums"]["notice_type"]
          starts_at: string | null
          title: string
          updated_at: string
        }
        Insert: {
          audience?: Database["public"]["Enums"]["notice_audience"]
          body?: string
          created_at?: string
          created_by?: string | null
          ends_at?: string | null
          id?: string
          is_active?: boolean
          notice_type?: Database["public"]["Enums"]["notice_type"]
          starts_at?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          audience?: Database["public"]["Enums"]["notice_audience"]
          body?: string
          created_at?: string
          created_by?: string | null
          ends_at?: string | null
          id?: string
          is_active?: boolean
          notice_type?: Database["public"]["Enums"]["notice_type"]
          starts_at?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      order_status_history: {
        Row: {
          changed_at: string
          changed_by: string | null
          id: string
          metadata: Json | null
          new_status: string
          note: string | null
          old_status: string | null
          order_id: string
          source: string
        }
        Insert: {
          changed_at?: string
          changed_by?: string | null
          id?: string
          metadata?: Json | null
          new_status: string
          note?: string | null
          old_status?: string | null
          order_id: string
          source?: string
        }
        Update: {
          changed_at?: string
          changed_by?: string | null
          id?: string
          metadata?: Json | null
          new_status?: string
          note?: string | null
          old_status?: string | null
          order_id?: string
          source?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_status_history_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          actor_id: string | null
          actor_type: string
          amount_charged: number
          beneficiary_number: string
          bundle_code: string
          bundle_name: string
          bundle_snapshot: Json
          created_at: string
          currency: string
          delivery_message: string | null
          id: string
          intent_id: string | null
          metadata: Json | null
          network: string
          origin_type: string
          payment_record_id: string | null
          public_order_id: string
          source_channel: string
          status: Database["public"]["Enums"]["order_status"]
          supplier_reference: string | null
          supplier_status: string | null
          updated_at: string
        }
        Insert: {
          actor_id?: string | null
          actor_type?: string
          amount_charged: number
          beneficiary_number: string
          bundle_code: string
          bundle_name: string
          bundle_snapshot?: Json
          created_at?: string
          currency?: string
          delivery_message?: string | null
          id?: string
          intent_id?: string | null
          metadata?: Json | null
          network: string
          origin_type?: string
          payment_record_id?: string | null
          public_order_id: string
          source_channel?: string
          status?: Database["public"]["Enums"]["order_status"]
          supplier_reference?: string | null
          supplier_status?: string | null
          updated_at?: string
        }
        Update: {
          actor_id?: string | null
          actor_type?: string
          amount_charged?: number
          beneficiary_number?: string
          bundle_code?: string
          bundle_name?: string
          bundle_snapshot?: Json
          created_at?: string
          currency?: string
          delivery_message?: string | null
          id?: string
          intent_id?: string | null
          metadata?: Json | null
          network?: string
          origin_type?: string
          payment_record_id?: string | null
          public_order_id?: string
          source_channel?: string
          status?: Database["public"]["Enums"]["order_status"]
          supplier_reference?: string | null
          supplier_status?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_intent_id_fkey"
            columns: ["intent_id"]
            isOneToOne: false
            referencedRelation: "purchase_intents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_payment_record_id_fkey"
            columns: ["payment_record_id"]
            isOneToOne: false
            referencedRelation: "payment_records"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_records: {
        Row: {
          amount: number
          base_amount: number | null
          created_at: string
          currency: string
          customer_email: string | null
          customer_identifier: string | null
          fee_amount: number | null
          fee_rate: number | null
          id: string
          intent_id: string | null
          internal_reference: string
          provider: string
          provider_reference: string
          provider_response: Json | null
          status: Database["public"]["Enums"]["payment_status"]
          total_amount: number | null
          updated_at: string
          verified_at: string | null
        }
        Insert: {
          amount: number
          base_amount?: number | null
          created_at?: string
          currency?: string
          customer_email?: string | null
          customer_identifier?: string | null
          fee_amount?: number | null
          fee_rate?: number | null
          id?: string
          intent_id?: string | null
          internal_reference: string
          provider?: string
          provider_reference: string
          provider_response?: Json | null
          status?: Database["public"]["Enums"]["payment_status"]
          total_amount?: number | null
          updated_at?: string
          verified_at?: string | null
        }
        Update: {
          amount?: number
          base_amount?: number | null
          created_at?: string
          currency?: string
          customer_email?: string | null
          customer_identifier?: string | null
          fee_amount?: number | null
          fee_rate?: number | null
          id?: string
          intent_id?: string | null
          internal_reference?: string
          provider?: string
          provider_reference?: string
          provider_response?: Json | null
          status?: Database["public"]["Enums"]["payment_status"]
          total_amount?: number | null
          updated_at?: string
          verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_records_intent_id_fkey"
            columns: ["intent_id"]
            isOneToOne: false
            referencedRelation: "purchase_intents"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          account_status: Database["public"]["Enums"]["account_status"]
          created_at: string
          email: string
          full_name: string
          id: string
          last_active_at: string | null
          last_login_at: string | null
          phone: string | null
          updated_at: string
          user_id: string
          username: string | null
        }
        Insert: {
          account_status?: Database["public"]["Enums"]["account_status"]
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          last_active_at?: string | null
          last_login_at?: string | null
          phone?: string | null
          updated_at?: string
          user_id: string
          username?: string | null
        }
        Update: {
          account_status?: Database["public"]["Enums"]["account_status"]
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          last_active_at?: string | null
          last_login_at?: string | null
          phone?: string | null
          updated_at?: string
          user_id?: string
          username?: string | null
        }
        Relationships: []
      }
      purchase_intents: {
        Row: {
          actor_id: string | null
          actor_type: string
          amount_expected: number
          base_amount: number | null
          created_at: string
          customer_email: string | null
          customer_name: string | null
          expires_at: string | null
          fee_amount: number | null
          fee_rate: number | null
          id: string
          intent_reference: string
          intent_type: string
          network: string
          order_context: Json | null
          payment_method: string | null
          phone_number: string
          plan_id: string | null
          plan_snapshot: Json
          source_channel: string
          status: Database["public"]["Enums"]["intent_status"]
          total_amount: number | null
          updated_at: string
        }
        Insert: {
          actor_id?: string | null
          actor_type?: string
          amount_expected: number
          base_amount?: number | null
          created_at?: string
          customer_email?: string | null
          customer_name?: string | null
          expires_at?: string | null
          fee_amount?: number | null
          fee_rate?: number | null
          id?: string
          intent_reference: string
          intent_type?: string
          network: string
          order_context?: Json | null
          payment_method?: string | null
          phone_number: string
          plan_id?: string | null
          plan_snapshot?: Json
          source_channel?: string
          status?: Database["public"]["Enums"]["intent_status"]
          total_amount?: number | null
          updated_at?: string
        }
        Update: {
          actor_id?: string | null
          actor_type?: string
          amount_expected?: number
          base_amount?: number | null
          created_at?: string
          customer_email?: string | null
          customer_name?: string | null
          expires_at?: string | null
          fee_amount?: number | null
          fee_rate?: number | null
          id?: string
          intent_reference?: string
          intent_type?: string
          network?: string
          order_context?: Json | null
          payment_method?: string | null
          phone_number?: string
          plan_id?: string | null
          plan_snapshot?: Json
          source_channel?: string
          status?: Database["public"]["Enums"]["intent_status"]
          total_amount?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth_key: string
          created_at: string | null
          endpoint: string
          id: string
          p256dh_key: string
          user_id: string | null
        }
        Insert: {
          auth_key: string
          created_at?: string | null
          endpoint: string
          id?: string
          p256dh_key: string
          user_id?: string | null
        }
        Update: {
          auth_key?: string
          created_at?: string | null
          endpoint?: string
          id?: string
          p256dh_key?: string
          user_id?: string | null
        }
        Relationships: []
      }
      special_bundle_orders: {
        Row: {
          admin_note: string | null
          amount_charged: number
          buyer_role: string
          created_at: string
          currency: string
          delivered_at: string | null
          id: string
          network: string
          package_id: string | null
          package_snapshot: Json
          price_tier: string
          public_order_id: string
          recipient_number: string
          refund_request_reason: string | null
          refund_requested: boolean
          refund_requested_at: string | null
          status: string
          supplier_reference: string | null
          updated_at: string
          user_id: string
          wallet_debit_txn_id: string | null
          wallet_refund_txn_id: string | null
        }
        Insert: {
          admin_note?: string | null
          amount_charged: number
          buyer_role?: string
          created_at?: string
          currency?: string
          delivered_at?: string | null
          id?: string
          network?: string
          package_id?: string | null
          package_snapshot?: Json
          price_tier: string
          public_order_id: string
          recipient_number: string
          refund_request_reason?: string | null
          refund_requested?: boolean
          refund_requested_at?: string | null
          status?: string
          supplier_reference?: string | null
          updated_at?: string
          user_id: string
          wallet_debit_txn_id?: string | null
          wallet_refund_txn_id?: string | null
        }
        Update: {
          admin_note?: string | null
          amount_charged?: number
          buyer_role?: string
          created_at?: string
          currency?: string
          delivered_at?: string | null
          id?: string
          network?: string
          package_id?: string | null
          package_snapshot?: Json
          price_tier?: string
          public_order_id?: string
          recipient_number?: string
          refund_request_reason?: string | null
          refund_requested?: boolean
          refund_requested_at?: string | null
          status?: string
          supplier_reference?: string | null
          updated_at?: string
          user_id?: string
          wallet_debit_txn_id?: string | null
          wallet_refund_txn_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "special_bundle_orders_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "special_bundle_packages"
            referencedColumns: ["id"]
          },
        ]
      }
      special_bundle_packages: {
        Row: {
          agent_price: number
          bundle_type: string
          created_at: string
          currency: string
          delivery_note: string | null
          id: string
          is_active: boolean
          name: string
          network: string
          size_label: string
          sort_order: number
          supplier_price: number
          updated_at: string
          user_price: number
        }
        Insert: {
          agent_price?: number
          bundle_type?: string
          created_at?: string
          currency?: string
          delivery_note?: string | null
          id?: string
          is_active?: boolean
          name?: string
          network?: string
          size_label: string
          sort_order?: number
          supplier_price?: number
          updated_at?: string
          user_price?: number
        }
        Update: {
          agent_price?: number
          bundle_type?: string
          created_at?: string
          currency?: string
          delivery_note?: string | null
          id?: string
          is_active?: boolean
          name?: string
          network?: string
          size_label?: string
          sort_order?: number
          supplier_price?: number
          updated_at?: string
          user_price?: number
        }
        Relationships: []
      }
      special_bundle_status_history: {
        Row: {
          changed_by: string | null
          created_at: string
          id: string
          new_status: string
          note: string | null
          old_status: string | null
          order_id: string
        }
        Insert: {
          changed_by?: string | null
          created_at?: string
          id?: string
          new_status: string
          note?: string | null
          old_status?: string | null
          order_id: string
        }
        Update: {
          changed_by?: string | null
          created_at?: string
          id?: string
          new_status?: string
          note?: string | null
          old_status?: string | null
          order_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "special_bundle_status_history_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "special_bundle_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      supplier_request_logs: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          is_success: boolean | null
          normalized_result: string | null
          order_id: string
          request_payload: Json | null
          request_started_at: string
          response_payload: Json | null
          response_received_at: string | null
          supplier_id: string | null
          supplier_reference: string | null
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          is_success?: boolean | null
          normalized_result?: string | null
          order_id: string
          request_payload?: Json | null
          request_started_at?: string
          response_payload?: Json | null
          response_received_at?: string | null
          supplier_id?: string | null
          supplier_reference?: string | null
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          is_success?: boolean | null
          normalized_result?: string | null
          order_id?: string
          request_payload?: Json | null
          request_started_at?: string
          response_payload?: Json | null
          response_received_at?: string | null
          supplier_id?: string | null
          supplier_reference?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "supplier_request_logs_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_request_logs_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      supplier_sync_logs: {
        Row: {
          completed_at: string | null
          created_at: string
          error_message: string | null
          id: string
          metadata: Json | null
          orders_updated: number | null
          packages_created: number | null
          packages_deactivated: number | null
          packages_updated: number | null
          raw_response: Json | null
          started_at: string
          status: string
          supplier_id: string | null
          sync_type: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          metadata?: Json | null
          orders_updated?: number | null
          packages_created?: number | null
          packages_deactivated?: number | null
          packages_updated?: number | null
          raw_response?: Json | null
          started_at?: string
          status?: string
          supplier_id?: string | null
          sync_type: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          metadata?: Json | null
          orders_updated?: number | null
          packages_created?: number | null
          packages_deactivated?: number | null
          packages_updated?: number | null
          raw_response?: Json | null
          started_at?: string
          status?: string
          supplier_id?: string | null
          sync_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "supplier_sync_logs_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          api_base_url: string | null
          auth_config: Json | null
          created_at: string
          endpoint_config: Json
          id: string
          is_active: boolean
          last_product_sync_at: string | null
          metadata: Json | null
          name: string
          polling_interval_seconds: number
          priority: number
          provider_code: string
          request_timeout_ms: number
          supported_networks: Json
          supports_order_submission: boolean
          supports_product_sync: boolean
          supports_status_sync: boolean
          updated_at: string
        }
        Insert: {
          api_base_url?: string | null
          auth_config?: Json | null
          created_at?: string
          endpoint_config?: Json
          id?: string
          is_active?: boolean
          last_product_sync_at?: string | null
          metadata?: Json | null
          name: string
          polling_interval_seconds?: number
          priority?: number
          provider_code: string
          request_timeout_ms?: number
          supported_networks?: Json
          supports_order_submission?: boolean
          supports_product_sync?: boolean
          supports_status_sync?: boolean
          updated_at?: string
        }
        Update: {
          api_base_url?: string | null
          auth_config?: Json | null
          created_at?: string
          endpoint_config?: Json
          id?: string
          is_active?: boolean
          last_product_sync_at?: string | null
          metadata?: Json | null
          name?: string
          polling_interval_seconds?: number
          priority?: number
          provider_code?: string
          request_timeout_ms?: number
          supported_networks?: Json
          supports_order_submission?: boolean
          supports_product_sync?: boolean
          supports_status_sync?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      system_settings: {
        Row: {
          description: string | null
          id: string
          setting_group: string | null
          setting_key: string
          setting_value: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          description?: string | null
          id?: string
          setting_group?: string | null
          setting_key: string
          setting_value?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          description?: string | null
          id?: string
          setting_group?: string | null
          setting_key?: string
          setting_value?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      user_profiles: {
        Row: {
          avatar_url: string | null
          country: string | null
          created_at: string
          default_network_preference: string | null
          id: string
          metadata: Json | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          country?: string | null
          created_at?: string
          default_network_preference?: string | null
          id?: string
          metadata?: Json | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          country?: string | null
          created_at?: string
          default_network_preference?: string | null
          id?: string
          metadata?: Json | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      wallet_transactions: {
        Row: {
          amount: number
          closing_balance: number
          created_at: string
          created_by: string | null
          direction: Database["public"]["Enums"]["transaction_direction"]
          id: string
          linked_record_id: string | null
          linked_record_type: string | null
          narration: string | null
          opening_balance: number
          reference: string | null
          status: Database["public"]["Enums"]["transaction_status"]
          transaction_type: Database["public"]["Enums"]["transaction_type"]
          updated_at: string
          wallet_id: string
        }
        Insert: {
          amount: number
          closing_balance?: number
          created_at?: string
          created_by?: string | null
          direction: Database["public"]["Enums"]["transaction_direction"]
          id?: string
          linked_record_id?: string | null
          linked_record_type?: string | null
          narration?: string | null
          opening_balance?: number
          reference?: string | null
          status?: Database["public"]["Enums"]["transaction_status"]
          transaction_type: Database["public"]["Enums"]["transaction_type"]
          updated_at?: string
          wallet_id: string
        }
        Update: {
          amount?: number
          closing_balance?: number
          created_at?: string
          created_by?: string | null
          direction?: Database["public"]["Enums"]["transaction_direction"]
          id?: string
          linked_record_id?: string | null
          linked_record_type?: string | null
          narration?: string | null
          opening_balance?: number
          reference?: string | null
          status?: Database["public"]["Enums"]["transaction_status"]
          transaction_type?: Database["public"]["Enums"]["transaction_type"]
          updated_at?: string
          wallet_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wallet_transactions_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "wallets"
            referencedColumns: ["id"]
          },
        ]
      }
      wallets: {
        Row: {
          created_at: string
          current_balance: number
          id: string
          locked_balance: number
          status: Database["public"]["Enums"]["wallet_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_balance?: number
          id?: string
          locked_balance?: number
          status?: Database["public"]["Enums"]["wallet_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_balance?: number
          id?: string
          locked_balance?: number
          status?: Database["public"]["Enums"]["wallet_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      withdrawal_requests: {
        Row: {
          admin_note: string | null
          agent_profile_id: string
          amount: number
          created_at: string
          id: string
          momo_name: string
          momo_network: string
          momo_number: string
          refund_transaction_id: string | null
          requested_at: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          updated_at: string
          user_id: string
          wallet_kind: string
          wallet_transaction_id: string | null
        }
        Insert: {
          admin_note?: string | null
          agent_profile_id: string
          amount: number
          created_at?: string
          id?: string
          momo_name: string
          momo_network: string
          momo_number: string
          refund_transaction_id?: string | null
          requested_at?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
          user_id: string
          wallet_kind?: string
          wallet_transaction_id?: string | null
        }
        Update: {
          admin_note?: string | null
          agent_profile_id?: string
          amount?: number
          created_at?: string
          id?: string
          momo_name?: string
          momo_network?: string
          momo_number?: string
          refund_transaction_id?: string | null
          requested_at?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
          user_id?: string
          wallet_kind?: string
          wallet_transaction_id?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      activate_agent_subscription_atomic: {
        Args: {
          _amount_paid: number
          _intent_id: string
          _payment_record_id: string
          _plan: Database["public"]["Enums"]["agent_subscription_plan"]
          _user_id: string
        }
        Returns: {
          agent_profile_id: string
          already_processed: boolean
          expires_at: string
          starts_at: string
          subscription_id: string
        }[]
      }
      admin_activate_agent_subscription: {
        Args: {
          _admin_id: string
          _note?: string
          _plan: Database["public"]["Enums"]["agent_subscription_plan"]
          _target_user_id: string
        }
        Returns: {
          agent_profile_id: string
          expires_at: string
          starts_at: string
          subscription_id: string
        }[]
      }
      admin_cancel_refund_special_bundle: {
        Args: { _order_id: string; _reason: string }
        Returns: undefined
      }
      admin_credit_user_wallet: {
        Args: {
          _admin_id: string
          _amount: number
          _reason: string
          _target_user_id: string
        }
        Returns: {
          new_balance: number
          txn_id: string
        }[]
      }
      admin_debit_user_wallet: {
        Args: {
          _admin_id: string
          _amount: number
          _reason: string
          _target_user_id: string
        }
        Returns: {
          new_balance: number
          txn_id: string
        }[]
      }
      admin_set_account_status: {
        Args: {
          _admin_id: string
          _reason: string
          _status: Database["public"]["Enums"]["account_status"]
          _target_user_id: string
        }
        Returns: undefined
      }
      admin_set_special_bundle_setting: {
        Args: { _key: string; _value: string }
        Returns: undefined
      }
      admin_set_special_bundle_status: {
        Args: { _new_status: string; _note: string; _order_id: string }
        Returns: undefined
      }
      admin_set_user_role: {
        Args: {
          _admin_id: string
          _grant?: boolean
          _role: Database["public"]["Enums"]["app_role"]
          _target_user_id: string
        }
        Returns: undefined
      }
      approve_agent_withdrawal_atomic: {
        Args: { _admin_id: string; _note?: string; _request_id: string }
        Returns: {
          request_id: string
          status: string
        }[]
      }
      approve_agent_withdrawal_v2_atomic: {
        Args: { _admin_id: string; _note?: string; _request_id: string }
        Returns: {
          request_id: string
          status: string
        }[]
      }
      claim_intent_for_verification: {
        Args: { _intent_id: string }
        Returns: {
          actor_id: string | null
          actor_type: string
          amount_expected: number
          base_amount: number | null
          created_at: string
          customer_email: string | null
          customer_name: string | null
          expires_at: string | null
          fee_amount: number | null
          fee_rate: number | null
          id: string
          intent_reference: string
          intent_type: string
          network: string
          order_context: Json | null
          payment_method: string | null
          phone_number: string
          plan_id: string | null
          plan_snapshot: Json
          source_channel: string
          status: Database["public"]["Enums"]["intent_status"]
          total_amount: number | null
          updated_at: string
        }[]
        SetofOptions: {
          from: "*"
          to: "purchase_intents"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      claim_order_for_fulfillment: {
        Args: { _order_id: string }
        Returns: {
          actor_id: string | null
          actor_type: string
          amount_charged: number
          beneficiary_number: string
          bundle_code: string
          bundle_name: string
          bundle_snapshot: Json
          created_at: string
          currency: string
          delivery_message: string | null
          id: string
          intent_id: string | null
          metadata: Json | null
          network: string
          origin_type: string
          payment_record_id: string | null
          public_order_id: string
          source_channel: string
          status: Database["public"]["Enums"]["order_status"]
          supplier_reference: string | null
          supplier_status: string | null
          updated_at: string
        }[]
        SetofOptions: {
          from: "*"
          to: "orders"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      credit_agent_commission_atomic: {
        Args: {
          _agent_profile_id: string
          _agent_user_id: string
          _commission_rate: number
          _order_amount: number
          _order_id: string
        }
        Returns: {
          already_processed: boolean
          commission_amount: number
          earning_id: string
        }[]
      }
      credit_agent_earnings_wallet_atomic: {
        Args: {
          _agent_wallet_id: string
          _amount: number
          _created_by?: string
          _linked_record_id?: string
          _linked_record_type?: string
          _narration: string
          _reference: string
          _txn_type?: string
        }
        Returns: {
          already_processed: boolean
          closing_bal: number
          new_balance: number
          opening_bal: number
          txn_id: string
        }[]
      }
      credit_wallet_atomic: {
        Args: {
          _amount: number
          _created_by?: string
          _linked_record_id?: string
          _linked_record_type?: string
          _narration: string
          _reference: string
          _wallet_id: string
        }
        Returns: {
          closing_bal: number
          new_balance: number
          opening_bal: number
          txn_id: string
        }[]
      }
      debit_agent_earnings_wallet_atomic: {
        Args: {
          _agent_wallet_id: string
          _amount: number
          _created_by?: string
          _linked_record_id?: string
          _linked_record_type?: string
          _narration: string
          _reference: string
          _txn_type?: string
        }
        Returns: {
          closing_bal: number
          new_balance: number
          opening_bal: number
          txn_id: string
        }[]
      }
      debit_wallet_atomic: {
        Args: {
          _amount: number
          _created_by?: string
          _linked_record_id?: string
          _linked_record_type?: string
          _narration: string
          _reference: string
          _wallet_id: string
        }
        Returns: {
          closing_bal: number
          new_balance: number
          opening_bal: number
          txn_id: string
        }[]
      }
      ensure_user_scaffold: {
        Args: {
          _email?: string
          _full_name?: string
          _phone?: string
          _user_id: string
          _username?: string
        }
        Returns: Json
      }
      get_account_status: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["account_status"]
      }
      get_admin_profit_stats: {
        Args: never
        Returns: {
          agent_profit: number
          direct_profit: number
          total_commission: number
          total_profit: number
        }[]
      }
      get_agent_storefront_orders: {
        Args: { p_limit?: number; p_profile_id: string }
        Returns: {
          actor_id: string | null
          actor_type: string
          amount_charged: number
          beneficiary_number: string
          bundle_code: string
          bundle_name: string
          bundle_snapshot: Json
          created_at: string
          currency: string
          delivery_message: string | null
          id: string
          intent_id: string | null
          metadata: Json | null
          network: string
          origin_type: string
          payment_record_id: string | null
          public_order_id: string
          source_channel: string
          status: Database["public"]["Enums"]["order_status"]
          supplier_reference: string | null
          supplier_status: string | null
          updated_at: string
        }[]
        SetofOptions: {
          from: "*"
          to: "orders"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_profit_metrics: {
        Args: { end_date: string; start_date: string }
        Returns: Json
      }
      get_public_agent_store: {
        Args: { _slug: string }
        Returns: {
          city: string
          created_at: string
          id: string
          status: Database["public"]["Enums"]["agent_profile_status"]
          store_logo_url: string
          store_name: string
          store_slug: string
          store_tagline: string
        }[]
      }
      get_public_storefront: {
        Args: { _slug: string }
        Returns: {
          business_name: string
          city: string
          contact_phone: string
          created_at: string
          id: string
          status: Database["public"]["Enums"]["agent_profile_status"]
          store_logo_url: string
          store_name: string
          store_slug: string
          store_tagline: string
          storefront_enabled: boolean
          user_id: string
        }[]
      }
      get_sales_source_breakdown: {
        Args: { timeframe?: string }
        Returns: {
          actor_type: string
          total_orders: number
          total_revenue: number
        }[]
      }
      get_sales_trends: {
        Args: { days_limit?: number }
        Returns: {
          sale_date: string
          total_orders: number
          total_revenue: number
        }[]
      }
      get_special_bundle_settings: {
        Args: never
        Returns: {
          delivery_eta: string
          offer_enabled: boolean
        }[]
      }
      get_top_agents: {
        Args: { timeframe?: string }
        Returns: {
          agent_id: string
          store_name: string
          total_commission: number
          total_orders: number
          total_revenue: number
          user_id: string
        }[]
      }
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      list_agent_resaleable_packages: {
        Args: never
        Returns: {
          agent_base_price: number
          buying_enabled: boolean
          category: string
          currency: string
          display_order: number
          id: string
          is_active: boolean
          is_agent_resaleable: boolean
          network: string
          package_code: string
          package_name: string
          package_size_label: string
          package_type: string
          package_volume_value: string
          selling_price: number
          source_type: string
          validity_label: string
        }[]
      }
      list_public_packages: {
        Args: { _logged_in?: boolean }
        Returns: {
          agent_base_price: number
          buying_enabled: boolean
          category: string
          currency: string
          display_order: number
          id: string
          is_active: boolean
          is_agent_resaleable: boolean
          network: string
          package_code: string
          package_name: string
          package_size_label: string
          package_type: string
          package_volume_value: string
          selling_price: number
          validity_label: string
          visible_for_logged_in: boolean
          visible_on_public: boolean
        }[]
      }
      lookup_intent_public: {
        Args: { _reference: string }
        Returns: {
          amount_expected: number
          base_amount: number
          created_at: string
          customer_name: string
          expires_at: string
          fee_amount: number
          id: string
          intent_reference: string
          intent_type: string
          network: string
          phone_number: string
          plan_snapshot: Json
          source_channel: string
          status: Database["public"]["Enums"]["intent_status"]
          total_amount: number
        }[]
      }
      process_express_order: {
        Args: {
          p_package_id: string
          p_phone_number: string
          p_user_id: string
        }
        Returns: Json
      }
      purchase_bulk_with_wallet_atomic: {
        Args: {
          _network: string
          _package_id: string
          _phone_numbers: string[]
          _source_channel?: string
          _user_id: string
        }
        Returns: {
          new_balance: number
          orders_created: number
          txn_id: string
        }[]
      }
      purchase_special_bundle_atomic: {
        Args: { _package_id: string; _recipient_number: string }
        Returns: {
          amount_charged: number
          new_balance: number
          order_id: string
          public_order_id: string
        }[]
      }
      purchase_with_wallet_atomic: {
        Args: {
          _customer_email?: string
          _customer_name?: string
          _network: string
          _package_id: string
          _phone_number: string
          _source_channel?: string
          _user_id: string
        }
        Returns: {
          amount_charged: number
          new_balance: number
          order_id: string
          public_order_id: string
          txn_id: string
        }[]
      }
      refund_wallet_purchase_atomic: {
        Args: { _actor_id?: string; _order_id: string; _reason?: string }
        Returns: {
          amount: number
          new_balance: number
          reason: string
          refunded: boolean
          txn_id: string
        }[]
      }
      reject_agent_withdrawal_atomic: {
        Args: { _admin_id: string; _note?: string; _request_id: string }
        Returns: {
          refunded_amount: number
          request_id: string
          status: string
        }[]
      }
      reject_agent_withdrawal_v2_atomic: {
        Args: { _admin_id: string; _note?: string; _request_id: string }
        Returns: {
          refunded_amount: number
          request_id: string
          status: string
        }[]
      }
      request_agent_withdrawal_atomic: {
        Args: {
          _amount: number
          _momo_name: string
          _momo_network: string
          _momo_number: string
          _user_id: string
        }
        Returns: {
          new_balance: number
          request_id: string
          txn_id: string
        }[]
      }
      request_agent_withdrawal_v2_atomic: {
        Args: {
          _amount: number
          _momo_name: string
          _momo_network: string
          _momo_number: string
          _user_id: string
        }
        Returns: {
          new_balance: number
          request_id: string
          txn_id: string
        }[]
      }
      request_special_bundle_refund: {
        Args: { _order_id: string; _reason: string }
        Returns: undefined
      }
      resolve_login_identifier: {
        Args: { _identifier: string }
        Returns: string
      }
      track_order_public: {
        Args: { _reference: string }
        Returns: {
          amount_charged: number
          beneficiary_number: string
          bundle_name: string
          bundle_snapshot: Json
          created_at: string
          currency: string
          delivery_message: string
          id: string
          network: string
          public_order_id: string
          status: Database["public"]["Enums"]["order_status"]
          timeline: Json
          updated_at: string
        }[]
      }
      track_orders_by_phone_public: {
        Args: { _phone: string }
        Returns: {
          bundle_snapshot: Json
          created_at: string
          network: string
          public_order_id: string
          status: Database["public"]["Enums"]["order_status"]
        }[]
      }
      upsert_agent_bundle_price: {
        Args: { _package_id: string; _selling_price: number }
        Returns: {
          agent_base_price: number
          id: string
          profit: number
          selling_price: number
        }[]
      }
      write_audit_log: {
        Args: {
          _action: string
          _metadata?: Json
          _target_id?: string
          _target_type?: string
        }
        Returns: string
      }
    }
    Enums: {
      account_status: "active" | "suspended" | "pending" | "disabled"
      agent_application_status:
        | "draft"
        | "submitted"
        | "under_review"
        | "needs_changes"
        | "approved"
        | "declined"
      agent_profile_status:
        | "pending_subscription"
        | "active"
        | "subscription_expired"
        | "suspended"
      agent_subscription_plan: "monthly" | "yearly"
      agent_subscription_status: "pending" | "active" | "expired" | "cancelled"
      app_role: "user" | "agent" | "staff" | "admin"
      intent_status:
        | "created"
        | "pending_payment"
        | "payment_processing"
        | "payment_confirmed"
        | "fulfilling"
        | "completed"
        | "failed"
        | "expired"
        | "cancelled"
      notice_audience:
        | "public"
        | "users"
        | "agents"
        | "staff"
        | "admins"
        | "all"
      notice_type:
        | "service_notice"
        | "maintenance_notice"
        | "info_notice"
        | "warning_notice"
      order_status:
        | "paid"
        | "queued"
        | "processing"
        | "delivered"
        | "failed"
        | "cancelled"
        | "refunded"
        | "on_hold"
      payment_status: "pending" | "verified" | "failed" | "reversed"
      transaction_direction: "inflow" | "outflow"
      transaction_status: "pending" | "completed" | "failed" | "reversed"
      transaction_type: "credit" | "debit" | "reversal" | "adjustment"
      wallet_status: "active" | "frozen" | "closed"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      account_status: ["active", "suspended", "pending", "disabled"],
      agent_application_status: [
        "draft",
        "submitted",
        "under_review",
        "needs_changes",
        "approved",
        "declined",
      ],
      agent_profile_status: [
        "pending_subscription",
        "active",
        "subscription_expired",
        "suspended",
      ],
      agent_subscription_plan: ["monthly", "yearly"],
      agent_subscription_status: ["pending", "active", "expired", "cancelled"],
      app_role: ["user", "agent", "staff", "admin"],
      intent_status: [
        "created",
        "pending_payment",
        "payment_processing",
        "payment_confirmed",
        "fulfilling",
        "completed",
        "failed",
        "expired",
        "cancelled",
      ],
      notice_audience: ["public", "users", "agents", "staff", "admins", "all"],
      notice_type: [
        "service_notice",
        "maintenance_notice",
        "info_notice",
        "warning_notice",
      ],
      order_status: [
        "paid",
        "queued",
        "processing",
        "delivered",
        "failed",
        "cancelled",
        "refunded",
        "on_hold",
      ],
      payment_status: ["pending", "verified", "failed", "reversed"],
      transaction_direction: ["inflow", "outflow"],
      transaction_status: ["pending", "completed", "failed", "reversed"],
      transaction_type: ["credit", "debit", "reversal", "adjustment"],
      wallet_status: ["active", "frozen", "closed"],
    },
  },
} as const
