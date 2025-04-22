import Link from 'next/link';

export default async function dashboard() {
    return (
        <div className="flex-grow flex flex-col items-center justify-center px-4 text-center py-6">
            <h1 className="text-3xl sm:text-4xl font-bold">Welcome to Slice Distributer</h1>
            <p className="text-base sm:text-lg text-gray-600 mt-4">
                You have successfully logged in. Please choose your Role/Station!
            </p>
            <div className="flex flex-col sm:flex-row gap-4 mt-6 w-full sm:w-auto items-center">
                <Link href="/POS">
                    <button className="w-full sm:w-auto px-4 py-2 bg-green-500 text-white rounded hover:bg-green-700">
                        POS/Cashier
                    </button>
                </Link>
                <Link href="/reheat-station">
                    <button className="w-full sm:w-auto px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600">
                        Reheat Station
                    </button>
                </Link>
            </div>
        </div>
    );
}