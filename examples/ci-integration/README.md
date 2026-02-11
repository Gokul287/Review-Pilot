# CI/CD Integration Guide

Copy the appropriate config for your CI platform.

## GitHub Actions

Already included at `.github/workflows/reviewpilot.yml`. Copy this file to any repository.

```yaml
name: ReviewPilot Code Review

on:
  pull_request:
    types: [opened, synchronize]

jobs:
  review:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - uses: actions/setup-node@v4
        with:
          node-version: '18'

      - run: npm install -g reviewpilot

      - name: Run analysis
        run: reviewpilot check --save --verbose

      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: reviewpilot-results
          path: .reviewpilot-output/
```

## GitLab CI

```yaml
# .gitlab-ci.yml
reviewpilot:
  stage: test
  image: node:18
  script:
    - npm install -g reviewpilot
    - reviewpilot check --save --verbose
  artifacts:
    paths:
      - .reviewpilot-output/
    when: always
  only:
    - merge_requests
```

## Jenkins

```groovy
// Jenkinsfile
pipeline {
    agent { docker { image 'node:18' } }

    stages {
        stage('Code Review') {
            steps {
                sh 'npm install -g reviewpilot'
                sh 'reviewpilot check --save --verbose'
            }
        }
    }

    post {
        always {
            archiveArtifacts artifacts: '.reviewpilot-output/**', allowEmptyArchive: true
        }
    }
}
```

## Azure DevOps

```yaml
# azure-pipelines.yml
trigger: none
pr:
  branches:
    include: ['*']

pool:
  vmImage: 'ubuntu-latest'

steps:
  - task: NodeTool@0
    inputs:
      versionSpec: '18.x'

  - script: |
      npm install -g reviewpilot
      reviewpilot check --save --verbose
    displayName: 'ReviewPilot Analysis'

  - publish: .reviewpilot-output
    artifact: reviewpilot-results
    condition: always()
```

## Local Docker Test

```bash
# Simulate CI locally
docker run --rm -v $(pwd):/app -w /app node:18 sh -c "
  npm install -g reviewpilot &&
  reviewpilot check --save --verbose
"
```

## Environment Variables

| Variable | Purpose | Default |
|----------|---------|---------|
| `CI=true` | Detected automatically | Disables telemetry |
| `REVIEWPILOT_TELEMETRY=0` | Explicit opt-out | — |
| `GITHUB_TOKEN` | PR comment posting | From `gh` auth |

## Exit Codes

| Code | Meaning |
|------|---------|
| `0` | Analysis complete, no critical issues |
| `1` | Critical or error-level issues found |
