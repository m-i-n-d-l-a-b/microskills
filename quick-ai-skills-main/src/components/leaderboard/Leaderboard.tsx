import { useState, useMemo } from "react";
import { Trophy, Medal, Award, Crown, Filter } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface LeaderboardEntry {
	id: string;
	name: string;
	avatar?: string;
	xp: number;
	streak: number;
	level: number;
	badges: number;
	completedLessons: number;
	rank: number;
}

interface LeaderboardProps {
	entries: LeaderboardEntry[];
	currentUserId?: string;
}

type SortBy = "xp" | "streak" | "badges" | "lessons";
type TimeFrame = "all" | "month" | "week";

const RANK_ICONS = {
	1: Crown,
	2: Trophy,
	3: Medal,
};

const RANK_COLORS = {
	1: "from-yellow-400 to-yellow-600",
	2: "from-gray-400 to-gray-600",
	3: "from-amber-600 to-amber-800",
};

export const Leaderboard = ({ entries, currentUserId }: LeaderboardProps) => {
	const [sortBy, setSortBy] = useState<SortBy>("xp");
	const [timeFrame, setTimeFrame] = useState<TimeFrame>("all");

	const sortedEntries = useMemo(() => {
		return [...entries]
			.sort((a, b) => {
				switch (sortBy) {
					case "xp":
						return b.xp - a.xp;
					case "streak":
						return b.streak - a.streak;
					case "badges":
						return b.badges - a.badges;
					case "lessons":
						return b.completedLessons - a.completedLessons;
					default:
						return b.xp - a.xp;
				}
			})
			.map((entry, index) => ({ ...entry, rank: index + 1 }));
	}, [entries, sortBy]);

	const currentUserEntry = sortedEntries.find(
		(entry) => entry.id === currentUserId,
	);

	const getRankIcon = (rank: number) => {
		const IconComponent = RANK_ICONS[rank as keyof typeof RANK_ICONS];
		return IconComponent ? IconComponent : Award;
	};

	const getRankColor = (rank: number) => {
		return (
			RANK_COLORS[rank as keyof typeof RANK_COLORS] ||
			"from-primary to-primary/80"
		);
	};

	return (
		<div className="space-y-6">
			{/* Filters */}
			<div className="flex gap-4 items-center">
				<div className="flex items-center gap-2">
					<Filter className="h-4 w-4 text-muted-foreground" />
					<Select
						value={sortBy}
						onValueChange={(value) => setSortBy(value as SortBy)}
					>
						<SelectTrigger className="w-32">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="xp">XP</SelectItem>
							<SelectItem value="streak">Streak</SelectItem>
							<SelectItem value="badges">Badges</SelectItem>
							<SelectItem value="lessons">Lessons</SelectItem>
						</SelectContent>
					</Select>
				</div>

				<Select
					value={timeFrame}
					onValueChange={(value) => setTimeFrame(value as TimeFrame)}
				>
					<SelectTrigger className="w-32">
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="all">All Time</SelectItem>
						<SelectItem value="month">This Month</SelectItem>
						<SelectItem value="week">This Week</SelectItem>
					</SelectContent>
				</Select>
			</div>

			{/* Current User Position (if not in top 10) */}
			{currentUserEntry && currentUserEntry.rank > 10 && (
				<Card className="p-4 border-primary/50 bg-primary/5">
					<div className="flex items-center gap-3">
						<div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/20 text-primary font-bold">
							{currentUserEntry.rank}
						</div>
						<Avatar className="h-8 w-8">
							<AvatarImage
								src={currentUserEntry.avatar}
								alt={currentUserEntry.name}
							/>
							<AvatarFallback>
								{currentUserEntry.name.slice(0, 2).toUpperCase()}
							</AvatarFallback>
						</Avatar>
						<div className="flex-1">
							<p className="font-medium">{currentUserEntry.name} (You)</p>
							<p className="text-sm text-muted-foreground">
								{sortBy === "xp" &&
									`${currentUserEntry.xp.toLocaleString()} XP`}
								{sortBy === "streak" && `${currentUserEntry.streak} day streak`}
								{sortBy === "badges" && `${currentUserEntry.badges} badges`}
								{sortBy === "lessons" &&
									`${currentUserEntry.completedLessons} lessons`}
							</p>
						</div>
						<Badge variant="secondary">Your Rank</Badge>
					</div>
				</Card>
			)}

			{/* Top Entries */}
			<div className="space-y-2">
				{sortedEntries.slice(0, 10).map((entry) => {
					const RankIcon = getRankIcon(entry.rank);
					const isCurrentUser = entry.id === currentUserId;

					return (
						<Card
							key={entry.id}
							className={`p-4 transition-all hover:shadow-md ${
								isCurrentUser ? "border-primary/50 bg-primary/5" : ""
							}`}
						>
							<div className="flex items-center gap-3">
								{/* Rank */}
								<div className="flex items-center justify-center w-10 h-10">
									{entry.rank <= 3 ? (
										<div
											className={`p-2 rounded-full bg-gradient-to-r ${getRankColor(entry.rank)}`}
										>
											<RankIcon className="h-5 w-5 text-white" />
										</div>
									) : (
										<div className="flex items-center justify-center w-8 h-8 rounded-full bg-muted text-foreground font-bold">
											{entry.rank}
										</div>
									)}
								</div>

								{/* Avatar */}
								<Avatar className="h-10 w-10">
									<AvatarImage src={entry.avatar} alt={entry.name} />
									<AvatarFallback>
										{entry.name.slice(0, 2).toUpperCase()}
									</AvatarFallback>
								</Avatar>

								{/* User Info */}
								<div className="flex-1">
									<div className="flex items-center gap-2">
										<p className="font-medium">{entry.name}</p>
										{isCurrentUser && (
											<Badge variant="secondary" className="text-xs">
												You
											</Badge>
										)}
									</div>
									<div className="flex items-center gap-4 text-sm text-muted-foreground">
										<span>Level {entry.level}</span>
										<span>{entry.completedLessons} lessons</span>
										<span>{entry.badges} badges</span>
									</div>
								</div>

								{/* Primary Stat */}
								<div className="text-right">
									<div className="font-bold text-lg">
										{sortBy === "xp" && entry.xp.toLocaleString()}
										{sortBy === "streak" && entry.streak}
										{sortBy === "badges" && entry.badges}
										{sortBy === "lessons" && entry.completedLessons}
									</div>
									<div className="text-xs text-muted-foreground">
										{sortBy === "xp" && "XP"}
										{sortBy === "streak" && "day streak"}
										{sortBy === "badges" && "badges"}
										{sortBy === "lessons" && "lessons"}
									</div>
								</div>
							</div>
						</Card>
					);
				})}
			</div>
		</div>
	);
};
