# Development Plan: Fix StakeKit API Integration

## Task Details
Fix the MCP Yield Server's StakeKit API integration to use the correct API endpoints and handle the v1 response formats properly.

## Success Criteria
1. ✅ All network-related tests pass with real API data
2. ✅ Provider/protocol tools work using `/v1/providers` endpoint
3. ✅ Yield tools continue working (they already use correct endpoint)
4. ✅ TypeScript compiles without errors
5. ✅ `npm test` passes all tests
6. ✅ Manual stdio test of `list-supported-chains` returns network data

## Feasibility Assessment
**CAN THIS BE IMPLEMENTED WITH REAL DATA/APIS?** ✅ YES
- We have a working API key: `e71fed90-9b4d-46b8-9358-98d8777bd929`
- API endpoints are confirmed working:
  - `https://api.yield.xyz/v1/networks` - Returns real network data
  - `https://api.yield.xyz/v1/providers` - Returns real provider data
  - `https://api.yield.xyz/v1/yields` - Returns valid (though empty) response

**DEPENDENCY VERIFICATION** ✅ VERIFIED
- Current codebase exists with TypeScript, tests, and MCP structure
- No missing dependencies blocking implementation
- Test framework (vitest) is in place

**CREDENTIAL REQUIREMENTS** ✅ AVAILABLE
- API Key provided and tested: `e71fed90-9b4d-46b8-9358-98d8777bd929`
- No additional authentication needed

## Implementation Plan

### Phase 1: Research and Analysis
1. Examine current implementation structure
2. Document existing API calls and response handling
3. Identify all files requiring changes

### Phase 2: TDD Implementation (RED-GREEN-REFACTOR)

#### Cycle 1: API Base URL
- **RED**: Write test for correct base URL in StakeKit client
- **GREEN**: Update base URL from `https://api.stakek.it/v2` to `https://api.yield.xyz/v1`
- **REFACTOR**: Clean up any hardcoded URLs

#### Cycle 2: Network Endpoint
- **RED**: Write test for v1 networks response format (array vs paginated)
- **GREEN**: Update catalog service to handle array response
- **REFACTOR**: Update TypeScript types for network response

#### Cycle 3: Providers Endpoint
- **RED**: Write test for providers endpoint functionality
- **GREEN**: Implement providers endpoint support
- **REFACTOR**: Replace protocol references with providers

#### Cycle 4: Type System Updates
- **RED**: Write tests for TypeScript type validation
- **GREEN**: Update all response types for v1 format
- **REFACTOR**: Consolidate and clean up type definitions

### Phase 3: Verification
1. Run full test suite
2. Manual STDIO testing
3. Integration testing with real API

## Current Implementation Analysis

Based on research:
1. **Base URL Configuration**:
   - Currently using `https://api.stakek.it/v2` as primary
   - Fallback to `https://api.yield.xyz/v1` exists but is only used on 404 errors
   - Need to swap these URLs - `api.yield.xyz/v1` should be primary

2. **Network Endpoint**:
   - Currently fetching from `/networks` which gets added to `/v2/networks`
   - Tests expect paginated response but v1 returns direct array
   - Need to update response parsing logic

3. **Protocols vs Providers**:
   - Currently using `/protocols` endpoint which doesn't exist in v1
   - Need to implement `/providers` endpoint instead
   - Response format differs: `{items: [...]}` vs direct array

4. **Test Infrastructure**:
   - Tests use nock to mock API responses
   - All tests currently expect v2 endpoints and response formats
   - Need to update test mocks to match v1 API

## Progress Tracking

### TDD Cycles Completed

#### Cycle 1: API Base URL
- [x] RED: Test written - Added test to verify primary API is api.yield.xyz/v1
- [x] GREEN: Implementation complete - Updated config.ts and test setup to swap URLs
- [x] REFACTOR: Code cleaned up - No refactoring needed for this simple change
- [ ] Review completed

#### Cycle 2: Network Endpoint
- [x] RED: Test written - Updated tests to expect v1 API endpoint
- [x] GREEN: Implementation complete - Already handled by flexible parseListResponse
- [x] REFACTOR: Code cleaned up - No refactoring needed
- [ ] Review completed

#### Cycle 3: Providers Endpoint
- [x] RED: Test written - Updated tests to expect providers instead of protocols
- [x] GREEN: Implementation complete - Changed endpoint to /providers, added items support
- [x] REFACTOR: Code cleaned up - Enhanced parseListResponse to handle {items: [...]}
- [ ] Review completed

#### Cycle 4: Type System
- [x] RED: Test written - All tests updated with correct response formats
- [x] GREEN: Implementation complete - Types already flexible enough
- [x] REFACTOR: Code cleaned up - No changes needed to types
- [ ] Review completed

### Verification Checklist
- [x] All unit tests passing - All 28 tests pass
- [x] TypeScript compilation successful - npm run lint passes with no errors
- [x] Manual STDIO test successful - MCP server returns 94 real networks from API
- [x] Real API integration verified - Successfully fetches data from api.yield.xyz/v1
- [x] No hardcoded values or fake data - Using real API key and endpoints

## Files to Modify
1. `src/client/stakekit.ts` - Base URL change
2. `src/services/catalog.ts` - Network, provider endpoint changes
3. `src/types/stakekit.ts` - Response schema updates
4. `tests/**/*.test.ts` - Update test expectations for v1 format

## Observed Issues (Do Not Fix)
- Document any unrelated issues found during implementation

## Review Feedback
- Document code review feedback and resolutions