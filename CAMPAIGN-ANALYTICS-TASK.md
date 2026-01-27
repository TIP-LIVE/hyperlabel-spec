# Campaign Analytics - Marketing Funnel Visualization

## Goal
Build a new section that shows the marketing campaign funnel from initial search to call arrangement, demonstrating that **2-3 leads = AI did a great job managing the entire process**.

---

## Current Data Model Analysis

### What's Already Tracked in Backend

#### 1. **Persona Level** (`Persona` entity)
- `totalContacts` - Total contacts found matching the persona
- `contacts[]` - Array of contacts with `usedInReplenishment` flag
- `previewContactIds[]` - Contacts used for persona preview
- `linkedinCursor` - Pagination state for LinkedIn search

#### 2. **Campaign Level** (`Campaign` entity)
- `contactIds[]` - All contacts in campaign
- `notProcessedContactIds[]` - Contacts not yet processed
- `prefetchedContactIds[]` - Contacts fetched but not processed yet
- `personaIds[]` - Linked personas

#### 3. **Outreach Level** (`Outreach` entity)
- `status` - `RUNNING | STOPPED | COMPLETED | FAILED | RETRY`
- `conversionStatus` - `APPOINTMENT_SCHEDULED` (expandable)
- `actionsHistory[]` - Full history of actions taken
- `conversationHistory[]` - Chat messages (role: 'ai' | 'user')
- `nextAction` - Scheduled action with type

#### 4. **Action Types Tracked** (`OutreachActionType`)
```typescript
- SEND_LINKEDIN_INVITATION
- SEND_LINKEDIN_MESSAGE
- RETRIEVE_LINKEDIN_PROFILE
- RETRIEVE_USERS_POSTS
- CANCEL_LINKEDIN_INVITATION
- COMMENT_ON_USERS_POST
- REACT_ON_USERS_POST
- SEND_LINKEDIN_MESSAGE_FOLLOWUP_DAY
- FINISH_OUTREACH_HAPPY_PATH
- FINISH_OUTREACH_UNHAPPY_PATH
```

#### 5. **Contact Relations** (`ContactRelation` entity)
- `linkedinInvitationStatus` - `PENDING | ACCEPTED`
- `commentedPostIds[]` - Posts commented on

---

## Funnel Stages to Track

| Stage | Description | Source | Status |
|-------|-------------|--------|--------|
| 1. **Contacts Searched** | Total contacts AI found during persona search | `Persona.totalContacts` | ✅ Exists |
| 2. **Contacts Filtered Out** | Contacts removed by ICP fit score < 0.4 | Need to track | ⚠️ Needs tracking |
| 3. **Contacts Added to Campaign** | Contacts selected for campaign | `Campaign.contactIds.length` | ✅ Exists |
| 4. **Outreach Started** | Contacts where outreach was created | `Outreach` records count | ✅ Exists |
| 5. **Post Engagement (Comments)** | Contacts who received comment on their post | `actionsHistory` with `COMMENT_ON_USERS_POST` | ✅ Exists |
| 6. **Post Engagement (Reactions)** | Contacts who received reaction on their post | `actionsHistory` with `REACT_ON_USERS_POST` | ✅ Exists |
| 7. **Invitation Sent** | Contacts who received LinkedIn invitation | `actionsHistory` with `SEND_LINKEDIN_INVITATION` | ✅ Exists |
| 8. **Invitation Accepted** | Contacts who accepted the invitation | `ContactRelation.linkedinInvitationStatus === 'ACCEPTED'` | ✅ Exists |
| 9. **Contacts Replied** | Contacts who sent at least one message | `conversationHistory` with `role: 'user'` | ✅ Exists |
| 10. **Call Arranged** | Contacts who scheduled a call | `Outreach.conversionStatus === 'APPOINTMENT_SCHEDULED'` | ✅ Exists |

---

## Backend Tasks

### Task 1: Create Campaign Statistics Endpoint

**File:** `backend/apps/api/src/campaign/campaign.controller.ts`

**New Endpoint:** `GET /campaigns/:id/statistics`

**Response DTO:**
```typescript
interface CampaignStatistics {
  // Persona/Search Phase
  totalContactsSearched: number;      // Sum of Persona.totalContacts
  contactsFilteredByICP: number;      // Contacts with fit_score < 0.4
  contactsAddedToCampaign: number;    // Campaign.contactIds.length
  
  // Outreach Phase
  outreachesStarted: number;          // Count of Outreach records
  outreachesRunning: number;          // Outreach.status === 'RUNNING'
  outreachesCompleted: number;        // Outreach.status === 'COMPLETED'
  outreachesFailed: number;           // Outreach.status === 'FAILED'
  
  // Engagement Metrics
  postsCommented: number;             // Count of COMMENT_ON_USERS_POST actions
  postsReacted: number;               // Count of REACT_ON_USERS_POST actions
  
  // Connection Phase
  invitationsSent: number;            // Count of SEND_LINKEDIN_INVITATION actions
  invitationsAccepted: number;        // ContactRelation.invitationStatus === 'ACCEPTED'
  invitationsPending: number;         // ContactRelation.invitationStatus === 'PENDING'
  
  // Conversation Phase
  contactsReplied: number;            // Outreaches with at least one user message
  totalMessages: number;              // Total messages sent by AI
  totalReplies: number;               // Total replies from contacts
  
  // Conversion Phase
  callsArranged: number;              // Outreach.conversionStatus === 'APPOINTMENT_SCHEDULED'
  bookingLinksSent: number;           // Count of messages containing booking link
}
```

### Task 2: Add ICP Filtering Tracking

**Context:** Currently, contacts with `fit_score < 0.4` are rejected in `OutreachService.create()` but not tracked.

**Changes:**
1. Add `filteredContactIds[]` field to `Campaign` model
2. When contact is rejected due to ICP score, add to this array
3. Optionally store rejection reasons

**File:** `backend/libs/common/src/domain/Campaign.ts`
```typescript
export interface Campaign {
  // ... existing fields
  filteredContactIds?: string[];  // NEW: Contacts filtered out by ICP
}
```

### Task 3: Create Statistics Aggregation Service

**File:** `backend/apps/api/src/campaign/campaign-statistics.service.ts`

```typescript
@Injectable()
export class CampaignStatisticsService {
  async getCampaignStatistics(campaignId: string): Promise<CampaignStatistics> {
    // 1. Get campaign with personas
    // 2. Aggregate outreach data
    // 3. Count actions by type
    // 4. Count conversation metrics
    // 5. Return compiled statistics
  }
}
```

### Task 4: Add Time-Series Data (Optional Enhancement)

For showing trends over time:
```typescript
interface CampaignStatisticsTimeSeries {
  date: string;
  invitationsSent: number;
  invitationsAccepted: number;
  repliesReceived: number;
  callsArranged: number;
}
```

---

## Frontend Tasks

### Task 1: Create Campaign Statistics Hook

**File:** `frontend/src/api/entities/campaign/useCampaignStatistics.ts`

```typescript
export function useCampaignStatistics(campaignId: string) {
  return useQuery({
    queryKey: ['campaign-statistics', campaignId],
    queryFn: () => getCampaignStatistics(campaignId),
    refetchInterval: 30000, // Refresh every 30 seconds
  });
}
```

### Task 2: Create Funnel Visualization Component

**File:** `frontend/src/modules/organization/campaign/campaign-details/CampaignFunnel.tsx`

**Design Requirements:**
1. **Vertical Funnel Chart** showing drop-off at each stage
2. **Color Coding:**
   - Blue: Search/Filter phase
   - Purple: Engagement phase
   - Green: Connection phase
   - Orange: Conversation phase
   - Gold: Conversion phase

3. **Key Metrics Cards** at top:
   - Total Searched → Added to Campaign (conversion %)
   - Outreach Started → Replied (engagement %)
   - Replied → Call Arranged (conversion %)

### Task 3: Create Statistics Dashboard Tab

**File:** `frontend/src/modules/organization/campaign/campaign-details/CampaignStatisticsTab.tsx`

**Layout:**
```
┌─────────────────────────────────────────────────────────────────┐
│  CAMPAIGN FUNNEL OVERVIEW                                       │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐        │
│  │ Searched │  │ Engaged  │  │ Replied  │  │ Calls    │        │
│  │   1,250  │  │   342    │  │    28    │  │   3      │        │
│  │  ----→   │  │  ----→   │  │  ----→   │  │  ✓       │        │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────────────┐  ┌─────────────────────────┐  │
│  │     FUNNEL VISUALIZATION    │  │    DETAILED METRICS     │  │
│  │                             │  │                         │  │
│  │  ████████████ 1,250        │  │  Personas: 3            │  │
│  │  ████████     890          │  │  Total Searched: 1,250  │  │
│  │  ██████       420          │  │  ICP Filtered: 360      │  │
│  │  ████         180          │  │  Added to Campaign: 890 │  │
│  │  ███          85           │  │  Outreach Started: 420  │  │
│  │  ██           42           │  │  Posts Commented: 180   │  │
│  │  █            28           │  │  Invitations Sent: 180  │  │
│  │  ▌            3            │  │  Invitations Accepted: 85│  │
│  │                             │  │  Contacts Replied: 28   │  │
│  │  Contacts → Calls          │  │  Calls Arranged: 3     │  │
│  └─────────────────────────────┘  └─────────────────────────┘  │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│  💡 3 calls arranged from 1,250 contacts = AI handled 99.8%    │
│     of the work automatically!                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Task 4: Add Statistics Tab to Campaign Details

**File:** `frontend/src/modules/organization/campaign/campaign-details/CampaignDetails.tsx`

Add new tab:
```typescript
const NAV_ITEMS = [
  // ... existing items
  {
    value: 'statistics',
    label: 'Statistics',
    icon: <Iconify width={24} icon="solar:chart-bold-duotone" />,
  },
];
```

### Task 5: Create Conversion Rate Display

**File:** `frontend/src/modules/organization/campaign/campaign-details/ConversionMetrics.tsx`

Show key conversion rates:
- **Search → Campaign:** How many contacts from search made it to campaign
- **Campaign → Outreach:** How many contacts had outreach started
- **Outreach → Reply:** Engagement rate
- **Reply → Call:** Final conversion rate

---

## UI Component Breakdown

### 1. `FunnelChart.tsx`
- Stacked bar chart showing funnel stages
- Hover tooltips with exact numbers
- Color-coded by phase

### 2. `MetricCard.tsx`
- Single metric with label
- Delta indicator (vs previous period)
- Trend sparkline (optional)

### 3. `ConversionArrow.tsx`
- Shows X → Y conversion
- Displays percentage
- Color indicates good/bad conversion

### 4. `AIEfficiencyMessage.tsx`
- Dynamic message: "X calls from Y contacts = AI handled Z% automatically"
- Emphasizes value proposition

---

## Data Flow

```
┌─────────────┐      ┌──────────────────┐      ┌─────────────────┐
│   Persona   │ ───→ │     Campaign     │ ───→ │    Outreach     │
│  Search     │      │   Contact Pool   │      │    Execution    │
└─────────────┘      └──────────────────┘      └─────────────────┘
      │                      │                         │
      ▼                      ▼                         ▼
┌─────────────┐      ┌──────────────────┐      ┌─────────────────┐
│ Total Found │      │ Filtered by ICP  │      │ Actions Taken   │
│   1,250     │      │   Added: 890     │      │ - Comments: 180 │
│             │      │   Removed: 360   │      │ - Invites: 180  │
└─────────────┘      └──────────────────┘      │ - Messages: 45  │
                                               └─────────────────┘
                                                       │
                                                       ▼
                                               ┌─────────────────┐
                                               │   Conversions   │
                                               │ - Replies: 28   │
                                               │ - Calls: 3      │
                                               └─────────────────┘
```

---

## Implementation Order

### Phase 1: Backend (Priority)
1. [ ] Create `CampaignStatistics` DTO
2. [ ] Add statistics endpoint to campaign controller
3. [ ] Implement aggregation logic in new service
4. [ ] Add ICP filtering tracking

### Phase 2: Frontend Core
1. [ ] Create API hook for statistics
2. [ ] Build `FunnelChart` component
3. [ ] Build `MetricCard` component
4. [ ] Create `CampaignStatisticsTab`

### Phase 3: Frontend Polish
1. [ ] Add tab to campaign details navigation
2. [ ] Create "AI Efficiency" message component
3. [ ] Add conversion rate displays
4. [ ] Implement responsive design

### Phase 4: Enhancement (Optional)
1. [ ] Add time-series tracking
2. [ ] Create trend charts
3. [ ] Add export functionality
4. [ ] Add comparison between campaigns

---

## Notes

### What Data is Missing
1. **ICP Filtered Count** - Need to track contacts rejected due to low ICP score
2. **Time-series data** - Currently no daily/weekly aggregation
3. **Per-persona breakdown** - Would be nice to show funnel per persona

### Existing Data That Can Be Computed
- Everything else can be computed from existing `Outreach.actionsHistory`, `conversationHistory`, and `ContactRelation` data
- No schema changes required for core funnel metrics

### Performance Considerations
- Consider caching statistics (Redis) with 5-minute TTL
- Use MongoDB aggregation pipelines for efficiency
- Index `actionsHistory.type` for faster queries
