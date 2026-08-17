"use client";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createClient } from "@/utils/supabase/client";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Minus, Plus } from "lucide-react";
import { BATCH_CAPACITY, type Order } from "@/domain/orders";

const formSchema = z
  .object({
    orderNumber: z.string().regex(/^\d+$/, "Use numbers only"),
    margherita: z.coerce.number().int().min(0).max(BATCH_CAPACITY),
    piccante: z.coerce.number().int().min(0).max(BATCH_CAPACITY),
    marinara: z.coerce.number().int().min(0).max(BATCH_CAPACITY),
    status: z.enum(["OPEN", "PROCESSED"]),
  })
  .refine(({ margherita, piccante, marinara }) => margherita + piccante + marinara > 0, {
    message: "Add at least one slice",
    path: ["marinara"],
  })
  .refine(
    ({ margherita, piccante, marinara }) => margherita + piccante + marinara <= BATCH_CAPACITY,
    {
      message: `An order can contain at most ${BATCH_CAPACITY} slices`,
      path: ["marinara"],
    },
  );

type FormValues = z.infer<typeof formSchema>;

interface OrderFormProps {
  initialData?: Order;
  onSuccess?: () => void;
  isDialog?: boolean;
  isEditMode?: boolean;
}

export function OrderForm({
  initialData,
  onSuccess,
  isDialog = false,
  isEditMode,
}: OrderFormProps) {
  const router = useRouter();
  const { toast } = useToast();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: initialData || {
      orderNumber: "",
      margherita: 0,
      piccante: 0,
      marinara: 0,
      status: "OPEN",
    },
  });

  const onSubmit = async (values: FormValues) => {
    const supabase = createClient();
    let savedOrderNumber = values.orderNumber;

    try {
      if (isEditMode && initialData?.id) {
        const result = await supabase
          .from("orders")
          .update({
            order_number: values.orderNumber,
            slices_margherita: values.margherita,
            slices_piccante: values.piccante,
            slices_marinara: values.marinara,
            status: values.status,
          })
          .eq("id", initialData.id);
        const error = result.error;
        if (error) {
          toast({
            title: "Error",
            description:
              error.message && error.message.includes("orders_order_number_key")
                ? "Order Number already exists!"
                : error.message || `Failed to ${isEditMode ? "update" : "create"} the order.`,
            variant: "destructive",
          });
          return;
        }
      } else {
        const result = await supabase
          .rpc("create_order", {
            p_slices_margherita: values.margherita,
            p_slices_piccante: values.piccante,
            p_slices_marinara: values.marinara,
            p_status: values.status,
          })
          .single();
        const error = result.error;
        if (error) {
          toast({
            title: "Error",
            description:
              error.message && error.message.includes("orders_order_number_key")
                ? "Order Number already exists!"
                : error.message || `Failed to ${isEditMode ? "update" : "create"} the order.`,
            variant: "destructive",
          });
          return;
        }
        if (
          !result.data ||
          typeof result.data !== "object" ||
          !("order_number" in result.data)
        ) {
          toast({
            title: "Order created with an invalid response",
            description: "Refresh the order list before trying again.",
            variant: "destructive",
          });
          return;
        }
        savedOrderNumber = String(result.data.order_number);
      }

      toast({
        title: isEditMode ? "Order updated" : "Order created",
        description: `Order ${savedOrderNumber} has been ${isEditMode ? "updated" : "created"} successfully.`,
      });

      if (onSuccess) {
        onSuccess();
      } else {
        router.push("/");
        router.refresh();
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "";
      toast({
        title: "Error",
        description: errorMessage.includes("orders_order_number_key")
          ? "Order Number already exists!"
          : errorMessage || `Failed to ${isEditMode ? "update" : "create"} the order.`,
        variant: "destructive",
      });
    }
  };

  const PizzaCounter = ({
    name,
    label,
  }: {
    name: "margherita" | "piccante" | "marinara";
    label: string;
  }) => {
    const value = form.watch(name);

    return (
      <FormField
        control={form.control}
        name={name}
        render={({ field }) => (
          <FormItem>
            <FormLabel>{label}</FormLabel>
            <div className="flex items-center space-x-2">
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => form.setValue(name, Math.max(0, value - 1))}
              >
                <Minus className="h-4 w-4" />
              </Button>
              <FormControl>
                <Input
                  {...field}
                  type="number"
                  min="0"
                  max={BATCH_CAPACITY}
                  className="w-20 text-center"
                />
              </FormControl>
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => form.setValue(name, value + 1)}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <FormMessage />
          </FormItem>
        )}
      />
    );
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 max-w-md">
        <FormField
          control={form.control}
          name="orderNumber"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Order Number</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  placeholder="Assigned automatically"
                  type="text"
                  inputMode="numeric"
                  readOnly={!isEditMode}
                  aria-readonly={!isEditMode}
                />
              </FormControl>
              <FormDescription>
                {isEditMode
                  ? "Order numbers must remain unique."
                  : "The database assigns the final number when saved."}
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <PizzaCounter name="margherita" label="Margherita" />
          <PizzaCounter name="piccante" label="Piccante" />
          <PizzaCounter name="marinara" label="Marinara" />
        </div>

        <FormField
          control={form.control}
          name="status"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Status</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a status" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="OPEN">OPEN</SelectItem>
                  <SelectItem value="PROCESSED">PROCESSED</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex gap-4">
          <Button type="submit">{isEditMode ? "Update Order" : "Create Order"}</Button>
          {isDialog ? (
            <Button type="button" variant="outline" onClick={onSuccess}>
              Cancel
            </Button>
          ) : (
            <Button type="button" variant="outline" onClick={() => router.push("/")}>
              Cancel
            </Button>
          )}
        </div>
      </form>
    </Form>
  );
}
