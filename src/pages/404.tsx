import Link from 'next/link';
import { useEffect } from 'react';
import { useRouter } from 'next/router';

const NotFoundPage = () => {
  const router = useRouter();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      router.asPath,
    );
  }, [router.asPath]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="text-center">
        <h1 className="text-4xl font-thin mb-4">404</h1>
        <p className="text-xl text-gray-600 mb-4 font-normal">Oops! Page not found</p>
        <Link href="/" className="text-blue-500 hover:text-blue-700 underline">
          Return to Home
        </Link>
      </div>
    </div>
  );
};

export default NotFoundPage;