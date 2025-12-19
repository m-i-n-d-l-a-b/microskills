#!/usr/bin/env node

import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Colors for console output
const colors = {
	reset: "\x1b[0m",
	bright: "\x1b[1m",
	red: "\x1b[31m",
	green: "\x1b[32m",
	yellow: "\x1b[33m",
	blue: "\x1b[34m",
	magenta: "\x1b[35m",
	cyan: "\x1b[36m",
};

function log(message, color = "reset") {
	console.log(`${colors[color]}${message}${colors.reset}`);
}

function checkK6Installation() {
	log("🔍 Checking k6 installation...", "blue");

	try {
		const version = execSync("k6 version", { encoding: "utf8" });
		log("✅ k6 is installed:", "green");
		log(version.trim(), "cyan");
		return true;
	} catch (_error) {
		log("❌ k6 is not installed", "red");
		return false;
	}
}

function showInstallationInstructions() {
	log("\n📋 Installation Instructions:", "yellow");
	log("================================", "yellow");

	const platform = process.platform;

	if (platform === "win32") {
		log("\n🪟 Windows Installation:", "cyan");
		log("1. Install Chocolatey (if not already installed):", "reset");
		log("   https://chocolatey.org/install", "blue");
		log("2. Install k6:", "reset");
		log("   choco install k6", "green");
		log("3. Restart your terminal", "reset");
	} else if (platform === "darwin") {
		log("\n🍎 macOS Installation:", "cyan");
		log("1. Install Homebrew (if not already installed):", "reset");
		log("   https://brew.sh/", "blue");
		log("2. Install k6:", "reset");
		log("   brew install k6", "green");
	} else if (platform === "linux") {
		log("\n🐧 Linux Installation:", "cyan");
		log("1. Add k6 repository:", "reset");
		log("   sudo gpg -k", "green");
		log(
			"   sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69",
			"green",
		);
		log(
			'   echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list',
			"green",
		);
		log("2. Install k6:", "reset");
		log("   sudo apt-get update", "green");
		log("   sudo apt-get install k6", "green");
	}

	log("\n🌐 Alternative: Download from official website:", "yellow");
	log("https://k6.io/docs/getting-started/installation/", "blue");
}

function checkTestFiles() {
	log("\n📁 Checking test files...", "blue");

	const testFiles = [
		"k6.config.js",
		"load-tests/main.js",
		"load-tests/graphql.js",
		"load-tests/run-tests.sh",
		"load-tests/test-setup.js",
		"load-tests/README.md",
	];

	let allFilesExist = true;

	testFiles.forEach((file) => {
		const filePath = path.join(__dirname, "..", file);
		if (fs.existsSync(filePath)) {
			log(`✅ ${file}`, "green");
		} else {
			log(`❌ ${file} (missing)`, "red");
			allFilesExist = false;
		}
	});

	return allFilesExist;
}

function checkPackageScripts() {
	log("\n📦 Checking package.json scripts...", "blue");

	try {
		const packageJson = JSON.parse(
			fs.readFileSync(path.join(__dirname, "..", "package.json"), "utf8"),
		);
		const scripts = packageJson.scripts;

		const loadTestScripts = [
			"load:smoke",
			"load:test",
			"load:stress",
			"load:spike",
			"load:soak",
			"load:all",
			"load:graphql",
			"load:test-setup",
		];

		let allScriptsExist = true;

		loadTestScripts.forEach((script) => {
			if (scripts[script]) {
				log(`✅ ${script}`, "green");
			} else {
				log(`❌ ${script} (missing)`, "red");
				allScriptsExist = false;
			}
		});

		return allScriptsExist;
	} catch (_error) {
		log("❌ Could not read package.json", "red");
		return false;
	}
}

function showUsageExamples() {
	log("\n🚀 Usage Examples:", "yellow");
	log("==================", "yellow");

	log("\n📋 Quick Start:", "cyan");
	log("npm run load:smoke          # Run smoke test", "green");
	log("npm run load:test           # Run load test", "green");
	log("npm run load:all            # Run all tests", "green");

	log("\n🔧 Using the shell script:", "cyan");
	log("./load-tests/run-tests.sh smoke     # Run smoke test", "green");
	log("./load-tests/run-tests.sh load      # Run load test", "green");
	log("./load-tests/run-tests.sh all       # Run all tests", "green");
	log("./load-tests/run-tests.sh --help    # Show help", "green");

	log("\n⚙️  Custom configuration:", "cyan");
	log(
		"k6 run --env BASE_URL=https://api.example.com load-tests/main.js",
		"green",
	);
	log("k6 run --scenario stress load-tests/main.js", "green");
	log("k6 run --out json=results.json load-tests/main.js", "green");
}

function main() {
	log("🧪 k6 Load Testing Setup Verification", "bright");
	log("====================================", "bright");

	const k6Installed = checkK6Installation();
	const testFilesExist = checkTestFiles();
	const scriptsExist = checkPackageScripts();

	log("\n📊 Summary:", "yellow");
	log("==========", "yellow");
	log(
		`k6 Installation: ${k6Installed ? "✅" : "❌"}`,
		k6Installed ? "green" : "red",
	);
	log(
		`Test Files: ${testFilesExist ? "✅" : "❌"}`,
		testFilesExist ? "green" : "red",
	);
	log(
		`Package Scripts: ${scriptsExist ? "✅" : "❌"}`,
		scriptsExist ? "green" : "red",
	);

	if (!k6Installed) {
		showInstallationInstructions();
	}

	if (testFilesExist && scriptsExist) {
		log("\n🎉 Setup verification completed!", "green");
		if (k6Installed) {
			log("✅ All components are ready for load testing", "green");
			showUsageExamples();
		} else {
			log("⚠️  Install k6 to start load testing", "yellow");
		}
	} else {
		log("\n❌ Some components are missing", "red");
		log(
			"Please ensure all test files and scripts are properly configured",
			"red",
		);
	}

	log("\n📚 For more information, see: load-tests/README.md", "blue");
}

// Run main function if this is the main module
main();
