import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Heart, Zap, Briefcase, Star, BookOpen, Rocket } from "lucide-react";

interface ToneOption {
	id: string;
	label: string;
	description: string;
	icon: React.ComponentType<{ className?: string }>;
}

interface DifficultyOption {
	id: string;
	label: string;
	description: string;
	icon: React.ComponentType<{ className?: string }>;
	color: string;
}

const tones: ToneOption[] = [
	{
		id: "friendly",
		label: "Friendly",
		description: "Encouraging and supportive",
		icon: Heart,
	},
	{
		id: "energetic",
		label: "Energetic",
		description: "High-energy and motivating",
		icon: Zap,
	},
	{
		id: "professional",
		label: "Professional",
		description: "Direct and business-focused",
		icon: Briefcase,
	},
];

const difficulties: DifficultyOption[] = [
	{
		id: "beginner",
		label: "Beginner",
		description: "New to AI concepts",
		icon: BookOpen,
		color: "border-success",
	},
	{
		id: "intermediate",
		label: "Intermediate",
		description: "Some AI experience",
		icon: Star,
		color: "border-primary",
	},
	{
		id: "advanced",
		label: "Advanced",
		description: "Deep AI knowledge",
		icon: Rocket,
		color: "border-streak-flame",
	},
];

interface ToneDifficultySelectorProps {
	tone: string;
	difficulty: string;
	onToneChange: (tone: string) => void;
	onDifficultyChange: (difficulty: string) => void;
}

export const ToneDifficultySelector = ({
	tone,
	difficulty,
	onToneChange,
	onDifficultyChange,
}: ToneDifficultySelectorProps) => {
	return (
		<div className="space-y-6">
			<div>
				<h3 className="font-medium mb-3 text-foreground">Teaching Tone</h3>
				<div className="grid grid-cols-1 gap-2">
					{tones.map((toneOption) => {
						const Icon = toneOption.icon;
						const isSelected = tone === toneOption.id;

						return (
							<Button
								key={toneOption.id}
								variant={isSelected ? "default" : "outline"}
								className={`h-auto p-3 justify-start transition-all duration-200 ${
									isSelected
										? "bg-gradient-primary border-0 text-primary-foreground shadow-glow"
										: "hover:border-primary hover:shadow-card"
								}`}
								onClick={() => onToneChange(toneOption.id)}
							>
								<Icon
									className={`w-4 h-4 mr-3 ${isSelected ? "text-primary-foreground" : "text-primary"}`}
								/>
								<div className="text-left">
									<div className="font-medium text-sm">{toneOption.label}</div>
									<div
										className={`text-xs ${isSelected ? "text-primary-foreground/80" : "text-muted-foreground"}`}
									>
										{toneOption.description}
									</div>
								</div>
							</Button>
						);
					})}
				</div>
			</div>

			<div>
				<h3 className="font-medium mb-3 text-foreground">Difficulty Level</h3>
				<div className="grid grid-cols-1 gap-2">
					{difficulties.map((difficultyOption) => {
						const Icon = difficultyOption.icon;
						const isSelected = difficulty === difficultyOption.id;

						return (
							<Card
								key={difficultyOption.id}
								className={`cursor-pointer transition-all duration-200 ${
									isSelected
										? `${difficultyOption.color} border-2 shadow-glow bg-gradient-card`
										: "hover:shadow-card hover:border-primary/50"
								}`}
								onClick={() => onDifficultyChange(difficultyOption.id)}
							>
								<CardContent className="p-3">
									<div className="flex items-center">
										<Icon
											className={`w-4 h-4 mr-3 ${
												isSelected ? "text-primary" : "text-muted-foreground"
											}`}
										/>
										<div className="text-left">
											<div
												className={`font-medium text-sm ${
													isSelected ? "text-foreground" : "text-foreground"
												}`}
											>
												{difficultyOption.label}
											</div>
											<div className="text-xs text-muted-foreground">
												{difficultyOption.description}
											</div>
										</div>
									</div>
								</CardContent>
							</Card>
						);
					})}
				</div>
			</div>
		</div>
	);
};
