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
          action_type: string
          created_at: string
          entity_id: string | null
          entity_type: string
          id: string
          metadata_json: Json | null
          user_id: string
        }
        Insert: {
          action_type: string
          created_at?: string
          entity_id?: string | null
          entity_type: string
          id?: string
          metadata_json?: Json | null
          user_id: string
        }
        Update: {
          action_type?: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: string
          metadata_json?: Json | null
          user_id?: string
        }
        Relationships: []
      }
      categories: {
        Row: {
          created_at: string
          description: string | null
          id: number
          name: string
          requires_age_limit: boolean
          requires_org_type: boolean
          tier_type: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id: number
          name: string
          requires_age_limit?: boolean
          requires_org_type?: boolean
          tier_type?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: number
          name?: string
          requires_age_limit?: boolean
          requires_org_type?: boolean
          tier_type?: string
        }
        Relationships: []
      }
      conflict_declarations: {
        Row: {
          conflict_reason: string
          created_at: string
          id: string
          judge_id: string
          resolved: boolean
          submission_id: string
        }
        Insert: {
          conflict_reason: string
          created_at?: string
          id?: string
          judge_id: string
          resolved?: boolean
          submission_id: string
        }
        Update: {
          conflict_reason?: string
          created_at?: string
          id?: string
          judge_id?: string
          resolved?: boolean
          submission_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conflict_declarations_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      countries: {
        Row: {
          created_at: string
          flag_emoji: string | null
          id: string
          name: string
          phone_code: string | null
          region_id: string | null
        }
        Insert: {
          created_at?: string
          flag_emoji?: string | null
          id: string
          name: string
          phone_code?: string | null
          region_id?: string | null
        }
        Update: {
          created_at?: string
          flag_emoji?: string | null
          id?: string
          name?: string
          phone_code?: string | null
          region_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "countries_region_id_fkey"
            columns: ["region_id"]
            isOneToOne: false
            referencedRelation: "regions"
            referencedColumns: ["id"]
          },
        ]
      }
      evidence_files: {
        Row: {
          file_type: string
          file_url: string
          id: string
          submission_id: string
          uploaded_at: string
        }
        Insert: {
          file_type: string
          file_url: string
          id?: string
          submission_id: string
          uploaded_at?: string
        }
        Update: {
          file_type?: string
          file_url?: string
          id?: string
          submission_id?: string
          uploaded_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "evidence_files_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      judge_assignments: {
        Row: {
          completed_at: string | null
          created_at: string
          id: string
          judge_id: string
          started_at: string
          status: string
          submission_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          id?: string
          judge_id: string
          started_at?: string
          status?: string
          submission_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          id?: string
          judge_id?: string
          started_at?: string
          status?: string
          submission_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "judge_assignments_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          link: string | null
          message: string
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          message: string
          title: string
          type?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          message?: string
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      panel_judges: {
        Row: {
          created_at: string
          id: string
          judge_id: string
          panel_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          judge_id: string
          panel_id: string
        }
        Update: {
          created_at?: string
          id?: string
          judge_id?: string
          panel_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "panel_judges_panel_id_fkey"
            columns: ["panel_id"]
            isOneToOne: false
            referencedRelation: "panels"
            referencedColumns: ["id"]
          },
        ]
      }
      panels: {
        Row: {
          category_id: number | null
          chair_id: string | null
          country_id: string | null
          created_at: string
          id: string
          level: string
          name: string | null
          region_id: string | null
        }
        Insert: {
          category_id?: number | null
          chair_id?: string | null
          country_id?: string | null
          created_at?: string
          id?: string
          level: string
          name?: string | null
          region_id?: string | null
        }
        Update: {
          category_id?: number | null
          chair_id?: string | null
          country_id?: string | null
          created_at?: string
          id?: string
          level?: string
          name?: string | null
          region_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "panels_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          currency: string
          id: string
          paid_at: string | null
          payment_method: string | null
          payment_status: string
          submission_id: string
          transaction_reference: string | null
        }
        Insert: {
          amount?: number
          created_at?: string
          currency?: string
          id?: string
          paid_at?: string | null
          payment_method?: string | null
          payment_status?: string
          submission_id: string
          transaction_reference?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          id?: string
          paid_at?: string | null
          payment_method?: string | null
          payment_status?: string
          submission_id?: string
          transaction_reference?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          country: string | null
          created_at: string
          credentials_path: string | null
          email: string
          full_name: string
          id: string
          organization: string | null
          phone: string | null
          position: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          country?: string | null
          created_at?: string
          credentials_path?: string | null
          email: string
          full_name: string
          id?: string
          organization?: string | null
          phone?: string | null
          position?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          country?: string | null
          created_at?: string
          credentials_path?: string | null
          email?: string
          full_name?: string
          id?: string
          organization?: string | null
          phone?: string | null
          position?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      regions: {
        Row: {
          created_at: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          id: string
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      scores: {
        Row: {
          comments: string | null
          created_at: string
          criterion_equity: number | null
          criterion_ethics: number | null
          criterion_evidence: number | null
          document_satisfaction: number | null
          documents_legitimate: boolean | null
          id: string
          impact_score: number | null
          innovation_score: number | null
          judge_id: string
          overall_score: number | null
          scalability_score: number | null
          submission_id: string
          sustainability_score: number | null
          updated_at: string
          verification_notes: string | null
          verification_source: string | null
        }
        Insert: {
          comments?: string | null
          created_at?: string
          criterion_equity?: number | null
          criterion_ethics?: number | null
          criterion_evidence?: number | null
          document_satisfaction?: number | null
          documents_legitimate?: boolean | null
          id?: string
          impact_score?: number | null
          innovation_score?: number | null
          judge_id: string
          overall_score?: number | null
          scalability_score?: number | null
          submission_id: string
          sustainability_score?: number | null
          updated_at?: string
          verification_notes?: string | null
          verification_source?: string | null
        }
        Update: {
          comments?: string | null
          created_at?: string
          criterion_equity?: number | null
          criterion_ethics?: number | null
          criterion_evidence?: number | null
          document_satisfaction?: number | null
          documents_legitimate?: boolean | null
          id?: string
          impact_score?: number | null
          innovation_score?: number | null
          judge_id?: string
          overall_score?: number | null
          scalability_score?: number | null
          submission_id?: string
          sustainability_score?: number | null
          updated_at?: string
          verification_notes?: string | null
          verification_source?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "scores_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      submission_documents: {
        Row: {
          category: string
          created_at: string
          file_name: string
          file_path: string
          file_size: number | null
          id: string
          mime_type: string | null
          submission_id: string
        }
        Insert: {
          category: string
          created_at?: string
          file_name: string
          file_path: string
          file_size?: number | null
          id?: string
          mime_type?: string | null
          submission_id: string
        }
        Update: {
          category?: string
          created_at?: string
          file_name?: string
          file_path?: string
          file_size?: number | null
          id?: string
          mime_type?: string | null
          submission_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "submission_documents_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      submissions: {
        Row: {
          approval_status: string
          average_score: number | null
          award_categories: string[] | null
          category_id: number | null
          communication_preference: string | null
          country_id: string | null
          created_at: string
          id: string
          institution_size: string | null
          institution_type: string | null
          is_locked: boolean
          nomination_statement: string
          nominator_email: string
          nominator_name: string
          nominator_phone: string | null
          nominator_role: string | null
          parent_submission_id: string | null
          past_awards: string | null
          promoted_from_stage: string | null
          region: string | null
          school_city: string
          school_country: string
          school_name: string
          screened_at: string | null
          screened_by: string | null
          screening_notes: string | null
          stage: string
          status: string
          submission_count: number
          submitter_id: string
          updated_at: string
        }
        Insert: {
          approval_status?: string
          average_score?: number | null
          award_categories?: string[] | null
          category_id?: number | null
          communication_preference?: string | null
          country_id?: string | null
          created_at?: string
          id?: string
          institution_size?: string | null
          institution_type?: string | null
          is_locked?: boolean
          nomination_statement: string
          nominator_email: string
          nominator_name: string
          nominator_phone?: string | null
          nominator_role?: string | null
          parent_submission_id?: string | null
          past_awards?: string | null
          promoted_from_stage?: string | null
          region?: string | null
          school_city: string
          school_country: string
          school_name: string
          screened_at?: string | null
          screened_by?: string | null
          screening_notes?: string | null
          stage?: string
          status?: string
          submission_count?: number
          submitter_id: string
          updated_at?: string
        }
        Update: {
          approval_status?: string
          average_score?: number | null
          award_categories?: string[] | null
          category_id?: number | null
          communication_preference?: string | null
          country_id?: string | null
          created_at?: string
          id?: string
          institution_size?: string | null
          institution_type?: string | null
          is_locked?: boolean
          nomination_statement?: string
          nominator_email?: string
          nominator_name?: string
          nominator_phone?: string | null
          nominator_role?: string | null
          parent_submission_id?: string | null
          past_awards?: string | null
          promoted_from_stage?: string | null
          region?: string | null
          school_city?: string
          school_country?: string
          school_name?: string
          screened_at?: string | null
          screened_by?: string | null
          screening_notes?: string | null
          stage?: string
          status?: string
          submission_count?: number
          submitter_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "submissions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "submissions_parent_submission_id_fkey"
            columns: ["parent_submission_id"]
            isOneToOne: false
            referencedRelation: "submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: never; Returns: boolean }
      is_judge: { Args: never; Returns: boolean }
      is_secretariat: { Args: never; Returns: boolean }
      is_submitter: { Args: never; Returns: boolean }
      log_audit: {
        Args: {
          _action_type: string
          _entity_id?: string
          _entity_type: string
          _metadata?: Json
          _user_id: string
        }
        Returns: undefined
      }
    }
    Enums: {
      app_role:
        | "submitter"
        | "judge"
        | "secretariat"
        | "admin"
        | "country_coordinator"
        | "panel_chair"
        | "global_jury"
        | "super_admin"
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
      app_role: [
        "submitter",
        "judge",
        "secretariat",
        "admin",
        "country_coordinator",
        "panel_chair",
        "global_jury",
        "super_admin",
      ],
    },
  },
} as const
