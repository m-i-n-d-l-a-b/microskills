import { cn } from "@/lib/utils";

interface SkeletonProps {
	className?: string;
}

export const Skeleton = ({ className }: SkeletonProps) => {
	return (
		<div
			className={cn(
				"animate-pulse rounded-md bg-gradient-to-r from-muted/50 via-muted to-muted/50 bg-[length:200%_100%]",
				className,
			)}
			style={{
				animation: "shimmer 2s infinite",
			}}
		/>
	);
};

// Specific skeleton components
export const ChatBubbleSkeleton = () => (
	<div className="flex gap-3 p-4">
		<Skeleton className="h-8 w-8 rounded-full" />
		<div className="space-y-2 flex-1">
			<Skeleton className="h-4 w-3/4" />
			<Skeleton className="h-4 w-1/2" />
		</div>
	</div>
);

export const LessonCardSkeleton = () => (
	<div className="p-4 space-y-3">
		<Skeleton className="h-6 w-3/4" />
		<Skeleton className="h-4 w-full" />
		<Skeleton className="h-4 w-2/3" />
		<div className="flex gap-2">
			<Skeleton className="h-8 w-16" />
			<Skeleton className="h-8 w-20" />
		</div>
	</div>
);

export const ProgressSkeleton = () => (
	<div className="space-y-3">
		<div className="flex justify-between">
			<Skeleton className="h-4 w-20" />
			<Skeleton className="h-4 w-12" />
		</div>
		<Skeleton className="h-2 w-full" />
	</div>
);
