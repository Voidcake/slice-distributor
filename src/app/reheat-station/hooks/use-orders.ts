"use client"

import {useCallback, useEffect, useRef, useState} from "react"
import {useToast} from "@/hooks/use-toast"
import {createClient} from "@/utils/supabase/client"
import {createBatch, mapOrderRow, PIZZA_TYPES, type Batch, type OrderRow} from "@/domain/orders"

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
            for (const type of PIZZA_TYPES) {
                totalByType[type] += o[type]
                totalSlices += o[type]
            }
        }
        return {totalSlices, totalByType}
    }, [orders])

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

            const formatted = (data ?? []).map((order) => mapOrderRow(order as OrderRow))
            setOrders(formatted)
            setIsLoading(false)

            /* always (re)build the first batch from fresh data */
            const first = createBatch(formatted)
            if (first) {
                setCurrentBatch(first)
            } else {
                setCurrentBatch(null)
            }
        }

        fetchOrders()
    }, [startOrderNumber, initialStart])

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

      // 1. Finalize current batch on the server
      if (currentBatch) {
        setPreviousBatch(currentBatch)
        setBatchHistory(prev => [...prev, currentBatch])

        const { error: updateError } = await supabase
          .from("orders")
          .update({ status: "PROCESSED" })
          .in("order_number", currentBatch.orderNumbers)

        if (updateError) {
          toast({
            title: "Error",
            description: "Error updating order status: " + updateError.message,
            variant: "destructive",
          })
          setIsLoading(false)
          return
        }
      }

      // 2. Re-fetch all orders >= the effective start so we pick up new ones
      const effectiveStart = prevStartOrderRef.current ?? ""
      const { data, error: fetchError } = await supabase
        .from("orders")
        .select("*")
        .gte("order_number", effectiveStart)
        .order("order_number", { ascending: true })

      if (fetchError) {
        toast({
          title: "Error",
          description: "Error fetching orders: " + fetchError.message,
          variant: "destructive",
        })
        setIsLoading(false)
        return
      }

      // 3. Map and store fetched orders
      const refreshed = (data ?? []).map((order) => mapOrderRow(order as OrderRow))
      setOrders(refreshed)

      // 4. Build the next batch from the fresh data
      const next = createBatch(refreshed)
      if (next) {
        setCurrentBatch(next)
      } else {
        setCurrentBatch(null)
      }

      setIsLoading(false)
    }, [currentBatch, createBatch, orders])

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

    }, [previousBatch, batchHistory])

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
