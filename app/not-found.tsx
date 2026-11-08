import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
      <h2 className="text-xl font-semibold mb-2">Page Not Found</h2>
      <p className="text-secondary text-sm mb-4">Could not find requested resource.</p>
      <Link href="/" className="px-4 py-2 bg-accent text-white rounded-[8px] text-xs font-medium">
        Return Home
      </Link>
    </div>
  );
}
