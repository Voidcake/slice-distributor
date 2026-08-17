"use client"

import {useCallback, useEffect, useRef, useState} from "react"
import {useToast} from "@/hooks/use-toast"
import {createClient} from "@/utils/supabase/client"
import {createBatch, mapOrderRow, PIZZA_TYPES, type Batch, type Order, type OrderRow} from "@/domain/orders"

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

    const buildBatch = useCallback((sourceOrders: Order[]) => {
        try {
            return createBatch(sourceOrders)
        } catch (error) {
            toast({
                title: "Cannot create reheat batch",
                description: error instanceof Error ? error.message : "An order contains an invalid slice count.",
                variant: "destructive",
            })
            return null
        }
    }, [toast])

    //Bootstrap: read any persisted batch & history on first mount
    useEffect(() => {
        if (bootstrapped) return
        setBootstrapped(true)

        try {
            const storedCurrent = localStorage.getItem("reheat_currentBatch")
            const storedPrevious = localStorage.getItem("reheat_previousBatch")
            const storedHistory = localStorage.getItem("reheat_batchHistory")

            if (storedCurrent) {
                const batch = JSON.parse(storedCurrent) as Batch
                setCurrentBatch(batch)
                if (batch.orderNumbers.length) {
                    setInitialStart(batch.orderNumbers[0])
                }
            }
            if (storedPrevious) setPreviousBatch(JSON.parse(storedPrevious))
            if (storedHistory) setBatchHistory(JSON.parse(storedHistory))
        } catch {
            localStorage.removeItem("reheat_currentBatch")
            localStorage.removeItem("reheat_previousBatch")
            localStorage.removeItem("reheat_batchHistory")
        }
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

            setIsLoading(true)

            const {error: statusError} = await supabase.rpc("reset_reheat_queue", {
                p_start_order_number: effectiveStart,
            })
            if (statusError) {
                toast({
                    title: "Unable to start reheat station",
                    description: statusError.message,
                    variant: "destructive",
                })
                setIsLoading(false)
                return
            }

            prevStartOrderRef.current = effectiveStart

            /* fetch fresh orders */
            const {data, error} = await supabase
                .from("orders")
                .select("*")
                .eq("status", "OPEN")
                .order("created_at", {ascending: true})

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
            const first = buildBatch(formatted)
            if (first) {
                setCurrentBatch(first)
            } else {
                setCurrentBatch(null)
            }
        }

        fetchOrders()
    }, [startOrderNumber, initialStart, buildBatch, toast])

    //Persist batches whenever they change
    useEffect(() => {
        if (currentBatch) localStorage.setItem("reheat_currentBatch", JSON.stringify(currentBatch))
        else localStorage.removeItem("reheat_currentBatch")
        if (previousBatch) localStorage.setItem("reheat_previousBatch", JSON.stringify(previousBatch))
        else localStorage.removeItem("reheat_previousBatch")
        localStorage.setItem("reheat_batchHistory", JSON.stringify(batchHistory))
    }, [currentBatch, previousBatch, batchHistory])

    // Next / Previous batch functions
    const loadNextBatch = useCallback(async () => {
      setIsLoading(true)
      const supabase = createClient()

      // 1. Finalize current batch on the server
      if (currentBatch) {
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
          return false
        }

        setPreviousBatch(currentBatch)
        setBatchHistory(prev => [...prev, currentBatch])
      }

      // 2. Re-fetch all orders >= the effective start so we pick up new ones
      const { data, error: fetchError } = await supabase
        .from("orders")
        .select("*")
        .eq("status", "OPEN")
        .order("created_at", { ascending: true })

      if (fetchError) {
        toast({
          title: "Error",
          description: "Error fetching orders: " + fetchError.message,
          variant: "destructive",
        })
        setIsLoading(false)
        return false
      }

      // 3. Map and store fetched orders
      const refreshed = (data ?? []).map((order) => mapOrderRow(order as OrderRow))
      setOrders(refreshed)

      // 4. Build the next batch from the fresh data
      const next = buildBatch(refreshed)
      if (next) {
        setCurrentBatch(next)
      } else {
        setCurrentBatch(null)
      }

      setIsLoading(false)
      return true
    }, [currentBatch, buildBatch, toast])

    const loadPreviousBatch = useCallback(async () => {
        if (!previousBatch) return false

        setIsLoading(true)
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
            setIsLoading(false)
            return false
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
        setIsLoading(false)
        return true
    }, [previousBatch, batchHistory, toast])

    const resetStation = useCallback(async () => {
        setIsLoading(true)
        const supabase = createClient()
        const {error} = await supabase.rpc("reset_reheat_queue", {
            p_start_order_number: "0",
        })

        if (error) {
            toast({
                title: "Unable to reset reheat station",
                description: error.message,
                variant: "destructive",
            })
            setIsLoading(false)
            return false
        }

        setOrders([])
        setCurrentBatch(null)
        setPreviousBatch(null)
        setBatchHistory([])
        setInitialStart(null)
        prevStartOrderRef.current = null
        localStorage.removeItem("reheat_currentBatch")
        localStorage.removeItem("reheat_previousBatch")
        localStorage.removeItem("reheat_batchHistory")
        setIsLoading(false)
        return true
    }, [toast])

    return {
        currentBatch,
        previousBatch,
        loadNextBatch,
        loadPreviousBatch,
        resetStation,
        allOpenOrdersInfo: allOpenOrdersInfo(),
        isLoading,
        hasPreviousBatch: previousBatch !== null,
    }
}
