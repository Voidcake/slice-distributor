"use client"

import {useCallback, useEffect, useMemo, useRef, useState} from "react"
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

    const [initialStart, setInitialStart] = useState<string | null>(null)

    const prevStartOrderRef = useRef<string | null>(null)
    const bootstrappedRef = useRef(false)
    const refreshRequestRef = useRef(0)
    const {toast} = useToast()
    const supabase = useMemo(() => createClient(), [])

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

    // Restore persisted batch state on first mount.
    useEffect(() => {
        if (bootstrappedRef.current) return
        bootstrappedRef.current = true

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
    }, [])

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

    const refreshOpenOrders = useCallback(async () => {
        const requestId = ++refreshRequestRef.current
        const {data, error} = await supabase
            .from("orders")
            .select("*")
            .eq("status", "OPEN")
            .order("created_at", {ascending: true})

        if (requestId !== refreshRequestRef.current) return false

        if (error) {
            toast({
                title: "Unable to refresh orders",
                description: error.message,
                variant: "destructive",
            })
            return false
        }

        const refreshed = (data ?? []).map((order) => mapOrderRow(order as OrderRow))
        setOrders(refreshed)
        setCurrentBatch(buildBatch(refreshed))
        return true
    }, [buildBatch, supabase, toast])

    const retryRefresh = useCallback(async () => {
        setIsLoading(true)
        const refreshed = await refreshOpenOrders()
        setIsLoading(false)
        return refreshed
    }, [refreshOpenOrders])

    //Main effect: status-sync + fetch + (re)build first batch
    useEffect(() => {
        const fetchOrders = async () => {
            const effectiveStart = startOrderNumber || initialStart
            if (!effectiveStart) return

            const prevVal = prevStartOrderRef.current
            const isManualJump = prevVal !== null && prevVal !== effectiveStart

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

            await refreshOpenOrders()
            setIsLoading(false)
        }

        fetchOrders()
    }, [startOrderNumber, initialStart, refreshOpenOrders, supabase, toast])

    useEffect(() => {
        const channel = supabase
            .channel("reheat-orders-realtime")
            .on(
                "postgres_changes",
                {event: "*", schema: "public", table: "orders"},
                () => {
                    if (prevStartOrderRef.current) void refreshOpenOrders()
                },
            )
            .subscribe()

        return () => {
            refreshRequestRef.current += 1
            void supabase.removeChannel(channel)
        }
    }, [refreshOpenOrders, supabase])

    // Persist batches whenever they change.
    useEffect(() => {
        if (currentBatch) localStorage.setItem("reheat_currentBatch", JSON.stringify(currentBatch))
        else localStorage.removeItem("reheat_currentBatch")
        if (previousBatch) localStorage.setItem("reheat_previousBatch", JSON.stringify(previousBatch))
        else localStorage.removeItem("reheat_previousBatch")
        localStorage.setItem("reheat_batchHistory", JSON.stringify(batchHistory))
    }, [currentBatch, previousBatch, batchHistory])

    const loadNextBatch = useCallback(async () => {
      setIsLoading(true)

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

      const refreshed = await refreshOpenOrders()
      setIsLoading(false)
      return refreshed
    }, [currentBatch, refreshOpenOrders, supabase, toast])

    const loadPreviousBatch = useCallback(async () => {
        if (!previousBatch) return false

        setIsLoading(true)
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
    }, [previousBatch, batchHistory, supabase, toast])

    const resetStation = useCallback(async () => {
        setIsLoading(true)
        const previousStart = prevStartOrderRef.current
        prevStartOrderRef.current = null
        const {error} = await supabase.rpc("reset_reheat_queue", {
            p_start_order_number: "0",
        })

        if (error) {
            prevStartOrderRef.current = previousStart
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
    }, [supabase, toast])

    return {
        currentBatch,
        previousBatch,
        loadNextBatch,
        loadPreviousBatch,
        resetStation,
        retryRefresh,
        allOpenOrdersInfo: allOpenOrdersInfo(),
        isLoading,
        hasPreviousBatch: previousBatch !== null,
    }
}
