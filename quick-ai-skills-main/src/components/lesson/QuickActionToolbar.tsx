import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Palette, Volume2, Lightbulb, RefreshCw } from "lucide-react";
import { useState } from "react";

interface QuickActionToolbarProps {
	onToneSwitch: (tone: string) => void;
}

const tones = [
	{ id: "friendly", label: "Friendly", color: "bg-success" },
	{ id: "energetic", label: "Energetic", color: "bg-streak-flame" },
	{ id: "professional", label: "Professional", color: "bg-primary" },
];

export const QuickActionToolbar = ({
	onToneSwitch,
}: QuickActionToolbarProps) => {
	const [showTones, setShowTones] = useState(false);
	const [currentTone, setCurrentTone] = useState("friendly");

	const handleToneChange = (toneId: string) => {
		setCurrentTone(toneId);
		onToneSwitch(toneId);
		setShowTones(false);
	};

	return (
		<div className="relative">
			{showTones && (
				<Card className="absolute bottom-full left-4 right-4 mb-2 shadow-glow animate-slide-up">
					<CardContent className="p-3">
						<div className="flex items-center justify-between mb-3">
							<span className="text-sm font-medium text-foreground">
								Switch Teaching Tone
							</span>
							<Button
								variant="ghost"
								size="sm"
								onClick={() => setShowTones(false)}
								className="h-6 w-6 p-0"
							>
								×
							</Button>
						</div>
						<div className="grid grid-cols-3 gap-2">
							{tones.map((tone) => (
								<Button
									key={tone.id}
									variant={currentTone === tone.id ? "default" : "outline"}
									size="sm"
									className={`text-xs transition-smooth ${
										currentTone === tone.id
											? "bg-gradient-primary border-0 text-primary-foreground"
											: "hover:border-primary"
									}`}
									onClick={() => handleToneChange(tone.id)}
								>
									<div className={`w-2 h-2 rounded-full ${tone.color} mr-2`} />
									{tone.label}
								</Button>
							))}
						</div>
					</CardContent>
				</Card>
			)}

			<div className="bg-card/80 backdrop-blur-sm border-t">
				<div className="max-w-4xl mx-auto px-4 py-2">
					<div className="flex items-center justify-between">
						<div className="flex items-center gap-2">
							<Badge variant="secondary" className="text-xs">
								<div
									className={`w-2 h-2 rounded-full ${
										tones.find((t) => t.id === currentTone)?.color
									} mr-1`}
								/>
								{tones.find((t) => t.id === currentTone)?.label} tone
							</Badge>
						</div>

						<div className="flex items-center gap-2">
							<Button
								variant="ghost"
								size="sm"
								onClick={() => setShowTones(!showTones)}
								className="h-8 px-3 text-xs transition-smooth hover:bg-primary hover:text-primary-foreground"
							>
								<Palette className="w-3 h-3 mr-1" />
								Tone
							</Button>

							<Button
								variant="ghost"
								size="sm"
								className="h-8 px-3 text-xs transition-smooth hover:bg-primary hover:text-primary-foreground"
							>
								<Zap className="w-3 h-3 mr-1" />
								Simplify
							</Button>

							<Button
								variant="ghost"
								size="sm"
								className="h-8 px-3 text-xs transition-smooth hover:bg-primary hover:text-primary-foreground"
							>
								<Lightbulb className="w-3 h-3 mr-1" />
								Hint
							</Button>

							<Button
								variant="ghost"
								size="sm"
								className="h-8 px-3 text-xs transition-smooth hover:bg-primary hover:text-primary-foreground"
							>
								<RefreshCw className="w-3 h-3 mr-1" />
								Retry
							</Button>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
};
