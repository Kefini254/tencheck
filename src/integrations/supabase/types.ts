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
      inquiries: {
        Row: {
          created_at: string
          id: string
          message: string
          property_id: string
          status: string
          tenant_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          property_id: string
          status?: string
          tenant_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          property_id?: string
          status?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inquiries_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      landlords: {
        Row: {
          created_at: string
          id: string
          user_id: string
          verification_status: string
        }
        Insert: {
          created_at?: string
          id?: string
          user_id: string
          verification_status?: string
        }
        Update: {
          created_at?: string
          id?: string
          user_id?: string
          verification_status?: string
        }
        Relationships: []
      }
      payment_evidence: {
        Row: {
          amount: number | null
          created_at: string
          evidence_type: string
          id: string
          payment_date: string | null
          raw_text: string | null
          receiver_name: string | null
          tenant_id: string
          transaction_code: string | null
          verification_status: string
        }
        Insert: {
          amount?: number | null
          created_at?: string
          evidence_type?: string
          id?: string
          payment_date?: string | null
          raw_text?: string | null
          receiver_name?: string | null
          tenant_id: string
          transaction_code?: string | null
          verification_status?: string
        }
        Update: {
          amount?: number | null
          created_at?: string
          evidence_type?: string
          id?: string
          payment_date?: string | null
          raw_text?: string | null
          receiver_name?: string | null
          tenant_id?: string
          transaction_code?: string | null
          verification_status?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          id: string
          name: string
          phone: string | null
          role: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          phone?: string | null
          role?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          phone?: string | null
          role?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      properties: {
        Row: {
          bathrooms: number
          bedrooms: number
          created_at: string
          description: string | null
          id: string
          images: string[] | null
          is_available: boolean
          landlord_id: string
          location: string
          rent_amount: number
          title: string
          updated_at: string
        }
        Insert: {
          bathrooms?: number
          bedrooms?: number
          created_at?: string
          description?: string | null
          id?: string
          images?: string[] | null
          is_available?: boolean
          landlord_id: string
          location: string
          rent_amount: number
          title: string
          updated_at?: string
        }
        Update: {
          bathrooms?: number
          bedrooms?: number
          created_at?: string
          description?: string | null
          id?: string
          images?: string[] | null
          is_available?: boolean
          landlord_id?: string
          location?: string
          rent_amount?: number
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      rental_records: {
        Row: {
          created_at: string
          id: string
          landlord_id: string
          payment_date: string | null
          payment_status: string
          property_id: string | null
          rent_amount: number
          tenant_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          landlord_id: string
          payment_date?: string | null
          payment_status?: string
          property_id?: string | null
          rent_amount: number
          tenant_id: string
        }
        Update: {
          created_at?: string
          id?: string
          landlord_id?: string
          payment_date?: string | null
          payment_status?: string
          property_id?: string | null
          rent_amount?: number
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "rental_records_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      service_requests: {
        Row: {
          created_at: string
          description: string | null
          id: string
          location: string
          requester_id: string
          service_category: string
          status: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          location: string
          requester_id: string
          service_category: string
          status?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          location?: string
          requester_id?: string
          service_category?: string
          status?: string
        }
        Relationships: []
      }
      service_workers: {
        Row: {
          created_at: string
          experience_years: number | null
          id: string
          is_available: boolean
          landlord_endorser_id: string | null
          latitude: number | null
          location: string
          longitude: number | null
          name: string
          phone: string | null
          rating: number | null
          service_category: string
          user_id: string | null
          verification_status: string
        }
        Insert: {
          created_at?: string
          experience_years?: number | null
          id?: string
          is_available?: boolean
          landlord_endorser_id?: string | null
          latitude?: number | null
          location: string
          longitude?: number | null
          name: string
          phone?: string | null
          rating?: number | null
          service_category: string
          user_id?: string | null
          verification_status?: string
        }
        Update: {
          created_at?: string
          experience_years?: number | null
          id?: string
          is_available?: boolean
          landlord_endorser_id?: string | null
          latitude?: number | null
          location?: string
          longitude?: number | null
          name?: string
          phone?: string | null
          rating?: number | null
          service_category?: string
          user_id?: string | null
          verification_status?: string
        }
        Relationships: []
      }
      tenant_scores: {
        Row: {
          last_updated: string
          late_payments: number
          missed_payments: number
          score: number
          tenant_id: string
          total_payments: number
          verified_sms_payments: number
        }
        Insert: {
          last_updated?: string
          late_payments?: number
          missed_payments?: number
          score?: number
          tenant_id: string
          total_payments?: number
          verified_sms_payments?: number
        }
        Update: {
          last_updated?: string
          late_payments?: number
          missed_payments?: number
          score?: number
          tenant_id?: string
          total_payments?: number
          verified_sms_payments?: number
        }
        Relationships: []
      }
      tenants: {
        Row: {
          created_at: string
          id: string
          name: string
          national_id: string | null
          phone: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          national_id?: string | null
          phone?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          national_id?: string | null
          phone?: string | null
          user_id?: string | null
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
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      worker_endorsements: {
        Row: {
          created_at: string
          endorsement_notes: string | null
          id: string
          landlord_id: string
          worker_id: string
        }
        Insert: {
          created_at?: string
          endorsement_notes?: string | null
          id?: string
          landlord_id: string
          worker_id: string
        }
        Update: {
          created_at?: string
          endorsement_notes?: string | null
          id?: string
          landlord_id?: string
          worker_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "worker_endorsements_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "service_workers"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      calculate_tenant_score: { Args: { _tenant_id: string }; Returns: number }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
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
      app_role: ["admin", "moderator", "user"],
    },
  },
} as const
