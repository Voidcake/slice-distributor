export type OrdersRow = {
  id: number;
  order_number: string;
  slices_margherita: number;
  slices_piccante: number;
  slices_marinara: number;
  status: "OPEN" | "PROCESSED";
  created_at: string;
};

export type Database = {
  public: {
    Tables: {
      orders: {
        Row: OrdersRow;
        Insert: {
          id?: number;
          order_number: string;
          slices_margherita?: number;
          slices_piccante?: number;
          slices_marinara?: number;
          status?: "OPEN" | "PROCESSED";
          created_at?: string;
        };
        Update: {
          id?: number;
          order_number?: string;
          slices_margherita?: number;
          slices_piccante?: number;
          slices_marinara?: number;
          status?: "OPEN" | "PROCESSED";
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<never, never>;
    Functions: {
      create_order: {
        Args: {
          p_slices_margherita: number;
          p_slices_piccante: number;
          p_slices_marinara: number;
          p_status?: string;
        };
        Returns: OrdersRow[];
      };
      reset_reheat_queue: {
        Args: { p_start_order_number: string };
        Returns: undefined;
      };
    };
    Enums: Record<never, never>;
    CompositeTypes: Record<never, never>;
  };
};
