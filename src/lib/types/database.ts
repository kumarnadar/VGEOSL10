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
      focus_items: {
        Row: {
          id: string
          snapshot_id: string
          priority: string | null
          company_subject: string
          location: string | null
          prospect_value: number | null
          pipeline_status: string | null
          key_decision_maker: string | null
          weekly_action: string | null
          obstacles: string | null
          resources_needed: string | null
          strategy: string | null
          sort_order: number | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          snapshot_id: string
          priority?: string | null
          company_subject: string
          location?: string | null
          prospect_value?: number | null
          pipeline_status?: string | null
          key_decision_maker?: string | null
          weekly_action?: string | null
          obstacles?: string | null
          resources_needed?: string | null
          strategy?: string | null
          sort_order?: number | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          snapshot_id?: string
          priority?: string | null
          company_subject?: string
          location?: string | null
          prospect_value?: number | null
          pipeline_status?: string | null
          key_decision_maker?: string | null
          weekly_action?: string | null
          obstacles?: string | null
          resources_needed?: string | null
          strategy?: string | null
          sort_order?: number | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "focus_items_snapshot_id_fkey"
            columns: ["snapshot_id"]
            isOneToOne: false
            referencedRelation: "focus_snapshots"
            referencedColumns: ["id"]
          },
        ]
      }
      focus_snapshots: {
        Row: {
          id: string
          user_id: string
          group_id: string
          week_date: string
          is_current: boolean | null
          created_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          group_id: string
          week_date: string
          is_current?: boolean | null
          created_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          group_id?: string
          week_date?: string
          is_current?: boolean | null
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "focus_snapshots_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "focus_snapshots_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      group_members: {
        Row: {
          id: string
          group_id: string
          user_id: string
          role_in_group: string
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          group_id: string
          user_id: string
          role_in_group?: string
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          group_id?: string
          user_id?: string
          role_in_group?: string
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "group_members_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      groups: {
        Row: {
          id: string
          name: string
          description: string | null
          geography: string | null
          meeting_cadence: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          geography?: string | null
          meeting_cadence?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          geography?: string | null
          meeting_cadence?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      issues: {
        Row: {
          id: string
          group_id: string
          raised_by: string
          description: string
          priority: number | null
          status: string
          assigned_to_id: string | null
          resolution_notes: string | null
          closed_at: string | null
          is_archived: boolean | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          group_id: string
          raised_by: string
          description: string
          priority?: number | null
          status?: string
          assigned_to_id?: string | null
          resolution_notes?: string | null
          closed_at?: string | null
          is_archived?: boolean | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          group_id?: string
          raised_by?: string
          description?: string
          priority?: number | null
          status?: string
          assigned_to_id?: string | null
          resolution_notes?: string | null
          closed_at?: string | null
          is_archived?: boolean | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "issues_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "issues_raised_by_fkey"
            columns: ["raised_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "issues_assigned_to_id_fkey"
            columns: ["assigned_to_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      meeting_attendees: {
        Row: {
          id: string
          meeting_id: string
          user_id: string
          score: number | null
          checkin_note: string | null
        }
        Insert: {
          id?: string
          meeting_id: string
          user_id: string
          score?: number | null
          checkin_note?: string | null
        }
        Update: {
          id?: string
          meeting_id?: string
          user_id?: string
          score?: number | null
          checkin_note?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "meeting_attendees_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "meetings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meeting_attendees_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      meetings: {
        Row: {
          id: string
          group_id: string
          meeting_date: string
          notes: string | null
          average_score: number | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          group_id: string
          meeting_date: string
          notes?: string | null
          average_score?: number | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          group_id?: string
          meeting_date?: string
          notes?: string | null
          average_score?: number | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "meetings_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      milestone_collaborators: {
        Row: {
          id: string
          milestone_id: string
          user_id: string
        }
        Insert: {
          id?: string
          milestone_id: string
          user_id: string
        }
        Update: {
          id?: string
          milestone_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "milestone_collaborators_milestone_id_fkey"
            columns: ["milestone_id"]
            isOneToOne: false
            referencedRelation: "milestones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "milestone_collaborators_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      milestones: {
        Row: {
          id: string
          rock_id: string
          title: string
          due_date: string | null
          status: string
          collaborators_text: string | null
          notes: string | null
          sort_order: number
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          rock_id: string
          title: string
          due_date?: string | null
          status?: string
          collaborators_text?: string | null
          notes?: string | null
          sort_order?: number
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          rock_id?: string
          title?: string
          due_date?: string | null
          status?: string
          collaborators_text?: string | null
          notes?: string | null
          sort_order?: number
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "milestones_rock_id_fkey"
            columns: ["rock_id"]
            isOneToOne: false
            referencedRelation: "rocks"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          id: string
          full_name: string
          email: string
          geography: string | null
          role: string
          is_active: boolean | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id: string
          full_name: string
          email: string
          geography?: string | null
          role?: string
          is_active?: boolean | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          full_name?: string
          email?: string
          geography?: string | null
          role?: string
          is_active?: boolean | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      quarters: {
        Row: {
          id: string
          label: string
          start_date: string
          end_date: string
          is_current: boolean | null
          created_at: string | null
        }
        Insert: {
          id?: string
          label: string
          start_date: string
          end_date: string
          is_current?: boolean | null
          created_at?: string | null
        }
        Update: {
          id?: string
          label?: string
          start_date?: string
          end_date?: string
          is_current?: boolean | null
          created_at?: string | null
        }
        Relationships: []
      }
      rock_ideas: {
        Row: {
          id: string
          group_id: string
          description: string
          suggested_owner_id: string | null
          priority_color: string | null
          comments: string | null
          promoted_to_rock_id: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          group_id: string
          description: string
          suggested_owner_id?: string | null
          priority_color?: string | null
          comments?: string | null
          promoted_to_rock_id?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          group_id?: string
          description?: string
          suggested_owner_id?: string | null
          priority_color?: string | null
          comments?: string | null
          promoted_to_rock_id?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rock_ideas_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rock_ideas_suggested_owner_id_fkey"
            columns: ["suggested_owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rock_ideas_promoted_to_rock_id_fkey"
            columns: ["promoted_to_rock_id"]
            isOneToOne: false
            referencedRelation: "rocks"
            referencedColumns: ["id"]
          },
        ]
      }
      rocks: {
        Row: {
          id: string
          title: string
          owner_id: string
          group_id: string
          quarter_id: string
          status: string
          completion: string
          target_completion_date: string | null
          notes: string | null
          rolled_from_rock_id: string | null
          is_archived: boolean | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          title: string
          owner_id: string
          group_id: string
          quarter_id: string
          status?: string
          completion?: string
          target_completion_date?: string | null
          notes?: string | null
          rolled_from_rock_id?: string | null
          is_archived?: boolean | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          title?: string
          owner_id?: string
          group_id?: string
          quarter_id?: string
          status?: string
          completion?: string
          target_completion_date?: string | null
          notes?: string | null
          rolled_from_rock_id?: string | null
          is_archived?: boolean | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rocks_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rocks_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rocks_quarter_id_fkey"
            columns: ["quarter_id"]
            isOneToOne: false
            referencedRelation: "quarters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rocks_rolled_from_rock_id_fkey"
            columns: ["rolled_from_rock_id"]
            isOneToOne: false
            referencedRelation: "rocks"
            referencedColumns: ["id"]
          },
        ]
      }
      todos: {
        Row: {
          id: string
          group_id: string
          description: string
          assigned_to_id: string
          due_date: string
          status: string
          source_issue_id: string | null
          is_archived: boolean | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          group_id: string
          description: string
          assigned_to_id: string
          due_date: string
          status?: string
          source_issue_id?: string | null
          is_archived?: boolean | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          group_id?: string
          description?: string
          assigned_to_id?: string
          due_date?: string
          status?: string
          source_issue_id?: string | null
          is_archived?: boolean | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "todos_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "todos_assigned_to_id_fkey"
            columns: ["assigned_to_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "todos_source_issue_id_fkey"
            columns: ["source_issue_id"]
            isOneToOne: false
            referencedRelation: "issues"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      roll_forward_rock: {
        Args: {
          p_rock_id: string
          p_new_quarter_id: string
        }
        Returns: string
      }
      start_new_week: {
        Args: {
          p_user_id: string
          p_group_id: string
          p_new_week_date: string
        }
        Returns: string
      }
      promote_rock_idea: {
        Args: {
          p_idea_id: string
          p_quarter_id: string
          p_owner_id: string
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

// Convenience types
export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row']
export type Insertable<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert']
export type Updatable<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Update']
