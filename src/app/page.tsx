
"use client"; // Keep this if other parts of Home might need client context, or remove if QuillFlowAppWithNoSSR is the only thing.
                // For this specific case, dynamic import with ssr:false usually handles client-only needs well.
                // Let's assume for now that client context might be useful or other components could be added.

import dynamic from 'next/dynamic';
import { Skeleton } from '@/components/ui/skeleton'; // Using Skeleton for a better loading UX

// Define a more structured loading component
const QuillFlowLoadingSkeleton = () => (
  <div className="flex-1 flex flex-col h-screen">
    {/* Skeleton for Sidebar */}
    <div className="flex h-full">
      <div className="w-64 p-4 border-r space-y-4 hidden md:block">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-8 w-3/4" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-8 w-3/4 mt-4" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-8 w-3/4 mt-4" />
        <Skeleton className="h-20 w-full" />
      </div>
      {/* Skeleton for Main Content Area */}
      <div className="flex-1 p-6 space-y-4">
        <Skeleton className="h-12 w-1/2" /> {/* Title */}
        <Skeleton className="h-8 w-full" /> {/* Toolbar */}
        <Skeleton className="h-64 w-full" /> {/* Editor Area */}
        <Skeleton className="h-10 w-1/4 mt-4" /> {/* AI Button */}
      </div>
    </div>
  </div>
);

const QuillFlowAppWithNoSSR = dynamic(() => import('@/components/quillflow/QuillFlowApp'), {
  ssr: false,
  loading: () => <QuillFlowLoadingSkeleton />,
});

export default function Home() {
  return (
    <main className="flex-1 flex flex-col">
      <QuillFlowAppWithNoSSR />
    </main>
  );
}
