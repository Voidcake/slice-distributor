"use client"

import {useCallback, useEffect, useRef, useState} from "react"
import {useToast} from "@/hooks/use-toast"
import {createClient} from "@/utils/supabase/client"

interface Order {
    id: number
    orderNumber: string
    margherita: number
    piccante: number
    marinara: number
    status: "OPEN" | "PROCESSED"
}

interface Batch {
    orderNumbers: string[]
    slicesByType: Record<string, number>
    totalSlices: number
    ovenDistribution: [Record<string, number>, Record<string, number>]
    orders: Order[]
}

interface OpenOrdersInfo {
    totalSlices: number
    totalByType: Record<string, number>
}

export function useOrders(startOrderNumber: string | null) {
    const [orders, setOrders] = useState<Order[]>([])
    const [currentBatch, setCurrentBatch] = useState<Batch | null>(null)
    const [previousBatch, setPreviousBatch] = useState<Batch | null>(null)
    const [batchHistory, setBatchHistory] = useState<Batch[]>([])
    const [isLoading, setIsLoading] = useState(false)
    const [lastProcessedOrderIndex, setLastProcessedOrderIndex] = useState(-1)

    /*  one-time bootstrap flags  */
    const [bootstrapped, setBootstrapped] = useState(false)
    const [initialStart, setInitialStart] = useState<string | null>(null)

    const prevStartOrderRef = useRef<string | null>(null)
    const {toast} = useToast()

    //Bootstrap: read any persisted batch & history on first mount
    useEffect(() => {
        if (bootstrapped) return
        setBootstrapped(true)

        const storedCurrent = localStorage.getItem("reheat_currentBatch")
        const storedPrevious = localStorage.getItem("reheat_previousBatch")
        const storedHistory = localStorage.getItem("reheat_batchHistory")

        if (storedCurrent) {
            const batch = JSON.parse(storedCurrent) as Batch
            setCurrentBatch(batch)
            if (batch.orderNumbers.length) {
                // take the first order number of that batch as our fallback start
                setInitialStart(batch.orderNumbers[0])
            }
        }
        if (storedPrevious) setPreviousBatch(JSON.parse(storedPrevious))
        if (storedHistory) setBatchHistory(JSON.parse(storedHistory))
    }, [bootstrapped])

    const allOpenOrdersInfo = useCallback((): OpenOrdersInfo => {
        const openOrders = orders.filter(o => o.status === "OPEN")
        const totalByType: Record<string, number> = {margherita: 0, piccante: 0, marinara: 0}
        let totalSlices = 0

        for (const o of openOrders) {
            totalByType.margherita += o.margherita
            totalByType.piccante += o.piccante
            totalByType.marinara += o.marinara
            totalSlices += o.margherita + o.piccante + o.marinara
        }
        return {totalSlices, totalByType}
    }, [orders])

    const distributeToOvens = useCallback(
        (slicesByType: Record<string, number>): [Record<string, number>, Record<string, number>] => {
            const oven1: Record<string, number> = {}
            const oven2: Record<string, number> = {}
            let oven1Count = 0, oven2Count = 0

            const sorted = Object.entries(slicesByType).sort((a, b) => b[1] - a[1])

            for (const [type, count] of sorted) {
                if (count <= 8) {
                    if (oven1Count + count <= 8) {
                        oven1[type] = count;
                        oven1Count += count
                    } else if (oven2Count + count <= 8) {
                        oven2[type] = count;
                        oven2Count += count
                    } else if (oven1Count < 8) {
                        const toOven1 = Math.min(8 - oven1Count, count)
                        oven1[type] = toOven1
                        oven1Count += toOven1
                        const remaining = count - toOven1
                        if (remaining) {
                            oven2[type] = remaining;
                            oven2Count += remaining
                        }
                    } else {
                        oven2[type] = count;
                        oven2Count += count
                    }
                } else {
                    const toOven1 = Math.min(8 - oven1Count, count)
                    if (toOven1) {
                        oven1[type] = toOven1;
                        oven1Count += toOven1
                    }
                    const remaining = count - toOven1
                    if (remaining) {
                        oven2[type] = remaining;
                        oven2Count += remaining
                    }
                }
            }
            return [oven1, oven2]
        }, [])

    const createBatch = useCallback((startIdx: number, sourceOrders?: Order[]): Batch | null => {
        const src = sourceOrders ?? orders
        const open = src.filter(o => o.status === "OPEN")
        if (startIdx >= open.length) return null

        const batchOrders: Order[] = []
        const slices: Record<string, number> = {margherita: 0, piccante: 0, marinara: 0}
        let total = 0, idx = startIdx

        while (idx < open.length) {
            const o = open[idx]
            const sliceCount = o.margherita + o.piccante + o.marinara
            if (total + sliceCount > 16) break
            batchOrders.push(o)
            slices.margherita += o.margherita
            slices.piccante += o.piccante
            slices.marinara += o.marinara
            total += sliceCount
            idx++
        }
        if (!batchOrders.length) return null

        const ovenDistribution = distributeToOvens(slices)
        const capitalised = Object.fromEntries(
            Object.entries(slices).map(([k, v]) => [k.charAt(0).toUpperCase() + k.slice(1), v]),
        )
        return {
            orderNumbers: batchOrders.map(o => o.orderNumber),
            slicesByType: capitalised,
            totalSlices: total,
            ovenDistribution,
            orders: batchOrders,
        }
    }, [orders, distributeToOvens])

    //Main effect: status-sync + fetch + (re)build first batch
    useEffect(() => {
        const fetchOrders = async () => {
            const effectiveStart = startOrderNumber || initialStart
            if (!effectiveStart) return

            const supabase = createClient()

            /* what kind of run is this? */
            const prevVal = prevStartOrderRef.current
            const isManualJump = prevVal !== null && prevVal !== effectiveStart

            /* clear local batch state only when the user jumped */
            if (isManualJump) {
                setCurrentBatch(null)
                setPreviousBatch(null)
                setBatchHistory([])
                localStorage.removeItem("reheat_currentBatch")
                localStorage.removeItem("reheat_previousBatch")
                localStorage.removeItem("reheat_batchHistory")
            }

            /* always bring the DB in sync with effectiveStart */
            await Promise.all([
                supabase.from("orders")
                    .update({status: "PROCESSED"})
                    .lt("order_number", effectiveStart),

                supabase.from("orders")
                    .update({status: "OPEN"})
                    .gte("order_number", effectiveStart),
            ])

            prevStartOrderRef.current = effectiveStart

            /* fetch fresh orders */
            setIsLoading(true)
            const {data, error} = await supabase
                .from("orders")
                .select("*")
                .gte("order_number", effectiveStart)
                .order("order_number", {ascending: true})

            if (error) {
                toast({
                    title: "Error",
                    description: "Error fetching orders: " + error.message,
                    variant: "destructive",
                })
                setIsLoading(false)
                return
            }

            const formatted: Order[] = (data ?? []).map((o: any) => ({
                id: o.id,
                orderNumber: o.order_number,
                margherita: o.slices_margherita || 0,
                piccante: o.slices_piccante || 0,
                marinara: o.slices_marinara || 0,
                status: o.status,
            }))
            setOrders(formatted)
            setIsLoading(false)

            /* always (re)build the first batch from fresh data */
            const first = createBatch(0, formatted)
            if (first) {
                setCurrentBatch(first)

                const open = formatted.filter(o => o.status === "OPEN")
                const last = first.orders[first.orders.length - 1]
                const idx = open.findIndex(o => o.orderNumber === last.orderNumber)
                setLastProcessedOrderIndex(idx !== -1 ? idx : -1)
            } else {
                setLastProcessedOrderIndex(-1)
            }
        }

        fetchOrders()
    }, [startOrderNumber, initialStart])          //  ← no createBatch here

    //Persist batches whenever they change
    useEffect(() => {
        if (currentBatch) localStorage.setItem("reheat_currentBatch", JSON.stringify(currentBatch))
        if (previousBatch) localStorage.setItem("reheat_previousBatch", JSON.stringify(previousBatch))
        localStorage.setItem("reheat_batchHistory", JSON.stringify(batchHistory))
    }, [currentBatch, previousBatch, batchHistory])

    // Next / Previous batch functions
    const loadNextBatch = useCallback(async () => {
        setIsLoading(true)
        const supabase = createClient()

        /* if we already have a current batch, finalise it first */
        if (currentBatch) {
            setPreviousBatch(currentBatch)
            setBatchHistory(prev => [...prev, currentBatch])

            const {error} = await supabase
                .from("orders")
                .update({status: "PROCESSED"})
                .in("order_number", currentBatch.orderNumbers)

            if (error) {
                toast({
                    title: "Error",
                    description: "Error updating order status: " + error.message,
                    variant: "destructive",
                })
                setIsLoading(false)
                return
            }

            setOrders(prev =>
                prev.map(o =>
                    currentBatch.orderNumbers.includes(o.orderNumber)
                        ? {...o, status: "PROCESSED"}
                        : o,
                ),
            )
        }

        /* build next batch from fresh OPEN orders */
        const openAfterProcess = orders.map(o =>
            currentBatch?.orderNumbers.includes(o.orderNumber)
                ? {...o, status: "PROCESSED" as "PROCESSED"}
                : o,
        )

        const next = createBatch(0, openAfterProcess)

        if (next) {
            const openOrders = openAfterProcess.filter(o => o.status === "OPEN")
            const last = next.orders[next.orders.length - 1]
            const idx = openOrders.findIndex(o => o.orderNumber === last.orderNumber)
            setLastProcessedOrderIndex(idx !== -1 ? idx : -1)
            setCurrentBatch(next)
        }
        setIsLoading(false)
    }, [currentBatch, orders, createBatch])

    const loadPreviousBatch = useCallback(async () => {
        if (!previousBatch) return

        const supabase = createClient()
        const {error} = await supabase
            .from("orders")
            .update({status: "OPEN"})
            .in("order_number", previousBatch.orderNumbers)

        if (error) {
            toast({
                title: "Error",
                description: "Error updating order status: " + error.message,
                variant: "destructive",
            })
            return
        }

        setOrders(prev =>
            prev.map(o =>
                previousBatch.orderNumbers.includes(o.orderNumber)
                    ? {...o, status: "OPEN"}
                    : o,
            ),
        )

        setCurrentBatch(previousBatch)
        const newHistory = batchHistory.slice(0, -1)
        setBatchHistory(newHistory)
        setPreviousBatch(newHistory.length ? newHistory[newHistory.length - 1] : null)

        if (newHistory.length) {
            const lastBatch = newHistory[newHistory.length - 1]
            const openOrders = orders.filter(
                o => !previousBatch.orderNumbers.includes(o.orderNumber) && o.status === "OPEN",
            )
            const last = lastBatch.orders[lastBatch.orders.length - 1]
            const idx = openOrders.findIndex(o => o.orderNumber === last.orderNumber)
            setLastProcessedOrderIndex(idx !== -1 ? idx : -1)
        } else {
            setLastProcessedOrderIndex(-1)
        }
    }, [previousBatch, batchHistory, orders])

    return {
        currentBatch,
        previousBatch,
        loadNextBatch,
        loadPreviousBatch,
        allOpenOrdersInfo: allOpenOrdersInfo(),
        isLoading,
        hasPreviousBatch: previousBatch !== null,
    }
}