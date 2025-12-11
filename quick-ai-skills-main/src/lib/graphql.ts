import {
	ApolloClient,
	InMemoryCache,
	createHttpLink,
	from,
} from "@apollo/client";
import { setContext } from "@apollo/client/link/context";
import { onError } from "@apollo/client/link/error";
import { RetryLink } from "@apollo/client/link/retry";
import { gql } from "@apollo/client";
import { ENV, STORAGE_KEYS, ERROR_MESSAGES, REQUEST_CONFIG } from "./constants";

// GraphQL Queries
export const GET_DAILY_LESSON = gql`
  query GetDailyLesson {
    getDailyLesson {
      id
      title
      description
      content {
        sections {
          id
          title
          content
          order
          type
          metadata
        }
        resources {
          id
          title
          type
          url
          description
        }
        quiz {
          id
          questions {
            id
            question
            type
            options
            correctAnswer
            explanation
            points
          }
          timeLimit
          passingScore
        }
      }
      difficulty
      duration
      tags
      category
      prerequisites
      objectives
      estimatedTime
      createdAt
      updatedAt
    }
  }
`;

export const GET_USER_PROGRESS = gql`
  query GetUserProgress {
    userProgress {
      userId
      lessonsCompleted
      totalLessons
      currentStreak
      longestStreak
      totalXp
      level
      achievements {
        id
        title
        description
        icon
        category
        rarity
        xpReward
        unlockedAt
        progress {
          current
          target
          percentage
        }
      }
      recentActivity {
        id
        type
        title
        description
        xpEarned
        timestamp
        metadata
      }
      weeklyProgress {
        weekStart
        lessonsCompleted
        xpEarned
        streakDays
        goals {
          id
          title
          target
          current
          type
          deadline
          completed
        }
      }
      monthlyProgress {
        month
        lessonsCompleted
        xpEarned
        averageStreak
        topCategories {
          category
          lessonsCompleted
          totalLessons
          averageScore
        }
      }
    }
  }
`;

// GraphQL Mutations
export const SUBMIT_QUIZ = gql`
  mutation SubmitQuiz($input: QuizSubmissionInput!) {
    submitQuiz(input: $input) {
      score
      totalPoints
      percentage
      passed
      feedback {
        questionId
        correct
        explanation
        pointsEarned
      }
      timeSpent
      submittedAt
    }
  }
`;

export const SWITCH_TONE = gql`
  mutation SwitchTone($input: ToneSwitchInput!) {
    switchTone(input: $input) {
      success
      newTone
      message
    }
  }
`;

export const MARK_LESSON_COMPLETE = gql`
  mutation MarkLessonComplete($input: LessonCompletionInput!) {
    markLessonComplete(input: $input) {
      success
      xpEarned
      achievements {
        id
        title
        description
        icon
      }
    }
  }
`;

// Spaced Repetition Queries
export const GET_SPACED_REPETITION_ITEMS = gql`
  query GetSpacedRepetitionItems {
    spacedRepetitionItems {
      id
      userId
      lessonId
      interval
      repetitions
      easeFactor
      nextReview
      lastReview
      createdAt
    }
  }
`;

export const GET_DUE_REVIEWS = gql`
  query GetDueReviews {
    dueReviews {
      id
      lessonId
      interval
      repetitions
      easeFactor
      nextReview
      lastReview
      priority
      daysOverdue
    }
  }
`;

// Spaced Repetition Mutations
export const UPDATE_SPACED_REPETITION = gql`
  mutation UpdateSpacedRepetition($input: SpacedRepetitionInput!) {
    updateSpacedRepetition(input: $input) {
      itemId
      nextReview
      interval
      repetitions
      easeFactor
      success
    }
  }
`;

export const CREATE_SPACED_REPETITION_ITEM = gql`
  mutation CreateSpacedRepetitionItem($input: CreateSpacedRepetitionInput!) {
    createSpacedRepetitionItem(input: $input) {
      id
      lessonId
      interval
      repetitions
      easeFactor
      nextReview
      success
    }
  }
`;

// Lesson Progress Tracking Queries
export const GET_LESSON_PROGRESS = gql`
  query GetLessonProgress($lessonId: ID!) {
    lessonProgress(lessonId: $lessonId) {
      id
      userId
      lessonId
      status
      progress
      sectionsCompleted
      totalSections
      timeSpent
      lastAccessedAt
      completedAt
      score
      attempts
      metadata
    }
  }
`;

export const GET_USER_LESSON_PROGRESS = gql`
  query GetUserLessonProgress {
    userLessonProgress {
      id
      lessonId
      status
      progress
      sectionsCompleted
      totalSections
      timeSpent
      lastAccessedAt
      completedAt
      score
      attempts
      metadata
      lesson {
        id
        title
        category
        difficulty
      }
    }
  }
`;

export const GET_PROGRESS_ANALYTICS = gql`
  query GetProgressAnalytics($timeframe: String) {
    progressAnalytics(timeframe: $timeframe) {
      totalLessons
      completedLessons
      inProgressLessons
      averageScore
      totalTimeSpent
      averageTimePerLesson
      completionRate
      categoryBreakdown {
        category
        lessonsCompleted
        totalLessons
        averageScore
        averageTime
      }
      weeklyProgress {
        weekStart
        lessonsCompleted
        timeSpent
        averageScore
      }
      monthlyProgress {
        month
        lessonsCompleted
        timeSpent
        averageScore
      }
    }
  }
`;

// Lesson Progress Tracking Mutations
export const UPDATE_LESSON_PROGRESS = gql`
  mutation UpdateLessonProgress($input: LessonProgressInput!) {
    updateLessonProgress(input: $input) {
      id
      progress
      sectionsCompleted
      timeSpent
      lastAccessedAt
      success
    }
  }
`;

export const COMPLETE_LESSON_SECTION = gql`
  mutation CompleteLessonSection($input: SectionCompletionInput!) {
    completeLessonSection(input: $input) {
      id
      sectionId
      completedAt
      timeSpent
      score
      success
    }
  }
`;

export const START_LESSON_SESSION = gql`
  mutation StartLessonSession($input: LessonSessionInput!) {
    startLessonSession(input: $input) {
      sessionId
      lessonId
      startedAt
      success
    }
  }
`;

export const END_LESSON_SESSION = gql`
  mutation EndLessonSession($input: LessonSessionEndInput!) {
    endLessonSession(input: $input) {
      sessionId
      totalTimeSpent
      progress
      success
    }
  }
`;

export const SAVE_LESSON_STATE = gql`
  mutation SaveLessonState($input: LessonStateInput!) {
    saveLessonState(input: $input) {
      id
      lessonId
      state
      savedAt
      success
    }
  }
`;

export const GET_LESSON_STATE = gql`
  query GetLessonState($lessonId: ID!) {
    lessonState(lessonId: $lessonId) {
      id
      lessonId
      state
      savedAt
    }
  }
`;

// Project Submission Mutations
export const SUBMIT_PROJECT = gql`
  mutation SubmitProject($input: ProjectSubmissionInput!) {
    submitProject(input: $input) {
      id
      projectId
      status
      score
      percentage
      passed
      feedback {
        id
        type
        message
        severity
        lineNumber
        suggestion
      }
      submittedAt
      gradedAt
      processingTime
      metadata
    }
  }
`;

export const GET_PROJECT_STATUS = gql`
  query GetProjectStatus($projectId: ID!) {
    projectStatus(projectId: $projectId) {
      id
      projectId
      status
      score
      percentage
      passed
      feedback {
        id
        type
        message
        severity
        lineNumber
        suggestion
      }
      submittedAt
      gradedAt
      processingTime
      metadata
    }
  }
`;

export const GET_PROJECT_HISTORY = gql`
  query GetProjectHistory {
    projectHistory {
      id
      projectId
      status
      score
      percentage
      passed
      feedback {
        id
        type
        message
        severity
        lineNumber
        suggestion
      }
      submittedAt
      gradedAt
      processingTime
      metadata
      project {
        id
        title
        description
        difficulty
        category
      }
    }
  }
`;

// HTTP Link
const httpLink = createHttpLink({
	uri: ENV.GRAPHQL_ENDPOINT,
});

// Auth Link - adds authentication headers
const authLink = setContext((_, { headers }) => {
	// Get the authentication token from local storage if it exists
	const token = localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);

	// Return the headers to the context so httpLink can read them
	return {
		headers: {
			...headers,
			authorization: token ? `Bearer ${token}` : "",
		},
	};
});

// Error Link - handles GraphQL and network errors
const errorLink = onError(
	({ graphQLErrors, networkError, operation, forward }) => {
		if (graphQLErrors) {
			graphQLErrors.forEach(({ message, locations, path }) => {
				console.error(
					`[GraphQL error]: Message: ${message}, Location: ${locations}, Path: ${path}`,
				);

				// Handle authentication errors
				if (message.includes("Unauthorized") || message.includes("Forbidden")) {
					// Clear invalid token and redirect to login
					localStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
					window.location.href = "/login";
				}
			});
		}

		if (networkError) {
			console.error(`[Network error]: ${networkError}`);

			// Handle network errors
			if (networkError.statusCode === 401) {
				localStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
				window.location.href = "/login";
			}
		}
	},
);

// Retry Link - retries failed requests
const retryLink = new RetryLink({
	delay: {
		initial: REQUEST_CONFIG.RETRY_DELAY,
		max: REQUEST_CONFIG.TIMEOUT,
		jitter: true,
	},
	attempts: {
		max: REQUEST_CONFIG.RETRY_ATTEMPTS,
		retryIf: (error, _operation) => {
			// Retry on network errors, but not on GraphQL errors
			return !!error && !error.graphQLErrors;
		},
	},
});

// Create Apollo Client
export const apolloClient = new ApolloClient({
	link: from([errorLink, retryLink, authLink, httpLink]),
	cache: new InMemoryCache({
		typePolicies: {
			Query: {
				fields: {
					// Configure cache policies for specific queries
					getDailyLesson: {
						merge: false, // Don't merge, always replace
					},
					userProgress: {
						merge: false,
					},
					leaderboard: {
						merge: false,
					},
				},
			},
		},
	}),
	defaultOptions: {
		watchQuery: {
			errorPolicy: "all",
			fetchPolicy: "cache-and-network",
		},
		query: {
			errorPolicy: "all",
			fetchPolicy: "cache-first",
		},
		mutate: {
			errorPolicy: "all",
		},
	},
});

// Helper function to clear cache
export const clearApolloCache = () => {
	apolloClient.clearStore();
};

// Helper function to reset store (clears cache and refetches active queries)
export const resetApolloStore = () => {
	apolloClient.resetStore();
};

// Export the client as default
export default apolloClient;
