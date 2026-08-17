import Link from "next/link";
import Logo from "@/components/logo";

export default function Dashboard() {
  return (
    <div className="flex-grow flex flex-col items-center justify-center px-4 text-center py-6">
      <Logo tailwindClass="h-32" />
      <h1 className="text-3xl sm:text-4xl font-bold">Welcome to Slice Distributor</h1>
      <p className="text-base sm:text-lg text-gray-600 mt-4">
        Choose the station you are operating.
      </p>
      <div className="flex flex-col sm:flex-row gap-4 mt-6 w-full sm:w-auto items-center">
        <Link href="/POS">
          <button className="w-full sm:w-auto px-4 py-2 bg-blue-900 text-white rounded hover:bg-blue-950">
            POS/Cashier
          </button>
        </Link>
        <Link href="/reheat-station">
          <button className="w-full sm:w-auto px-4 py-2 bg-red-500 bg-opacity-75 text-white rounded hover:bg-red-600">
            Reheat Station
          </button>
        </Link>
      </div>
    </div>
  );
}
