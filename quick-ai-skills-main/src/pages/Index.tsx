import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { OnboardingWizard } from "@/components/onboarding/OnboardingWizard";
import { LessonChatScreen } from "@/components/lesson/LessonChatScreen";
import { MiniProjectSandbox } from "@/components/project/MiniProjectSandbox";
import { AdminAnalytics } from "@/components/admin/AdminAnalytics";
import { NotificationPreferences } from "@/components/settings/NotificationPreferences";
import { BadgeShareModal } from "@/components/badges/BadgeShareModal";
import { StreakCounter } from "@/components/progress/StreakCounter";
import { XPProgressBar } from "@/components/progress/XPProgressBar";
import { Leaderboard } from '@/components/leaderboard/Leaderboard';
import { AchievementToast, useAchievements } from '@/components/achievements/AchievementToast';
import { 
  ErrorBoundary, 
  RouteErrorBoundary, 
  ComponentErrorBoundary,
  LessonErrorBoundary,
  ProjectErrorBoundary 
} from '@/components/ui/error-boundary';
import { Settings as SettingsPage } from "@/pages/Settings";
import { Play, BookOpen, Trophy, Target, Clock, Sparkles, Settings, Code, BarChart, Users } from "lucide-react";
import { useAnalytics, ANALYTICS_EVENTS } from '@/hooks/useAnalytics';
import { useSpacedRepetition } from '@/hooks/useSpacedRepetition';
import heroImage from "@/assets/hero-learning.jpg";

interface UserData {
  role: string;
  timeCommit: number;
  tone: string;
  difficulty: string;
}

const Index = () => {
  const [isOnboarded, setIsOnboarded] = useState(false);
  const [isInLesson, setIsInLesson] = useState(false);
  const [isInSettings, setIsInSettings] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [userData, setUserData] = useState<UserData | null>(null);
  const { track } = useAnalytics();
  const { getRecommendedLessons } = useSpacedRepetition();
  const { achievements, triggerAchievement, removeAchievement } = useAchievements();

  // Mock user progress data
  const userProgress = {
    streak: 7,
    currentXP: 2450,
    nextLevelXP: 3000,
    level: 12,
    lessonsCompleted: 24,
    lastActive: new Date(Date.now() - 24 * 60 * 60 * 1000) // Yesterday
  };

  const handleOnboardingComplete = (data: UserData) => {
    setUserData(data);
    setIsOnboarded(true);
    track(ANALYTICS_EVENTS.ONBOARDING_COMPLETED, data);
    
    // Trigger welcome achievement
    triggerAchievement({
      id: 'welcome',
      title: 'Welcome Aboard!',
      description: 'You\'ve completed onboarding and are ready to learn!',
      type: 'completion',
      rarity: 'common',
    });
  };

  const handleStartLesson = () => {
    setIsInLesson(true);
    track(ANALYTICS_EVENTS.LESSON_STARTED, { source: 'dashboard' });
  };

  const handleLessonComplete = () => {
    setIsInLesson(false);
    // In real app, this would update progress and trigger celebrations
  };

  const handleBackFromLesson = () => {
    setIsInLesson(false);
  };

  const handleOpenSettings = () => {
    setIsInSettings(true);
  };

  const handleBackFromSettings = () => {
    setIsInSettings(false);
  };

  // Mock leaderboard data
  const leaderboardData = [
    { id: '1', name: 'Alex Chen', avatar: '', xp: 15420, streak: 47, level: 12, badges: 23, completedLessons: 156, rank: 1 },
    { id: '2', name: 'Sarah Johnson', avatar: '', xp: 14850, streak: 32, level: 11, badges: 19, completedLessons: 142, rank: 2 },
    { id: '3', name: 'Mike Rodriguez', avatar: '', xp: 13960, streak: 28, level: 10, badges: 17, completedLessons: 134, rank: 3 },
    { id: '4', name: 'Emma Wilson', avatar: '', xp: 12340, streak: 15, level: 9, badges: 14, completedLessons: 118, rank: 4 },
    { id: '5', name: 'David Kim', avatar: '', xp: 11890, streak: 22, level: 9, badges: 12, completedLessons: 107, rank: 5 },
    { id: 'current', name: userData?.role || 'You', avatar: '', xp: 2450, streak: 7, level: 3, badges: 5, completedLessons: 24, rank: 0 },
  ];

  if (!isOnboarded) {
    return <OnboardingWizard onComplete={handleOnboardingComplete} />;
  }

  if (isInSettings) {
    return <SettingsPage onBack={handleBackFromSettings} />;
  }

  if (showLeaderboard) {
    return (
      <RouteErrorBoundary>
        <div className="min-h-screen bg-gradient-hero">
          <header className="border-b bg-background/80 backdrop-blur-sm">
            <div className="max-w-6xl mx-auto px-4 py-4">
              <div className="flex items-center gap-4">
                <Button variant="ghost" onClick={() => setShowLeaderboard(false)}>
                  ← Back to Dashboard
                </Button>
                <h1 className="text-2xl font-bold">Leaderboard</h1>
              </div>
            </div>
          </header>
          <div className="max-w-6xl mx-auto px-4 py-8">
            <Leaderboard entries={leaderboardData} currentUserId="current" />
          </div>
        </div>
      </RouteErrorBoundary>
    );
  }

  if (isInLesson) {
    return (
      <LessonErrorBoundary>
        <LessonChatScreen
          lessonId="prompt-engineering-101"
          lessonTitle="Prompt Engineering Fundamentals"
          stepNumber={1}
          totalSteps={5}
          onComplete={handleLessonComplete}
          onBack={handleBackFromLesson}
        />
      </LessonErrorBoundary>
    );
  }

  return (
    <RouteErrorBoundary>
      <div className="min-h-screen bg-gradient-hero">
        {/* Achievement Toasts */}
        {achievements.map((achievement) => (
          <AchievementToast
            key={achievement.id}
            achievement={achievement}
            onClose={() => removeAchievement(achievement.id)}
          />
        ))}
        
        {/* Header */}
        <header className="border-b bg-background/80 backdrop-blur-sm">
          <div className="max-w-6xl mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-gradient-primary rounded-lg flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-primary-foreground" />
                </div>
                <h1 className="text-xl font-bold text-foreground">AI Skills</h1>
              </div>
              <div className="flex items-center gap-4">
                <Badge variant="secondary" className="bg-gradient-primary text-primary-foreground">
                  {userData?.role || "Learner"}
                </Badge>
                <Button variant="outline" size="sm" onClick={() => setShowLeaderboard(true)}>
                  <Users className="w-4 h-4 mr-2" />
                  Leaderboard
                </Button>
                <Button variant="outline" size="sm" onClick={handleOpenSettings}>
                  <Settings className="w-4 h-4 mr-2" />
                  Settings
                </Button>
              </div>
            </div>
          </div>
        </header>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Hero Section */}
        <div className="grid lg:grid-cols-2 gap-8 items-center mb-12">
          <div className="space-y-6">
            <div className="space-y-4">
              <Badge className="bg-success text-success-foreground">
                Welcome back!
              </Badge>
              <h1 className="text-4xl lg:text-5xl font-bold text-foreground leading-tight">
                Master AI Skills in
                <span className="bg-gradient-primary bg-clip-text"> 5 Minutes</span>
              </h1>
              <p className="text-lg text-muted-foreground leading-relaxed">
                Learn cutting-edge AI techniques through interactive micro-lessons. 
                Perfect for busy professionals who want to stay ahead.
              </p>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4">
              <Button 
                onClick={handleStartLesson}
                size="lg"
                className="bg-gradient-primary border-0 text-primary-foreground hover:opacity-90 shadow-glow transition-spring"
              >
                <Play className="w-5 h-5 mr-2" />
                Start Today's Lesson
              </Button>
              <Button variant="outline" size="lg" className="transition-smooth hover:border-primary">
                <Target className="w-5 h-5 mr-2" />
                View Learning Path
              </Button>
            </div>

            <div className="flex items-center gap-6 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                {userData?.timeCommit} min/day
              </div>
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4" />
                {userProgress.lessonsCompleted} lessons completed
              </div>
            </div>
          </div>

          <div className="relative">
            <img 
              src={heroImage} 
              alt="AI Learning" 
              className="w-full h-auto rounded-2xl shadow-glow animate-fade-in"
            />
            <div className="absolute -bottom-4 -right-4 bg-background/90 backdrop-blur-sm rounded-xl p-4 shadow-card animate-slide-up">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-success rounded-full animate-pulse"></div>
                <span className="text-sm font-medium text-foreground">Live AI tutor ready</span>
              </div>
            </div>
          </div>
        </div>

        {/* Progress Cards */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <StreakCounter 
            streak={userProgress.streak}
            lastActive={userProgress.lastActive}
          />
          <XPProgressBar
            currentXP={userProgress.currentXP}
            nextLevelXP={userProgress.nextLevelXP}
            level={userProgress.level}
          />
        </div>

        {/* Quick Stats */}
        <div className="grid sm:grid-cols-3 gap-4 mb-8">
          <Card className="shadow-card hover:shadow-glow transition-smooth">
            <CardContent className="p-6 text-center">
              <BookOpen className="w-8 h-8 text-primary mx-auto mb-3" />
              <div className="text-2xl font-bold text-foreground mb-1">
                {userProgress.lessonsCompleted}
              </div>
              <div className="text-sm text-muted-foreground">Lessons Complete</div>
            </CardContent>
          </Card>
          
          <Card className="shadow-card hover:shadow-glow transition-smooth">
            <CardContent className="p-6 text-center">
              <Trophy className="w-8 h-8 text-streak-flame mx-auto mb-3" />
              <div className="text-2xl font-bold text-foreground mb-1">3</div>
              <div className="text-sm text-muted-foreground">Badges Earned</div>
            </CardContent>
          </Card>
          
          <Card className="shadow-card hover:shadow-glow transition-smooth">
            <CardContent className="p-6 text-center">
              <Target className="w-8 h-8 text-success mx-auto mb-3" />
              <div className="text-2xl font-bold text-foreground mb-1">89%</div>
              <div className="text-sm text-muted-foreground">Quiz Average</div>
            </CardContent>
          </Card>
        </div>

        {/* Today's Lesson Preview */}
        <Card className="shadow-glow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              Today's Lesson: Prompt Engineering
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              Learn how to craft effective prompts that get better results from AI models. 
              We'll cover structure, context, and advanced techniques.
            </p>
            <div className="flex items-center justify-between">
              <div className="flex gap-2">
                <Badge variant="secondary">5 min</Badge>
                <Badge variant="secondary">Beginner</Badge>
                <Badge variant="secondary">Interactive</Badge>
              </div>
              <Button 
                onClick={handleStartLesson}
                className="bg-gradient-primary border-0 text-primary-foreground hover:opacity-90"
              >
                <Play className="w-4 h-4 mr-2" />
                Start Lesson
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
      </div>
    </RouteErrorBoundary>
  );
};

export default Index;
