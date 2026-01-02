import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import Editor from "@monaco-editor/react";
import {
	Play,
	Save,
	RotateCcw,
	CheckCircle,
	XCircle,
	Clock,
	RefreshCw,
	Download,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useProjects } from "@/hooks/useProjects";
import {
	projectQueueService,
	type QueueItem,
	type QueueStats,
} from "@/services/projectQueueService";
import type {
	CodeEvaluationResponse,
	CodeFeedback,
} from "@/services/llmService";
import type { ProjectSubmission } from "@/types/api";

interface MiniProjectSandboxProps {
	projectId: string;
	title: string;
	description: string;
	initialCode?: string;
	language?: string;
	expectedOutput?: string;
	requirements?: string[];
	rubric?: {
		functionality: number;
		codeQuality: number;
		bestPractices: number;
	};
	onSubmit?: (submission: ProjectSubmission) => void;
}

const defaultCode = {
	javascript: `// Write a function that uses AI prompt engineering
function createPrompt(context, task, tone = 'professional') {
  // Your code here
  return \`As a \${tone} assistant, \${context}. Please \${task}.\`;
}

// Test your function
console.log(createPrompt(
  "you are helping a developer", 
  "explain async/await in simple terms"
));`,
	python: `# Write a function that uses AI prompt engineering
def create_prompt(context, task, tone='professional'):
    """Create an effective AI prompt"""
    # Your code here
    return f"As a {tone} assistant, {context}. Please {task}."

# Test your function
print(create_prompt(
    "you are helping a developer", 
    "explain async/await in simple terms"
))`,
	html: `<!DOCTYPE html>
<html>
<head>
    <title>AI Chat Interface</title>
    <style>
        /* Style your chat interface */
        .chat-container { 
            max-width: 600px; 
            margin: 20px auto; 
            padding: 20px;
        }
    </style>
</head>
<body>
    <div class="chat-container">
        <h1>AI Assistant</h1>
        <!-- Build your chat interface here -->
    </div>
</body>
</html>`,
};

export const MiniProjectSandbox = ({
	projectId,
	title,
	description,
	initialCode,
	language = "javascript",
	expectedOutput,
	requirements = [],
	rubric = {
		functionality: 40,
		codeQuality: 30,
		bestPractices: 30,
	},
	onSubmit,
}: MiniProjectSandboxProps) => {
	const [code, setCode] = useState(
		initialCode || defaultCode[language as keyof typeof defaultCode] || "",
	);
	const [output, setOutput] = useState("");
	const [isRunning, setIsRunning] = useState(false);
	const [activeTab, setActiveTab] = useState("code");
	const [queueItem, setQueueItem] = useState<QueueItem | null>(null);
	const [evaluationResult, setEvaluationResult] =
		useState<CodeEvaluationResponse | null>(null);
	const [queueStats, setQueueStats] = useState<QueueStats | null>(null);
	const [isCheckingStatus, setIsCheckingStatus] = useState(false);
	const editorRef = useRef<any>(null);
	const { toast } = useToast();
	const {
		submitProject,
		getProjectStatus,
		resubmitProject,
		downloadProjectFiles,
		isSubmitting,
		clearError,
	} = useProjects();

	// Subscribe to queue events
	useEffect(() => {
		const listenerId = projectQueueService.subscribe(
			[
				"item_added",
				"item_started",
				"item_completed",
				"item_failed",
				"queue_updated",
			],
			(event) => {
				switch (event.type) {
					case "item_added":
						if (event.data?.item && event.data.item.projectId === projectId) {
							setQueueItem(event.data.item);
						}
						break;
					case "item_started":
						if (event.data?.item && event.data.item.projectId === projectId) {
							setQueueItem(event.data.item);
							toast({
								title: "Processing Started",
								description: "Your project is now being evaluated by AI.",
							});
						}
						break;
					case "item_completed":
						if (event.data?.item && event.data.item.projectId === projectId) {
							setQueueItem(event.data.item);
							setEvaluationResult(event.data.result);
							toast({
								title: "Evaluation Complete",
								description: `Score: ${event.data.result.score}/100`,
							});
						}
						break;
					case "item_failed":
						if (event.data?.item && event.data.item.projectId === projectId) {
							setQueueItem(event.data.item);
							toast({
								title: "Evaluation Failed",
								description: event.data.error || "Please try again.",
								variant: "destructive",
							});
						}
						break;
					case "queue_updated":
						if (event.data?.stats) {
							setQueueStats(event.data.stats);
						}
						break;
				}
			},
		);

		// Get initial queue stats
		setQueueStats(projectQueueService.getQueueStats());

		return () => {
			projectQueueService.unsubscribe(listenerId);
		};
	}, [projectId, toast]);

	// Clear errors when component unmounts
	useEffect(() => {
		return () => {
			clearError();
		};
	}, [clearError]);

	const handleEditorDidMount = (editor: any) => {
		editorRef.current = editor;
		editor.updateOptions({
			fontSize: 14,
			minimap: { enabled: false },
			scrollBeyondLastLine: false,
			automaticLayout: true,
		});
	};

	const runCode = async () => {
		setIsRunning(true);
		setActiveTab("output");

		try {
			// Simulate code execution
			setTimeout(() => {
				if (language === "javascript") {
					// Mock JavaScript execution
					setOutput(
						"As a professional assistant, you are helping a developer. Please explain async/await in simple terms.",
					);
				} else if (language === "python") {
					setOutput(
						"As a professional assistant, you are helping a developer. Please explain async/await in simple terms.",
					);
				} else {
					setOutput(
						"HTML preview would be rendered here in a real environment.",
					);
				}
				setIsRunning(false);
			}, 1000);
		} catch (error) {
			setOutput(`Error: ${error}`);
			setIsRunning(false);
		}
	};

	const submitProjectToQueue = async () => {
		try {
			const submission: ProjectSubmission = {
				projectId,
				code,
				language,
				files: [],
				metadata: {
					lessonId: projectId,
					difficulty: "intermediate",
					learningObjectives: requirements,
					timestamp: new Date().toISOString(),
				},
			};

			// Add to queue
			const queueItem = await projectQueueService.addToQueue(
				projectId,
				"current-user-id", // This would come from auth context
				submission,
				"normal",
			);

			setQueueItem(queueItem);

			// Also submit to backend for persistence
			await submitProject(submission);

			toast({
				title: "Project Submitted!",
				description: "Your project has been added to the evaluation queue.",
			});

			onSubmit?.(submission);
		} catch (error: any) {
			toast({
				title: "Submission Failed",
				description: error.message || "Please try again.",
				variant: "destructive",
			});
		}
	};

	const checkProjectStatus = async () => {
		if (!queueItem) return;

		try {
			setIsCheckingStatus(true);
			const result = await getProjectStatus(queueItem.id);

			if (result) {
				setEvaluationResult({
					id: result.id,
					projectId: result.projectId,
					score: result.score || 0,
					percentage: result.percentage || 0,
					passed: result.passed || false,
					feedback: result.feedback || [],
					rubric: result.rubric || rubric,
					analysis: result.analysis || {
						strengths: [],
						weaknesses: [],
						suggestions: [],
						complexity: "beginner",
					},
					processingTime: result.processingTime || 0,
					model: result.model || "unknown",
					provider: result.provider || "unknown",
					evaluatedAt: result.evaluatedAt || new Date().toISOString(),
				});
			}
		} catch (error: any) {
			toast({
				title: "Status Check Failed",
				description: error.message || "Please try again.",
				variant: "destructive",
			});
		} finally {
			setIsCheckingStatus(false);
		}
	};

	const resubmitProjectToQueue = async () => {
		if (!queueItem) return;

		try {
			const submission: ProjectSubmission = {
				projectId,
				code,
				language,
				files: [],
				metadata: {
					lessonId: projectId,
					difficulty: "intermediate",
					learningObjectives: requirements,
					timestamp: new Date().toISOString(),
					resubmission: true,
					originalSubmissionId: queueItem.id,
				},
			};

			// Cancel current queue item
			await projectQueueService.cancelQueueItem(
				queueItem.id,
				"current-user-id",
			);

			// Add new submission to queue
			const newQueueItem = await projectQueueService.addToQueue(
				projectId,
				"current-user-id",
				submission,
				"high", // Higher priority for resubmissions
			);

			setQueueItem(newQueueItem);
			setEvaluationResult(null);

			// Submit to backend
			await resubmitProject(queueItem.id, submission);

			toast({
				title: "Project Resubmitted!",
				description: "Your updated project is being evaluated.",
			});
		} catch (error: any) {
			toast({
				title: "Resubmission Failed",
				description: error.message || "Please try again.",
				variant: "destructive",
			});
		}
	};

	const handleDownloadProjectFiles = async () => {
		try {
			const files = await downloadProjectFiles(projectId);
			toast({
				title: "Files Downloaded",
				description: `${files.length} project files downloaded.`,
			});
		} catch (error: any) {
			toast({
				title: "Download Failed",
				description: error.message || "Please try again.",
				variant: "destructive",
			});
		}
	};

	const resetCode = () => {
		setCode(defaultCode[language as keyof typeof defaultCode] || "");
		setOutput("");
		setQueueItem(null);
		setEvaluationResult(null);
	};

	const getStatusIcon = (status: string) => {
		switch (status) {
			case "pending":
				return <Clock className="w-4 h-4 text-yellow-500 animate-spin" />;
			case "processing":
			case "evaluating":
				return <RefreshCw className="w-4 h-4 text-blue-500 animate-spin" />;
			case "completed":
				return <CheckCircle className="w-4 h-4 text-green-500" />;
			case "failed":
				return <XCircle className="w-4 h-4 text-red-500" />;
			default:
				return null;
		}
	};

	const getStatusColor = (status: string) => {
		switch (status) {
			case "pending":
				return "bg-yellow-100 text-yellow-800 border-yellow-200";
			case "processing":
			case "evaluating":
				return "bg-blue-100 text-blue-800 border-blue-200";
			case "completed":
				return "bg-green-100 text-green-800 border-green-200";
			case "failed":
				return "bg-red-100 text-red-800 border-red-200";
			default:
				return "bg-gray-100 text-gray-800 border-gray-200";
		}
	};

	const renderFeedback = (feedback: CodeFeedback[]) => {
		return feedback.map((item) => (
			<div
				key={`feedback-${item.message}-${item.category}-${item.lineNumber || "no-line"}`}
				className={`p-3 rounded-lg border-l-4 ${
					item.type === "success"
						? "border-green-500 bg-green-50"
						: item.type === "error"
							? "border-red-500 bg-red-50"
							: item.type === "warning"
								? "border-yellow-500 bg-yellow-50"
								: "border-blue-500 bg-blue-50"
				}`}
			>
				<div className="flex items-start gap-2">
					<div className="flex-1">
						<p className="text-sm font-medium">{item.message}</p>
						{item.suggestion && (
							<p className="text-xs text-muted-foreground mt-1">
								<strong>Suggestion:</strong> {item.suggestion}
							</p>
						)}
						{item.lineNumber && (
							<p className="text-xs text-muted-foreground mt-1">
								Line {item.lineNumber}
							</p>
						)}
					</div>
					<Badge variant="outline" className="text-xs">
						{item.category}
					</Badge>
				</div>
			</div>
		));
	};

	return (
		<div className="h-screen flex flex-col bg-background">
			{/* Header */}
			<div className="border-b bg-card/50 backdrop-blur-sm">
				<div className="max-w-7xl mx-auto px-4 py-4">
					<div className="flex items-center justify-between">
						<div>
							<h1 className="text-xl font-semibold text-foreground">{title}</h1>
							<p className="text-sm text-muted-foreground mt-1">
								{description}
							</p>
						</div>
						<div className="flex items-center gap-2">
							<Badge variant="secondary">{language}</Badge>
							{queueItem && (
								<Badge className={getStatusColor(queueItem.status)}>
									{getStatusIcon(queueItem.status)}
									<span className="ml-1">
										{queueItem.status === "completed" && evaluationResult
											? `${evaluationResult.score}/100`
											: queueItem.status}
									</span>
								</Badge>
							)}
							{queueStats && queueStats.pendingItems > 0 && (
								<Badge variant="outline" className="text-xs">
									{queueStats.pendingItems} in queue
								</Badge>
							)}
						</div>
					</div>
				</div>
			</div>

			<div className="flex-1 flex">
				{/* Left Panel - Code Editor */}
				<div className="flex-1 flex flex-col">
					<div className="border-b bg-muted/30">
						<div className="flex items-center justify-between px-4 py-2">
							<div className="flex items-center gap-2">
								<span className="text-sm font-medium text-foreground">
									Code Editor
								</span>
								<Badge variant="outline" className="text-xs">
									{language}
								</Badge>
							</div>
							<div className="flex items-center gap-2">
								<Button variant="ghost" size="sm" onClick={resetCode}>
									<RotateCcw className="w-4 h-4 mr-1" />
									Reset
								</Button>
								<Button variant="ghost" size="sm">
									<Save className="w-4 h-4 mr-1" />
									Save
								</Button>
								<Button
									variant="ghost"
									size="sm"
									onClick={handleDownloadProjectFiles}
								>
									<Download className="w-4 h-4 mr-1" />
									Download
								</Button>
							</div>
						</div>
					</div>

					<div className="flex-1">
						<Editor
							height="100%"
							language={language}
							value={code}
							onChange={(value) => setCode(value || "")}
							onMount={handleEditorDidMount}
							theme="vs-dark"
							options={{
								fontSize: 14,
								minimap: { enabled: false },
								scrollBeyondLastLine: false,
								automaticLayout: true,
								wordWrap: "on",
								lineNumbers: "on",
								glyphMargin: false,
								folding: false,
								lineDecorationsWidth: 0,
								lineNumbersMinChars: 3,
							}}
						/>
					</div>

					<div className="border-t bg-card/50 p-4">
						<div className="flex items-center justify-between">
							<div className="flex items-center gap-2">
								<Button
									onClick={runCode}
									disabled={isRunning}
									className="bg-gradient-primary border-0 text-primary-foreground"
								>
									<Play className="w-4 h-4 mr-2" />
									{isRunning ? "Running..." : "Run Code"}
								</Button>
								<Button
									onClick={submitProjectToQueue}
									disabled={
										!code.trim() ||
										isSubmitting ||
										queueItem?.status === "pending"
									}
									variant="outline"
									className="transition-smooth hover:border-primary"
								>
									{isSubmitting || queueItem?.status === "pending"
										? "Submitting..."
										: "Submit Project"}
								</Button>
								{queueItem && queueItem.status === "completed" && (
									<Button
										onClick={resubmitProjectToQueue}
										variant="outline"
										size="sm"
									>
										<RotateCcw className="w-4 h-4 mr-1" />
										Resubmit
									</Button>
								)}
								{queueItem &&
									(queueItem.status === "processing" ||
										queueItem.status === "evaluating") && (
										<Button
											onClick={checkProjectStatus}
											disabled={isCheckingStatus}
											variant="outline"
											size="sm"
										>
											<RefreshCw
												className={`w-4 h-4 mr-1 ${isCheckingStatus ? "animate-spin" : ""}`}
											/>
											Check Status
										</Button>
									)}
							</div>
							{expectedOutput && (
								<div className="text-sm text-muted-foreground">
									Expected output available in instructions
								</div>
							)}
						</div>
					</div>
				</div>

				{/* Right Panel - Output & Instructions */}
				<div className="w-1/3 border-l bg-card/20">
					<Tabs
						value={activeTab}
						onValueChange={setActiveTab}
						className="h-full flex flex-col"
					>
						<TabsList className="grid w-full grid-cols-3 m-2">
							<TabsTrigger value="instructions">Instructions</TabsTrigger>
							<TabsTrigger value="output">Output</TabsTrigger>
							<TabsTrigger value="feedback">Feedback</TabsTrigger>
						</TabsList>

						<div className="flex-1 overflow-hidden">
							<TabsContent
								value="instructions"
								className="h-full m-0 p-4 overflow-y-auto"
							>
								<Card>
									<CardHeader>
										<CardTitle className="text-sm">Project Goal</CardTitle>
									</CardHeader>
									<CardContent className="space-y-4">
										<p className="text-sm text-muted-foreground">
											Create a function that demonstrates prompt engineering
											best practices.
										</p>
										<div className="space-y-2">
											<h4 className="text-sm font-medium">Requirements:</h4>
											<ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
												{requirements.length > 0 ? (
													requirements.map((req) => (
														<li key={`requirement-${req}`}>{req}</li>
													))
												) : (
													<>
														<li>Include context parameter</li>
														<li>Accept task specification</li>
														<li>Support tone customization</li>
														<li>Return well-structured prompt</li>
													</>
												)}
											</ul>
										</div>
										<div className="space-y-2">
											<h4 className="text-sm font-medium">Grading Rubric:</h4>
											<div className="space-y-1">
												<div className="flex justify-between text-xs">
													<span>Functionality</span>
													<span>{rubric.functionality}%</span>
												</div>
												<Progress
													value={rubric.functionality}
													className="h-1"
												/>
												<div className="flex justify-between text-xs">
													<span>Code Quality</span>
													<span>{rubric.codeQuality}%</span>
												</div>
												<Progress value={rubric.codeQuality} className="h-1" />
												<div className="flex justify-between text-xs">
													<span>Best Practices</span>
													<span>{rubric.bestPractices}%</span>
												</div>
												<Progress
													value={rubric.bestPractices}
													className="h-1"
												/>
											</div>
										</div>
										{expectedOutput && (
											<Alert>
												<AlertDescription className="text-xs">
													<strong>Expected:</strong> {expectedOutput}
												</AlertDescription>
											</Alert>
										)}
									</CardContent>
								</Card>
							</TabsContent>

							<TabsContent
								value="output"
								className="h-full m-0 p-4 overflow-y-auto"
							>
								<Card>
									<CardHeader>
										<CardTitle className="text-sm">Output</CardTitle>
									</CardHeader>
									<CardContent>
										{isRunning ? (
											<div className="flex items-center gap-2 text-sm text-muted-foreground">
												<div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
												Running code...
											</div>
										) : (
											<pre className="text-xs bg-muted p-3 rounded overflow-x-auto whitespace-pre-wrap">
												{output || "Click 'Run Code' to see output"}
											</pre>
										)}
									</CardContent>
								</Card>
							</TabsContent>

							<TabsContent
								value="feedback"
								className="h-full m-0 p-4 overflow-y-auto"
							>
								<Card>
									<CardHeader>
										<CardTitle className="text-sm">AI Feedback</CardTitle>
									</CardHeader>
									<CardContent>
										{queueItem ? (
											<div className="space-y-3">
												{queueItem.status === "pending" && (
													<div className="space-y-2">
														<div className="flex items-center gap-2 text-sm text-muted-foreground">
															<Clock className="w-4 h-4 animate-spin" />
															Waiting in queue...
														</div>
														{queueStats && (
															<div className="text-xs text-muted-foreground">
																Position: {queueItem.position} | Estimated wait:{" "}
																{Math.round(queueItem.estimatedWaitTime / 60)}{" "}
																minutes
															</div>
														)}
													</div>
												)}
												{(queueItem.status === "processing" ||
													queueItem.status === "evaluating") && (
													<div className="flex items-center gap-2 text-sm text-muted-foreground">
														<RefreshCw className="w-4 h-4 animate-spin" />
														AI is evaluating your code...
													</div>
												)}
												{queueItem.status === "completed" &&
													evaluationResult && (
														<div className="space-y-3">
															<div className="flex items-center gap-2">
																<Badge
																	variant="default"
																	className="bg-gradient-primary"
																>
																	Score: {evaluationResult.score}/100
																</Badge>
																<Badge
																	variant={
																		evaluationResult.passed
																			? "default"
																			: "secondary"
																	}
																>
																	{evaluationResult.passed
																		? "Passed"
																		: "Failed"}
																</Badge>
															</div>

															{evaluationResult.analysis && (
																<div className="space-y-2">
																	{evaluationResult.analysis.strengths.length >
																		0 && (
																		<div>
																			<h4 className="text-sm font-medium text-green-600">
																				Strengths:
																			</h4>
																			<ul className="text-xs text-muted-foreground space-y-1">
																				{evaluationResult.analysis.strengths.map(
																					(strength) => (
																						<li key={`strength-${strength}`}>
																							• {strength}
																						</li>
																					),
																				)}
																			</ul>
																		</div>
																	)}
																	{evaluationResult.analysis.weaknesses.length >
																		0 && (
																		<div>
																			<h4 className="text-sm font-medium text-red-600">
																				Areas for Improvement:
																			</h4>
																			<ul className="text-xs text-muted-foreground space-y-1">
																				{evaluationResult.analysis.weaknesses.map(
																					(weakness) => (
																						<li key={`weakness-${weakness}`}>
																							• {weakness}
																						</li>
																					),
																				)}
																			</ul>
																		</div>
																	)}
																	{evaluationResult.analysis.suggestions
																		.length > 0 && (
																		<div>
																			<h4 className="text-sm font-medium text-blue-600">
																				Suggestions:
																			</h4>
																			<ul className="text-xs text-muted-foreground space-y-1">
																				{evaluationResult.analysis.suggestions.map(
																					(suggestion) => (
																						<li
																							key={`suggestion-${suggestion}`}
																						>
																							• {suggestion}
																						</li>
																					),
																				)}
																			</ul>
																		</div>
																	)}
																</div>
															)}

															{evaluationResult.feedback &&
																evaluationResult.feedback.length > 0 && (
																	<div className="space-y-2">
																		<h4 className="text-sm font-medium">
																			Detailed Feedback:
																		</h4>
																		{renderFeedback(evaluationResult.feedback)}
																	</div>
																)}
														</div>
													)}
												{queueItem.status === "failed" && (
													<div className="space-y-2">
														<div className="flex items-center gap-2 text-sm text-red-600">
															<XCircle className="w-4 h-4" />
															Evaluation failed
														</div>
														<p className="text-xs text-muted-foreground">
															{queueItem.error ||
																"An error occurred during evaluation. Please try again."}
														</p>
														<Button
															onClick={resubmitProjectToQueue}
															variant="outline"
															size="sm"
														>
															<RotateCcw className="w-4 h-4 mr-1" />
															Retry
														</Button>
													</div>
												)}
											</div>
										) : (
											<p className="text-sm text-muted-foreground">
												Submit your project to receive AI-powered feedback and
												scoring.
											</p>
										)}
									</CardContent>
								</Card>
							</TabsContent>
						</div>
					</Tabs>
				</div>
			</div>
		</div>
	);
};
