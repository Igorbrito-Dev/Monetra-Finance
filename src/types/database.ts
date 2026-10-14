export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type AccountType = 'checking' | 'savings' | 'investment' | 'cash' | 'other';
export type TransactionType = 'income' | 'expense' | 'transfer';
export type PaymentMethod = 'pix' | 'credit' | 'debit' | 'cash' | 'transfer' | 'boleto' | 'other';
export type SourceFileType = 'csv' | 'ofx' | 'xlsx' | 'other';
export type AgentChannel = 'telegram' | 'web';
export type NotificationType =
  | 'bill_due'
  | 'bill_today'
  | 'bill_overdue'
  | 'card_invoice'
  | 'daily_report'
  | 'budget_alert';

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string | null;
          avatar_url: string | null;
          telegram_chat_id: number | null;
          preferred_currency: string;
          monthly_budget: number | null;
          daily_report_enabled: boolean;
          daily_report_hour: number;
          bill_reminder_days: number;
          card_reminder_days: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          full_name?: string | null;
          avatar_url?: string | null;
          telegram_chat_id?: number | null;
          preferred_currency?: string;
          monthly_budget?: number | null;
          daily_report_enabled?: boolean;
          daily_report_hour?: number;
          bill_reminder_days?: number;
          card_reminder_days?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          full_name?: string | null;
          avatar_url?: string | null;
          telegram_chat_id?: number | null;
          preferred_currency?: string;
          monthly_budget?: number | null;
          daily_report_enabled?: boolean;
          daily_report_hour?: number;
          bill_reminder_days?: number;
          card_reminder_days?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      accounts: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          type: AccountType;
          initial_balance: number;
          current_balance: number;
          color: string | null;
          icon: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          type: AccountType;
          initial_balance?: number;
          current_balance?: number;
          color?: string | null;
          icon?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          type?: AccountType;
          initial_balance?: number;
          current_balance?: number;
          color?: string | null;
          icon?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      credit_cards: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          limit_amount: number;
          closing_day: number;
          due_day: number;
          color: string | null;
          icon: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          limit_amount?: number;
          closing_day: number;
          due_day: number;
          color?: string | null;
          icon?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          limit_amount?: number;
          closing_day?: number;
          due_day?: number;
          color?: string | null;
          icon?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      categories: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          type: 'income' | 'expense';
          color: string | null;
          icon: string | null;
          parent_id: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          type: 'income' | 'expense';
          color?: string | null;
          icon?: string | null;
          parent_id?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          type?: 'income' | 'expense';
          color?: string | null;
          icon?: string | null;
          parent_id?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      transactions: {
        Row: {
          id: string;
          user_id: string;
          account_id: string | null;
          credit_card_id: string | null;
          category_id: string | null;
          import_batch_id: string | null;
          description: string;
          amount: number;
          type: TransactionType;
          payment_method: PaymentMethod;
          transaction_date: string;
          due_date: string | null;
          is_paid: boolean;
          is_recurrent: boolean;
          installment_number: number | null;
          total_installments: number | null;
          installment_group_id: string | null;
          is_invoice_payment: boolean;
          external_id: string | null;
          notes: string | null;
          recurring_bill_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          account_id?: string | null;
          credit_card_id?: string | null;
          category_id?: string | null;
          import_batch_id?: string | null;
          description: string;
          amount: number;
          type: TransactionType;
          payment_method: PaymentMethod;
          transaction_date?: string;
          due_date?: string | null;
          is_paid?: boolean;
          is_recurrent?: boolean;
          installment_number?: number | null;
          total_installments?: number | null;
          installment_group_id?: string | null;
          is_invoice_payment?: boolean;
          external_id?: string | null;
          notes?: string | null;
          recurring_bill_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          account_id?: string | null;
          credit_card_id?: string | null;
          category_id?: string | null;
          import_batch_id?: string | null;
          description?: string;
          amount?: number;
          type?: TransactionType;
          payment_method?: PaymentMethod;
          transaction_date?: string;
          due_date?: string | null;
          is_paid?: boolean;
          is_recurrent?: boolean;
          installment_number?: number | null;
          total_installments?: number | null;
          installment_group_id?: string | null;
          is_invoice_payment?: boolean;
          external_id?: string | null;
          notes?: string | null;
          recurring_bill_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      import_batches: {
        Row: {
          id: string;
          user_id: string;
          filename: string;
          file_hash: string | null;
          source_type: SourceFileType;
          total_records: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          filename: string;
          file_hash?: string | null;
          source_type: SourceFileType;
          total_records?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          filename?: string;
          file_hash?: string | null;
          source_type?: SourceFileType;
          total_records?: number;
          created_at?: string;
        };
        Relationships: [];
      };
      agent_messages: {
        Row: {
          id: string;
          user_id: string;
          channel: AgentChannel;
          role: 'user' | 'assistant';
          content: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          channel: AgentChannel;
          role: 'user' | 'assistant';
          content: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          channel?: AgentChannel;
          role?: 'user' | 'assistant';
          content?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      recurring_bills: {
        Row: {
          id: string;
          user_id: string;
          type: 'income' | 'expense';
          description: string;
          amount: number;
          day_of_month: number;
          category_id: string | null;
          account_id: string | null;
          credit_card_id: string | null;
          payment_method: PaymentMethod;
          notes: string | null;
          start_date: string;
          end_date: string | null;
          active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          type: 'income' | 'expense';
          description: string;
          amount: number;
          day_of_month: number;
          category_id?: string | null;
          account_id?: string | null;
          credit_card_id?: string | null;
          payment_method?: PaymentMethod;
          notes?: string | null;
          start_date?: string;
          end_date?: string | null;
          active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          type?: 'income' | 'expense';
          description?: string;
          amount?: number;
          day_of_month?: number;
          category_id?: string | null;
          account_id?: string | null;
          credit_card_id?: string | null;
          payment_method?: PaymentMethod;
          notes?: string | null;
          start_date?: string;
          end_date?: string | null;
          active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      notifications: {
        Row: {
          id: string;
          user_id: string;
          type: NotificationType;
          title: string;
          body: string;
          link_tab: string | null;
          dedupe_key: string;
          read_at: string | null;
          telegram_sent_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          type: NotificationType;
          title: string;
          body: string;
          link_tab?: string | null;
          dedupe_key: string;
          read_at?: string | null;
          telegram_sent_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          type?: NotificationType;
          title?: string;
          body?: string;
          link_tab?: string | null;
          dedupe_key?: string;
          read_at?: string | null;
          telegram_sent_at?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      telegram_link_tokens: {
        Row: {
          id: string;
          user_id: string;
          token: string;
          expires_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          token: string;
          expires_at: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          token?: string;
          expires_at?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      telegram_updates: {
        Row: {
          update_id: number;
          user_id: string | null;
          processed_at: string;
        };
        Insert: {
          update_id: number;
          user_id?: string | null;
          processed_at?: string;
        };
        Update: {
          update_id?: number;
          user_id?: string | null;
          processed_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      account_balances: {
        Row: {
          account_id: string;
          user_id: string;
          initial_balance: number;
          balance: number;
        };
        Relationships: [];
      };
    };
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

// Helpers tipados
export type Profile = Database['public']['Tables']['profiles']['Row'];
export type Account = Database['public']['Tables']['accounts']['Row'];
export type CreditCard = Database['public']['Tables']['credit_cards']['Row'];
export type Category = Database['public']['Tables']['categories']['Row'];
export type Transaction = Database['public']['Tables']['transactions']['Row'];
export type ImportBatch = Database['public']['Tables']['import_batches']['Row'];
export type TelegramLinkToken = Database['public']['Tables']['telegram_link_tokens']['Row'];
export type RecurringBill = Database['public']['Tables']['recurring_bills']['Row'];
export type AppNotification = Database['public']['Tables']['notifications']['Row'];
export type AgentMessage = Database['public']['Tables']['agent_messages']['Row'];
