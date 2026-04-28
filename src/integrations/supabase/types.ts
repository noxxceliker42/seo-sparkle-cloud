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
      analysis_jobs: {
        Row: {
          completed_at: string | null
          error_message: string | null
          id: string
          keyword: string
          mode: string
          result_json: Json | null
          started_at: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          error_message?: string | null
          id?: string
          keyword: string
          mode?: string
          result_json?: Json | null
          started_at?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          error_message?: string | null
          id?: string
          keyword?: string
          mode?: string
          result_json?: Json | null
          started_at?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      brand_kits: {
        Row: {
          accent_color: string | null
          created_at: string | null
          custom_css_vars: Json | null
          design_philosophy: string | null
          firm_id: string | null
          id: string
          is_active: boolean | null
          is_default: boolean | null
          logo_alt: string | null
          logo_url: string | null
          name: string
          primary_color: string | null
          secondary_color: string | null
          updated_at: string | null
        }
        Insert: {
          accent_color?: string | null
          created_at?: string | null
          custom_css_vars?: Json | null
          design_philosophy?: string | null
          firm_id?: string | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          logo_alt?: string | null
          logo_url?: string | null
          name?: string
          primary_color?: string | null
          secondary_color?: string | null
          updated_at?: string | null
        }
        Update: {
          accent_color?: string | null
          created_at?: string | null
          custom_css_vars?: Json | null
          design_philosophy?: string | null
          firm_id?: string | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          logo_alt?: string | null
          logo_url?: string | null
          name?: string
          primary_color?: string | null
          secondary_color?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "brand_kits_firm_id_fkey"
            columns: ["firm_id"]
            isOneToOne: false
            referencedRelation: "firms"
            referencedColumns: ["id"]
          },
        ]
      }
      cluster_pages: {
        Row: {
          ai_description: string | null
          anchor_text: string | null
          cluster_id: string | null
          cpc: number | null
          created_at: string | null
          generated_at: string | null
          generation_jobs_id: string | null
          has_sub_cluster_potential: boolean | null
          id: string
          internal_links_list: Json | null
          internal_links_set: boolean | null
          is_sub_cluster_suggested: boolean | null
          keyword: string
          keyword_difficulty: number | null
          page_type: string
          pillar_tier: number | null
          priority: number | null
          score_conversion: number | null
          score_difficulty: number | null
          score_gap: number | null
          score_pillar_support: number | null
          score_total: number | null
          score_trend: number | null
          score_volume: number | null
          search_volume: number | null
          seo_page_id: string | null
          sitemap_added: boolean | null
          status: string | null
          sub_cluster_id: string | null
          trend_direction: string | null
          url_slug: string
          user_id: string | null
        }
        Insert: {
          ai_description?: string | null
          anchor_text?: string | null
          cluster_id?: string | null
          cpc?: number | null
          created_at?: string | null
          generated_at?: string | null
          generation_jobs_id?: string | null
          has_sub_cluster_potential?: boolean | null
          id?: string
          internal_links_list?: Json | null
          internal_links_set?: boolean | null
          is_sub_cluster_suggested?: boolean | null
          keyword: string
          keyword_difficulty?: number | null
          page_type: string
          pillar_tier?: number | null
          priority?: number | null
          score_conversion?: number | null
          score_difficulty?: number | null
          score_gap?: number | null
          score_pillar_support?: number | null
          score_total?: number | null
          score_trend?: number | null
          score_volume?: number | null
          search_volume?: number | null
          seo_page_id?: string | null
          sitemap_added?: boolean | null
          status?: string | null
          sub_cluster_id?: string | null
          trend_direction?: string | null
          url_slug: string
          user_id?: string | null
        }
        Update: {
          ai_description?: string | null
          anchor_text?: string | null
          cluster_id?: string | null
          cpc?: number | null
          created_at?: string | null
          generated_at?: string | null
          generation_jobs_id?: string | null
          has_sub_cluster_potential?: boolean | null
          id?: string
          internal_links_list?: Json | null
          internal_links_set?: boolean | null
          is_sub_cluster_suggested?: boolean | null
          keyword?: string
          keyword_difficulty?: number | null
          page_type?: string
          pillar_tier?: number | null
          priority?: number | null
          score_conversion?: number | null
          score_difficulty?: number | null
          score_gap?: number | null
          score_pillar_support?: number | null
          score_total?: number | null
          score_trend?: number | null
          score_volume?: number | null
          search_volume?: number | null
          seo_page_id?: string | null
          sitemap_added?: boolean | null
          status?: string | null
          sub_cluster_id?: string | null
          trend_direction?: string | null
          url_slug?: string
          user_id?: string | null
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
            foreignKeyName: "cluster_pages_seo_page_id_fkey"
            columns: ["seo_page_id"]
            isOneToOne: false
            referencedRelation: "seo_pages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cluster_pages_sub_cluster_id_fkey"
            columns: ["sub_cluster_id"]
            isOneToOne: false
            referencedRelation: "clusters"
            referencedColumns: ["id"]
          },
        ]
      }
      clusters: {
        Row: {
          accent_color: string | null
          branche: string | null
          cluster_type: string | null
          created_at: string | null
          design_philosophy: string | null
          design_philosophy_custom: string | null
          differentiation: string | null
          firm_id: string | null
          id: string
          main_keyword: string
          name: string
          pillar_page_id: string | null
          plan_generated: boolean | null
          primary_color: string | null
          secondary_color: string | null
          sprache: string | null
          status: string | null
          target_audience: string | null
          theme_context: string | null
          user_id: string | null
        }
        Insert: {
          accent_color?: string | null
          branche?: string | null
          cluster_type?: string | null
          created_at?: string | null
          design_philosophy?: string | null
          design_philosophy_custom?: string | null
          differentiation?: string | null
          firm_id?: string | null
          id?: string
          main_keyword: string
          name: string
          pillar_page_id?: string | null
          plan_generated?: boolean | null
          primary_color?: string | null
          secondary_color?: string | null
          sprache?: string | null
          status?: string | null
          target_audience?: string | null
          theme_context?: string | null
          user_id?: string | null
        }
        Update: {
          accent_color?: string | null
          branche?: string | null
          cluster_type?: string | null
          created_at?: string | null
          design_philosophy?: string | null
          design_philosophy_custom?: string | null
          differentiation?: string | null
          firm_id?: string | null
          id?: string
          main_keyword?: string
          name?: string
          pillar_page_id?: string | null
          plan_generated?: boolean | null
          primary_color?: string | null
          secondary_color?: string | null
          sprache?: string | null
          status?: string | null
          target_audience?: string | null
          theme_context?: string | null
          user_id?: string | null
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
      components: {
        Row: {
          brand_kit_id: string | null
          component_type: string
          config: Json | null
          created_at: string | null
          css_output: string | null
          description: string | null
          embed_id: string | null
          embed_type: string | null
          firm_id: string | null
          html_output: string | null
          id: string
          is_global: boolean | null
          js_output: string | null
          name: string
          parent_id: string | null
          updated_at: string | null
          variant: string
          version: number | null
        }
        Insert: {
          brand_kit_id?: string | null
          component_type: string
          config?: Json | null
          created_at?: string | null
          css_output?: string | null
          description?: string | null
          embed_id?: string | null
          embed_type?: string | null
          firm_id?: string | null
          html_output?: string | null
          id?: string
          is_global?: boolean | null
          js_output?: string | null
          name: string
          parent_id?: string | null
          updated_at?: string | null
          variant?: string
          version?: number | null
        }
        Update: {
          brand_kit_id?: string | null
          component_type?: string
          config?: Json | null
          created_at?: string | null
          css_output?: string | null
          description?: string | null
          embed_id?: string | null
          embed_type?: string | null
          firm_id?: string | null
          html_output?: string | null
          id?: string
          is_global?: boolean | null
          js_output?: string | null
          name?: string
          parent_id?: string | null
          updated_at?: string | null
          variant?: string
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "components_brand_kit_id_fkey"
            columns: ["brand_kit_id"]
            isOneToOne: false
            referencedRelation: "brand_kits"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "components_firm_id_fkey"
            columns: ["firm_id"]
            isOneToOne: false
            referencedRelation: "firms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "components_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "components"
            referencedColumns: ["id"]
          },
        ]
      }
      firm_style_profiles: {
        Row: {
          camera_style: string | null
          color_palette: string | null
          created_at: string | null
          firm_id: string
          forbidden: string | null
          hero_style: string | null
          id: string
          lighting: string | null
          mood: string | null
          section_style: string | null
          setting: string | null
          style_type: string
        }
        Insert: {
          camera_style?: string | null
          color_palette?: string | null
          created_at?: string | null
          firm_id: string
          forbidden?: string | null
          hero_style?: string | null
          id?: string
          lighting?: string | null
          mood?: string | null
          section_style?: string | null
          setting?: string | null
          style_type?: string
        }
        Update: {
          camera_style?: string | null
          color_palette?: string | null
          created_at?: string | null
          firm_id?: string
          forbidden?: string | null
          hero_style?: string | null
          id?: string
          lighting?: string | null
          mood?: string | null
          section_style?: string | null
          setting?: string | null
          style_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "firm_style_profiles_firm_id_fkey"
            columns: ["firm_id"]
            isOneToOne: true
            referencedRelation: "firms"
            referencedColumns: ["id"]
          },
        ]
      }
      firms: {
        Row: {
          accent_color: string | null
          author: string | null
          author_certs: string | null
          author_experience: number | null
          author_title: string | null
          branche: string | null
          city: string | null
          created_at: string | null
          design_philosophy: string | null
          design_philosophy_custom: string | null
          differentiation: string | null
          email: string | null
          id: string
          name: string
          oeffnungszeiten: string | null
          phone: string | null
          primary_color: string | null
          rating: number | null
          review_count: number | null
          secondary_color: string | null
          service_area: string | null
          sprache: string | null
          street: string | null
          target_audience: string | null
          theme_context: string | null
          user_id: string
          website: string | null
          zip: string | null
        }
        Insert: {
          accent_color?: string | null
          author?: string | null
          author_certs?: string | null
          author_experience?: number | null
          author_title?: string | null
          branche?: string | null
          city?: string | null
          created_at?: string | null
          design_philosophy?: string | null
          design_philosophy_custom?: string | null
          differentiation?: string | null
          email?: string | null
          id?: string
          name: string
          oeffnungszeiten?: string | null
          phone?: string | null
          primary_color?: string | null
          rating?: number | null
          review_count?: number | null
          secondary_color?: string | null
          service_area?: string | null
          sprache?: string | null
          street?: string | null
          target_audience?: string | null
          theme_context?: string | null
          user_id: string
          website?: string | null
          zip?: string | null
        }
        Update: {
          accent_color?: string | null
          author?: string | null
          author_certs?: string | null
          author_experience?: number | null
          author_title?: string | null
          branche?: string | null
          city?: string | null
          created_at?: string | null
          design_philosophy?: string | null
          design_philosophy_custom?: string | null
          differentiation?: string | null
          email?: string | null
          id?: string
          name?: string
          oeffnungszeiten?: string | null
          phone?: string | null
          primary_color?: string | null
          rating?: number | null
          review_count?: number | null
          secondary_color?: string | null
          service_area?: string | null
          sprache?: string | null
          street?: string | null
          target_audience?: string | null
          theme_context?: string | null
          user_id?: string
          website?: string | null
          zip?: string | null
        }
        Relationships: []
      }
      generation_jobs: {
        Row: {
          body_content: string | null
          completed_at: string | null
          created_at: string
          css_block: string | null
          duration_seconds: number | null
          error_message: string | null
          html_output: string | null
          id: string
          json_ld: string | null
          keyword: string
          meta_desc: string | null
          meta_keywords: string | null
          meta_title: string | null
          page_id: string | null
          prompt_used: string | null
          status: string
          stop_reason: string | null
          tokens_used: number | null
          tokens_used_agent: number | null
          tokens_used_sonnet: number | null
          triggered_by: string | null
          user_id: string
          warnings: string | null
        }
        Insert: {
          body_content?: string | null
          completed_at?: string | null
          created_at?: string
          css_block?: string | null
          duration_seconds?: number | null
          error_message?: string | null
          html_output?: string | null
          id?: string
          json_ld?: string | null
          keyword: string
          meta_desc?: string | null
          meta_keywords?: string | null
          meta_title?: string | null
          page_id?: string | null
          prompt_used?: string | null
          status?: string
          stop_reason?: string | null
          tokens_used?: number | null
          tokens_used_agent?: number | null
          tokens_used_sonnet?: number | null
          triggered_by?: string | null
          user_id: string
          warnings?: string | null
        }
        Update: {
          body_content?: string | null
          completed_at?: string | null
          created_at?: string
          css_block?: string | null
          duration_seconds?: number | null
          error_message?: string | null
          html_output?: string | null
          id?: string
          json_ld?: string | null
          keyword?: string
          meta_desc?: string | null
          meta_keywords?: string | null
          meta_title?: string | null
          page_id?: string | null
          prompt_used?: string | null
          status?: string
          stop_reason?: string | null
          tokens_used?: number | null
          tokens_used_agent?: number | null
          tokens_used_sonnet?: number | null
          triggered_by?: string | null
          user_id?: string
          warnings?: string | null
        }
        Relationships: []
      }
      image_jobs: {
        Row: {
          alt_text: string | null
          cloudinary_public_id: string | null
          cloudinary_url: string | null
          completed_at: string | null
          created_at: string | null
          edit_strength: number | null
          firm_id: string | null
          height: number | null
          html_inserted: boolean | null
          id: string
          image_url: string | null
          is_selected: boolean | null
          mode: string | null
          nano_url: string | null
          page_id: string | null
          prompt: string
          prompt_negative: string | null
          prompt_positive: string | null
          reference_image_url: string | null
          slot: string | null
          slot_label: string | null
          status: string | null
          style_type: string | null
          task_id: string | null
          user_id: string
          variant_index: number | null
          width: number | null
        }
        Insert: {
          alt_text?: string | null
          cloudinary_public_id?: string | null
          cloudinary_url?: string | null
          completed_at?: string | null
          created_at?: string | null
          edit_strength?: number | null
          firm_id?: string | null
          height?: number | null
          html_inserted?: boolean | null
          id?: string
          image_url?: string | null
          is_selected?: boolean | null
          mode?: string | null
          nano_url?: string | null
          page_id?: string | null
          prompt: string
          prompt_negative?: string | null
          prompt_positive?: string | null
          reference_image_url?: string | null
          slot?: string | null
          slot_label?: string | null
          status?: string | null
          style_type?: string | null
          task_id?: string | null
          user_id: string
          variant_index?: number | null
          width?: number | null
        }
        Update: {
          alt_text?: string | null
          cloudinary_public_id?: string | null
          cloudinary_url?: string | null
          completed_at?: string | null
          created_at?: string | null
          edit_strength?: number | null
          firm_id?: string | null
          height?: number | null
          html_inserted?: boolean | null
          id?: string
          image_url?: string | null
          is_selected?: boolean | null
          mode?: string | null
          nano_url?: string | null
          page_id?: string | null
          prompt?: string
          prompt_negative?: string | null
          prompt_positive?: string | null
          reference_image_url?: string | null
          slot?: string | null
          slot_label?: string | null
          status?: string | null
          style_type?: string | null
          task_id?: string | null
          user_id?: string
          variant_index?: number | null
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "image_jobs_firm_id_fkey"
            columns: ["firm_id"]
            isOneToOne: false
            referencedRelation: "firms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "image_jobs_page_id_fkey"
            columns: ["page_id"]
            isOneToOne: false
            referencedRelation: "seo_pages"
            referencedColumns: ["id"]
          },
        ]
      }
      page_components: {
        Row: {
          component_id: string | null
          created_at: string | null
          id: string
          inject_mode: string
          position: string
          seo_page_id: string | null
        }
        Insert: {
          component_id?: string | null
          created_at?: string | null
          id?: string
          inject_mode?: string
          position?: string
          seo_page_id?: string | null
        }
        Update: {
          component_id?: string | null
          created_at?: string | null
          id?: string
          inject_mode?: string
          position?: string
          seo_page_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "page_components_component_id_fkey"
            columns: ["component_id"]
            isOneToOne: false
            referencedRelation: "components"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "page_components_seo_page_id_fkey"
            columns: ["seo_page_id"]
            isOneToOne: false
            referencedRelation: "seo_pages"
            referencedColumns: ["id"]
          },
        ]
      }
      page_images: {
        Row: {
          alt_text: string | null
          cloudinary_public_id: string | null
          cloudinary_url: string | null
          created_at: string
          height: number | null
          id: string
          nano_prompt: string | null
          nano_status: string
          nano_task_id: string | null
          nano_url: string | null
          page_id: string
          section_context: string | null
          slot: string
          slot_label: string | null
          updated_at: string
          width: number | null
        }
        Insert: {
          alt_text?: string | null
          cloudinary_public_id?: string | null
          cloudinary_url?: string | null
          created_at?: string
          height?: number | null
          id?: string
          nano_prompt?: string | null
          nano_status?: string
          nano_task_id?: string | null
          nano_url?: string | null
          page_id: string
          section_context?: string | null
          slot: string
          slot_label?: string | null
          updated_at?: string
          width?: number | null
        }
        Update: {
          alt_text?: string | null
          cloudinary_public_id?: string | null
          cloudinary_url?: string | null
          created_at?: string
          height?: number | null
          id?: string
          nano_prompt?: string | null
          nano_status?: string
          nano_task_id?: string | null
          nano_url?: string | null
          page_id?: string
          section_context?: string | null
          slot?: string
          slot_label?: string | null
          updated_at?: string
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "page_images_page_id_fkey"
            columns: ["page_id"]
            isOneToOne: false
            referencedRelation: "seo_pages"
            referencedColumns: ["id"]
          },
        ]
      }
      page_versions: {
        Row: {
          created_at: string | null
          html_output: string | null
          id: string
          json_ld: string | null
          meta_desc: string | null
          meta_title: string | null
          seo_page_id: string | null
          user_id: string | null
          version_number: number | null
        }
        Insert: {
          created_at?: string | null
          html_output?: string | null
          id?: string
          json_ld?: string | null
          meta_desc?: string | null
          meta_title?: string | null
          seo_page_id?: string | null
          user_id?: string | null
          version_number?: number | null
        }
        Update: {
          created_at?: string | null
          html_output?: string | null
          id?: string
          json_ld?: string | null
          meta_desc?: string | null
          meta_title?: string | null
          seo_page_id?: string | null
          user_id?: string | null
          version_number?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "page_versions_seo_page_id_fkey"
            columns: ["seo_page_id"]
            isOneToOne: false
            referencedRelation: "seo_pages"
            referencedColumns: ["id"]
          },
        ]
      }
      process_logs: {
        Row: {
          created_at: string | null
          detail: Json | null
          duration_ms: number | null
          id: string
          message: string | null
          process_type: string
          session_id: string
          status: string
          step_index: number
          step_name: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          detail?: Json | null
          duration_ms?: number | null
          id?: string
          message?: string | null
          process_type: string
          session_id: string
          status: string
          step_index: number
          step_name: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          detail?: Json | null
          duration_ms?: number | null
          id?: string
          message?: string | null
          process_type?: string
          session_id?: string
          status?: string
          step_index?: number
          step_name?: string
          user_id?: string
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
      saved_analyses: {
        Row: {
          analysis_status: string | null
          created_at: string | null
          firm_id: string | null
          form_data: Json | null
          generated_html: string | null
          id: string
          is_template: boolean | null
          json_ld: string | null
          keyword: string
          meta_desc: string | null
          meta_title: string | null
          mode: string | null
          name: string | null
          page_id: string | null
          qa_state: Json | null
          result_kieai: Json | null
          result_serp: Json | null
          result_volume: Json | null
          tags: string[] | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          analysis_status?: string | null
          created_at?: string | null
          firm_id?: string | null
          form_data?: Json | null
          generated_html?: string | null
          id?: string
          is_template?: boolean | null
          json_ld?: string | null
          keyword: string
          meta_desc?: string | null
          meta_title?: string | null
          mode?: string | null
          name?: string | null
          page_id?: string | null
          qa_state?: Json | null
          result_kieai?: Json | null
          result_serp?: Json | null
          result_volume?: Json | null
          tags?: string[] | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          analysis_status?: string | null
          created_at?: string | null
          firm_id?: string | null
          form_data?: Json | null
          generated_html?: string | null
          id?: string
          is_template?: boolean | null
          json_ld?: string | null
          keyword?: string
          meta_desc?: string | null
          meta_title?: string | null
          mode?: string | null
          name?: string | null
          page_id?: string | null
          qa_state?: Json | null
          result_kieai?: Json | null
          result_serp?: Json | null
          result_volume?: Json | null
          tags?: string[] | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_analyses_firm_id_fkey"
            columns: ["firm_id"]
            isOneToOne: false
            referencedRelation: "firms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saved_analyses_page_id_fkey"
            columns: ["page_id"]
            isOneToOne: false
            referencedRelation: "seo_pages"
            referencedColumns: ["id"]
          },
        ]
      }
      section_templates: {
        Row: {
          created_at: string | null
          description: string | null
          design_philosophy: string | null
          firm_id: string | null
          html: string
          id: string
          is_global: boolean | null
          name: string
          section_type: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          design_philosophy?: string | null
          firm_id?: string | null
          html: string
          id?: string
          is_global?: boolean | null
          name: string
          section_type: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          design_philosophy?: string | null
          firm_id?: string | null
          html?: string
          id?: string
          is_global?: boolean | null
          name?: string
          section_type?: string
        }
        Relationships: []
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
          body_content: string | null
          city: string | null
          contao_mode: boolean | null
          created_at: string | null
          css_block: string | null
          design_philosophy: string | null
          design_philosophy_custom: string | null
          design_preset: string | null
          differentiation: string | null
          firm: string | null
          firm_id: string | null
          html_output: string | null
          id: string
          intent: string | null
          internal_links: Json | null
          json_ld: string | null
          keyword: string
          meta_desc: string | null
          meta_keywords: string | null
          meta_title: string | null
          page_type: string | null
          published_url: string | null
          qa_score: number | null
          score: number | null
          sitemap_added: boolean | null
          status: string | null
          status_changed_at: string | null
          target_audience: string | null
          theme_context: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          active_sections?: Json | null
          body_content?: string | null
          city?: string | null
          contao_mode?: boolean | null
          created_at?: string | null
          css_block?: string | null
          design_philosophy?: string | null
          design_philosophy_custom?: string | null
          design_preset?: string | null
          differentiation?: string | null
          firm?: string | null
          firm_id?: string | null
          html_output?: string | null
          id?: string
          intent?: string | null
          internal_links?: Json | null
          json_ld?: string | null
          keyword: string
          meta_desc?: string | null
          meta_keywords?: string | null
          meta_title?: string | null
          page_type?: string | null
          published_url?: string | null
          qa_score?: number | null
          score?: number | null
          sitemap_added?: boolean | null
          status?: string | null
          status_changed_at?: string | null
          target_audience?: string | null
          theme_context?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          active_sections?: Json | null
          body_content?: string | null
          city?: string | null
          contao_mode?: boolean | null
          created_at?: string | null
          css_block?: string | null
          design_philosophy?: string | null
          design_philosophy_custom?: string | null
          design_preset?: string | null
          differentiation?: string | null
          firm?: string | null
          firm_id?: string | null
          html_output?: string | null
          id?: string
          intent?: string | null
          internal_links?: Json | null
          json_ld?: string | null
          keyword?: string
          meta_desc?: string | null
          meta_keywords?: string | null
          meta_title?: string | null
          page_type?: string | null
          published_url?: string | null
          qa_score?: number | null
          score?: number | null
          sitemap_added?: boolean | null
          status?: string | null
          status_changed_at?: string | null
          target_audience?: string | null
          theme_context?: string | null
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
      get_my_firm_id: { Args: never; Returns: string }
      get_my_role: {
        Args: never
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      owns_seo_page: {
        Args: { _page_id: string; _user_id: string }
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
