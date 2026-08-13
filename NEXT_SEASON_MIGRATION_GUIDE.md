# Next Season Migration Guide

This guide outlines the steps required to migrate the F1 Predictor system from the 2026 season to 2027 (or any future season).

## Overview

Each new F1 season brings changes to:
- Calendar (new/removed races, date changes)
- Driver lineup (transfers, retirements, new drivers)
- Team roster (new teams, team name changes)
- Technical regulations (affecting car performance patterns)
- Points system (rare, but possible)

## Migration Checklist

### 1. Update Season Configuration

**File: `config/settings.py`**
```python
SEASON_YEAR = 2027  # Update from 2026
```

**File: `.env`**
```bash
SEASON_YEAR=2027
```

### 2. Update Calendar

**File: `data/calendar_2026.py` → `data/calendar_2027.py`**

Steps:
1. Obtain the official FIA 2027 calendar from Formula1.com
2. Update race list with new circuits, removed races, and date changes
3. Verify lap counts, circuit lengths, and DRS zones for new venues
4. Update base weather, safety car, and temperature estimates
5. Mark sprint weekends appropriately
6. Rename the file and update imports throughout the codebase

Key changes to verify:
- Total number of rounds (typically 23-24)
- New circuits (add circuit data to `data/circuit_data.py`)
- Cancelled races (mark with `status: "cancelled"`)
- Sprint race format changes

### 3. Update Driver and Team Lineup

**File: `config/team_driver_lineup_2026.py` → `config/team_driver_lineup_2027.py`**

Steps:
1. Research confirmed driver transfers and retirements
2. Update team rosters with new driver codes, names, and numbers
3. Adjust strength, reliability, and wet-skill seed values based on:
   - Previous season performance
   - Pre-season testing observations
   - Expert analysis and team expectations
4. Add new teams (if any) with appropriate branding and colors
5. Update team colors if rebranding occurs
6. Rename the file and update imports

### 4. Update Circuit Data

**File: `data/circuit_data.py`**

For new circuits on the 2027 calendar:
1. Add circuit metadata (name, location, country)
2. Record technical specifications (laps, length, DRS zones)
3. Estimate overtaking difficulty (Low/Medium/High)
4. Set baseline weather, safety car probability, and temperature
5. Research historical F1/F2/F3 data at similar circuits for parameter tuning

### 5. Refresh Historical Data

**Action Required:**
- Update `data/season_2026.py` with complete 2026 season results
- Create `data/season_2027.py` for the new season's live data
- Clear cached API responses in `cache/api_responses/`
- Update Hugging Face dataset references if using newer data

### 6. Retrain ML Models

**Files: `engine/ml_models.py`, `scripts/optimize_weights.py`**

Steps:
1. Run `scripts/measure_accuracy.py` on 2026 data to establish final baseline
2. Retrain models on complete 2026 + available historical data
3. Optimize feature weights using `scripts/optimize_weights.py`
4. Update model version in `config/settings.py`
5. Calibrate probabilities using `scripts/calibrate_probabilities.py`

### 7. Update Database Schema (if needed)

**File: `database/models.py`**

Check if regulatory changes require schema updates:
- New points system structure
- Sprint format changes affecting session types
- New championship categories

If changes are needed:
1. Create migration script in `scripts/`
2. Backup existing database
3. Run migration
4. Verify data integrity

### 8. Update Frontend References

**Files: `dashboard/templates/*.html`, `dashboard/static/js/*.js`**

Search and replace:
- Season year references (2026 → 2027)
- Team names and colors (if changed)
- Driver codes and numbers
- Calendar references

### 9. Update Documentation

**Files: `README.md`, `BUILD_PLAN.md`, this guide**

1. Update season year references
2. Update feature descriptions if regulations changed
3. Update example data and screenshots
4. Review and update technical assumptions

### 10. Testing

**Comprehensive Testing Checklist:**

- [ ] Calendar loads correctly with all 2027 races
- [ ] Driver/team lineup displays correctly
- [ ] Predictions generate without errors
- [ ] API clients connect to live data sources
- [ ] Historical data from 2026 is accessible
- [ ] Fantasy scoring reflects any rule changes
- [ ] Reports generate correctly
- [ ] All automated tests pass: `pytest tests/`
- [ ] Manual smoke test of all dashboard views

### 11. Deployment

**Production Deployment Steps:**

1. Create database backup
2. Deploy code changes
3. Run database migrations
4. Clear all caches
5. Restart background schedulers
6. Monitor initial predictions for accuracy
7. Update user-facing documentation

## Season-Specific Considerations

### 2027 Anticipated Changes

*(Update this section each year with known upcoming changes)*

- **Technical Regulations**: [TBD - monitor FIA announcements]
- **Calendar Changes**: [TBD - monitor Formula1.com]
- **Driver Market**: [TBD - monitor transfer news]
- **New Teams**: [TBD - monitor entries]

## Rollback Plan

If issues arise post-migration:

1. Restore database from pre-migration backup
2. Revert code to previous season tag
3. Clear all caches
4. Restart services
5. Communicate with users about rollback

## Automation Opportunities

Consider automating:
- Calendar updates from official F1 API
- Driver lineup scraping from reliable sources
- Model retraining pipeline
- Database migration scripts
- Cache clearing and service restarts

## Support

For migration issues:
- Consult the main `README.md` for architecture details
- Review `BUILD_PLAN.md` for module responsibilities
- Check `AGENTS.md` for learned project patterns
- Contact development team for assistance

---

**Last Updated**: August 2026
**Next Review**: December 2026 (post-2026 season completion)
