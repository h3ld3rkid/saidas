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
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      concelhos: {
        Row: {
          created_at: string
          distrito_id: string
          id: string
          nome: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          distrito_id: string
          id?: string
          nome: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          distrito_id?: string
          id?: string
          nome?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "concelhos_distrito_id_fkey"
            columns: ["distrito_id"]
            isOneToOne: false
            referencedRelation: "distritos"
            referencedColumns: ["id"]
          },
        ]
      }
      distritos: {
        Row: {
          created_at: string
          id: string
          nome: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          nome: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          nome?: string
          updated_at?: string
        }
        Relationships: []
      }
      freguesias: {
        Row: {
          concelho_id: string
          created_at: string
          id: string
          nome: string
          updated_at: string
        }
        Insert: {
          concelho_id: string
          created_at?: string
          id?: string
          nome: string
          updated_at?: string
        }
        Update: {
          concelho_id?: string
          created_at?: string
          id?: string
          nome?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "freguesias_concelho_id_fkey"
            columns: ["concelho_id"]
            isOneToOne: false
            referencedRelation: "concelhos"
            referencedColumns: ["id"]
          },
        ]
      }
      notices: {
        Row: {
          content: string
          created_at: string
          created_by: string
          end_date: string
          id: string
          is_active: boolean
          start_date: string
          title: string
          updated_at: string
        }
        Insert: {
          content: string
          created_at?: string
          created_by: string
          end_date: string
          id?: string
          is_active?: boolean
          start_date: string
          title: string
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          created_by?: string
          end_date?: string
          id?: string
          is_active?: boolean
          start_date?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          employee_number: string
          first_name: string
          function_role: string | null
          id: string
          is_active: boolean
          last_name: string
          role: Database["public"]["Enums"]["app_role"]
          telegram_chat_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          employee_number: string
          first_name: string
          function_role?: string | null
          id?: string
          is_active?: boolean
          last_name: string
          role?: Database["public"]["Enums"]["app_role"]
          telegram_chat_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          employee_number?: string
          first_name?: string
          function_role?: string | null
          id?: string
          is_active?: boolean
          last_name?: string
          role?: Database["public"]["Enums"]["app_role"]
          telegram_chat_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      ruas: {
        Row: {
          created_at: string
          freguesia_id: string
          id: string
          nome: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          freguesia_id: string
          id?: string
          nome: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          freguesia_id?: string
          id?: string
          nome?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ruas_freguesia_id_fkey"
            columns: ["freguesia_id"]
            isOneToOne: false
            referencedRelation: "freguesias"
            referencedColumns: ["id"]
          },
        ]
      }
      service_counters: {
        Row: {
          created_at: string | null
          current_number: number
          id: string
          service_type: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          current_number?: number
          id?: string
          service_type: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          current_number?: number
          id?: string
          service_type?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      total_service_counter: {
        Row: {
          current_number: number
          id: string
          updated_at: string | null
        }
        Insert: {
          current_number?: number
          id?: string
          updated_at?: string | null
        }
        Update: {
          current_number?: number
          id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      vehicle_exits: {
        Row: {
          ambulance_number: string | null
          created_at: string
          crew: string | null
          departure_date: string
          departure_time: string
          destination: string
          driver_license: string | null
          driver_name: string | null
          exit_type: string | null
          expected_return_date: string | null
          expected_return_time: string | null
          id: string
          is_pem: boolean | null
          is_reserve: boolean | null
          observations: string | null
          patient_address: string | null
          patient_age: number | null
          patient_contact: string | null
          patient_district: string | null
          patient_gender: string | null
          patient_municipality: string | null
          patient_name: string | null
          patient_parish: string | null
          purpose: string
          service_number: number | null
          status: string
          total_service_number: number | null
          updated_at: string
          user_id: string
          vehicle_id: string
        }
        Insert: {
          ambulance_number?: string | null
          created_at?: string
          crew?: string | null
          departure_date: string
          departure_time: string
          destination: string
          driver_license?: string | null
          driver_name?: string | null
          exit_type?: string | null
          expected_return_date?: string | null
          expected_return_time?: string | null
          id?: string
          is_pem?: boolean | null
          is_reserve?: boolean | null
          observations?: string | null
          patient_address?: string | null
          patient_age?: number | null
          patient_contact?: string | null
          patient_district?: string | null
          patient_gender?: string | null
          patient_municipality?: string | null
          patient_name?: string | null
          patient_parish?: string | null
          purpose: string
          service_number?: number | null
          status?: string
          total_service_number?: number | null
          updated_at?: string
          user_id: string
          vehicle_id: string
        }
        Update: {
          ambulance_number?: string | null
          created_at?: string
          crew?: string | null
          departure_date?: string
          departure_time?: string
          destination?: string
          driver_license?: string | null
          driver_name?: string | null
          exit_type?: string | null
          expected_return_date?: string | null
          expected_return_time?: string | null
          id?: string
          is_pem?: boolean | null
          is_reserve?: boolean | null
          observations?: string | null
          patient_address?: string | null
          patient_age?: number | null
          patient_contact?: string | null
          patient_district?: string | null
          patient_gender?: string | null
          patient_municipality?: string | null
          patient_name?: string | null
          patient_parish?: string | null
          purpose?: string
          service_number?: number | null
          status?: string
          total_service_number?: number | null
          updated_at?: string
          user_id?: string
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vehicle_exits_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicles: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          license_plate: string
          make: string
          model: string
          updated_at: string
          year: number | null
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          license_plate: string
          make: string
          model: string
          updated_at?: string
          year?: number | null
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          license_plate?: string
          make?: string
          model?: string
          updated_at?: string
          year?: number | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      auto_complete_old_services: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      check_codu_exists: {
        Args: { codu_number: string }
        Returns: {
          departure_date: string
          departure_time: string
          exit_id: string
          found: boolean
        }[]
      }
      get_all_users_details: {
        Args: Record<PropertyKey, never>
        Returns: {
          access_role: Database["public"]["Enums"]["app_role"]
          created_at: string
          email: string
          employee_number: string
          first_name: string
          function_role: string
          is_active: boolean
          last_name: string
          profile_id: string
          user_id: string
        }[]
      }
      get_current_user_role: {
        Args: Record<PropertyKey, never>
        Returns: Database["public"]["Enums"]["app_role"]
      }
      get_limited_exit_data: {
        Args: { exit_id: string }
        Returns: {
          created_at: string
          departure_date: string
          departure_time: string
          exit_type: string
          id: string
          service_number: number
          status: string
          total_service_number: number
          updated_at: string
          user_id: string
          vehicle_id: string
        }[]
      }
      get_next_service_number: {
        Args: { p_service_type: string }
        Returns: {
          service_num: number
          total_num: number
        }[]
      }
      get_users_with_email: {
        Args: Record<PropertyKey, never>
        Returns: {
          created_at: string
          email: string
          employee_number: string
          first_name: string
          function_role: string
          id: string
          is_active: boolean
          last_name: string
          user_id: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      search_active_crew_profiles: {
        Args: { q: string }
        Returns: {
          display_name: string
          user_id: string
        }[]
      }
    }
    Enums: {
      app_role: "user" | "mod" | "admin"
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
      app_role: ["user", "mod", "admin"],
    },
  },
} as const
