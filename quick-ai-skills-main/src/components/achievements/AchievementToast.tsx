import { useState, useEffect } from "react";
import { Trophy, Star, Flame, Zap } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface Achievement {
	id: string;
	title: string;
	description: string;
	type: "streak" | "xp" | "completion" | "speed";
	icon?: React.ComponentType<{ className?: string }>;
	rarity: "common" | "rare" | "epic" | "legendary";
}

interface AchievementToastProps {
	achievement: Achievement;
	onClose: () => void;
	autoClose?: number;
}

const ACHIEVEMENT_ICONS = {
	streak: Flame,
	xp: Star,
	completion: Trophy,
	speed: Zap,
};

const RARITY_COLORS = {
	common: "from-gray-400 to-gray-600",
	rare: "from-blue-400 to-blue-600",
	epic: "from-purple-400 to-purple-600",
	legendary: "from-yellow-400 to-yellow-600",
};

export const AchievementToast = ({
	achievement,
	onClose,
	autoClose = 5000,
}: AchievementToastProps) => {
	const [isVisible, setIsVisible] = useState(true);

	useEffect(() => {
		if (autoClose > 0) {
			const timer = setTimeout(() => {
				setIsVisible(false);
				setTimeout(onClose, 300); // Allow animation to complete
			}, autoClose);

			return () => clearTimeout(timer);
		}
	}, [autoClose, onClose]);

	const Icon = achievement.icon || ACHIEVEMENT_ICONS[achievement.type];

	return (
		<div
			className={`fixed top-4 right-4 z-50 transition-all duration-300 ${
				isVisible ? "animate-scale-in" : "animate-scale-out"
			}`}
		>
			<Card className="p-4 min-w-[300px] bg-gradient-to-r from-background to-background/95 border-2 border-primary/20 shadow-xl">
				<div className="flex items-start gap-3">
					<div
						className={`p-2 rounded-full bg-gradient-to-r ${RARITY_COLORS[achievement.rarity]}`}
					>
						<Icon className="h-6 w-6 text-white" />
					</div>
					<div className="flex-1">
						<div className="flex items-center gap-2 mb-1">
							<h4 className="font-semibold text-foreground">
								{achievement.title}
							</h4>
							<Badge
								variant="secondary"
								className={`text-xs bg-gradient-to-r ${RARITY_COLORS[achievement.rarity]} text-white border-0`}
							>
								{achievement.rarity}
							</Badge>
						</div>
						<p className="text-sm text-muted-foreground">
							{achievement.description}
						</p>
					</div>
					<button
						type="button"
						onClick={() => setIsVisible(false)}
						className="text-muted-foreground hover:text-foreground transition-colors"
					>
						×
					</button>
				</div>
			</Card>
		</div>
	);
};

// Hook for managing achievements
export const useAchievements = () => {
	const [achievements, setAchievements] = useState<Achievement[]>([]);

	const triggerAchievement = (achievement: Achievement) => {
		setAchievements((prev) => [...prev, achievement]);
	};

	const removeAchievement = (id: string) => {
		setAchievements((prev) => prev.filter((a) => a.id !== id));
	};

	return {
		achievements,
		triggerAchievement,
		removeAchievement,
	};
};
