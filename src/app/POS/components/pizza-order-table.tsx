"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  type ColumnDef,
  type ColumnFiltersState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  type SortingState,
  useReactTable,
} from "@tanstack/react-table";
import { ArrowUpDown, Edit, InfoIcon, Trash } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { OrderDialog } from "./order-dialog";
import { CreateOrderButton } from "./create-order-button";
import { mapOrderRow, type Order, type OrderRow } from "@/domain/orders";

export type { Order } from "@/domain/orders";

export function PizzaOrderTable() {
  const { toast } = useToast();
  const [sorting, setSorting] = useState<SortingState>([{ id: "orderNumber", desc: true }]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [isInfoOpen, setIsInfoOpen] = useState(false);
  const [isDeleteAllDialogOpen, setIsDeleteAllDialogOpen] = useState(false);

  const [data, setData] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  const supabase = useMemo(() => createClient(), []);

  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [orderToEdit, setOrderToEdit] = useState<Order | null>(null);
  const [orderToDelete, setOrderToDelete] = useState<Order | null>(null);

  // Retrieve persisted state on mount.
  useEffect(() => {
    try {
      const storedSorting = localStorage.getItem("sortingState");
      if (storedSorting) {
        setSorting(JSON.parse(storedSorting));
      }
      const storedFilters = localStorage.getItem("columnFiltersState");
      if (storedFilters) {
        setColumnFilters(JSON.parse(storedFilters));
      }
    } catch {
      localStorage.removeItem("sortingState");
      localStorage.removeItem("columnFiltersState");
    }
  }, []);

  // Persist sorting state
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("sortingState", JSON.stringify(sorting));
    }
  }, [sorting]);

  // Persist filters state
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("columnFiltersState", JSON.stringify(columnFilters));
    }
  }, [columnFilters]);

  const ordersInfo = useMemo(() => {
    const info: Record<
      "OPEN" | "PROCESSED",
      {
        totalByType: Record<"margherita" | "piccante" | "marinara", number>;
        totalSlices: number;
      }
    > = {
      OPEN: {
        totalByType: { margherita: 0, piccante: 0, marinara: 0 },
        totalSlices: 0,
      },
      PROCESSED: {
        totalByType: { margherita: 0, piccante: 0, marinara: 0 },
        totalSlices: 0,
      },
    };
    data.forEach((order) => {
      const bucket = info[order.status];
      (Object.keys(bucket.totalByType) as Array<keyof typeof bucket.totalByType>).forEach(
        (type) => {
          const count = order[type] as number;
          bucket.totalByType[type] += count;
          bucket.totalSlices += count;
        },
      );
    });
    return info;
  }, [data]);

  const fetchOrders = useCallback(async () => {
    const { data: orders, error } = await supabase
      .from("orders")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast({
        title: "Unable to load orders",
        description: error.message,
        variant: "destructive",
      });
    } else {
      setData((orders ?? []).map((order) => mapOrderRow(order as OrderRow)));
    }

    setLoading(false);
  }, [supabase, toast]);

  useEffect(() => {
    const channel = supabase
      .channel("orders-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders" },
        () => void fetchOrders(),
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [fetchOrders, supabase]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const handleDeleteOrder = async (order: Order) => {
    if (!order) return;

    try {
      const { error } = await supabase.from("orders").delete().eq("id", order.id);
      if (error) {
        toast({
          title: "Error",
          description: "Failed to delete the order from the database.",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Order deleted",
        description: "The order has been successfully deleted.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete the order.",
        variant: "destructive",
      });
    } finally {
      await fetchOrders();
    }
  };

  const handleDeleteAllOrders = async () => {
    try {
      const { error } = await supabase.from("orders").delete().not("id", "is", null);

      if (error) {
        toast({
          title: "Error",
          description: "Failed to delete all orders from the database.",
          variant: "destructive",
        });
        return;
      }
      toast({
        title: "All orders deleted",
        description: "All orders have been successfully deleted.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete all orders.",
        variant: "destructive",
      });
    } finally {
      setIsDeleteAllDialogOpen(false);
      await fetchOrders();
    }
  };

  const columns: ColumnDef<Order>[] = [
    {
      accessorKey: "orderNumber",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Order Number
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => (
        <div className="text-center font-medium text-sm sm:text-base">
          {row.getValue("orderNumber")}
        </div>
      ),
    },
    {
      accessorKey: "margherita",
      header: "Margherita",
      cell: ({ row }) => (
        <div className="text-center font-medium text-sm sm:text-base">
          {row.getValue("margherita")}
        </div>
      ),
    },
    {
      accessorKey: "piccante",
      header: "Piccante",
      cell: ({ row }) => (
        <div className="text-center font-medium text-sm sm:text-base">
          {row.getValue("piccante")}
        </div>
      ),
    },
    {
      accessorKey: "marinara",
      header: "Marinara",
      cell: ({ row }) => (
        <div className="text-center font-medium text-sm sm:text-base">
          {row.getValue("marinara")}
        </div>
      ),
    },
    {
      accessorKey: "status",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Status
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => {
        const status = row.getValue("status") as string;
        return (
          <div className="text-center font-medium text-sm sm:text-base">
            <Badge variant={status === "OPEN" ? "default" : "secondary"}>{status}</Badge>
          </div>
        );
      },
      filterFn: (row, id, value) => {
        return value.includes(row.getValue(id));
      },
    },
    {
      cell: ({ row }) => {
        const order = row.original;
        const canDelete = order.status === "OPEN";

        return (
          <div className="flex justify-end w-full sm:w-auto">
            <div className="flex justify-end gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  setOrderToEdit(order);
                  setIsEditDialogOpen(true);
                }}
              >
                <Edit className="h-4 w-4" />
                <span className="sr-only">Edit</span>
              </Button>
              <Button
                variant="ghost"
                size="icon"
                disabled={!canDelete}
                onClick={() => setOrderToDelete(order)}
              >
                <Trash className="h-4 w-4" />
                <span className="sr-only">Delete</span>
              </Button>
            </div>
          </div>
        );
      },
      id: "actions",
    },
  ];

  const table = useReactTable({
    data,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    state: { sorting, columnFilters },
  });

  return (
    <>
      {loading ? (
        <div className="px-4 py-3 text-center sm:p-6" role="status">
          Loading orders...
        </div>
      ) : (
        <div>
          <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-4 mb-4">
            <Sheet open={isInfoOpen} onOpenChange={setIsInfoOpen}>
              <SheetTrigger asChild>
                <Button variant="secondary">
                  <InfoIcon className="mr-2 h-4 w-4" />
                  Orders Info
                </Button>
              </SheetTrigger>
              <SheetContent className="w-full overflow-y-auto sm:max-w-[540px]">
                <SheetHeader>
                  <SheetTitle>Orders Overview</SheetTitle>
                  <SheetDescription>Total slices by status</SheetDescription>
                </SheetHeader>

                <div className="mt-6 space-y-12">
                  {(["OPEN", "PROCESSED"] as const).map((status) => (
                    <div
                      key={status}
                      className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm space-y-6"
                    >
                      <h3 className="font-semibold text-lg capitalize">
                        {status.toLowerCase()} orders
                      </h3>

                      {/* Per-type breakdown */}
                      <div className="space-y-4">
                        {Object.entries(ordersInfo[status].totalByType).map(([type, count]) => (
                          <div
                            key={type}
                            className="flex flex-col sm:flex-row justify-between items-start sm:items-center"
                          >
                            <span className="capitalize font-medium">{type}</span>
                            <div className="text-sm font-medium text-right">
                              {count} slices
                              <br />
                              {`${Math.floor(count / 8)} Full Pizzas${
                                count % 8 ? ` + ${count % 8} Slices` : ""
                              }`}
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Overall total */}
                      <div className="pt-4 border-t border-gray-200 dark:border-gray-700 space-y-1">
                        <div className="flex justify-between font-medium">
                          <span>Total Slices:</span>
                          <span>{ordersInfo[status].totalSlices}</span>
                        </div>
                        <div className="text-sm font-medium text-right">
                          {`${Math.floor(ordersInfo[status].totalSlices / 8)} Full Pizzas${
                            ordersInfo[status].totalSlices % 8
                              ? ` + ${ordersInfo[status].totalSlices % 8} Slices`
                              : ""
                          }`}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-4 flex justify-end">
                  <Button variant="destructive" onClick={() => setIsDeleteAllDialogOpen(true)}>
                    Delete All Orders
                  </Button>
                </div>
              </SheetContent>
            </Sheet>
            <CreateOrderButton onOrderCreated={fetchOrders} />
          </div>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 py-2 sm:py-4">
            <Input
              type="text"
              inputMode="numeric"
              placeholder="Search Order Number..."
              value={(table.getColumn("orderNumber")?.getFilterValue() as string) ?? ""}
              onChange={(event) =>
                table.getColumn("orderNumber")?.setFilterValue(event.target.value)
              }
              className="max-w-sm"
            />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="ml-0 sm:ml-auto w-full sm:w-auto">
                  Status Filter
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="relative" align="end">
                <DropdownMenuItem
                  onClick={() => table.getColumn("status")?.setFilterValue(undefined)}
                >
                  All
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => table.getColumn("status")?.setFilterValue(["OPEN"])}
                >
                  Open
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => table.getColumn("status")?.setFilterValue(["PROCESSED"])}
                >
                  Processed
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <div className="overflow-x-auto w-full rounded-md border">
            <Table className="min-w-[600px]">
              <TableHeader>
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id}>
                    {headerGroup.headers.map((header) => (
                      <TableHead key={header.id}>
                        {!header.isPlaceholder &&
                          flexRender(header.column.columnDef.header, header.getContext())}
                      </TableHead>
                    ))}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {table.getRowModel().rows.length ? (
                  <>
                    {table.getRowModel().rows.map((row) => (
                      <TableRow key={row.id} data-state={row.getIsSelected() && "selected"}>
                        {row.getVisibleCells().map((cell) => (
                          <TableCell key={cell.id}>
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </>
                ) : (
                  <TableRow>
                    <TableCell colSpan={columns.length} className="h-24 text-center">
                      No orders found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          <div className="flex items-center justify-end space-x-2 py-4">
            <Button
              variant="outline"
              className="ml-0 sm:ml-auto w-full sm:w-auto"
              size="sm"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              className="ml-0 sm:ml-auto w-full sm:w-auto"
              size="sm"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              Next
            </Button>
          </div>
          {orderToEdit && (
            <OrderDialog
              open={isEditDialogOpen}
              onOpenChange={async (open) => {
                setIsEditDialogOpen(open);
                if (!open) {
                  setOrderToEdit(null);
                  await fetchOrders();
                }
              }}
              initialData={orderToEdit}
              title={`Edit Order #${orderToEdit.orderNumber}`}
              isEditMode={true}
            />
          )}
          {orderToDelete && (
            <AlertDialog
              open={!!orderToDelete}
              onOpenChange={(open) => !open && setOrderToDelete(null)}
            >
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete order {orderToDelete.orderNumber}. This action
                    cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    className="text-xs sm:text-sm px-2 py-1 bg-destructive text-destructive-foreground"
                    onClick={() => {
                      handleDeleteOrder(orderToDelete);
                      setOrderToDelete(null);
                    }}
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
          <AlertDialog
            open={isDeleteAllDialogOpen}
            onOpenChange={(open) => !open && setIsDeleteAllDialogOpen(false)}
          >
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete all orders. This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  className="text-xs sm:text-sm px-2 py-1 bg-destructive text-destructive-foreground"
                  onClick={handleDeleteAllOrders}
                >
                  Delete All
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      )}
    </>
  );
}
