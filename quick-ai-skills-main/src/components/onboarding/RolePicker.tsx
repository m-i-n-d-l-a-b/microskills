import { Button } from "@/components/ui/button";
import {
	User,
	Code,
	Briefcase,
	GraduationCap,
	Users,
	Sparkles,
} from "lucide-react";

interface Role {
	id: string;
	label: string;
	description: string;
	icon: React.ComponentType<{ className?: string }>;
}

const roles: Role[] = [
	{
		id: "developer",
		label: "Developer",
		description: "Software engineer, programmer",
		icon: Code,
	},
	{
		id: "manager",
		label: "Team Lead",
		description: "Manager, team leader",
		icon: Users,
	},
	{
		id: "analyst",
		label: "Data Analyst",
		description: "Data scientist, analyst",
		icon: Briefcase,
	},
	{
		id: "student",
		label: "Student",
		description: "Learning AI skills",
		icon: GraduationCap,
	},
	{
		id: "entrepreneur",
		label: "Entrepreneur",
		description: "Startup founder, business owner",
		icon: Sparkles,
	},
	{
		id: "other",
		label: "Other",
		description: "Something else",
		icon: User,
	},
];

interface RolePickerProps {
	selected: string;
	onSelect: (role: string) => void;
}

export const RolePicker = ({ selected, onSelect }: RolePickerProps) => {
	return (
		<div className="grid grid-cols-2 gap-3">
			{roles.map((role) => {
				const Icon = role.icon;
				const isSelected = selected === role.id;

				return (
					<Button
						key={role.id}
						variant={isSelected ? "default" : "outline"}
						className={`h-auto p-4 flex flex-col items-center text-center transition-all duration-200 ${
							isSelected
								? "bg-gradient-primary border-0 text-primary-foreground shadow-glow"
								: "hover:border-primary hover:shadow-card"
						}`}
						onClick={() => onSelect(role.id)}
					>
						<Icon
							className={`w-6 h-6 mb-2 ${isSelected ? "text-primary-foreground" : "text-primary"}`}
						/>
						<div className="space-y-1">
							<div className="font-medium text-sm">{role.label}</div>
							<div
								className={`text-xs ${isSelected ? "text-primary-foreground/80" : "text-muted-foreground"}`}
							>
								{role.description}
							</div>
						</div>
					</Button>
				);
			})}
		</div>
	);
};
