import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Trophy, Star, Zap } from "lucide-react";

interface XPProgressBarProps {
	currentXP: number;
	nextLevelXP: number;
	level: number;
	className?: string;
}

export const XPProgressBar = ({
	currentXP,
	nextLevelXP,
	level,
	className,
}: XPProgressBarProps) => {
	const progressPercentage = (currentXP / nextLevelXP) * 100;
	const xpNeeded = nextLevelXP - currentXP;

	const getLevelTitle = (lvl: number) => {
		if (lvl < 5) return "Beginner";
		if (lvl < 15) return "Learner";
		if (lvl < 30) return "Explorer";
		if (lvl < 50) return "Expert";
		return "Master";
	};

	const getLevelIcon = (lvl: number) => {
		if (lvl < 5) return Star;
		if (lvl < 15) return Zap;
		return Trophy;
	};

	const LevelIcon = getLevelIcon(level);

	return (
		<Card
			className={`shadow-card hover:shadow-glow transition-smooth ${className}`}
		>
			<CardContent className="p-6">
				<div className="space-y-4">
					<div className="flex items-center justify-between">
						<div className="flex items-center gap-3">
							<div className="flex items-center justify-center w-10 h-10 rounded-full bg-gradient-primary">
								<LevelIcon className="w-5 h-5 text-primary-foreground" />
							</div>
							<div>
								<div className="font-semibold text-lg text-foreground">
									Level {level}
								</div>
								<div className="text-sm text-muted-foreground">
									{getLevelTitle(level)}
								</div>
							</div>
						</div>
						<div className="text-right">
							<div className="text-lg font-bold text-foreground">
								{currentXP.toLocaleString()}
							</div>
							<div className="text-xs text-muted-foreground">XP</div>
						</div>
					</div>

					<div className="space-y-2">
						<div className="flex justify-between text-sm">
							<span className="text-muted-foreground">
								Progress to Level {level + 1}
							</span>
							<span className="font-medium text-foreground">
								{Math.round(progressPercentage)}%
							</span>
						</div>

						<div className="relative">
							<Progress value={progressPercentage} className="h-3 bg-muted" />
							<div
								className="absolute top-0 left-0 h-full bg-gradient-primary rounded-full animate-xp-fill origin-left"
								style={{ width: `${progressPercentage}%` }}
							/>
						</div>

						<div className="flex justify-between text-xs text-muted-foreground">
							<span>{currentXP.toLocaleString()} XP</span>
							<span>{nextLevelXP.toLocaleString()} XP</span>
						</div>
					</div>

					{xpNeeded > 0 && (
						<div className="bg-muted/50 rounded-lg p-3 text-center">
							<div className="text-sm text-muted-foreground">
								<span className="font-medium text-primary">
									{xpNeeded.toLocaleString()} XP
								</span>{" "}
								to next level
							</div>
						</div>
					)}
				</div>
			</CardContent>
		</Card>
	);
};
