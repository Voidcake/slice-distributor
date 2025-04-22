"use client"

import {useCallback, useEffect, useState, useRef} from "react"
import {useToast} from "@/hooks/use-toast"
import {createClient} from "@/utils/supabase/client"

// Types
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
    const [lastProcessedOrderIndex, setLastProcessedOrderIndex] = useState<number>(-1)

    const {toast} = useToast()
    const prevStartOrderRef = useRef<string | null>(null);

    useEffect(() => {
        const fetchOrders = async () => {
            if (!startOrderNumber) return

            const supabase = createClient()

            // Handle manual start-point jumps
            if (prevStartOrderRef.current) {
                const prevNum = parseInt(prevStartOrderRef.current, 10)
                const newNum = parseInt(startOrderNumber, 10)
                if (newNum > prevNum) {
                    // Forward jump: mark all orders before the new start as PROCESSED
                    const { error: updateError } = await supabase
                        .from("orders")
                        .update({ status: "PROCESSED" })
                        .lt("order_number", startOrderNumber)
                    if (updateError) {
                        toast({
                            title: "Error",
                            description: "Error updating orders to PROCESSED: " + updateError.message,
                            variant: "destructive",
                        })
                    }
                } else if (newNum < prevNum) {
                    //Clear current batch from local storage and state
                    setCurrentBatch(null)
                    localStorage.removeItem("reheat_currentBatch")

                    // Backward jump: reopen orders from the new start onward as OPEN
                    const { error: updateError } = await supabase
                        .from("orders")
                        .update({ status: "OPEN" })
                        .gte("order_number", startOrderNumber)
                    if (updateError) {
                        toast({
                            title: "Error",
                            description: "Error updating orders to OPEN: " + updateError.message,
                            variant: "destructive",
                        })
                    }
                }
            }
            // Remember this start for the next comparison
            prevStartOrderRef.current = startOrderNumber

            const storedCurrent = localStorage.getItem("reheat_currentBatch");
            const storedHistory = localStorage.getItem("reheat_batchHistory");

            if (storedCurrent) {
                const parsedCurrent = JSON.parse(storedCurrent);
                setCurrentBatch(parsedCurrent);
            }

            if (storedHistory) {
                const parsedHistory = JSON.parse(storedHistory);
                setBatchHistory(parsedHistory);
                const last = parsedHistory.length > 0 ? parsedHistory[parsedHistory.length - 1] : null;
                setPreviousBatch(last);
            }

            setIsLoading(true)

            const {data, error} = await supabase
                .from("orders")
                .select("*")
                .gte("order_number", startOrderNumber)
                .order("order_number", {ascending: true})

            if (error) {
                toast({
                    title: "Error",
                    description: "Error fetching orders: " + error.message,
                    variant: "destructive",
                });
                setIsLoading(false)
                return
            }

            if (data) {
                const formattedOrders: Order[] = data.map((order: any) => ({
                    id: order.id,
                    orderNumber: order.order_number,
                    margherita: order.slices_margherita || 0,
                    piccante: order.slices_piccante || 0,
                    marinara: order.slices_marinara || 0,
                    status: order.status,
                }))
                setOrders(formattedOrders)
            }
            setIsLoading(false)
        }
        fetchOrders()
    }, [startOrderNumber])

    useEffect(() => {
        if (currentBatch) {
            localStorage.setItem("reheat_currentBatch", JSON.stringify(currentBatch));
        }
        if (previousBatch) {
            localStorage.setItem("reheat_previousBatch", JSON.stringify(previousBatch));
        }
        localStorage.setItem("reheat_batchHistory", JSON.stringify(batchHistory));
    }, [currentBatch, previousBatch, batchHistory])


    // Calculate all open orders info
    const allOpenOrdersInfo = useCallback((): OpenOrdersInfo => {
        const openOrders = orders.filter((order) => order.status === "OPEN")
        const totalByType: Record<string, number> = {margherita: 0, piccante: 0, marinara: 0}
        let totalSlices = 0

        for (const order of openOrders) {
            totalByType.margherita += order.margherita
            totalByType.piccante += order.piccante
            totalByType.marinara += order.marinara
            totalSlices += order.margherita + order.piccante + order.marinara
        }

        return {totalSlices, totalByType}
    }, [orders])

    // Distribute slices between two ovens with a maximum of 8 slices per oven
    const distributeToOvens = useCallback((slicesByType: Record<string, number>): [Record<string, number>, Record<string, number>] => {
        const oven1: Record<string, number> = {}
        const oven2: Record<string, number> = {}
        let oven1Count = 0
        let oven2Count = 0

        // Step 1: Sort pizza types by slice count in descending order
        // This ensures we handle the largest slice types first
        const sortedTypes = Object.entries(slicesByType).sort((a, b) => b[1] - a[1])

        for (const [type, count] of sortedTypes) {
            // Step 2: If the slice count is 8 or fewer, try to fit it into one oven
            if (count <= 8) {
                // Prefer oven1 if there's space
                if (oven1Count + count <= 8) {
                    oven1[type] = count
                    oven1Count += count
                }
                // If not, try oven2
                else if (oven2Count + count <= 8) {
                    oven2[type] = count
                    oven2Count += count
                }
                // If it doesn't fit entirely in either oven, split between both
                else if (oven1Count < 8) {
                    const toOven1 = Math.min(8 - oven1Count, count)
                    oven1[type] = toOven1
                    oven1Count += toOven1

                    const remaining = count - toOven1
                    if (remaining > 0) {
                        oven2[type] = remaining
                        oven2Count += remaining
                    }
                }
                // If oven1 is full, just drop it into oven2 (could overflow slightly if logic fails)
                else {
                    oven2[type] = count
                    oven2Count += count
                }
            }
            // Step 3: If more than 8 slices, force a split
            else {
                const toOven1 = Math.min(8 - oven1Count, count)
                if (toOven1 > 0) {
                    oven1[type] = toOven1
                    oven1Count += toOven1
                }

                const remaining = count - toOven1
                if (remaining > 0) {
                    oven2[type] = remaining
                    oven2Count += remaining
                }
            }
        }

        return [oven1, oven2]
    }, [])

    // Create a batch from open orders
    const createBatch = useCallback((startIndex: number, ordersOverride?: Order[]): Batch | null => {
        const sourceOrders = ordersOverride ?? orders;
        const openOrders = sourceOrders.filter((order) => order.status === "OPEN")
        if (startIndex >= openOrders.length) return null

        const batchOrders: Order[] = []
        const slicesByType: Record<string, number> = { margherita: 0, piccante: 0, marinara: 0 }
        let totalSlices = 0
        let currentIndex = startIndex

        while (currentIndex < openOrders.length) {
            const order = openOrders[currentIndex]
            const orderSlices = order.margherita + order.piccante + order.marinara
            if (totalSlices + orderSlices > 16) break

            batchOrders.push(order)
            slicesByType.margherita += order.margherita
            slicesByType.piccante += order.piccante
            slicesByType.marinara += order.marinara
            totalSlices += orderSlices
            currentIndex++
        }

        if (batchOrders.length === 0) return null

        const ovenDistribution = distributeToOvens(slicesByType)

        // Capitalize keys of slicesByType
        const capitalizedSlicesByType = Object.fromEntries(
            Object.entries(slicesByType).map(([key, value]) => [key.charAt(0).toUpperCase() + key.slice(1), value])
        )

        return {
            orderNumbers: batchOrders.map((order) => order.orderNumber),
            slicesByType: capitalizedSlicesByType,
            totalSlices,
            ovenDistribution,
            orders: batchOrders,
        }
    }, [orders, distributeToOvens])

    // Load the next batch
    const loadNextBatch = useCallback(async () => {
        setIsLoading(true)

        const startIndex = 0 // Always start from the top

        if (currentBatch) {
            setPreviousBatch(currentBatch)
            setBatchHistory((prev) => [...prev, currentBatch])

            // Mark previous batch as PROCESSED in Supabase and local state
            const supabase = createClient()
            const { error } = await supabase
                .from("orders")
                .update({ status: "PROCESSED" })
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

            setOrders((prevOrders) =>
                prevOrders.map((order) =>
                    currentBatch.orderNumbers.includes(order.orderNumber)
                        ? { ...order, status: "PROCESSED" }
                        : order
                )
            )

            const updatedOpenOrders = orders.map((order) =>
                currentBatch.orderNumbers.includes(order.orderNumber)
                    ? { ...order, status: "PROCESSED" }
                    : order
            )
            const nextBatch = createBatch(startIndex, updatedOpenOrders)

            if (!nextBatch) {
                setIsLoading(false)
                return
            }

            const openOrders = updatedOpenOrders.filter((order) => order.status === "OPEN")
            const lastProcessedOrder = nextBatch.orders[nextBatch.orders.length - 1]
            const lastProcessedIndex = openOrders.findIndex((order) => order.orderNumber === lastProcessedOrder.orderNumber)

            setLastProcessedOrderIndex(lastProcessedIndex !== -1 ? lastProcessedIndex : -1)

            setCurrentBatch(nextBatch)
            setIsLoading(false)
            return
        }

        // If no current batch
        const nextBatch = createBatch(startIndex)

        if (!nextBatch) {
            setIsLoading(false)
            return
        }

        const openOrders = orders.filter((order) => order.status === "OPEN")
        const lastProcessedOrder = nextBatch.orders[nextBatch.orders.length - 1]
        const lastProcessedIndex = openOrders.findIndex((order) => order.orderNumber === lastProcessedOrder.orderNumber)

        setLastProcessedOrderIndex(lastProcessedIndex !== -1 ? lastProcessedIndex : -1)

        setCurrentBatch(nextBatch)
        setIsLoading(false)
    }, [currentBatch, orders, createBatch])

    // Load the previous batch
    const loadPreviousBatch = useCallback(async () => {
        if (!previousBatch) return

        const supabase = createClient()
        const { error } = await supabase
            .from("orders")
            .update({ status: "OPEN" })
            .in("order_number", previousBatch.orderNumbers)

        if (error) {
            toast({
                title: "Error",
                description: "Error updating order status: " + error.message,
                variant: "destructive",
            })
            return
        }

        setOrders((prevOrders) =>
            prevOrders.map((order) =>
                previousBatch.orderNumbers.includes(order.orderNumber)
                    ? { ...order, status: "OPEN" }
                    : order
            )
        )

        setCurrentBatch(previousBatch)

        const newHistory = batchHistory.slice(0, -1)
        setBatchHistory(newHistory)
        setPreviousBatch(newHistory.length ? newHistory[newHistory.length - 1] : null)

        if (newHistory.length > 0) {
            const lastBatch = newHistory[newHistory.length - 1]
            const openOrders = orders.filter(
                (order) => !previousBatch.orderNumbers.includes(order.orderNumber) && order.status === "OPEN"
            )
            const lastProcessedOrder = lastBatch.orders[lastBatch.orders.length - 1]
            const lastProcessedIndex = openOrders.findIndex(
                (order) => order.orderNumber === lastProcessedOrder.orderNumber
            )

            setLastProcessedOrderIndex(lastProcessedIndex !== -1 ? lastProcessedIndex : -1)
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
