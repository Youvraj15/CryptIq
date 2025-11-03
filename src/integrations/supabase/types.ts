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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      admin_actions: {
        Row: {
          action_type: string
          admin_user_id: string
          created_at: string
          details: Json | null
          entity_id: string
          entity_type: string
          id: string
          ip_address: string | null
          user_agent: string | null
        }
        Insert: {
          action_type: string
          admin_user_id: string
          created_at?: string
          details?: Json | null
          entity_id: string
          entity_type: string
          id?: string
          ip_address?: string | null
          user_agent?: string | null
        }
        Update: {
          action_type?: string
          admin_user_id?: string
          created_at?: string
          details?: Json | null
          entity_id?: string
          entity_type?: string
          id?: string
          ip_address?: string | null
          user_agent?: string | null
        }
        Relationships: []
      }
      admin_roles: {
        Row: {
          created_at: string
          granted_at: string
          granted_by: string | null
          id: string
          role: string
          user_id: string
        }
        Insert: {
          created_at?: string
          granted_at?: string
          granted_by?: string | null
          id?: string
          role?: string
          user_id: string
        }
        Update: {
          created_at?: string
          granted_at?: string
          granted_by?: string | null
          id?: string
          role?: string
          user_id?: string
        }
        Relationships: []
      }
      lab_completions: {
        Row: {
          completed_at: string
          created_at: string
          id: string
          jiet_amount: number
          jiet_rewarded: boolean
          lab_id: number
          task_id: number
          transaction_signature: string | null
          user_id: string
          wallet_address: string | null
        }
        Insert: {
          completed_at?: string
          created_at?: string
          id?: string
          jiet_amount?: number
          jiet_rewarded?: boolean
          lab_id: number
          task_id: number
          transaction_signature?: string | null
          user_id: string
          wallet_address?: string | null
        }
        Update: {
          completed_at?: string
          created_at?: string
          id?: string
          jiet_amount?: number
          jiet_rewarded?: boolean
          lab_id?: number
          task_id?: number
          transaction_signature?: string | null
          user_id?: string
          wallet_address?: string | null
        }
        Relationships: []
      }
      lab_task_completions: {
        Row: {
          completed_at: string
          id: string
          task_id: number
          user_id: string
        }
        Insert: {
          completed_at?: string
          id?: string
          task_id: number
          user_id: string
        }
        Update: {
          completed_at?: string
          id?: string
          task_id?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lab_task_completions_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "lab_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      lab_tasks: {
        Row: {
          challenge_data: Json | null
          created_at: string
          description: string
          flag: string
          id: number
          is_locked: boolean
          lab_id: number
          title: string
          xp_reward: number
        }
        Insert: {
          challenge_data?: Json | null
          created_at?: string
          description: string
          flag: string
          id: number
          is_locked?: boolean
          lab_id: number
          title: string
          xp_reward?: number
        }
        Update: {
          challenge_data?: Json | null
          created_at?: string
          description?: string
          flag?: string
          id?: number
          is_locked?: boolean
          lab_id?: number
          title?: string
          xp_reward?: number
        }
        Relationships: [
          {
            foreignKeyName: "lab_tasks_lab_id_fkey"
            columns: ["lab_id"]
            isOneToOne: false
            referencedRelation: "labs"
            referencedColumns: ["id"]
          },
        ]
      }
      labs: {
        Row: {
          description: string
          icon: string | null
          id: number
          title: string
        }
        Insert: {
          description: string
          icon?: string | null
          id: number
          title: string
        }
        Update: {
          description?: string
          icon?: string | null
          id?: number
          title?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string | null
          id: string
          updated_at: string
          user_id: string
          username: string | null
          wallet_address: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          updated_at?: string
          user_id: string
          username?: string | null
          wallet_address?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          updated_at?: string
          user_id?: string
          username?: string | null
          wallet_address?: string | null
        }
        Relationships: []
      }
      quiz_completions: {
        Row: {
          completed_at: string | null
          created_at: string | null
          id: string
          jiet_amount: number
          jiet_rewarded: boolean
          quiz_id: number
          score: number
          transaction_signature: string | null
          user_id: string
          wallet_address: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          id?: string
          jiet_amount?: number
          jiet_rewarded?: boolean
          quiz_id: number
          score: number
          transaction_signature?: string | null
          user_id: string
          wallet_address?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          id?: string
          jiet_amount?: number
          jiet_rewarded?: boolean
          quiz_id?: number
          score?: number
          transaction_signature?: string | null
          user_id?: string
          wallet_address?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quiz_completions_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "quizzes"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_questions: {
        Row: {
          correct_answer_index: number
          created_at: string | null
          explanation: string
          id: string
          options: Json
          question_text: string
          quiz_id: number
          sort_order: number
        }
        Insert: {
          correct_answer_index: number
          created_at?: string | null
          explanation: string
          id?: string
          options: Json
          question_text: string
          quiz_id: number
          sort_order?: number
        }
        Update: {
          correct_answer_index?: number
          created_at?: string | null
          explanation?: string
          id?: string
          options?: Json
          question_text?: string
          quiz_id?: number
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "quiz_questions_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "quizzes"
            referencedColumns: ["id"]
          },
        ]
      }
      quizzes: {
        Row: {
          created_at: string | null
          description: string
          difficulty: string
          duration_minutes: number
          id: number
          is_locked: boolean
          jiet_reward: number
          question_count: number
          sort_order: number
          title: string
          updated_at: string | null
          xp_reward: number
        }
        Insert: {
          created_at?: string | null
          description: string
          difficulty: string
          duration_minutes?: number
          id: number
          is_locked?: boolean
          jiet_reward?: number
          question_count?: number
          sort_order?: number
          title: string
          updated_at?: string | null
          xp_reward?: number
        }
        Update: {
          created_at?: string | null
          description?: string
          difficulty?: string
          duration_minutes?: number
          id?: number
          is_locked?: boolean
          jiet_reward?: number
          question_count?: number
          sort_order?: number
          title?: string
          updated_at?: string | null
          xp_reward?: number
        }
        Relationships: []
      }
      rewards: {
        Row: {
          available: boolean
          cost: number
          created_at: string
          description: string
          icon_name: string | null
          id: string
          title: string
        }
        Insert: {
          available?: boolean
          cost?: number
          created_at?: string
          description: string
          icon_name?: string | null
          id?: string
          title: string
        }
        Update: {
          available?: boolean
          cost?: number
          created_at?: string
          description?: string
          icon_name?: string | null
          id?: string
          title?: string
        }
        Relationships: []
      }
      user_redemptions: {
        Row: {
          cost_paid: number
          id: string
          redeemed_at: string
          reward_id: string
          transaction_signature: string | null
          user_id: string
        }
        Insert: {
          cost_paid: number
          id?: string
          redeemed_at?: string
          reward_id: string
          transaction_signature?: string | null
          user_id: string
        }
        Update: {
          cost_paid?: number
          id?: string
          redeemed_at?: string
          reward_id?: string
          transaction_signature?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_redemptions_reward_id_fkey"
            columns: ["reward_id"]
            isOneToOne: false
            referencedRelation: "rewards"
            referencedColumns: ["id"]
          },
        ]
      }
      user_stats: {
        Row: {
          created_at: string
          current_streak: number
          id: string
          labs_completed: number
          last_activity_date: string | null
          longest_streak: number
          quizzes_completed: number
          total_xp: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_streak?: number
          id?: string
          labs_completed?: number
          last_activity_date?: string | null
          longest_streak?: number
          quizzes_completed?: number
          total_xp?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_streak?: number
          id?: string
          labs_completed?: number
          last_activity_date?: string | null
          longest_streak?: number
          quizzes_completed?: number
          total_xp?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      leaderboard_view: {
        Row: {
          avatar_url: string | null
          current_streak: number | null
          display_name: string | null
          full_name: string | null
          labs_completed: number | null
          quizzes_completed: number | null
          rank: number | null
          total_xp: number | null
          user_id: string | null
          username: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      get_leaderboard: {
        Args: { limit_count?: number }
        Returns: {
          avatar_url: string
          current_streak: number
          full_name: string
          labs_completed: number
          quizzes_completed: number
          rank: number
          total_xp: number
          user_id: string
          username: string
        }[]
      }
      get_user_rank: {
        Args: { check_user_id?: string }
        Returns: {
          rank: number
          total_xp: number
          user_id: string
          username: string
        }[]
      }
      increment_user_xp: {
        Args: { p_user_id: string; p_xp_to_add: number }
        Returns: undefined
      }
      is_admin: { Args: { check_user_id?: string }; Returns: boolean }
      is_super_admin: { Args: { check_user_id?: string }; Returns: boolean }
      log_admin_action: {
        Args: {
          p_action_type: string
          p_details?: Json
          p_entity_id: string
          p_entity_type: string
        }
        Returns: string
      }
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
