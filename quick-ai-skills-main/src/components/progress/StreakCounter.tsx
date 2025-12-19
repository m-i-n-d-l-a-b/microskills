import { Card, CardContent } from "@/components/ui/card";
import { Flame, Calendar } from "lucide-react";

interface StreakCounterProps {
	streak: number;
	lastActive?: Date;
	className?: string;
}

export const StreakCounter = ({
	streak,
	lastActive,
	className,
}: StreakCounterProps) => {
	const getStreakMessage = (days: number) => {
		if (days === 0) return "Start your streak today!";
		if (days === 1) return "Great start!";
		if (days < 7) return "Building momentum!";
		if (days < 30) return "On fire!";
		return "Unstoppable!";
	};

	const getFlameColor = (days: number) => {
		if (days === 0) return "text-muted-foreground";
		if (days < 7) return "text-streak-flame";
		if (days < 30) return "text-error";
		return "text-gradient-primary";
	};

	return (
		<Card
			className={`shadow-card hover:shadow-glow transition-smooth ${className}`}
		>
			<CardContent className="p-6 text-center">
				<div className="space-y-4">
					<div className="relative">
						<Flame
							className={`w-12 h-12 mx-auto ${getFlameColor(streak)} ${
								streak > 0 ? "animate-streak-flame" : ""
							}`}
						/>
						{streak > 0 && (
							<div className="absolute -top-1 -right-1 w-6 h-6 bg-gradient-primary rounded-full flex items-center justify-center">
								<span className="text-xs font-bold text-primary-foreground">
									{streak}
								</span>
							</div>
						)}
					</div>

					<div className="space-y-2">
						<div className="text-2xl font-bold text-foreground">
							{streak} {streak === 1 ? "Day" : "Days"}
						</div>
						<div className="text-sm text-muted-foreground">
							{getStreakMessage(streak)}
						</div>
					</div>

					{lastActive && (
						<div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
							<Calendar className="w-3 h-3" />
							Last active: {lastActive.toLocaleDateString()}
						</div>
					)}

					<div className="pt-2">
						<div className="flex justify-center gap-1">
							{Array.from({ length: Math.min(streak, 7) }, (_, i) => (
								<div
									key={i}
									className="w-2 h-2 rounded-full bg-gradient-primary animate-scale-in"
									style={{ animationDelay: `${i * 0.1}s` }}
								/>
							))}
							{streak > 7 && (
								<div className="text-xs text-primary font-medium ml-1">
									+{streak - 7}
								</div>
							)}
						</div>
					</div>
				</div>
			</CardContent>
		</Card>
	);
};
