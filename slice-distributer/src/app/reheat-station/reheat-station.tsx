"use client"

import type React from "react"
import {useState} from "react"
import {Button} from "@/components/ui/button"
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from "@/components/ui/card"
import {Input} from "@/components/ui/input"
import {Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger} from "@/components/ui/sheet"
import {Badge} from "@/components/ui/badge"
import {ArrowLeftIcon, ArrowRightIcon, InfoIcon} from "lucide-react"
import {PizzaChart} from "./components/pizza-chart"
import {useOrders} from "./hooks/use-orders"
import {PizzaLegend} from "./components/pizza-legend"
import {useToast} from "@/hooks/use-toast"


export default function ReheatStation() {
    const [inputOrderNumber, setInputOrderNumber] = useState("")
    const [startOrderNumber, setStartOrderNumber] = useState<string | null>("001")
    const [isInfoOpen, setIsInfoOpen] = useState(false)

    const {toast} = useToast()

    const {
        currentBatch,
        previousBatch,
        loadNextBatch,
        loadPreviousBatch,
        allOpenOrdersInfo,
        isLoading,
        hasPreviousBatch,
    } = useOrders(startOrderNumber)

    const handleStartNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value
        if (/^\d*$/.test(value)) {
            setInputOrderNumber(value)
        }
    }

    const handleStartBatch = () => {
        if (inputOrderNumber) {
            setStartOrderNumber(inputOrderNumber)
            toast({
                title: "Started Reheating",
                description: `Loading batch starting from order #${inputOrderNumber}`,
            })
        }
    }

    const handleNextBatch = () => {
        loadNextBatch()
        if (currentBatch) {
            toast({
                title: "Batch Successfully Reheated",
                description: `Orders: ${currentBatch.orderNumbers.join(", ")}`,
            })
        }
    }

    const handlePreviousBatch = () => {
        loadPreviousBatch()
        if (previousBatch) {
            toast({
                title: "Returned to Previous Batch",
                description: `Orders: ${previousBatch.orderNumbers.join(", ")}`,
            })
        }
    }

    return (
        <div className="container mx-auto p-4 max-w-6xl">
            <Card className="mb-6">
                <CardHeader className="bg-orange-400">
                    <CardTitle className="text-2xl">Pizza Reheat Station</CardTitle>
                    <CardDescription className="text-l">Manage pizza batches for reheating</CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                    <div className="flex flex-col md:flex-row gap-4 mb-6">
                        <div className="flex gap-2">
                            <Input
                                type="text"
                                placeholder="Start Order #"
                                value={inputOrderNumber}
                                onChange={handleStartNumberChange}
                                className="w-32"
                            />
                            <Button onClick={handleStartBatch}>Start</Button>
                        </div>
                        <div className="flex gap-2">
                            <Button variant="outline" onClick={handlePreviousBatch}
                                    disabled={!hasPreviousBatch || currentBatch?.orderNumbers.includes("001")}>
                                <ArrowLeftIcon className="mr-2 h-4 w-4"/>
                                Previous Batch
                            </Button>
                            <Button onClick={handleNextBatch} disabled={isLoading}>
                                Next Batch
                                <ArrowRightIcon className="ml-2 h-4 w-4"/>
                            </Button>
                        </div>
                        <Sheet open={isInfoOpen} onOpenChange={setIsInfoOpen}>
                            <SheetTrigger asChild>
                                <Button variant="secondary">
                                    <InfoIcon className="mr-2 h-4 w-4"/>
                                    Open Orders Info
                                </Button>
                            </SheetTrigger>
                            <SheetContent className="w-[400px] sm:w-[540px]">
                                <SheetHeader>
                                    <SheetTitle>All Open Orders Overview</SheetTitle>
                                    <SheetDescription>Total slice counts for all *open* orders</SheetDescription>
                                </SheetHeader>
                                <div className="mt-6">
                                    {allOpenOrdersInfo && (
                                        <div className="space-y-6">
                                            {Object.entries(allOpenOrdersInfo.totalByType).map(([type, count]) => (
                                                <div key={type} className="space-y-2">
                                                    <div className="flex justify-between items-center">
                                                        <h3 className="font-medium">{type.charAt(0).toUpperCase() + type.slice(1)}</h3>
                                                        <Badge variant="outline">{count} slices</Badge>
                                                    </div>
                                                    <div className="text-sm font-medium text-right">
                                                        {`${Math.floor(count / 8)} Pizzas${count % 8 ? ` + ${count % 8} Slices` : ""}`}
                                                    </div>
                                                </div>
                                            ))}
                                            <div className="pt-4 border-t">
                                                <div className="flex justify-between font-medium">
                                                    <span>Total Slices:</span>
                                                    <span>{allOpenOrdersInfo.totalSlices}</span>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </SheetContent>
                        </Sheet>
                    </div>

                    {currentBatch ? (
                        <div className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <Card>
                                    <CardHeader>
                                        <CardTitle>Current Batch</CardTitle>
                                        <CardDescription>Orders: {currentBatch.orderNumbers.join(", ")}</CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="space-y-4">
                                            <h3 className="font-medium">Slice Count by Type</h3>
                                            <div className="space-y-2">
                                                {Object.entries(currentBatch.slicesByType).map(([type, count]) => (
                                                    <div key={type} className="flex justify-between items-center">
                                                        <span>{type}</span>
                                                        <Badge variant="outline">{count} slices</Badge>
                                                    </div>
                                                ))}
                                            </div>
                                            <div className="pt-2 border-t mt-4">
                                                <div className="flex justify-between font-medium">
                                                    <span>Total Slices:</span>
                                                    <span>{currentBatch.totalSlices}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>

                                <Card>
                                    <CardHeader>
                                        <CardTitle>Oven Layout</CardTitle>
                                        <CardDescription>Distribution of pizzas in ovens</CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div>
                                                <h3 className="text-center font-medium mb-2">Oven 1</h3>
                                                <PizzaChart slicesByType={currentBatch.ovenDistribution[0]}/>
                                            </div>
                                            <div>
                                                <h3 className="text-center font-medium mb-2">Oven 2</h3>
                                                <PizzaChart slicesByType={currentBatch.ovenDistribution[1]}/>
                                            </div>
                                        </div>
                                        {/* Shared legend for both ovens */}
                                        <PizzaLegend
                                            slicesByType={[currentBatch.ovenDistribution[0], currentBatch.ovenDistribution[1]]}/>
                                    </CardContent>
                                </Card>
                            </div>
                        </div>
                    ) : (
                        <div className="text-center py-12 text-muted-foreground">
                            {isLoading ? (
                                <p>Loading batch data...</p>
                            ) : (
                                <p>Enter a starting order number and click "Start" to begin</p>
                            )}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
