import type React from "react";
import { useState, useEffect, useCallback } from "react";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
	Shield,
	Lock,
	Key,
	RefreshCw,
	AlertTriangle,
	CheckCircle,
	XCircle,
	Download,
	Database,
	Clock,
} from "lucide-react";
import {
	useEncryption,
	useSecureStorage,
	useSecureTransmission,
	useEncryptionConfig,
	useSensitiveForm,
} from "@/hooks/useEncryption";
import type { EncryptionConfig } from "@/services/encryptionService";
import { addBreadcrumb } from "@/services/monitoringService";

interface SecurityStats {
	totalEncryptions: number;
	totalDecryptions: number;
	secureTransmissions: number;
	failedOperations: number;
	keyRotations: number;
	lastKeyRotation: Date | null;
	averageEncryptionTime: number;
	averageDecryptionTime: number;
	storageUsage: number;
	integrityChecks: number;
	integrityFailures: number;
}

interface SecurityAlert {
	id: string;
	type: "warning" | "error" | "info" | "success";
	message: string;
	timestamp: Date;
	category: string;
	resolved: boolean;
}

export const SecurityDashboard: React.FC = () => {
	const [isLoading, setIsLoading] = useState(true);
	const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
	const [securityStats, setSecurityStats] = useState<SecurityStats | null>(
		null,
	);
	const [_alerts, _setAlerts] = useState<SecurityAlert[]>([]);
	const [testData, setTestData] = useState("");
	const [encryptedData, setEncryptedData] = useState("");
	const [decryptedData, setDecryptedData] = useState("");

	const {
		isInitialized,
		error: encryptionError,
		encryptData,
		decryptData,
	} = useEncryption();

	const { error: storageError } = useSecureStorage();

	const { error: transmissionError } = useSecureTransmission();

	const { config, stats, updateConfig, rotateKeys } = useEncryptionConfig();

	const {
		data: formData,
		isEncrypted: formEncrypted,
		isLoading: formLoading,
		updateField,
		saveToStorage,
		clearForm,
	} = useSensitiveForm(
		{
			name: "",
			email: "",
			password: "",
			notes: "",
		},
		"test_form",
	);

	const refreshData = useCallback(async () => {
		setIsLoading(true);
		try {
			// Simulate fetching security stats
			const mockStats: SecurityStats = {
				totalEncryptions: Math.floor(Math.random() * 1000) + 500,
				totalDecryptions: Math.floor(Math.random() * 1000) + 500,
				secureTransmissions: Math.floor(Math.random() * 100) + 50,
				failedOperations: Math.floor(Math.random() * 10),
				keyRotations: Math.floor(Math.random() * 5) + 1,
				lastKeyRotation: new Date(
					Date.now() - Math.random() * 24 * 60 * 60 * 1000,
				),
				averageEncryptionTime: Math.random() * 100 + 50,
				averageDecryptionTime: Math.random() * 100 + 50,
				storageUsage: Math.random() * 100,
				integrityChecks: Math.floor(Math.random() * 500) + 200,
				integrityFailures: Math.floor(Math.random() * 5),
			};

			setSecurityStats(mockStats);
			setLastRefresh(new Date());

			addBreadcrumb("security_dashboard_refreshed", "security");
		} catch (error) {
			console.error("Failed to refresh security data:", error);
		} finally {
			setIsLoading(false);
		}
	}, []);

	const handleTestEncryption = async () => {
		if (!testData.trim()) return;

		try {
			const encrypted = await encryptData(testData, { verifyIntegrity: true });
			setEncryptedData(JSON.stringify(encrypted, null, 2));
			setDecryptedData("");

			addBreadcrumb("test_encryption_performed", "security");
		} catch (error) {
			console.error("Test encryption failed:", error);
		}
	};

	const handleTestDecryption = async () => {
		if (!encryptedData.trim()) return;

		try {
			const parsed = JSON.parse(encryptedData);
			const decrypted = await decryptData(parsed);
			setDecryptedData(
				typeof decrypted === "string"
					? decrypted
					: JSON.stringify(decrypted, null, 2),
			);

			addBreadcrumb("test_decryption_performed", "security");
		} catch (error) {
			console.error("Test decryption failed:", error);
		}
	};

	const handleKeyRotation = async () => {
		try {
			await rotateKeys();

			addBreadcrumb("manual_key_rotation_performed", "security");
		} catch (error) {
			console.error("Key rotation failed:", error);
		}
	};

	const handleConfigUpdate = (updates: Partial<typeof config>) => {
		try {
			updateConfig(updates);

			addBreadcrumb("security_config_updated", "security");
		} catch (error) {
			console.error("Config update failed:", error);
		}
	};

	const getSecurityStatus = () => {
		if (!isInitialized) return "initializing";
		if (encryptionError || storageError || transmissionError) return "error";
		if (stats.keyCount === 0) return "warning";
		return "secure";
	};

	const getStatusIcon = (status: string) => {
		switch (status) {
			case "secure":
				return <CheckCircle className="h-5 w-5 text-green-600" />;
			case "warning":
				return <AlertTriangle className="h-5 w-5 text-yellow-600" />;
			case "error":
				return <XCircle className="h-5 w-5 text-red-600" />;
			default:
				return <Clock className="h-5 w-5 text-gray-600" />;
		}
	};

	useEffect(() => {
		refreshData();
	}, [refreshData]);

	if (isLoading && !securityStats) {
		return (
			<div className="flex items-center justify-center h-64">
				<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
			</div>
		);
	}

	const securityStatus = getSecurityStatus();

	return (
		<div className="space-y-6">
			{/* Header */}
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-3xl font-bold tracking-tight">
						Security Dashboard
					</h1>
					<p className="text-muted-foreground">
						Monitor and manage encryption, secure transmission, and security
						settings
					</p>
				</div>
				<div className="flex items-center gap-2">
					<Badge
						variant={securityStatus === "secure" ? "default" : "destructive"}
					>
						{getStatusIcon(securityStatus)}
						<span className="ml-1 capitalize">{securityStatus}</span>
					</Badge>
					<Button onClick={refreshData} variant="outline" size="sm">
						<RefreshCw className="h-4 w-4 mr-2" />
						Refresh
					</Button>
				</div>
			</div>

			{/* Last Updated */}
			<div className="text-sm text-muted-foreground">
				Last updated: {lastRefresh.toLocaleString()}
			</div>

			{/* Security Status Alert */}
			{securityStatus !== "secure" && (
				<Alert variant={securityStatus === "error" ? "destructive" : "default"}>
					<AlertTriangle className="h-4 w-4" />
					<AlertDescription>
						{securityStatus === "error" &&
							"Security system has encountered errors. Please check the configuration."}
						{securityStatus === "warning" &&
							"Security system needs attention. Consider rotating keys or updating settings."}
						{securityStatus === "initializing" &&
							"Security system is initializing. Please wait..."}
					</AlertDescription>
				</Alert>
			)}

			{/* Overview Cards */}
			<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium">
							Encryption Status
						</CardTitle>
						<Shield className="h-4 w-4 text-muted-foreground" />
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold">{stats.keyCount}</div>
						<p className="text-xs text-muted-foreground">Active keys</p>
					</CardContent>
				</Card>

				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium">Algorithm</CardTitle>
						<Lock className="h-4 w-4 text-muted-foreground" />
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold">{config.algorithm}</div>
						<p className="text-xs text-muted-foreground">
							{config.keyLength}-bit keys
						</p>
					</CardContent>
				</Card>

				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium">
							Integrity Checks
						</CardTitle>
						<CheckCircle className="h-4 w-4 text-muted-foreground" />
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold">
							{securityStats ? securityStats.integrityChecks : 0}
						</div>
						<p className="text-xs text-muted-foreground">
							{securityStats ? securityStats.integrityFailures : 0} failures
						</p>
					</CardContent>
				</Card>

				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium">Storage Usage</CardTitle>
						<Database className="h-4 w-4 text-muted-foreground" />
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold">
							{securityStats ? Math.round(securityStats.storageUsage) : 0}%
						</div>
						<Progress
							value={securityStats?.storageUsage || 0}
							className="mt-2"
						/>
					</CardContent>
				</Card>
			</div>

			{/* Main Content Tabs */}
			<Tabs defaultValue="overview" className="space-y-4">
				<TabsList>
					<TabsTrigger value="overview">Overview</TabsTrigger>
					<TabsTrigger value="testing">Testing</TabsTrigger>
					<TabsTrigger value="configuration">Configuration</TabsTrigger>
					<TabsTrigger value="monitoring">Monitoring</TabsTrigger>
				</TabsList>

				<TabsContent value="overview" className="space-y-4">
					<div className="grid gap-4 md:grid-cols-2">
						{/* Security Statistics */}
						<Card>
							<CardHeader>
								<CardTitle>Security Statistics</CardTitle>
								<CardDescription>
									Overview of encryption and security operations
								</CardDescription>
							</CardHeader>
							<CardContent className="space-y-4">
								{securityStats && (
									<div className="space-y-3">
										<div className="flex justify-between">
											<span>Total Encryptions:</span>
											<span className="font-mono">
												{securityStats.totalEncryptions}
											</span>
										</div>
										<div className="flex justify-between">
											<span>Total Decryptions:</span>
											<span className="font-mono">
												{securityStats.totalDecryptions}
											</span>
										</div>
										<div className="flex justify-between">
											<span>Secure Transmissions:</span>
											<span className="font-mono">
												{securityStats.secureTransmissions}
											</span>
										</div>
										<div className="flex justify-between">
											<span>Failed Operations:</span>
											<span className="font-mono text-red-600">
												{securityStats.failedOperations}
											</span>
										</div>
										<div className="flex justify-between">
											<span>Key Rotations:</span>
											<span className="font-mono">
												{securityStats.keyRotations}
											</span>
										</div>
										<div className="flex justify-between">
											<span>Avg Encryption Time:</span>
											<span className="font-mono">
												{securityStats.averageEncryptionTime.toFixed(2)}ms
											</span>
										</div>
										<div className="flex justify-between">
											<span>Avg Decryption Time:</span>
											<span className="font-mono">
												{securityStats.averageDecryptionTime.toFixed(2)}ms
											</span>
										</div>
									</div>
								)}
							</CardContent>
						</Card>

						{/* Current Status */}
						<Card>
							<CardHeader>
								<CardTitle>Current Status</CardTitle>
								<CardDescription>
									Real-time security system status
								</CardDescription>
							</CardHeader>
							<CardContent className="space-y-4">
								<div className="space-y-3">
									<div className="flex justify-between items-center">
										<span>Encryption Service:</span>
										<Badge variant={isInitialized ? "default" : "destructive"}>
											{isInitialized ? "Active" : "Inactive"}
										</Badge>
									</div>
									<div className="flex justify-between items-center">
										<span>Integrity Checks:</span>
										<Badge
											variant={
												config.enableIntegrityCheck ? "default" : "secondary"
											}
										>
											{config.enableIntegrityCheck ? "Enabled" : "Disabled"}
										</Badge>
									</div>
									<div className="flex justify-between items-center">
										<span>Compression:</span>
										<Badge
											variant={
												config.enableCompression ? "default" : "secondary"
											}
										>
											{config.enableCompression ? "Enabled" : "Disabled"}
										</Badge>
									</div>
									<div className="flex justify-between items-center">
										<span>Key Rotation:</span>
										<Badge
											variant={
												config.enableKeyRotation ? "default" : "secondary"
											}
										>
											{config.enableKeyRotation ? "Auto" : "Manual"}
										</Badge>
									</div>
									<div className="flex justify-between items-center">
										<span>Algorithm:</span>
										<Badge variant="outline">{config.algorithm}</Badge>
									</div>
									<div className="flex justify-between items-center">
										<span>Key Length:</span>
										<Badge variant="outline">{config.keyLength}-bit</Badge>
									</div>
								</div>

								<Separator />

								<div className="space-y-2">
									<div className="flex justify-between items-center">
										<span className="text-sm font-medium">Actions</span>
									</div>
									<div className="flex gap-2">
										<Button
											onClick={handleKeyRotation}
											size="sm"
											variant="outline"
											disabled={!isInitialized}
										>
											<Key className="h-4 w-4 mr-1" />
											Rotate Keys
										</Button>
										<Button onClick={refreshData} size="sm" variant="outline">
											<RefreshCw className="h-4 w-4 mr-1" />
											Refresh
										</Button>
									</div>
								</div>
							</CardContent>
						</Card>
					</div>
				</TabsContent>

				<TabsContent value="testing" className="space-y-4">
					<div className="grid gap-4 md:grid-cols-2">
						{/* Encryption Testing */}
						<Card>
							<CardHeader>
								<CardTitle>Encryption Testing</CardTitle>
								<CardDescription>
									Test encryption and decryption functionality
								</CardDescription>
							</CardHeader>
							<CardContent className="space-y-4">
								<div className="space-y-2">
									<Label htmlFor="test-data">Test Data</Label>
									<Textarea
										id="test-data"
										placeholder="Enter data to encrypt..."
										value={testData}
										onChange={(e) => setTestData(e.target.value)}
										rows={3}
									/>
								</div>
								<div className="flex gap-2">
									<Button
										onClick={handleTestEncryption}
										disabled={!testData.trim() || !isInitialized}
									>
										<Lock className="h-4 w-4 mr-2" />
										Encrypt
									</Button>
									<Button
										onClick={handleTestDecryption}
										disabled={!encryptedData.trim() || !isInitialized}
										variant="outline"
									>
										<Key className="h-4 w-4 mr-2" />
										Decrypt
									</Button>
								</div>
							</CardContent>
						</Card>

						{/* Results */}
						<Card>
							<CardHeader>
								<CardTitle>Results</CardTitle>
								<CardDescription>
									View encrypted and decrypted data
								</CardDescription>
							</CardHeader>
							<CardContent className="space-y-4">
								<div className="space-y-2">
									<Label>Encrypted Data</Label>
									<Textarea
										value={encryptedData}
										readOnly
										placeholder="Encrypted data will appear here..."
										rows={4}
										className="font-mono text-xs"
									/>
								</div>
								<div className="space-y-2">
									<Label>Decrypted Data</Label>
									<Textarea
										value={decryptedData}
										readOnly
										placeholder="Decrypted data will appear here..."
										rows={4}
										className="font-mono text-xs"
									/>
								</div>
							</CardContent>
						</Card>
					</div>

					{/* Sensitive Form Testing */}
					<Card>
						<CardHeader>
							<CardTitle>Sensitive Form Testing</CardTitle>
							<CardDescription>
								Test secure form data handling with encryption
							</CardDescription>
						</CardHeader>
						<CardContent className="space-y-4">
							<div className="grid gap-4 md:grid-cols-2">
								<div className="space-y-2">
									<Label htmlFor="form-name">Name</Label>
									<Input
										id="form-name"
										value={formData.name}
										onChange={(e) => updateField("name", e.target.value)}
										placeholder="Enter name..."
									/>
								</div>
								<div className="space-y-2">
									<Label htmlFor="form-email">Email</Label>
									<Input
										id="form-email"
										type="email"
										value={formData.email}
										onChange={(e) => updateField("email", e.target.value)}
										placeholder="Enter email..."
									/>
								</div>
							</div>
							<div className="space-y-2">
								<Label htmlFor="form-password">Password</Label>
								<Input
									id="form-password"
									type="password"
									value={formData.password}
									onChange={(e) => updateField("password", e.target.value)}
									placeholder="Enter password..."
								/>
							</div>
							<div className="space-y-2">
								<Label htmlFor="form-notes">Notes</Label>
								<Textarea
									id="form-notes"
									value={formData.notes}
									onChange={(e) => updateField("notes", e.target.value)}
									placeholder="Enter sensitive notes..."
									rows={3}
								/>
							</div>
							<div className="flex gap-2">
								<Button
									onClick={saveToStorage}
									disabled={!isInitialized || formLoading}
								>
									<Download className="h-4 w-4 mr-2" />
									Save Securely
								</Button>
								<Button onClick={clearForm} variant="outline">
									Clear Form
								</Button>
								<Badge variant={formEncrypted ? "default" : "secondary"}>
									{formEncrypted ? "Encrypted" : "Plain Text"}
								</Badge>
							</div>
						</CardContent>
					</Card>
				</TabsContent>

				<TabsContent value="configuration" className="space-y-4">
					<Card>
						<CardHeader>
							<CardTitle>Security Configuration</CardTitle>
							<CardDescription>
								Configure encryption and security settings
							</CardDescription>
						</CardHeader>
						<CardContent className="space-y-6">
							<div className="space-y-4">
								<div className="flex items-center justify-between">
									<div className="space-y-0.5">
										<Label>Enable Integrity Checks</Label>
										<p className="text-sm text-muted-foreground">
											Verify data integrity using HMAC signatures
										</p>
									</div>
									<Switch
										checked={config.enableIntegrityCheck}
										onCheckedChange={(checked) =>
											handleConfigUpdate({ enableIntegrityCheck: checked })
										}
									/>
								</div>

								<div className="flex items-center justify-between">
									<div className="space-y-0.5">
										<Label>Enable Compression</Label>
										<p className="text-sm text-muted-foreground">
											Compress data before encryption to reduce size
										</p>
									</div>
									<Switch
										checked={config.enableCompression}
										onCheckedChange={(checked) =>
											handleConfigUpdate({ enableCompression: checked })
										}
									/>
								</div>

								<div className="flex items-center justify-between">
									<div className="space-y-0.5">
										<Label>Enable Key Rotation</Label>
										<p className="text-sm text-muted-foreground">
											Automatically rotate encryption keys
										</p>
									</div>
									<Switch
										checked={config.enableKeyRotation}
										onCheckedChange={(checked) =>
											handleConfigUpdate({ enableKeyRotation: checked })
										}
									/>
								</div>
							</div>

							<Separator />

							<div className="grid gap-4 md:grid-cols-2">
								<div className="space-y-2">
									<Label htmlFor="algorithm">Encryption Algorithm</Label>
									<select
										id="algorithm"
										value={config.algorithm}
										onChange={(e) =>
											handleConfigUpdate({
												algorithm: e.target
													.value as EncryptionConfig["algorithm"],
											})
										}
										className="w-full p-2 border rounded-md"
									>
										<option value="AES-GCM">AES-GCM</option>
										<option value="AES-CBC">AES-CBC</option>
									</select>
								</div>

								<div className="space-y-2">
									<Label htmlFor="key-length">Key Length</Label>
									<select
										id="key-length"
										value={config.keyLength}
										onChange={(e) =>
											handleConfigUpdate({
												keyLength: Number(
													e.target.value,
												) as EncryptionConfig["keyLength"],
											})
										}
										className="w-full p-2 border rounded-md"
									>
										<option value={128}>128-bit</option>
										<option value={192}>192-bit</option>
										<option value={256}>256-bit</option>
									</select>
								</div>
							</div>

							<div className="space-y-2">
								<Label htmlFor="rotation-interval">
									Key Rotation Interval (hours)
								</Label>
								<Input
									id="rotation-interval"
									type="number"
									value={Math.round(
										config.keyRotationInterval / (1000 * 60 * 60),
									)}
									onChange={(e) =>
										handleConfigUpdate({
											keyRotationInterval:
												parseInt(e.target.value, 10) * 1000 * 60 * 60,
										})
									}
									min={1}
									max={168} // 1 week
								/>
							</div>
						</CardContent>
					</Card>
				</TabsContent>

				<TabsContent value="monitoring" className="space-y-4">
					<Card>
						<CardHeader>
							<CardTitle>Security Monitoring</CardTitle>
							<CardDescription>
								Monitor security events and system health
							</CardDescription>
						</CardHeader>
						<CardContent className="space-y-4">
							<div className="grid gap-4 md:grid-cols-2">
								<div className="space-y-2">
									<Label>System Health</Label>
									<div className="space-y-2">
										<div className="flex justify-between">
											<span>Encryption Service:</span>
											<Badge
												variant={isInitialized ? "default" : "destructive"}
											>
												{isInitialized ? "Healthy" : "Unhealthy"}
											</Badge>
										</div>
										<div className="flex justify-between">
											<span>Storage Service:</span>
											<Badge variant={storageError ? "destructive" : "default"}>
												{storageError ? "Error" : "Healthy"}
											</Badge>
										</div>
										<div className="flex justify-between">
											<span>Transmission Service:</span>
											<Badge
												variant={transmissionError ? "destructive" : "default"}
											>
												{transmissionError ? "Error" : "Healthy"}
											</Badge>
										</div>
									</div>
								</div>

								<div className="space-y-2">
									<Label>Performance Metrics</Label>
									<div className="space-y-2">
										<div className="flex justify-between">
											<span>Active Keys:</span>
											<span className="font-mono">{stats.keyCount}</span>
										</div>
										<div className="flex justify-between">
											<span>Algorithm:</span>
											<span className="font-mono">{stats.algorithm}</span>
										</div>
										<div className="flex justify-between">
											<span>Key Length:</span>
											<span className="font-mono">{stats.keyLength}-bit</span>
										</div>
									</div>
								</div>
							</div>

							{encryptionError && (
								<Alert variant="destructive">
									<AlertTriangle className="h-4 w-4" />
									<AlertDescription>
										Encryption Error: {encryptionError.message}
									</AlertDescription>
								</Alert>
							)}

							{storageError && (
								<Alert variant="destructive">
									<AlertTriangle className="h-4 w-4" />
									<AlertDescription>
										Storage Error: {storageError.message}
									</AlertDescription>
								</Alert>
							)}

							{transmissionError && (
								<Alert variant="destructive">
									<AlertTriangle className="h-4 w-4" />
									<AlertDescription>
										Transmission Error: {transmissionError.message}
									</AlertDescription>
								</Alert>
							)}
						</CardContent>
					</Card>
				</TabsContent>
			</Tabs>
		</div>
	);
};

export default SecurityDashboard;
