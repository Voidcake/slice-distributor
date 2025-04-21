import {PizzaOrderTable} from "./components/pizza-order-table"

export default function POS() {
    return (
        <div className="container mx-auto py-10">
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-bold mb-4">Pizza POS</h1>
            </div>
            <PizzaOrderTable/>
        </div>
    )
}
