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
      scorecard_templates: {
        Row: {
          id: string
          group_id: string
          name: string
          description: string | null
          is_active: boolean
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          group_id: string
          name: string
          description?: string | null
          is_active?: boolean
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          group_id?: string
          name?: string
          description?: string | null
          is_active?: boolean
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "scorecard_templates_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      scorecard_sections: {
        Row: {
          id: string
          template_id: string
          name: string
          display_order: number
          section_type: string
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          template_id: string
          name: string
          display_order?: number
          section_type: string
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          template_id?: string
          name?: string
          display_order?: number
          section_type?: string
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "scorecard_sections_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "scorecard_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      scorecard_measures: {
        Row: {
          id: string
          section_id: string
          name: string
          display_order: number
          data_type: string
          is_calculated: boolean
          calculation_formula: Json | null
          owner_user_id: string | null
          zoho_field_mapping: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          section_id: string
          name: string
          display_order?: number
          data_type?: string
          is_calculated?: boolean
          calculation_formula?: Json | null
          owner_user_id?: string | null
          zoho_field_mapping?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          section_id?: string
          name?: string
          display_order?: number
          data_type?: string
          is_calculated?: boolean
          calculation_formula?: Json | null
          owner_user_id?: string | null
          zoho_field_mapping?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "scorecard_measures_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "scorecard_sections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scorecard_measures_owner_user_id_fkey"
            columns: ["owner_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      scorecard_goals: {
        Row: {
          id: string
          measure_id: string
          quarter: string
          goal_value: number
          set_by: string
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          measure_id: string
          quarter: string
          goal_value: number
          set_by: string
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          measure_id?: string
          quarter?: string
          goal_value?: number
          set_by?: string
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "scorecard_goals_measure_id_fkey"
            columns: ["measure_id"]
            isOneToOne: false
            referencedRelation: "scorecard_measures"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scorecard_goals_set_by_fkey"
            columns: ["set_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      goal_change_log: {
        Row: {
          id: string
          goal_id: string
          previous_value: number
          new_value: number
          changed_by: string
          changed_at: string
          reason: string | null
        }
        Insert: {
          id?: string
          goal_id: string
          previous_value: number
          new_value: number
          changed_by: string
          changed_at?: string
          reason?: string | null
        }
        Update: {
          id?: string
          goal_id?: string
          previous_value?: number
          new_value?: number
          changed_by?: string
          changed_at?: string
          reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "goal_change_log_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "scorecard_goals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goal_change_log_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      scorecard_entries: {
        Row: {
          id: string
          measure_id: string
          user_id: string
          week_ending: string
          value: number | null
          zoho_record_id: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          measure_id: string
          user_id: string
          week_ending: string
          value?: number | null
          zoho_record_id?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          measure_id?: string
          user_id?: string
          week_ending?: string
          value?: number | null
          zoho_record_id?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "scorecard_entries_measure_id_fkey"
            columns: ["measure_id"]
            isOneToOne: false
            referencedRelation: "scorecard_measures"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scorecard_entries_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      scorecard_entry_details: {
        Row: {
          id: string
          entry_id: string
          line_name: string
          line_value: number | null
          notes: string | null
          zoho_potential_id: string | null
          display_order: number
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          entry_id: string
          line_name: string
          line_value?: number | null
          notes?: string | null
          zoho_potential_id?: string | null
          display_order?: number
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          entry_id?: string
          line_name?: string
          line_value?: number | null
          notes?: string | null
          zoho_potential_id?: string | null
          display_order?: number
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "scorecard_entry_details_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: false
            referencedRelation: "scorecard_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      campaigns: {
        Row: {
          id: string
          group_id: string
          name: string
          leads_count_total: number | null
          status: string
          created_at: string | null
          archived_at: string | null
        }
        Insert: {
          id?: string
          group_id: string
          name: string
          leads_count_total?: number | null
          status?: string
          created_at?: string | null
          archived_at?: string | null
        }
        Update: {
          id?: string
          group_id?: string
          name?: string
          leads_count_total?: number | null
          status?: string
          created_at?: string | null
          archived_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "campaigns_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_weekly_data: {
        Row: {
          id: string
          campaign_id: string
          week_ending: string
          data: Json
          entered_by: string
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          campaign_id: string
          week_ending: string
          data?: Json
          entered_by: string
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          campaign_id?: string
          week_ending?: string
          data?: Json
          entered_by?: string
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "campaign_weekly_data_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_weekly_data_entered_by_fkey"
            columns: ["entered_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_metric_definitions: {
        Row: {
          id: string
          group_id: string
          metric_key: string
          label: string
          data_type: string
          is_required: boolean
          display_order: number
          created_at: string | null
        }
        Insert: {
          id?: string
          group_id: string
          metric_key: string
          label: string
          data_type?: string
          is_required?: boolean
          display_order?: number
          created_at?: string | null
        }
        Update: {
          id?: string
          group_id?: string
          metric_key?: string
          label?: string
          data_type?: string
          is_required?: boolean
          display_order?: number
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "campaign_metric_definitions_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      scorecard_settings: {
        Row: {
          id: string
          group_id: string
          setting_key: string
          setting_value: string
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          group_id: string
          setting_key: string
          setting_value: string
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          group_id?: string
          setting_key?: string
          setting_value?: string
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "scorecard_settings_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
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
