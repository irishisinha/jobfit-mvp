# Automated Build → Deploy → Verify Loop

## Phase 1: BUILD & COMMIT
```
1. Make code changes
2. Commit changes
3. Push to main
4. Get build ID
```

## Phase 2: DEPLOYMENT CHECK ✓
```
1. Verify build pushed successfully to GitHub
2. Check production deployment status
3. Confirm build is live at production URL
4. Health check: Can access assessment page
```

**Deployment Checklist:**
- [ ] Build committed: `git log -1 --oneline`
- [ ] Build pushed: `git log --oneline origin/main -1`
- [ ] Production URL accessible
- [ ] Assessment page loads without errors
- [ ] Debug panel visible (shows resumes loaded)
- [ ] No console errors in browser

## Phase 3: FEATURE VERIFICATION ✓
Once deployment confirmed, test:

### Assessment Page
- [ ] All tabs load (Overview, Tailored Resume, Cover Letter, Questions)
- [ ] Recommended resume shows in Overview
- [ ] Debug panel displays correctly

### Tailored Resume
- [ ] Tab shows "Using Recommended Resume" (no dropdown)
- [ ] Generate button works
- [ ] Output displays with 2+ pages
- [ ] Download works

### Cover Letter (3 Tones)
- [ ] Professional tone generates ✓
- [ ] Enthusiastic tone generates ✓
- [ ] Warm tone generates ✓
- [ ] All have download buttons

### Application Questions
- [ ] Can add question
- [ ] Question appears immediately
- [ ] Loading indicator shows
- [ ] Answer appears below question
- [ ] Add second question works

## Phase 4: REPORT & LOOP
**Report Format:**
```
Build: [ID]
Deployment: ✅ Live / ❌ Failed
Assessment: ✅ PASS / ❌ Issue: [describe]
Tailored Resume: ✅ PASS / ❌ Issue: [describe]
Cover Letter: ✅ PASS / ❌ Issue: [describe]
App Questions: ✅ PASS / ❌ Issue: [describe]
```

If any issues found → Fix → Go back to Phase 1
If all pass → Loop complete, ready for next change
