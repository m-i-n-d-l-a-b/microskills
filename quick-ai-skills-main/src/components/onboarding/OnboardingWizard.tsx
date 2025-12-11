import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { RolePicker } from "./RolePicker";
import { TimeCommitSlider } from "./TimeCommitSlider";
import { ToneDifficultySelector } from "./ToneDifficultySelector";
import { CheckCircle } from "lucide-react";

interface OnboardingData {
	role: string;
	timeCommit: number;
	tone: string;
	difficulty: string;
}

interface OnboardingWizardProps {
	onComplete: (data: OnboardingData) => void;
}

export const OnboardingWizard = ({ onComplete }: OnboardingWizardProps) => {
	const [step, setStep] = useState(1);
	const [data, setData] = useState<OnboardingData>({
		role: "",
		timeCommit: 5,
		tone: "friendly",
		difficulty: "beginner",
	});

	const totalSteps = 3;
	const progress = (step / totalSteps) * 100;

	const handleNext = () => {
		if (step < totalSteps) {
			setStep(step + 1);
		} else {
			onComplete(data);
		}
	};

	const handleBack = () => {
		if (step > 1) {
			setStep(step - 1);
		}
	};

	const isStepComplete = () => {
		switch (step) {
			case 1:
				return data.role !== "";
			case 2:
				return data.timeCommit > 0;
			case 3:
				return data.tone !== "" && data.difficulty !== "";
			default:
				return false;
		}
	};

	return (
		<div className="min-h-screen bg-gradient-hero flex items-center justify-center p-4">
			<Card className="w-full max-w-md mx-auto shadow-glow animate-scale-in">
				<CardContent className="p-8">
					<div className="mb-8">
						<div className="flex items-center justify-between mb-4">
							<h1 className="text-2xl font-bold text-foreground">Welcome!</h1>
							<span className="text-sm text-muted-foreground">
								{step} of {totalSteps}
							</span>
						</div>
						<Progress value={progress} className="mb-2" />
						<p className="text-sm text-muted-foreground">
							Let's personalize your learning experience
						</p>
					</div>

					<div className="min-h-[300px] animate-fade-in">
						{step === 1 && (
							<div className="space-y-6">
								<div>
									<h2 className="text-xl font-semibold mb-2">
										What's your role?
									</h2>
									<p className="text-muted-foreground mb-4">
										This helps us tailor lessons to your needs
									</p>
								</div>
								<RolePicker
									selected={data.role}
									onSelect={(role) => setData({ ...data, role })}
								/>
							</div>
						)}

						{step === 2 && (
							<div className="space-y-6">
								<div>
									<h2 className="text-xl font-semibold mb-2">
										Daily time commitment
									</h2>
									<p className="text-muted-foreground mb-4">
										How many minutes per day can you learn?
									</p>
								</div>
								<TimeCommitSlider
									value={data.timeCommit}
									onChange={(timeCommit) => setData({ ...data, timeCommit })}
								/>
							</div>
						)}

						{step === 3 && (
							<div className="space-y-6">
								<div>
									<h2 className="text-xl font-semibold mb-2">Learning style</h2>
									<p className="text-muted-foreground mb-4">
										Choose your preferred tone and difficulty
									</p>
								</div>
								<ToneDifficultySelector
									tone={data.tone}
									difficulty={data.difficulty}
									onToneChange={(tone) => setData({ ...data, tone })}
									onDifficultyChange={(difficulty) =>
										setData({ ...data, difficulty })
									}
								/>
							</div>
						)}
					</div>

					<div className="flex justify-between mt-8">
						<Button
							variant="outline"
							onClick={handleBack}
							disabled={step === 1}
							className="transition-smooth"
						>
							Back
						</Button>
						<Button
							onClick={handleNext}
							disabled={!isStepComplete()}
							className="bg-gradient-primary border-0 text-primary-foreground hover:opacity-90 transition-smooth"
						>
							{step === totalSteps ? (
								<div className="flex items-center gap-2">
									<CheckCircle className="w-4 h-4" />
									Complete
								</div>
							) : (
								"Next"
							)}
						</Button>
					</div>
				</CardContent>
			</Card>
		</div>
	);
};
