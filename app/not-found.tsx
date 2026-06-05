import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="text-center max-w-sm">
        <div className="text-6xl font-bold text-blue-200 mb-4">404</div>
        <h1 className="text-xl font-semibold text-gray-800 mb-2">Page Not Found</h1>
        <p className="text-gray-500 text-sm mb-6">
          The page you are looking for does not exist or has been moved.
        </p>
        <Link
          href="/dashboard"
          className="inline-block px-5 py-2 text-sm font-semibold bg-blue-700 text-white rounded-lg hover:bg-blue-800"
        >
          Back to Dashboard
        </Link>
      </div>
    </div>
  )
}
