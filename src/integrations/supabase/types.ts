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
    PostgrestVersion: "12.2.12 (cd3cf9e)"
  }
  public: {
    Tables: {
      audit_logs: {
        Row: {
          action: string
          created_at: string
          details: Json | null
          id: string
          ip_address: string | null
          resource_id: string | null
          resource_name: string | null
          resource_type: string
          tenant_admin_id: string | null
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json | null
          id?: string
          ip_address?: string | null
          resource_id?: string | null
          resource_name?: string | null
          resource_type: string
          tenant_admin_id?: string | null
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json | null
          id?: string
          ip_address?: string | null
          resource_id?: string | null
          resource_name?: string | null
          resource_type?: string
          tenant_admin_id?: string | null
          user_id?: string
        }
        Relationships: []
      }
      clientes: {
        Row: {
          cnpj: string | null
          created_at: string
          email: string | null
          empresa_terceira_id: string
          endereco: string | null
          id: string
          logo_url: string | null
          nome_cliente: string | null
          telefone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          cnpj?: string | null
          created_at?: string
          email?: string | null
          empresa_terceira_id: string
          endereco?: string | null
          id?: string
          logo_url?: string | null
          nome_cliente?: string | null
          telefone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          cnpj?: string | null
          created_at?: string
          email?: string | null
          empresa_terceira_id?: string
          endereco?: string | null
          id?: string
          logo_url?: string | null
          nome_cliente?: string | null
          telefone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "clientes_empresa_terceira_id_fkey"
            columns: ["empresa_terceira_id"]
            isOneToOne: false
            referencedRelation: "empresas_terceiras"
            referencedColumns: ["id"]
          },
        ]
      }
      cofre_senhas: {
        Row: {
          cliente_id: string | null
          created_at: string
          descricao: string | null
          empresa_terceira_id: string | null
          grupo: string | null
          id: string
          login: string | null
          nome_acesso: string
          senha: string
          updated_at: string
          url_acesso: string | null
          user_id: string
        }
        Insert: {
          cliente_id?: string | null
          created_at?: string
          descricao?: string | null
          empresa_terceira_id?: string | null
          grupo?: string | null
          id?: string
          login?: string | null
          nome_acesso: string
          senha: string
          updated_at?: string
          url_acesso?: string | null
          user_id: string
        }
        Update: {
          cliente_id?: string | null
          created_at?: string
          descricao?: string | null
          empresa_terceira_id?: string | null
          grupo?: string | null
          id?: string
          login?: string | null
          nome_acesso?: string
          senha?: string
          updated_at?: string
          url_acesso?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cofre_senhas_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cofre_senhas_empresa_terceira_id_fkey"
            columns: ["empresa_terceira_id"]
            isOneToOne: false
            referencedRelation: "empresas_terceiras"
            referencedColumns: ["id"]
          },
        ]
      }
      empresas_terceiras: {
        Row: {
          ativo: boolean
          created_at: string
          id: string
          nome_empresa: string
          updated_at: string
          user_id: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          id?: string
          nome_empresa: string
          updated_at?: string
          user_id: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          id?: string
          nome_empresa?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      equipes: {
        Row: {
          created_at: string
          id: string
          membros: string | null
          nome_equipe: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          membros?: string | null
          nome_equipe: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          membros?: string | null
          nome_equipe?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      generated_reports: {
        Row: {
          created_at: string
          filters: Json
          format: string
          id: string
          public_id: string
          report_html: string
          title: string
          user_id: string
        }
        Insert: {
          created_at?: string
          filters?: Json
          format?: string
          id?: string
          public_id?: string
          report_html?: string
          title?: string
          user_id: string
        }
        Update: {
          created_at?: string
          filters?: Json
          format?: string
          id?: string
          public_id?: string
          report_html?: string
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      grupos_cofre: {
        Row: {
          created_at: string
          id: string
          nome_grupo: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          nome_grupo: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          nome_grupo?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      landing_plans: {
        Row: {
          ativo: boolean | null
          categoria: string
          created_at: string | null
          descricao: string | null
          destaque: boolean | null
          id: string
          importacao_excel: boolean | null
          links_publicos: boolean | null
          max_empresas: number | null
          max_equipes: number | null
          max_manutencoes: number | null
          max_senhas: number | null
          max_urls: number | null
          max_usuarios: number | null
          nome: string
          offer_free_signup: boolean | null
          ordem: number | null
          preco: string | null
          recursos: Json
          relatorios_avancados: boolean | null
          suporte_email: boolean | null
          suporte_email_endereco: string | null
          suporte_whatsapp: boolean | null
          suporte_whatsapp_numero: string | null
          texto_botao: string
          tipo: string
          updated_at: string | null
          whatsapp_mensagem: string | null
          whatsapp_numero: string | null
        }
        Insert: {
          ativo?: boolean | null
          categoria?: string
          created_at?: string | null
          descricao?: string | null
          destaque?: boolean | null
          id?: string
          importacao_excel?: boolean | null
          links_publicos?: boolean | null
          max_empresas?: number | null
          max_equipes?: number | null
          max_manutencoes?: number | null
          max_senhas?: number | null
          max_urls?: number | null
          max_usuarios?: number | null
          nome: string
          offer_free_signup?: boolean | null
          ordem?: number | null
          preco?: string | null
          recursos?: Json
          relatorios_avancados?: boolean | null
          suporte_email?: boolean | null
          suporte_email_endereco?: string | null
          suporte_whatsapp?: boolean | null
          suporte_whatsapp_numero?: string | null
          texto_botao?: string
          tipo?: string
          updated_at?: string | null
          whatsapp_mensagem?: string | null
          whatsapp_numero?: string | null
        }
        Update: {
          ativo?: boolean | null
          categoria?: string
          created_at?: string | null
          descricao?: string | null
          destaque?: boolean | null
          id?: string
          importacao_excel?: boolean | null
          links_publicos?: boolean | null
          max_empresas?: number | null
          max_equipes?: number | null
          max_manutencoes?: number | null
          max_senhas?: number | null
          max_urls?: number | null
          max_usuarios?: number | null
          nome?: string
          offer_free_signup?: boolean | null
          ordem?: number | null
          preco?: string | null
          recursos?: Json
          relatorios_avancados?: boolean | null
          suporte_email?: boolean | null
          suporte_email_endereco?: string | null
          suporte_whatsapp?: boolean | null
          suporte_whatsapp_numero?: string | null
          texto_botao?: string
          tipo?: string
          updated_at?: string | null
          whatsapp_mensagem?: string | null
          whatsapp_numero?: string | null
        }
        Relationships: []
      }
      manutencao_equipes: {
        Row: {
          created_at: string
          equipe_id: string
          id: string
          manutencao_id: string
        }
        Insert: {
          created_at?: string
          equipe_id: string
          id?: string
          manutencao_id: string
        }
        Update: {
          created_at?: string
          equipe_id?: string
          id?: string
          manutencao_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "manutencao_equipes_equipe_id_fkey"
            columns: ["equipe_id"]
            isOneToOne: false
            referencedRelation: "equipes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "manutencao_equipes_manutencao_id_fkey"
            columns: ["manutencao_id"]
            isOneToOne: false
            referencedRelation: "manutencoes"
            referencedColumns: ["id"]
          },
        ]
      }
      manutencoes: {
        Row: {
          cliente_id: string
          created_at: string
          data_fim: string | null
          data_inicio: string
          descricao: string | null
          empresa_terceira_id: string
          equipe_id: string | null
          hora_fim: string | null
          hora_inicio: string
          id: string
          responsavel: string | null
          solicitante: string | null
          status: string | null
          tempo_total: number | null
          tipo_manutencao_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          cliente_id: string
          created_at?: string
          data_fim?: string | null
          data_inicio: string
          descricao?: string | null
          empresa_terceira_id: string
          equipe_id?: string | null
          hora_fim?: string | null
          hora_inicio: string
          id?: string
          responsavel?: string | null
          solicitante?: string | null
          status?: string | null
          tempo_total?: number | null
          tipo_manutencao_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          cliente_id?: string
          created_at?: string
          data_fim?: string | null
          data_inicio?: string
          descricao?: string | null
          empresa_terceira_id?: string
          equipe_id?: string | null
          hora_fim?: string | null
          hora_inicio?: string
          id?: string
          responsavel?: string | null
          solicitante?: string | null
          status?: string | null
          tempo_total?: number | null
          tipo_manutencao_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "manutencoes_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "manutencoes_empresa_terceira_id_fkey"
            columns: ["empresa_terceira_id"]
            isOneToOne: false
            referencedRelation: "empresas_terceiras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "manutencoes_equipe_id_fkey"
            columns: ["equipe_id"]
            isOneToOne: false
            referencedRelation: "equipes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "manutencoes_tipo_manutencao_id_fkey"
            columns: ["tipo_manutencao_id"]
            isOneToOne: false
            referencedRelation: "tipos_manutencao"
            referencedColumns: ["id"]
          },
        ]
      }
      monitor_schedules: {
        Row: {
          ativo: boolean
          created_at: string
          email_destinatario: string
          frequency_minutes: number
          id: string
          report_time: string | null
          report_type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          email_destinatario: string
          frequency_minutes?: number
          id?: string
          report_time?: string | null
          report_type?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          email_destinatario?: string
          frequency_minutes?: number
          id?: string
          report_time?: string | null
          report_type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      monitored_urls: {
        Row: {
          ativo: boolean
          check_interval_minutes: number
          cliente_id: string | null
          created_at: string
          empresa_terceira_id: string | null
          id: string
          keyword: string | null
          nome: string
          tipo: string | null
          updated_at: string
          url: string
          user_id: string
        }
        Insert: {
          ativo?: boolean
          check_interval_minutes?: number
          cliente_id?: string | null
          created_at?: string
          empresa_terceira_id?: string | null
          id?: string
          keyword?: string | null
          nome: string
          tipo?: string | null
          updated_at?: string
          url: string
          user_id: string
        }
        Update: {
          ativo?: boolean
          check_interval_minutes?: number
          cliente_id?: string | null
          created_at?: string
          empresa_terceira_id?: string | null
          id?: string
          keyword?: string | null
          nome?: string
          tipo?: string | null
          updated_at?: string
          url?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "monitored_urls_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "monitored_urls_empresa_terceira_id_fkey"
            columns: ["empresa_terceira_id"]
            isOneToOne: false
            referencedRelation: "empresas_terceiras"
            referencedColumns: ["id"]
          },
        ]
      }
      pacotes_manutencao: {
        Row: {
          cliente_id: string
          created_at: string
          id: string
          limite_horas_mensais: number | null
          updated_at: string
          user_id: string
          valor_mensal: number | null
          valor_por_hora: number | null
          vigencia_fim: string | null
          vigencia_inicio: string | null
        }
        Insert: {
          cliente_id: string
          created_at?: string
          id?: string
          limite_horas_mensais?: number | null
          updated_at?: string
          user_id: string
          valor_mensal?: number | null
          valor_por_hora?: number | null
          vigencia_fim?: string | null
          vigencia_inicio?: string | null
        }
        Update: {
          cliente_id?: string
          created_at?: string
          id?: string
          limite_horas_mensais?: number | null
          updated_at?: string
          user_id?: string
          valor_mensal?: number | null
          valor_por_hora?: number | null
          vigencia_fim?: string | null
          vigencia_inicio?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pacotes_manutencao_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
        ]
      }
      permission_profiles: {
        Row: {
          client_access: Json
          client_permissions_mode: string
          created_at: string
          empresa_access: Json
          empresa_permissions_mode: string
          id: string
          is_admin_profile: boolean
          nome_perfil: string
          password_access: Json
          system_permissions: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          client_access?: Json
          client_permissions_mode?: string
          created_at?: string
          empresa_access?: Json
          empresa_permissions_mode?: string
          id?: string
          is_admin_profile?: boolean
          nome_perfil: string
          password_access?: Json
          system_permissions?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          client_access?: Json
          client_permissions_mode?: string
          created_at?: string
          empresa_access?: Json
          empresa_permissions_mode?: string
          id?: string
          is_admin_profile?: boolean
          nome_perfil?: string
          password_access?: Json
          system_permissions?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      system_settings: {
        Row: {
          created_at: string | null
          id: string
          key: string
          updated_at: string | null
          value: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          key: string
          updated_at?: string | null
          value: string
        }
        Update: {
          created_at?: string | null
          id?: string
          key?: string
          updated_at?: string | null
          value?: string
        }
        Relationships: []
      }
      tipos_manutencao: {
        Row: {
          created_at: string
          descricao: string | null
          id: string
          nome_tipo_manutencao: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          descricao?: string | null
          id?: string
          nome_tipo_manutencao: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          descricao?: string | null
          id?: string
          nome_tipo_manutencao?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      url_check_logs: {
        Row: {
          checked_at: string
          error_message: string | null
          id: string
          is_online: boolean
          monitored_url_id: string
          response_time_ms: number | null
          screenshot_url: string | null
          status_code: number | null
          test_results: Json | null
        }
        Insert: {
          checked_at?: string
          error_message?: string | null
          id?: string
          is_online?: boolean
          monitored_url_id: string
          response_time_ms?: number | null
          screenshot_url?: string | null
          status_code?: number | null
          test_results?: Json | null
        }
        Update: {
          checked_at?: string
          error_message?: string | null
          id?: string
          is_online?: boolean
          monitored_url_id?: string
          response_time_ms?: number | null
          screenshot_url?: string | null
          status_code?: number | null
          test_results?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "url_check_logs_monitored_url_id_fkey"
            columns: ["monitored_url_id"]
            isOneToOne: false
            referencedRelation: "monitored_urls"
            referencedColumns: ["id"]
          },
        ]
      }
      user_client_permissions: {
        Row: {
          can_create: boolean | null
          can_delete: boolean | null
          can_edit: boolean | null
          can_view: boolean | null
          cliente_id: string
          created_at: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          can_create?: boolean | null
          can_delete?: boolean | null
          can_edit?: boolean | null
          can_view?: boolean | null
          cliente_id: string
          created_at?: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          can_create?: boolean | null
          can_delete?: boolean | null
          can_edit?: boolean | null
          can_view?: boolean | null
          cliente_id?: string
          created_at?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_empresa_permissions: {
        Row: {
          can_create_manutencao: boolean | null
          can_delete: boolean | null
          can_edit: boolean | null
          can_view: boolean | null
          created_at: string | null
          empresa_terceira_id: string
          id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          can_create_manutencao?: boolean | null
          can_delete?: boolean | null
          can_edit?: boolean | null
          can_view?: boolean | null
          created_at?: string | null
          empresa_terceira_id: string
          id?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          can_create_manutencao?: boolean | null
          can_delete?: boolean | null
          can_edit?: boolean | null
          can_view?: boolean | null
          created_at?: string | null
          empresa_terceira_id?: string
          id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_empresa_permissions_empresa_terceira_id_fkey"
            columns: ["empresa_terceira_id"]
            isOneToOne: false
            referencedRelation: "empresas_terceiras"
            referencedColumns: ["id"]
          },
        ]
      }
      user_group_permissions: {
        Row: {
          can_edit: boolean | null
          can_view: boolean | null
          created_at: string
          grupo_nome: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          can_edit?: boolean | null
          can_view?: boolean | null
          created_at?: string
          grupo_nome: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          can_edit?: boolean | null
          can_view?: boolean | null
          created_at?: string
          grupo_nome?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_password_permissions: {
        Row: {
          can_edit: boolean | null
          can_view: boolean | null
          created_at: string
          id: string
          senha_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          can_edit?: boolean | null
          can_view?: boolean | null
          created_at?: string
          id?: string
          senha_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          can_edit?: boolean | null
          can_view?: boolean | null
          created_at?: string
          id?: string
          senha_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_profile_data: {
        Row: {
          created_at: string | null
          department: string | null
          display_name: string | null
          id: string
          phone: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          department?: string | null
          display_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          department?: string | null
          display_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_profiles: {
        Row: {
          account_status: string | null
          created_at: string
          display_name: string | null
          email: string | null
          id: string
          is_admin: boolean | null
          is_permanent: boolean | null
          is_super_admin: boolean | null
          permission_profile_id: string | null
          phone: string | null
          plan_id: string | null
          trial_days: number | null
          trial_start: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          account_status?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          is_admin?: boolean | null
          is_permanent?: boolean | null
          is_super_admin?: boolean | null
          permission_profile_id?: string | null
          phone?: string | null
          plan_id?: string | null
          trial_days?: number | null
          trial_start?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          account_status?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          is_admin?: boolean | null
          is_permanent?: boolean | null
          is_super_admin?: boolean | null
          permission_profile_id?: string | null
          phone?: string | null
          plan_id?: string | null
          trial_days?: number | null
          trial_start?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_profiles_permission_profile_id_fkey"
            columns: ["permission_profile_id"]
            isOneToOne: false
            referencedRelation: "permission_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_profiles_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "landing_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      user_system_permissions: {
        Row: {
          can_create: boolean | null
          can_delete: boolean | null
          can_edit: boolean | null
          can_view: boolean | null
          can_view_details: boolean | null
          created_at: string
          id: string
          resource_type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          can_create?: boolean | null
          can_delete?: boolean | null
          can_edit?: boolean | null
          can_view?: boolean | null
          can_view_details?: boolean | null
          created_at?: string
          id?: string
          resource_type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          can_create?: boolean | null
          can_delete?: boolean | null
          can_edit?: boolean | null
          can_view?: boolean | null
          can_view_details?: boolean | null
          created_at?: string
          id?: string
          resource_type?: string
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
      admin_owns_user: {
        Args: { _admin_id: string; _target_user_id: string }
        Returns: boolean
      }
      check_email_exists: { Args: { _email: string }; Returns: boolean }
      has_system_permission: {
        Args: { _permission: string; _resource: string; _user_id: string }
        Returns: boolean
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      is_super_admin: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
