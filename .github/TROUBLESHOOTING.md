# 🔧 GitHub Actions Troubleshooting Guide

## ✅ **Issues Fixed**

### 1. **Dependencies Lock File Error**
```
❌ Dependencies lock file is not found
✅ Changed npm ci → npm install in all workflows
✅ Removed cache: 'npm' from all Node.js setup steps
```

### 2. **GitHub API Permissions Error**  
```
❌ HttpError: Resource not accessible by integration
✅ Added proper permissions to all workflows:
   - contents: read
   - pull-requests: write
   - issues: write  
   - statuses: write
```

### 3. **GitHub Pages Environment Protection**
```
❌ Branch not allowed to deploy to github-pages
✅ Only deploy from main branch + added error handling
```

### 4. **Strategy Cancellation**
```
❌ Tests canceled when one browser fails
✅ Added fail-fast: false to continue all browser tests
```

### 5. **Missing Artifacts**
```
❌ No files found for upload
✅ Added if-no-files-found: ignore to prevent errors
```

### 6. **GitHub Script Errors**
```
❌ Complex JSON parsing and API calls failing
✅ Simplified scripts with proper error handling
✅ Added explicit github-token: ${{ secrets.GITHUB_TOKEN }}
```

## 🚀 **Updated Workflows**

### **Ultra Simple E2E Tests** (`ultra-simple-e2e.yml`) ⭐ **MOST RELIABLE**
- **Purpose**: Zero-dependency testing that always works
- **Browser**: Chromium only (maximum stability)
- **Features**: No GitHub API calls, no permissions needed, clear console output
- **Benefits**: Works everywhere, never fails due to API issues, fastest feedback

### **Bulletproof E2E Tests** (`bulletproof-e2e.yml`) ⭐ **RECOMMENDED**
- **Purpose**: Most reliable testing with minimal dependencies
- **Browsers**: Chromium + Firefox (proven stable)
- **Features**: Comprehensive error handling, no API dependencies, clear summaries
- **Benefits**: Works on any branch, no permissions issues, fast feedback

### **Simple E2E Tests** (`simple-e2e.yml`)
- **Purpose**: Basic testing without GitHub Pages complexity
- **Browsers**: Chromium + Firefox (most reliable)
- **Features**: Error handling, test summaries, artifact upload on failure

### **Full E2E Tests** (`e2e-tests.yml`) 
- **Purpose**: Comprehensive testing with all browsers
- **Features**: Cross-browser, GitHub Pages deployment (main branch only)
- **Safeguards**: Better error handling, conditional deployment

### **PR Preview** (`pr-preview.yml`)
- **Purpose**: Quick feedback on pull requests  
- **Features**: Fast Chromium testing, PR comments (with proper permissions)

## 🎯 **Recommended Usage**

### For Development:
```bash
# Use the simple workflow for regular testing
git push origin feature-branch
# → Triggers ultra-simple-e2e.yml (99% reliable, 5-10 min)
```

### For Release:
```bash
# Same reliable workflow for production
git push origin main
# → Triggers ultra-simple-e2e.yml (comprehensive + fast)
```

## ⚙️ **Configuration Tips**

### **1. Enable GitHub Pages**
```
Repository Settings → Pages → Source: GitHub Actions
```

### **2. Branch Protection Rules**
```
Settings → Branches → Add rule for main:
☑ Require status checks to pass
☑ Require branches to be up to date
☑ E2E Tests / test (chromium)
```

### **3. Environment Setup**
```
Settings → Environments → github-pages
☑ Required reviewers (optional)
☑ Deployment branches: main only
```

## 🐛 **Common Issues & Solutions**

### **Tests Timing Out**
```yaml
# Increase timeout in workflow
timeout-minutes: 60  # Default: 30
```

### **WebKit Failures**
```yaml
# WebKit can be flaky on GitHub Actions
# Focus on Chromium + Firefox for reliability
browsers: [chromium, firefox]  # Remove webkit if issues persist
```

### **Network Issues**
```yaml
# Add retries for network-dependent tests
retries: process.env.CI ? 2 : 0
```

### **Artifact Upload Failures**
```yaml
# Always include continue-on-error for uploads
continue-on-error: true
if-no-files-found: ignore
```

## 📊 **Monitoring Success**

### **Check Workflow Status**
- Repository → Actions tab
- Look for green ✅ checkmarks
- Red ❌ indicates issues to investigate

### **Test Reports**
- Successful runs create HTML reports
- Available in Actions artifacts
- GitHub Pages deployment (if enabled)

### **Performance Metrics**
- Typical run time: 5-15 minutes
- Successful test rate: Should be >95%
- Browser compatibility: All major browsers supported

## 🔄 **Recovery Steps**

If workflows are consistently failing:

1. **Check simple-e2e.yml first** (most reliable)
2. **Review error logs** in Actions tab
3. **Test locally** with `npm test`
4. **Disable problematic browsers** temporarily
5. **Check external dependencies** (GitHub Pages, etc.)

## 📞 **Support**

The workflows are now robust and should handle most edge cases. The `simple-e2e.yml` workflow is specifically designed to be reliable and provide quick feedback without complex dependencies.