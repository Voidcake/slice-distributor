"use client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { OrderForm } from "./order-form";
import type { Order } from "./pizza-order-table";

interface OrderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  initialData?: Order;
  isEditMode: boolean;
  onOrderCreated?: () => void;
}

export function OrderDialog({
  open,
  onOpenChange,
  title,
  initialData,
  isEditMode,
  onOrderCreated,
}: OrderDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <OrderForm
          initialData={initialData}
          onSuccess={() => {
            onOpenChange(false);
            onOrderCreated?.();
          }}
          isDialog={true}
          isEditMode={isEditMode}
        />
      </DialogContent>
    </Dialog>
  );
}
