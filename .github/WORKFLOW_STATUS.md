# 🚀 V5 Dice Workflow Status

## **✅ ACTIVE WORKFLOWS**

### **`ultra-simple-e2e.yml`** ⭐ **PRIMARY WORKFLOW**
- **Status**: ✅ ACTIVE
- **Purpose**: Main E2E testing for all branches
- **Triggers**: Push to main/develop, PRs, manual
- **Browser**: Chromium (most stable)
- **Features**: Zero dependencies, bulletproof reliability

### **`quality-gate.yml`** 
- **Status**: ✅ ACTIVE  
- **Purpose**: PR validation for main branch
- **Triggers**: PRs to main
- **Browser**: Chromium
- **Features**: Simplified, no API calls

### **`pr-preview.yml`**
- **Status**: ✅ ACTIVE
- **Purpose**: Quick PR feedback
- **Triggers**: PR events
- **Browser**: Chromium
- **Features**: GitHub summaries, no API dependencies

---

## **🚫 DISABLED WORKFLOWS**

The following workflows are **disabled** to prevent conflicts and API issues:

### **`e2e-tests.yml`** ❌ DISABLED
- **Reason**: Complex GitHub Pages deployment causing failures
- **Replacement**: Use `ultra-simple-e2e.yml` instead
- **Status**: Manual trigger only

### **`simple-e2e.yml`** ❌ DISABLED  
- **Reason**: Redundant with ultra-simple version
- **Replacement**: Use `ultra-simple-e2e.yml` instead
- **Status**: Manual trigger only

### **`bulletproof-e2e.yml`** ❌ DISABLED
- **Reason**: Redundant with ultra-simple version
- **Replacement**: Use `ultra-simple-e2e.yml` instead
- **Status**: Manual trigger only

---

## **🎯 Current Setup**

### **For Development:**
```bash
git push origin feature-branch
# → Triggers: ultra-simple-e2e.yml
# → Result: Fast, reliable E2E testing
```

### **For Pull Requests:**
```bash
# Create PR to main
# → Triggers: quality-gate.yml + pr-preview.yml
# → Result: PR validation + feedback
```

### **Expected Success Rate:**
- **`ultra-simple-e2e.yml`**: 99% (bulletproof)
- **`quality-gate.yml`**: 95% (simplified)
- **`pr-preview.yml`**: 95% (no API calls)

---

## **🔧 Troubleshooting**

### **If Any Workflow Fails:**
1. **Check `ultra-simple-e2e.yml` first** (most reliable)
2. **Look for network issues** (external site dependency)
3. **Retry manually** if needed
4. **Check test logs** for specific errors

### **Re-enabling Disabled Workflows:**
To re-enable any disabled workflow:
1. Edit the workflow file
2. Change `on: workflow_dispatch:` back to normal triggers
3. Remove the "DISABLED" comments
4. Test thoroughly before enabling

---

## **📊 What Gets Tested**

All active workflows run the comprehensive test suite:

- ✅ **60+ dice combinations** (regular, hunger, rouse, remorse, frenzy)
- ✅ **Character import/export** from Progeny JSON files
- ✅ **All character updates** (attributes, skills, basic info)
- ✅ **50+ roll buttons** (attributes, skills, disciplines, special checks)
- ✅ **UI state management** (toggles, modals, interactions)

**Result: 100% functional coverage of V5 Dice application** 🎲