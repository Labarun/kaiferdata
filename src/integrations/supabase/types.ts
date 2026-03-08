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
          created_at: string
          currency: string
          customer_email: string | null
          customer_identifier: string | null
          id: string
          intent_id: string | null
          internal_reference: string
          provider: string
          provider_reference: string
          provider_response: Json | null
          status: Database["public"]["Enums"]["payment_status"]
          updated_at: string
          verified_at: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          currency?: string
          customer_email?: string | null
          customer_identifier?: string | null
          id?: string
          intent_id?: string | null
          internal_reference: string
          provider?: string
          provider_reference: string
          provider_response?: Json | null
          status?: Database["public"]["Enums"]["payment_status"]
          updated_at?: string
          verified_at?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          customer_email?: string | null
          customer_identifier?: string | null
          id?: string
          intent_id?: string | null
          internal_reference?: string
          provider?: string
          provider_reference?: string
          provider_response?: Json | null
          status?: Database["public"]["Enums"]["payment_status"]
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
          last_login_at: string | null
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          account_status?: Database["public"]["Enums"]["account_status"]
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          last_login_at?: string | null
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          account_status?: Database["public"]["Enums"]["account_status"]
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          last_login_at?: string | null
          phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      purchase_intents: {
        Row: {
          actor_id: string | null
          actor_type: string
          amount_expected: number
          created_at: string
          customer_email: string | null
          customer_name: string | null
          expires_at: string | null
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
          updated_at: string
        }
        Insert: {
          actor_id?: string | null
          actor_type?: string
          amount_expected: number
          created_at?: string
          customer_email?: string | null
          customer_name?: string | null
          expires_at?: string | null
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
          updated_at?: string
        }
        Update: {
          actor_id?: string | null
          actor_type?: string
          amount_expected?: number
          created_at?: string
          customer_email?: string | null
          customer_name?: string | null
          expires_at?: string | null
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
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "purchase_intents_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "data_plans"
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
      suppliers: {
        Row: {
          api_base_url: string | null
          auth_config: Json | null
          created_at: string
          id: string
          is_active: boolean
          metadata: Json | null
          name: string
          priority: number
          provider_code: string
          request_timeout_ms: number
          supported_networks: Json
          updated_at: string
        }
        Insert: {
          api_base_url?: string | null
          auth_config?: Json | null
          created_at?: string
          id?: string
          is_active?: boolean
          metadata?: Json | null
          name: string
          priority?: number
          provider_code: string
          request_timeout_ms?: number
          supported_networks?: Json
          updated_at?: string
        }
        Update: {
          api_base_url?: string | null
          auth_config?: Json | null
          created_at?: string
          id?: string
          is_active?: boolean
          metadata?: Json | null
          name?: string
          priority?: number
          provider_code?: string
          request_timeout_ms?: number
          supported_networks?: Json
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_account_status: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["account_status"]
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
    }
    Enums: {
      account_status: "active" | "suspended" | "pending" | "disabled"
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
      ],
      payment_status: ["pending", "verified", "failed", "reversed"],
      transaction_direction: ["inflow", "outflow"],
      transaction_status: ["pending", "completed", "failed", "reversed"],
      transaction_type: ["credit", "debit", "reversal", "adjustment"],
      wallet_status: ["active", "frozen", "closed"],
    },
  },
} as const
