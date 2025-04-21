import Link from 'next/link';

export default async function dashboard() {
    return (
        <div className="flex flex-col items-center justify-center h-screen">
            <h1 className="text-4xl font-bold">Welcome to Slice Distributer</h1>
            <p className="text-lg text-gray-600 mt-4">
                You have successfully logged in. Please choose your Role/Station!
            </p>
            <div className="flex gap-4 mt-6">
                <Link href="/POS">
                    <button className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700">
                        POS/Cashier
                    </button>
                </Link>
                <Link href="/reheat-station">
                    <button className="px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600">
                        Reheat Station
                    </button>
                </Link>
            </div>
        </div>
    );
}