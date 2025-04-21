"use client"
import {useRouter} from "next/navigation"
import {z} from "zod"
import {useForm} from "react-hook-form"
import {zodResolver} from "@hookform/resolvers/zod"
import {createClient} from "@/utils/supabase/client"

import {Button} from "@/components/ui/button"
import {Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage} from "@/components/ui/form"
import {Input} from "@/components/ui/input"
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/components/ui/select"
import {useToast} from "@/hooks/use-toast"
import {Minus, Plus} from "lucide-react"
import type {Order} from "./pizza-order-table"

const formSchema = z.object({
    orderNumber: z.string().min(1, "Order number is required"),
    margherita: z.coerce.number().min(0),
    piccante: z.coerce.number().min(0),
    marinara: z.coerce.number().min(0),
    status: z.enum(["OPEN", "PROCESSED"]),
})

type FormValues = z.infer<typeof formSchema>

interface OrderFormProps {
    initialData?: Order
    onSuccess?: () => void
    isDialog?: boolean
    isEditMode?: boolean
}


export function OrderForm({initialData, onSuccess, isDialog = false, isEditMode}: OrderFormProps) {
    const router = useRouter()
    const {toast} = useToast()

    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: initialData || {
            orderNumber: "",
            margherita: 0,
            piccante: 0,
            marinara: 0,
            status: "OPEN",
        },
    })

    const onSubmit = async (values: FormValues) => {
        const supabase = createClient()

        try {
            const {error} = await supabase.from("orders").insert({
                order_number: values.orderNumber,
                slices_margherita: values.margherita,
                slices_piccante: values.piccante,
                slices_marinara: values.marinara,
                status: values.status,
            })
            if (error) {
                toast({
                    title: "Error",
                    description: `Failed to ${isEditMode ? "update" : "create"} the order.`,
                    variant: "destructive",
                })
            }

            toast({
                title: isEditMode ? "Order updated" : "Order created",
                description: `Order ${values.orderNumber} has been ${isEditMode ? "updated" : "created"} successfully.`,
            })

            if (onSuccess) {
                onSuccess()
            } else {
                router.push("/")
                router.refresh()
            }
        } catch (error) {
            toast({
                title: "Error",
                description: `Failed to ${isEditMode ? "update" : "create"} the order.`,
                variant: "destructive",
            })
        }
    }

    const PizzaCounter = ({name, label}: { name: "margherita" | "piccante" | "marinara"; label: string }) => {
        const value = form.watch(name)

        return (
            <FormField
                control={form.control}
                name={name}
                render={({field}) => (
                    <FormItem>
                        <FormLabel>{label}</FormLabel>
                        <div className="flex items-center space-x-2">
                            <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                onClick={() => form.setValue(name, Math.max(0, value - 1))}
                            >
                                <Minus className="h-4 w-4"/>
                            </Button>
                            <FormControl>
                                <Input {...field} type="number" min="0" className="w-20 text-center"/>
                            </FormControl>
                            <Button type="button" variant="outline" size="icon"
                                    onClick={() => form.setValue(name, value + 1)}>
                                <Plus className="h-4 w-4"/>
                            </Button>
                        </div>
                        <FormMessage/>
                    </FormItem>
                )}
            />
        )
    }

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 max-w-md">
                <FormField
                    control={form.control}
                    name="orderNumber"
                    render={({field}) => (
                        <FormItem>
                            <FormLabel>Order Number</FormLabel>
                            <FormControl>
                                <Input {...field} placeholder="Enter a unique order number"/>
                            </FormControl>
                            <FormDescription>This must be a unique order number.</FormDescription>
                            <FormMessage/>
                        </FormItem>
                    )}
                />

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <PizzaCounter name="margherita" label="Margherita"/>
                    <PizzaCounter name="piccante" label="Piccante"/>
                    <PizzaCounter name="marinara" label="Marinara"/>
                </div>

                <FormField
                    control={form.control}
                    name="status"
                    render={({field}) => (
                        <FormItem>
                            <FormLabel>Status</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select a status"/>
                                    </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    <SelectItem value="OPEN">OPEN</SelectItem>
                                    <SelectItem value="PROCESSED">PROCESSED</SelectItem>
                                </SelectContent>
                            </Select>
                            <FormMessage/>
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
    )
}
