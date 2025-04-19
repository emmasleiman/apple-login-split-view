export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      employees: {
        Row: {
          contact_number: string | null
          created_at: string
          employee_id: string
          first_name: string
          gender: string
          id: string
          inactive_timeout_mins: number | null
          last_name: string
          password: string
          role: Database["public"]["Enums"]["employee_role"]
          username: string
        }
        Insert: {
          contact_number?: string | null
          created_at?: string
          employee_id: string
          first_name: string
          gender: string
          id?: string
          inactive_timeout_mins?: number | null
          last_name: string
          password: string
          role: Database["public"]["Enums"]["employee_role"]
          username: string
        }
        Update: {
          contact_number?: string | null
          created_at?: string
          employee_id?: string
          first_name?: string
          gender?: string
          id?: string
          inactive_timeout_mins?: number | null
          last_name?: string
          password?: string
          role?: Database["public"]["Enums"]["employee_role"]
          username?: string
        }
        Relationships: []
      }
      lab_results: {
        Row: {
          collection_date: string
          id: string
          notes: string | null
          patient_id: string | null
          processed_by: string | null
          processed_date: string | null
          result: string | null
          sample_id: string
        }
        Insert: {
          collection_date?: string
          id?: string
          notes?: string | null
          patient_id?: string | null
          processed_by?: string | null
          processed_date?: string | null
          result?: string | null
          sample_id: string
        }
        Update: {
          collection_date?: string
          id?: string
          notes?: string | null
          patient_id?: string | null
          processed_by?: string | null
          processed_date?: string | null
          result?: string | null
          sample_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lab_results_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patient_lab_results"
            referencedColumns: ["patient_uuid"]
          },
          {
            foreignKeyName: "lab_results_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_location_inconsistencies: {
        Row: {
          cleared: boolean | null
          cleared_at: string | null
          cleared_by: string | null
          detected_at: string | null
          first_ward: string
          id: string
          notes: string | null
          patient_id: string
          second_ward: string
          time_difference_mins: number
        }
        Insert: {
          cleared?: boolean | null
          cleared_at?: string | null
          cleared_by?: string | null
          detected_at?: string | null
          first_ward: string
          id?: string
          notes?: string | null
          patient_id: string
          second_ward: string
          time_difference_mins: number
        }
        Update: {
          cleared?: boolean | null
          cleared_at?: string | null
          cleared_by?: string | null
          detected_at?: string | null
          first_ward?: string
          id?: string
          notes?: string | null
          patient_id?: string
          second_ward?: string
          time_difference_mins?: number
        }
        Relationships: []
      }
      patients: {
        Row: {
          culture_qr_code: string | null
          culture_required: boolean
          discharge_date: string | null
          id: string
          other_qr_code: string | null
          patient_id: string
          qr_code_url: string | null
          registration_date: string
          status: string
          wristband_qr_code: string | null
        }
        Insert: {
          culture_qr_code?: string | null
          culture_required?: boolean
          discharge_date?: string | null
          id?: string
          other_qr_code?: string | null
          patient_id: string
          qr_code_url?: string | null
          registration_date?: string
          status: string
          wristband_qr_code?: string | null
        }
        Update: {
          culture_qr_code?: string | null
          culture_required?: boolean
          discharge_date?: string | null
          id?: string
          other_qr_code?: string | null
          patient_id?: string
          qr_code_url?: string | null
          registration_date?: string
          status?: string
          wristband_qr_code?: string | null
        }
        Relationships: []
      }
      unauthorized_login_attempts: {
        Row: {
          attempt_time: string | null
          cleared: boolean | null
          cleared_at: string | null
          cleared_by: string | null
          device_info: string | null
          id: string
          ward_id: string
          ward_name: string
        }
        Insert: {
          attempt_time?: string | null
          cleared?: boolean | null
          cleared_at?: string | null
          cleared_by?: string | null
          device_info?: string | null
          id?: string
          ward_id: string
          ward_name: string
        }
        Update: {
          attempt_time?: string | null
          cleared?: boolean | null
          cleared_at?: string | null
          cleared_by?: string | null
          device_info?: string | null
          id?: string
          ward_id?: string
          ward_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "unauthorized_login_attempts_ward_id_fkey"
            columns: ["ward_id"]
            isOneToOne: false
            referencedRelation: "ward_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      ward_accounts: {
        Row: {
          created_at: string | null
          id: string
          password: string
          username: string
          ward: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          password: string
          username: string
          ward: string
        }
        Update: {
          created_at?: string | null
          id?: string
          password?: string
          username?: string
          ward?: string
        }
        Relationships: []
      }
      ward_active_sessions: {
        Row: {
          created_at: string | null
          device_info: string | null
          id: string
          last_active: string | null
          session_id: string
          ward_id: string
        }
        Insert: {
          created_at?: string | null
          device_info?: string | null
          id?: string
          last_active?: string | null
          session_id: string
          ward_id: string
        }
        Update: {
          created_at?: string | null
          device_info?: string | null
          id?: string
          last_active?: string | null
          session_id?: string
          ward_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ward_active_sessions_ward_id_fkey"
            columns: ["ward_id"]
            isOneToOne: false
            referencedRelation: "ward_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      ward_scan_logs: {
        Row: {
          id: string
          patient_id: string
          scanned_at: string
          scanned_by: string
          ward: string
        }
        Insert: {
          id?: string
          patient_id: string
          scanned_at?: string
          scanned_by: string
          ward: string
        }
        Update: {
          id?: string
          patient_id?: string
          scanned_at?: string
          scanned_by?: string
          ward?: string
        }
        Relationships: []
      }
    }
    Views: {
      patient_lab_results: {
        Row: {
          collection_date: string | null
          culture_required: boolean | null
          discharge_date: string | null
          lab_result_id: string | null
          notes: string | null
          patient_id: string | null
          patient_uuid: string | null
          processed_by: string | null
          processed_date: string | null
          registration_date: string | null
          result: string | null
          sample_id: string | null
          status: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      employee_role: "admin" | "data_encoder" | "lab_technician"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      employee_role: ["admin", "data_encoder", "lab_technician"],
    },
  },
} as const
