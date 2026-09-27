export type WritingGoalType = "DAILY" | "WEEKLY";

export type WordCountScene = {
  id: string;
  title: string;
  wordCount: number;
};

export type WordCountChapter = {
  id: string;
  title: string;
  wordCount: number;
  scenes: WordCountScene[];
};

export type WordCountBook = {
  id: string;
  title: string;
  wordCount: number;
  chapters: WordCountChapter[];
};

export type WritingGoal = {
  id: string;
  goalType: WritingGoalType;
  targetWords: number;
  currentWords: number;
  deadline: string | null;
  progressPercent: number;
};

export type WritingSession = {
  id: string;
  sceneId: string | null;
  sceneTitle: string;
  startedAt: string;
  endedAt: string | null;
  durationSecs: number;
  wordsAdded: number;
  wordsDeleted: number;
  wordsNet: number;
  avgWpm: number;
};

export type DailyWritingActivity = {
  date: string;
  words: number;
  durationSecs: number;
  sessions: number;
};

export type AnalyticsDashboard = {
  project: {
    id: string;
    title: string;
    wordCount: number;
    wordCountTarget: number | null;
    progressPercent: number | null;
  };
  hierarchy: WordCountBook[];
  summary: {
    todayWords: number;
    weekWords: number;
    currentStreak: number;
    bestStreak: number;
    averageWpm: number;
    averageDailyWords: number;
    estimatedCompletionDate: string | null;
  };
  dailyActivity: DailyWritingActivity[];
  recentSessions: WritingSession[];
  goals: WritingGoal[];
  generatedAt: string;
};
