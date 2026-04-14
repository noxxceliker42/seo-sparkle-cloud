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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      cluster_pages: {
        Row: {
          cluster_id: string
          content_angle: string | null
          created_at: string
          differentiator: string | null
          estimated_difficulty: number | null
          estimated_volume: number | null
          firm_id: string | null
          id: string
          intent: string | null
          internal_link_anchor: string | null
          keyword: string
          page_type: string
          priority: string
          reason: string | null
          seo_page_id: string | null
          sort_order: number
          status: string
          updated_at: string
        }
        Insert: {
          cluster_id: string
          content_angle?: string | null
          created_at?: string
          differentiator?: string | null
          estimated_difficulty?: number | null
          estimated_volume?: number | null
          firm_id?: string | null
          id?: string
          intent?: string | null
          internal_link_anchor?: string | null
          keyword: string
          page_type: string
          priority?: string
          reason?: string | null
          seo_page_id?: string | null
          sort_order?: number
          status?: string
          updated_at?: string
        }
        Update: {
          cluster_id?: string
          content_angle?: string | null
          created_at?: string
          differentiator?: string | null
          estimated_difficulty?: number | null
          estimated_volume?: number | null
          firm_id?: string | null
          id?: string
          intent?: string | null
          internal_link_anchor?: string | null
          keyword?: string
          page_type?: string
          priority?: string
          reason?: string | null
          seo_page_id?: string | null
          sort_order?: number
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cluster_pages_cluster_id_fkey"
            columns: ["cluster_id"]
            isOneToOne: false
            referencedRelation: "clusters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cluster_pages_firm_id_fkey"
            columns: ["firm_id"]
            isOneToOne: false
            referencedRelation: "firms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cluster_pages_seo_page_id_fkey"
            columns: ["seo_page_id"]
            isOneToOne: false
            referencedRelation: "seo_pages"
            referencedColumns: ["id"]
          },
        ]
      }
      clusters: {
        Row: {
          created_at: string
          firm_id: string | null
          id: string
          name: string
          pillar_keyword: string
          pillar_page_id: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          firm_id?: string | null
          id?: string
          name: string
          pillar_keyword: string
          pillar_page_id?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          firm_id?: string | null
          id?: string
          name?: string
          pillar_keyword?: string
          pillar_page_id?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "clusters_firm_id_fkey"
            columns: ["firm_id"]
            isOneToOne: false
            referencedRelation: "firms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clusters_pillar_page_id_fkey"
            columns: ["pillar_page_id"]
            isOneToOne: false
            referencedRelation: "seo_pages"
            referencedColumns: ["id"]
          },
        ]
      }
      firms: {
        Row: {
          city: string | null
          created_at: string | null
          email: string | null
          id: string
          name: string
          phone: string | null
          service_area: string | null
          street: string | null
          user_id: string
          website: string | null
          zip: string | null
        }
        Insert: {
          city?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          name: string
          phone?: string | null
          service_area?: string | null
          street?: string | null
          user_id: string
          website?: string | null
          zip?: string | null
        }
        Update: {
          city?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          name?: string
          phone?: string | null
          service_area?: string | null
          street?: string | null
          user_id?: string
          website?: string | null
          zip?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          firm_id: string | null
          full_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          firm_id?: string | null
          full_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          firm_id?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_firm_id_fkey"
            columns: ["firm_id"]
            isOneToOne: false
            referencedRelation: "firms"
            referencedColumns: ["id"]
          },
        ]
      }
      seo_analyses: {
        Row: {
          city: string | null
          cluster: Json | null
          content_gaps: Json | null
          cpc: number | null
          created_at: string
          difficulty: number | null
          discover_angle: string | null
          firm_name: string | null
          id: string
          information_gain_suggestions: Json | null
          intent: string | null
          intent_detail: string | null
          keyword: string
          lsi: Json | null
          mode: string
          paa: Json | null
          page_type: string | null
          page_type_why: string | null
          raw_json: string | null
          schema_recommendation: Json | null
          secondary_keywords: Json | null
          serp_data: Json | null
          user_id: string
          volume: number | null
        }
        Insert: {
          city?: string | null
          cluster?: Json | null
          content_gaps?: Json | null
          cpc?: number | null
          created_at?: string
          difficulty?: number | null
          discover_angle?: string | null
          firm_name?: string | null
          id?: string
          information_gain_suggestions?: Json | null
          intent?: string | null
          intent_detail?: string | null
          keyword: string
          lsi?: Json | null
          mode?: string
          paa?: Json | null
          page_type?: string | null
          page_type_why?: string | null
          raw_json?: string | null
          schema_recommendation?: Json | null
          secondary_keywords?: Json | null
          serp_data?: Json | null
          user_id: string
          volume?: number | null
        }
        Update: {
          city?: string | null
          cluster?: Json | null
          content_gaps?: Json | null
          cpc?: number | null
          created_at?: string
          difficulty?: number | null
          discover_angle?: string | null
          firm_name?: string | null
          id?: string
          information_gain_suggestions?: Json | null
          intent?: string | null
          intent_detail?: string | null
          keyword?: string
          lsi?: Json | null
          mode?: string
          paa?: Json | null
          page_type?: string | null
          page_type_why?: string | null
          raw_json?: string | null
          schema_recommendation?: Json | null
          secondary_keywords?: Json | null
          serp_data?: Json | null
          user_id?: string
          volume?: number | null
        }
        Relationships: []
      }
      seo_pages: {
        Row: {
          active_sections: Json | null
          city: string | null
          created_at: string | null
          design_preset: string | null
          firm: string | null
          html_output: string | null
          id: string
          intent: string | null
          json_ld: string | null
          keyword: string
          meta_desc: string | null
          meta_title: string | null
          page_type: string | null
          score: number | null
          status: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          active_sections?: Json | null
          city?: string | null
          created_at?: string | null
          design_preset?: string | null
          firm?: string | null
          html_output?: string | null
          id?: string
          intent?: string | null
          json_ld?: string | null
          keyword: string
          meta_desc?: string | null
          meta_title?: string | null
          page_type?: string | null
          score?: number | null
          status?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          active_sections?: Json | null
          city?: string | null
          created_at?: string | null
          design_preset?: string | null
          firm?: string | null
          html_output?: string | null
          id?: string
          intent?: string | null
          json_ld?: string | null
          keyword?: string
          meta_desc?: string | null
          meta_title?: string | null
          page_type?: string | null
          score?: number | null
          status?: string | null
          updated_at?: string | null
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
    }
    Enums: {
      app_role: "admin" | "editor" | "viewer"
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
      app_role: ["admin", "editor", "viewer"],
    },
  },
} as const
