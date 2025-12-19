# Dependency Management and Automated Updates

## Overview

This document outlines the comprehensive dependency management strategy for the AI Skills platform, including automated updates, security scanning, and maintenance procedures to ensure the platform remains secure, up-to-date, and performant.

## Table of Contents

1. [Dependency Management Strategy](#dependency-management-strategy)
2. [Automated Update Systems](#automated-update-systems)
3. [Security Scanning](#security-scanning)
4. [Update Procedures](#update-procedures)
5. [Monitoring and Alerting](#monitoring-and-alerting)
6. [Rollback Procedures](#rollback-procedures)
7. [Best Practices](#best-practices)

## Dependency Management Strategy

### Dependency Categories

#### Production Dependencies
```json
{
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "apollo-client": "^3.8.0",
    "graphql": "^16.8.0",
    "@supabase/supabase-js": "^2.38.0",
    "posthog-js": "^1.100.0"
  }
}
```

#### Development Dependencies
```json
{
  "devDependencies": {
    "typescript": "^5.2.0",
    "vite": "^4.5.0",
    "vitest": "^0.34.0",
    "cypress": "^13.6.0",
    "@biomejs/biome": "^2.3.8",
    "@types/react": "^18.2.0"
  }
}
```

#### Security Dependencies
```json
{
  "dependencies": {
    "helmet": "^7.1.0",
    "cors": "^2.8.5",
    "rate-limiter-flexible": "^3.0.0",
    "bcryptjs": "^2.4.3",
    "jsonwebtoken": "^9.0.2"
  }
}
```

### Version Management Strategy

#### Semantic Versioning
- **Major versions (X.0.0)**: Breaking changes, require manual review
- **Minor versions (0.X.0)**: New features, automated updates with testing
- **Patch versions (0.0.X)**: Bug fixes, automated updates

#### Update Frequency
- **Security patches**: Immediate (within 24 hours)
- **Patch updates**: Weekly
- **Minor updates**: Monthly
- **Major updates**: Quarterly (with manual review)

## Automated Update Systems

### GitHub Actions Workflow

#### Automated Dependency Updates
```yaml
# .github/workflows/dependency-updates.yml
name: Automated Dependency Updates

on:
  schedule:
    # Run daily at 2 AM UTC
    - cron: '0 2 * * *'
  workflow_dispatch:
    inputs:
      update_type:
        description: 'Type of update to perform'
        required: true
        default: 'patch'
        type: choice
        options:
          - patch
          - minor
          - major

jobs:
  update-dependencies:
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
        
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'
          
      - name: Install dependencies
        run: npm ci
        
      - name: Update dependencies
        run: |
          case ${{ github.event.inputs.update_type || 'patch' }} in
            "patch")
              npx npm-check-updates --target patch
              ;;
            "minor")
              npx npm-check-updates --target minor
              ;;
            "major")
              npx npm-check-updates --target major
              ;;
          esac
          
      - name: Install updated dependencies
        run: npm install
        
      - name: Run security audit
        run: npm audit --audit-level moderate
        
      - name: Run tests
        run: |
          npm run test
          npm run test:e2e
          
      - name: Build application
        run: npm run build
        
      - name: Create pull request
        uses: peter-evans/create-pull-request@v5
        with:
          token: ${{ secrets.GITHUB_TOKEN }}
          commit-message: 'chore: update dependencies'
          title: 'Automated dependency updates'
          body: |
            This PR contains automated dependency updates.
            
            ## Changes
            - Updated dependencies to latest compatible versions
            - All tests passing
            - Security audit passed
            
            ## Review Required
            - [ ] Manual testing
            - [ ] Performance impact assessment
            - [ ] Breaking changes review
          branch: automated-dependency-updates
          delete-branch: true
```

#### Security Updates Workflow
```yaml
# .github/workflows/security-updates.yml
name: Security Updates

on:
  schedule:
    # Run every 6 hours
    - cron: '0 */6 * * *'
  security_advisory:
  workflow_dispatch:

jobs:
  security-update:
    runs-on: ubuntu-latest
    priority: high
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
        
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'
          
      - name: Install dependencies
        run: npm ci
        
      - name: Run security audit
        run: npm audit --audit-level moderate
        
      - name: Fix security vulnerabilities
        run: npm audit fix
        continue-on-error: true
        
      - name: Update vulnerable dependencies
        run: |
          # Get list of vulnerable packages
          npm audit --json | jq -r '.vulnerabilities[].module_name' | sort -u > vulnerable-packages.txt
          
          # Update each vulnerable package
          while IFS= read -r package; do
            echo "Updating $package..."
            npm update "$package"
          done < vulnerable-packages.txt
          
      - name: Verify fixes
        run: npm audit --audit-level moderate
        
      - name: Run tests
        run: npm run test
        
      - name: Create security update PR
        uses: peter-evans/create-pull-request@v5
        with:
          token: ${{ secrets.GITHUB_TOKEN }}
          commit-message: 'security: fix vulnerabilities'
          title: 'Security vulnerability fixes'
          body: |
            This PR contains security vulnerability fixes.
            
            ## Security Updates
            - Fixed identified security vulnerabilities
            - All tests passing
            - Security audit passed
            
            ## Urgency
            - High priority security fixes
            - Requires immediate review and deployment
          branch: security-updates
          delete-branch: true
```

### Dependabot Configuration

#### Dependabot.yml
```yaml
# .github/dependabot.yml
version: 2
updates:
  # Enable version updates for npm
  - package-ecosystem: "npm"
    directory: "/"
    schedule:
      interval: "daily"
      time: "02:00"
      timezone: "UTC"
    open-pull-requests-limit: 10
    reviewers:
      - "devops-team"
    assignees:
      - "security-team"
    commit-message:
      prefix: "chore"
      include: "scope"
    labels:
      - "dependencies"
      - "automated"
    ignore:
      # Ignore major version updates for critical packages
      - dependency-name: "react"
        update-types: ["version-update:semver-major"]
      - dependency-name: "react-dom"
        update-types: ["version-update:semver-major"]
      - dependency-name: "typescript"
        update-types: ["version-update:semver-major"]
        
  # Enable version updates for GitHub Actions
  - package-ecosystem: "github-actions"
    directory: "/"
    schedule:
      interval: "weekly"
      day: "monday"
      time: "09:00"
      timezone: "UTC"
    open-pull-requests-limit: 5
    reviewers:
      - "devops-team"
    labels:
      - "dependencies"
      - "github-actions"
      
  # Enable version updates for Docker
  - package-ecosystem: "docker"
    directory: "/"
    schedule:
      interval: "weekly"
      day: "monday"
      time: "10:00"
      timezone: "UTC"
    open-pull-requests-limit: 3
    reviewers:
      - "devops-team"
    labels:
      - "dependencies"
      - "docker"
```

### Automated Testing

#### Pre-Update Testing
```yaml
# .github/workflows/pre-update-testing.yml
name: Pre-Update Testing

on:
  pull_request:
    branches: [main]
    paths:
      - 'package.json'
      - 'package-lock.json'
      - 'yarn.lock'

jobs:
  test-updates:
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
        
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'
          
      - name: Install dependencies
        run: npm ci
        
      - name: Run security audit
        run: npm audit --audit-level moderate
        
      - name: Run linting
        run: npm run lint
        
      - name: Run unit tests
        run: npm run test
        
      - name: Run integration tests
        run: npm run test:integration
        
      - name: Run end-to-end tests
        run: npm run test:e2e
        
      - name: Build application
        run: npm run build
        
      - name: Performance testing
        run: npm run test:performance
        
      - name: Bundle analysis
        run: npm run analyze
```

## Security Scanning

### Vulnerability Scanning

#### NPM Audit Integration
```javascript
// scripts/security-scan.js
const { execSync } = require('child_process');
const fs = require('fs');

async function runSecurityScan() {
  console.log('🔍 Running security scan...');
  
  try {
    // Run npm audit
    const auditResult = execSync('npm audit --json', { encoding: 'utf8' });
    const auditData = JSON.parse(auditResult);
    
    // Check for vulnerabilities
    const vulnerabilities = auditData.vulnerabilities || {};
    const vulnerabilityCount = Object.keys(vulnerabilities).length;
    
    if (vulnerabilityCount > 0) {
      console.log(`❌ Found ${vulnerabilityCount} vulnerabilities`);
      
      // Generate vulnerability report
      const report = {
        timestamp: new Date().toISOString(),
        vulnerabilityCount,
        vulnerabilities: Object.values(vulnerabilities).map(vuln => ({
          package: vuln.module_name,
          severity: vuln.severity,
          title: vuln.title,
          description: vuln.description,
          recommendation: vuln.recommendation
        }))
      };
      
      // Save report
      fs.writeFileSync('security-report.json', JSON.stringify(report, null, 2));
      
      // Exit with error for CI/CD
      process.exit(1);
    } else {
      console.log('✅ No vulnerabilities found');
    }
  } catch (error) {
    console.error('❌ Security scan failed:', error.message);
    process.exit(1);
  }
}

runSecurityScan();
```

#### Snyk Integration
```yaml
# .github/workflows/snyk-security.yml
name: Snyk Security Scan

on:
  schedule:
    - cron: '0 3 * * *'  # Daily at 3 AM
  pull_request:
    branches: [main]
  push:
    branches: [main]

jobs:
  security:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
        
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'
          
      - name: Install dependencies
        run: npm ci
        
      - name: Run Snyk to check for vulnerabilities
        uses: snyk/actions/node@master
        env:
          SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}
        with:
          args: --severity-threshold=high
          
      - name: Upload Snyk report to GitHub Code Scanning
        uses: github/codeql-action/upload-sarif@v2
        if: always()
        with:
          sarif_file: snyk.sarif
```

### License Compliance

#### License Checker
```javascript
// scripts/license-check.js
const { execSync } = require('child_process');
const fs = require('fs');

const ALLOWED_LICENSES = [
  'MIT',
  'Apache-2.0',
  'BSD-2-Clause',
  'BSD-3-Clause',
  'ISC',
  'CC0-1.0',
  'Unlicense'
];

async function checkLicenses() {
  console.log('📋 Checking license compliance...');
  
  try {
    // Run license checker
    const licenseResult = execSync('npx license-checker --json', { encoding: 'utf8' });
    const licenses = JSON.parse(licenseResult);
    
    const violations = [];
    
    for (const [package, info] of Object.entries(licenses)) {
      if (!ALLOWED_LICENSES.includes(info.licenses)) {
        violations.push({
          package,
          license: info.licenses,
          repository: info.repository
        });
      }
    }
    
    if (violations.length > 0) {
      console.log('❌ License violations found:');
      violations.forEach(violation => {
        console.log(`  - ${violation.package}: ${violation.license}`);
      });
      
      // Save violation report
      fs.writeFileSync('license-violations.json', JSON.stringify(violations, null, 2));
      process.exit(1);
    } else {
      console.log('✅ All licenses are compliant');
    }
  } catch (error) {
    console.error('❌ License check failed:', error.message);
    process.exit(1);
  }
}

checkLicenses();
```

## Update Procedures

### Automated Update Process

#### Update Workflow
```bash
#!/bin/bash
# scripts/update-dependencies.sh

set -e

echo "=== Dependency Update Process - $(date) ==="

# 1. Check current status
echo "1. Checking current dependency status..."
npm outdated

# 2. Create backup
echo "2. Creating backup..."
cp package.json package.json.backup
cp package-lock.json package-lock.json.backup

# 3. Update dependencies based on type
UPDATE_TYPE=${1:-patch}

case $UPDATE_TYPE in
  "patch")
    echo "3. Updating patch versions..."
    npx npm-check-updates --target patch
    ;;
  "minor")
    echo "3. Updating minor versions..."
    npx npm-check-updates --target minor
    ;;
  "major")
    echo "3. Updating major versions..."
    npx npm-check-updates --target major
    ;;
  *)
    echo "Invalid update type. Use: patch, minor, or major"
    exit 1
    ;;
esac

# 4. Install updated dependencies
echo "4. Installing updated dependencies..."
npm install

# 5. Run security audit
echo "5. Running security audit..."
npm audit --audit-level moderate

# 6. Run tests
echo "6. Running tests..."
npm run test
npm run test:e2e

# 7. Build application
echo "7. Building application..."
npm run build

# 8. Generate update report
echo "8. Generating update report..."
npm outdated --json > update-report.json

echo "=== Dependency update completed ==="
```

#### Update Validation
```javascript
// scripts/validate-updates.js
const fs = require('fs');
const { execSync } = require('child_process');

async function validateUpdates() {
  console.log('🔍 Validating dependency updates...');
  
  const checks = [
    {
      name: 'Security Audit',
      command: 'npm audit --audit-level moderate',
      success: '✅ Security audit passed',
      failure: '❌ Security vulnerabilities found'
    },
    {
      name: 'Linting',
      command: 'npm run lint',
      success: '✅ Linting passed',
      failure: '❌ Linting errors found'
    },
    {
      name: 'Unit Tests',
      command: 'npm run test',
      success: '✅ Unit tests passed',
      failure: '❌ Unit tests failed'
    },
    {
      name: 'Integration Tests',
      command: 'npm run test:integration',
      success: '✅ Integration tests passed',
      failure: '❌ Integration tests failed'
    },
    {
      name: 'Build',
      command: 'npm run build',
      success: '✅ Build successful',
      failure: '❌ Build failed'
    }
  ];
  
  const results = [];
  
  for (const check of checks) {
    try {
      execSync(check.command, { stdio: 'pipe' });
      console.log(check.success);
      results.push({ name: check.name, status: 'passed' });
    } catch (error) {
      console.log(check.failure);
      results.push({ name: check.name, status: 'failed', error: error.message });
    }
  }
  
  // Save validation report
  const report = {
    timestamp: new Date().toISOString(),
    results
  };
  
  fs.writeFileSync('validation-report.json', JSON.stringify(report, null, 2));
  
  // Check if all tests passed
  const failedChecks = results.filter(r => r.status === 'failed');
  if (failedChecks.length > 0) {
    console.log(`❌ ${failedChecks.length} checks failed`);
    process.exit(1);
  } else {
    console.log('✅ All validation checks passed');
  }
}

validateUpdates();
```

### Manual Update Process

#### Major Version Updates
```bash
#!/bin/bash
# scripts/major-update.sh

set -e

echo "=== Major Version Update Process - $(date) ==="

# 1. Create feature branch
echo "1. Creating feature branch..."
git checkout -b dependency-update-major-$(date +%Y%m%d)

# 2. Update major versions
echo "2. Updating major versions..."
npx npm-check-updates --target major

# 3. Install dependencies
echo "3. Installing dependencies..."
npm install

# 4. Run comprehensive tests
echo "4. Running comprehensive tests..."
npm run test
npm run test:integration
npm run test:e2e
npm run test:performance

# 5. Check for breaking changes
echo "5. Checking for breaking changes..."
npm run check-breaking-changes

# 6. Update documentation
echo "6. Updating documentation..."
npm run update-docs

# 7. Create detailed report
echo "7. Creating detailed report..."
npm run generate-update-report

echo "=== Major version update completed ==="
echo "Please review the changes and create a pull request"
```

## Monitoring and Alerting

### Dependency Monitoring

#### Dependency Health Dashboard
```javascript
// scripts/dependency-monitor.js
const fs = require('fs');
const { execSync } = require('child_process');

async function monitorDependencies() {
  console.log('📊 Monitoring dependencies...');
  
  const report = {
    timestamp: new Date().toISOString(),
    outdated: [],
    vulnerabilities: [],
    licenses: [],
    metrics: {}
  };
  
  try {
    // Check outdated packages
    const outdatedResult = execSync('npm outdated --json', { encoding: 'utf8' });
    const outdated = JSON.parse(outdatedResult);
    report.outdated = Object.keys(outdated);
    
    // Check vulnerabilities
    const auditResult = execSync('npm audit --json', { encoding: 'utf8' });
    const audit = JSON.parse(auditResult);
    report.vulnerabilities = Object.keys(audit.vulnerabilities || {});
    
    // Check licenses
    const licenseResult = execSync('npx license-checker --json', { encoding: 'utf8' });
    const licenses = JSON.parse(licenseResult);
    report.licenses = Object.values(licenses).map(l => l.licenses);
    
    // Calculate metrics
    report.metrics = {
      totalDependencies: Object.keys(licenses).length,
      outdatedCount: report.outdated.length,
      vulnerabilityCount: report.vulnerabilities.length,
      uniqueLicenses: [...new Set(report.licenses)].length
    };
    
    // Save report
    fs.writeFileSync('dependency-health.json', JSON.stringify(report, null, 2));
    
    // Send alerts if needed
    if (report.vulnerabilities.length > 0) {
      console.log(`⚠️  ${report.vulnerabilities.length} vulnerabilities found`);
      // Send alert to security team
    }
    
    if (report.outdated.length > 10) {
      console.log(`⚠️  ${report.outdated.length} packages are outdated`);
      // Send alert to devops team
    }
    
    console.log('✅ Dependency monitoring completed');
    
  } catch (error) {
    console.error('❌ Dependency monitoring failed:', error.message);
  }
}

monitorDependencies();
```

#### Alert Configuration
```yaml
# .github/workflows/dependency-alerts.yml
name: Dependency Alerts

on:
  schedule:
    - cron: '0 6 * * *'  # Daily at 6 AM
  workflow_dispatch:

jobs:
  check-dependencies:
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
        
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'
          
      - name: Install dependencies
        run: npm ci
        
      - name: Check for vulnerabilities
        run: npm audit --audit-level moderate
        continue-on-error: true
        
      - name: Check outdated packages
        run: npm outdated
        continue-on-error: true
        
      - name: Send Slack alert
        if: failure()
        uses: 8398a7/action-slack@v3
        with:
          status: failure
          webhook_url: ${{ secrets.SLACK_WEBHOOK }}
          text: 'Dependency issues detected in AI Skills platform'
```

## Rollback Procedures

### Automated Rollback

#### Rollback Script
```bash
#!/bin/bash
# scripts/rollback-dependencies.sh

set -e

echo "=== Dependency Rollback - $(date) ==="

# Check if backup exists
if [ ! -f "package.json.backup" ]; then
    echo "❌ No backup found. Cannot rollback."
    exit 1
fi

# 1. Stop application
echo "1. Stopping application..."
docker-compose down

# 2. Restore package files
echo "2. Restoring package files..."
cp package.json.backup package.json
cp package-lock.json.backup package-lock.json

# 3. Clean install
echo "3. Clean installing dependencies..."
rm -rf node_modules
npm ci

# 4. Run tests
echo "4. Running tests..."
npm run test

# 5. Start application
echo "5. Starting application..."
docker-compose up -d

# 6. Health check
echo "6. Running health check..."
sleep 30
curl -f http://localhost:4000/health || exit 1

echo "=== Rollback completed successfully ==="
```

#### Rollback Workflow
```yaml
# .github/workflows/rollback.yml
name: Emergency Rollback

on:
  workflow_dispatch:
    inputs:
      reason:
        description: 'Reason for rollback'
        required: true
        default: 'Dependency issues'

jobs:
  rollback:
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
        
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'
          
      - name: Restore dependencies
        run: |
          if [ -f "package.json.backup" ]; then
            cp package.json.backup package.json
            cp package-lock.json.backup package-lock.json
            npm ci
          else
            echo "No backup found"
            exit 1
          fi
          
      - name: Run tests
        run: npm run test
        
      - name: Deploy rollback
        run: |
          # Deploy rollback to production
          echo "Deploying rollback..."
          
      - name: Notify team
        uses: 8398a7/action-slack@v3
        with:
          status: success
          webhook_url: ${{ secrets.SLACK_WEBHOOK }}
          text: 'Dependency rollback completed successfully'
```

## Best Practices

### Dependency Management Best Practices

#### Version Pinning Strategy
```json
{
  "dependencies": {
    // Pin exact versions for critical dependencies
    "react": "18.2.0",
    "react-dom": "18.2.0",
    
    // Allow patch updates for stable dependencies
    "lodash": "^4.17.21",
    
    // Allow minor updates for well-maintained dependencies
    "axios": "~1.6.0"
  }
}
```

#### Security Best Practices
```json
{
  "$schema": "https://biomejs.dev/schemas/2.3.8/schema.json",
  "linter": {
    "rules": {
      "recommended": false,
      "suspicious": {
        "noUnsafeFinally": "error",
        "noUnsafeOptionalChaining": "error"
      }
    }
  },
  "files": {
    "includes": ["**/*", "!dist", "!coverage", "!node_modules"]
  }
}
```

#### Update Frequency Guidelines
```yaml
# Update frequency guidelines
update_frequency:
  security_patches:
    frequency: "immediate"
    max_delay: "24 hours"
    automation: "full"
    
  patch_updates:
    frequency: "weekly"
    max_delay: "7 days"
    automation: "full"
    
  minor_updates:
    frequency: "monthly"
    max_delay: "30 days"
    automation: "partial"
    
  major_updates:
    frequency: "quarterly"
    max_delay: "90 days"
    automation: "manual"
```

### Documentation and Reporting

#### Update Reports
```javascript
// scripts/generate-update-report.js
const fs = require('fs');
const { execSync } = require('child_process');

async function generateUpdateReport() {
  const report = {
    timestamp: new Date().toISOString(),
    summary: {},
    details: {},
    recommendations: []
  };
  
  // Get update summary
  const outdated = JSON.parse(execSync('npm outdated --json', { encoding: 'utf8' }));
  report.summary = {
    totalOutdated: Object.keys(outdated).length,
    byType: {
      patch: 0,
      minor: 0,
      major: 0
    }
  };
  
  // Categorize updates
  for (const [package, info] of Object.entries(outdated)) {
    const current = info.current;
    const latest = info.latest;
    
    if (current.split('.')[0] !== latest.split('.')[0]) {
      report.summary.byType.major++;
    } else if (current.split('.')[1] !== latest.split('.')[1]) {
      report.summary.byType.minor++;
    } else {
      report.summary.byType.patch++;
    }
  }
  
  // Generate recommendations
  if (report.summary.byType.major > 0) {
    report.recommendations.push('Review major version updates for breaking changes');
  }
  
  if (report.summary.byType.minor > 5) {
    report.recommendations.push('Consider updating minor versions in batches');
  }
  
  // Save report
  fs.writeFileSync('update-report.json', JSON.stringify(report, null, 2));
  
  console.log('📊 Update report generated');
}

generateUpdateReport();
```

---

## Support and Contacts

### Emergency Contacts
- **DevOps Team**: devops@aiskills.com
- **Security Team**: security@aiskills.com
- **On-Call Engineer**: +1-555-0123 (24/7)

### Documentation
- **Dependency Policy**: [docs.aiskills.com/dependencies](https://docs.aiskills.com/dependencies)
- **Security Guidelines**: [docs.aiskills.com/security](https://docs.aiskills.com/security)
- **Update Procedures**: [docs.aiskills.com/updates](https://docs.aiskills.com/updates)

### Tools and Resources
- **Dependency Dashboard**: [deps.aiskills.com](https://deps.aiskills.com)
- **Security Scanner**: [security.aiskills.com](https://security.aiskills.com)
- **Update History**: [updates.aiskills.com](https://updates.aiskills.com) 