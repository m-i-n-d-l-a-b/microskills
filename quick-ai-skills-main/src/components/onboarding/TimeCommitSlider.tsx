import { Slider } from "@/components/ui/slider";
import { Clock } from "lucide-react";

interface TimeCommitSliderProps {
	value: number;
	onChange: (value: number) => void;
}

export const TimeCommitSlider = ({
	value,
	onChange,
}: TimeCommitSliderProps) => {
	const getTimeLabel = (minutes: number) => {
		if (minutes < 60) {
			return `${minutes} min`;
		}
		const hours = Math.floor(minutes / 60);
		const remainingMinutes = minutes % 60;
		if (remainingMinutes === 0) {
			return `${hours}h`;
		}
		return `${hours}h ${remainingMinutes}m`;
	};

	const getCommitmentLevel = (minutes: number) => {
		if (minutes <= 5) return { level: "Quick", color: "text-success" };
		if (minutes <= 15) return { level: "Moderate", color: "text-primary" };
		if (minutes <= 30)
			return { level: "Dedicated", color: "text-streak-flame" };
		return { level: "Intensive", color: "text-error" };
	};

	const commitment = getCommitmentLevel(value);

	return (
		<div className="space-y-6">
			<div className="text-center">
				<div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-primary text-primary-foreground mb-4">
					<Clock className="w-8 h-8" />
				</div>
				<div className="space-y-2">
					<div className="text-3xl font-bold text-foreground">
						{getTimeLabel(value)}
					</div>
					<div className={`text-sm font-medium ${commitment.color}`}>
						{commitment.level}
					</div>
				</div>
			</div>

			<div className="px-4">
				<Slider
					value={[value]}
					onValueChange={(values) => onChange(values[0])}
					max={60}
					min={1}
					step={1}
					className="w-full"
				/>
				<div className="flex justify-between text-xs text-muted-foreground mt-2">
					<span>1 min</span>
					<span>60 min</span>
				</div>
			</div>

			<div className="bg-muted/50 rounded-lg p-4">
				<div className="text-sm text-muted-foreground text-center">
					{value <= 5 && "Perfect for quick daily habits"}
					{value > 5 && value <= 15 && "Great for consistent learning"}
					{value > 15 && value <= 30 && "Ideal for deep skill building"}
					{value > 30 && "Intensive learning sessions"}
				</div>
			</div>
		</div>
	);
};
