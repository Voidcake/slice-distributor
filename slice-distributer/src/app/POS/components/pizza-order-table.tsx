"use client"

import {useState, useEffect} from "react"
import {
    type ColumnDef,
    type ColumnFiltersState,
    type SortingState,
    flexRender,
    getCoreRowModel,
    getFilteredRowModel,
    getPaginationRowModel,
    getSortedRowModel,
    useReactTable,
} from "@tanstack/react-table"
import {ArrowUpDown, Edit, Trash} from "lucide-react"
import {createClient} from "@/utils/supabase/client"

import {Button} from "@/components/ui/button"
import {DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger} from "@/components/ui/dropdown-menu"
import {Input} from "@/components/ui/input"
import {Table, TableBody, TableCell, TableHead, TableHeader, TableRow} from "@/components/ui/table"
import {Badge} from "@/components/ui/badge"
import {useToast} from "@/hooks/use-toast"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import {OrderDialog} from "./order-dialog"
import {CreateOrderButton} from "./create-order-button"


export type Order = {
    id: string
    orderNumber: string
    margherita: number
    piccante: number
    marinara: number
    status: "OPEN" | "PROCESSED"
}

export function PizzaOrderTable() {
    const {toast} = useToast()
    const [sorting, setSorting] = useState<SortingState>([{ id: "orderNumber", desc: true }])
    const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
    const [data, setData] = useState<Order[]>([])
    const [loading, setLoading] = useState(true)

    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
    const [orderToEdit, setOrderToEdit] = useState<Order | null>(null)

    const fetchOrders = async () => {
        const supabase = createClient()
        const {data: orders, error} = await supabase.from("orders").select("*")

        if (error) {
            toast({
                title: "Error",
                description: "Failed to fetch orders from the database.",
                variant: "destructive",
            })
        } else if (orders) {
            const mappedOrders = orders.map((order) => ({
                id: order.id,
                orderNumber: order.order_number,
                margherita: order.slices_margherita,
                piccante: order.slices_piccante,
                marinara: order.slices_marinara,
                status: order.status,
            }))
            setData(mappedOrders)
        }

        setLoading(false)
    }

    useEffect(() => {
        fetchOrders()
    }, [])

    const handleDeleteOrder = async (order: Order) => {
        console.debug("handleDeleteOrder triggered");
        console.debug("Deleting order ID:", order.id);
        if (!order) return

        try {
            const supabase = createClient();
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
            })
        } catch (error) {
            toast({
                title: "Error",
                description: "Failed to delete the order.",
                variant: "destructive",
            })
        } finally {
            await fetchOrders()
        }
    }

    const columns: ColumnDef<Order>[] = [
        {
            accessorKey: "orderNumber",
            header: ({column}) => (
                <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
                    Order Number
                    <ArrowUpDown className="ml-2 h-4 w-4"/>
                </Button>
            ),
            cell: ({row}) => <div className="text-center font-medium">{row.getValue("orderNumber")}</div>,
        },
        {
            accessorKey: "margherita",
            header: "Margherita",
            cell: ({row}) => <div className="text-center">{row.getValue("margherita")}</div>,
        },
        {
            accessorKey: "piccante",
            header: "Piccante",
            cell: ({row}) => <div className="text-center">{row.getValue("piccante")}</div>,
        },
        {
            accessorKey: "marinara",
            header: "Marinara",
            cell: ({row}) => <div className="text-center">{row.getValue("marinara")}</div>,
        },
        {
            accessorKey: "status",
            header: ({column}) => (
                <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
                    Status
                    <ArrowUpDown className="ml-2 h-4 w-4"/>
                </Button>
            ),
            cell: ({row}) => {
                const status = row.getValue("status") as string
                return (
                    <div className="text-center">
                        <Badge variant={status === "OPEN" ? "default" : "secondary"}>{status}</Badge>
                    </div>
                )
            },
            filterFn: (row, id, value) => {
                return value.includes(row.getValue(id))
            },
        },
        {
            id: "actions",
            cell: ({ row }) => {
                const order = row.original;
                const canDelete = order.status === "OPEN";

                return (
                    <div className="flex justify-end">
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
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    disabled={!canDelete}
                                >
                                    <Trash className="h-4 w-4" />
                                    <span className="sr-only">Delete</span>
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        This will permanently delete order {order.orderNumber}. This action cannot be undone.
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction
                                        className="bg-destructive text-destructive-foreground"
                                        onClick={() => {
                                            console.debug("Delete confirmed for order:", order.id);
                                            handleDeleteOrder(order);
                                        }}
                                    >
                                        Delete
                                    </AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    </div>
                );
            },
        },
    ]

    const table = useReactTable({
        data,
        columns,
        onSortingChange: setSorting,
        onColumnFiltersChange: setColumnFilters,
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        state: {
            sorting,
            columnFilters,
        },
    })

    return (
        <>
            {loading ? (
                <div className="p-6 text-center">Loading orders...</div>
            ) : (
                <div>
                    <div className="flex justify-end mb-4">
                        <CreateOrderButton onOrderCreated={fetchOrders} />
                    </div>
                    <div className="flex items-center py-4">
                        <Input
                            placeholder="Search Order Number..."
                            value={(table.getColumn("orderNumber")?.getFilterValue() as string) ?? ""}
                            onChange={(event) => table.getColumn("orderNumber")?.setFilterValue(event.target.value)}
                            className="max-w-sm"
                        />
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" className="ml-auto">
                                    Status Filter
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => table.getColumn("status")?.setFilterValue(undefined)}>
                                    All
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => table.getColumn("status")?.setFilterValue(["OPEN"])}>
                                    Open
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                    onClick={() => table.getColumn("status")?.setFilterValue(["PROCESSED"])}>
                                    Processed
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                    <div className="rounded-md border">
                        <Table>
                            <TableHeader>
                                {table.getHeaderGroups().map((headerGroup) => (
                                    <TableRow key={headerGroup.id}>
                                        {headerGroup.headers.map((header) => (
                                            <TableHead key={header.id}>
                                                {!header.isPlaceholder && flexRender(header.column.columnDef.header, header.getContext())}
                                            </TableHead>
                                        ))}
                                    </TableRow>
                                ))}
                            </TableHeader>
                            <TableBody>
                                {table.getRowModel().rows.length ? (
                                    table.getRowModel().rows.map((row) => (
                                        <TableRow key={row.id} data-state={row.getIsSelected() && "selected"}>
                                            {row.getVisibleCells().map((cell) => (
                                                <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
                                            ))}
                                        </TableRow>
                                    ))
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
                        <Button variant="outline" size="sm" onClick={() => table.previousPage()}
                                disabled={!table.getCanPreviousPage()}>
                            Previous
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => table.nextPage()}
                                disabled={!table.getCanNextPage()}>
                            Next
                        </Button>
                    </div>
                    {orderToEdit && (
                        <OrderDialog
                            open={isEditDialogOpen}
                            onOpenChange={async (open) => {
                                setIsEditDialogOpen(open)
                                if (!open) {
                                    setOrderToEdit(null)
                                    await fetchOrders()
                                }
                            }}
                            initialData={orderToEdit}
                            title={`Edit Order #${orderToEdit.orderNumber}`}
                            isEditMode={true}
                        />
                    )}
                </div>
            )}
        </>
    )
}
