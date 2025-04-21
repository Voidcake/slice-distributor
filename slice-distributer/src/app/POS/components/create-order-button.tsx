"use client"

import { Button } from "@/components/ui/button"
import { PlusCircle } from "lucide-react"
import { useState, useEffect } from "react"
import { OrderDialog } from "./order-dialog"
import { createClient } from "@/utils/supabase/client"

export function CreateOrderButton({ onOrderCreated }: { onOrderCreated: () => void }) {
    const [open, setOpen] = useState(false)
    const [nextOrderNumber, setNextOrderNumber] = useState<string | undefined>()

    useEffect(() => {
        const fetchNextOrderNumber = async () => {
            const supabase = createClient()
            const { data, error } = await supabase
                .from("orders")
                .select("order_number")
                .order("order_number", { ascending: false })
                .limit(1)
                .single()
            if (!error && data) {
                const current = parseInt(data.order_number, 10)
                if (!isNaN(current)) {
                    const next = (current + 1).toString().padStart(3, "0")
                    setNextOrderNumber(next)
                } else {
                    setNextOrderNumber("001")
                }
            } else {
                setNextOrderNumber("001")
            }
        }

        fetchNextOrderNumber()
    }, [])

    return (
        <>
            <Button onClick={() => setOpen(true)} className="flex items-center gap-2">
                <PlusCircle className="h-4 w-4" />
                New Order
            </Button>

            <OrderDialog
                open={open}
                onOpenChange={setOpen}
                title="Create New Order"
                initialData={
                    nextOrderNumber
                        ? {id:"", orderNumber: nextOrderNumber, margherita: 0, piccante: 0, marinara: 0, status: "OPEN" } //TODO: what to do with id?
                        : undefined
                }
                isEditMode={false}
                onOrderCreated={onOrderCreated}
            />
        </>
    )
}
