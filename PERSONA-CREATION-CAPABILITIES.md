# Persona Creation System - Current Capabilities Analysis

## Overview

The system supports **two paths** for persona creation:

### Path A: AI-Generated Personas (Recommended for Quiz)
1. User adds **Source** (website URL or text)
2. AI ingests and analyzes the source
3. AI generates complete personas with LinkedIn params
4. User reviews and selects personas

### Path B: Manual Persona Creation
1. User fills out detailed form with LinkedIn targeting criteria
2. System searches LinkedIn for preview contacts
3. User refines criteria and saves persona

---

## Path A: AI-Generated Personas

### Step 1: Add Source
**Endpoint**: `POST /personas/sources`

**Input Options**:
```typescript
// Option 1: Website Source
{
  type: 'website',
  title: 'Company Website',
  url: 'https://company.com'
}

// Option 2: Text Source
{
  type: 'text', 
  title: 'Product Description',
  text: 'We help SaaS companies...'
}
```

**What AI Does**:
- Scrapes website (up to 10 pages) or processes text
- Creates knowledge chunks in RAG system
- Stores as `IcpSource` for organization

### Step 2: Generate Personas from Source
**Endpoint**: `POST /personas/generate`

**Input**:
```typescript
{
  icpSourceId: 'source-123'  // From step 1
}
```

**What AI Generates** (per persona):
```typescript
{
  // Persona Identity
  name: 'Growth-Focused VP of Sales',
  description: 'Senior sales leaders at B2B SaaS companies...',
  
  // Psychology
  pain_points: ['Long sales cycles', 'Low conversion rates'],
  fears: ['Losing deals to competitors', 'Team underperformance'],
  barriers: ['Budget constraints', 'Change resistance'],
  
  // LinkedIn Search Params (auto-generated!)
  industries: { include: ['Technology'], exclude: [] },
  job_titles: { include: ['VP Sales', 'Head of Sales'], exclude: [] },
  locations: { include: ['United States'], exclude: [] },
  departments: { include: ['Sales'], exclude: [] },
  company_headcount: { min: 51, max: 500 },
  company_types: ['privately_held'],
  seniority: { include: ['vice_president', 'director'], exclude: [] },
  tenure: { min: 1, max: 5 },
  keywords: 'SaaS OR B2B OR enterprise',
  
  // Confidence Scores
  overall_confidence: 0.85,
  data_completeness: 0.9,
  evidence_strength: 0.8,
  field_evidence: [/* citations from source */]
}
```

**Key Point**: AI generates complete LinkedIn search params automatically!

### Step 3: Preview & Save
- System auto-searches LinkedIn with generated params
- Shows 5 preview contacts
- Shows total audience size
- User can edit/refine before saving

---

## Path B: Manual Persona Creation

### Available LinkedIn Targeting Fields

**Required Fields**:
| Field | Type | Description |
|-------|------|-------------|
| `fullName` | string | Persona name (e.g., "Tech Decision Makers") |
| `description` | string | Detailed description |
| `searchViaNavigator` | enum | `'mandatory'`, `'preferable'`, `'optional'`, `'only_classic'` |
| `jobTitles` | include/exclude | Job title keywords |

**Role & Experience Fields**:
| Field | Sales Nav Only? | Description |
|-------|-----------------|-------------|
| `jobTitles` | ❌ | Include/exclude job titles |
| `seniority` | ❌ | Owner, CXO, VP, Director, Manager, Senior, Entry Level |
| `tenure` | ❌ | Years at current company (0-10) |
| `tenureAtCompany` | ✅ | Years at current company (more granular) |
| `tenureAtRole` | ✅ | Years in current role |
| `pastCompany` | ✅ | Previous employers |

**Company Info Fields**:
| Field | Sales Nav Only? | Description |
|-------|-----------------|-------------|
| `industries` | ❌ | Industry sectors |
| `companyHeadcount` | ❌ | Company size ranges (1-10K+) |
| `companyTypes` | ❌ | Public, Private, Non-profit, etc. |
| `companyLocations` | ❌ | Where company is based |
| `company` | ✅ | Specific current companies |

**Location & Network Fields**:
| Field | Sales Nav Only? | Description |
|-------|-----------------|-------------|
| `locations` | ❌ | Person's location |
| `networkDistance` | ❌ | 1st, 2nd, 3rd degree, Groups |
| `departments` | ✅ | Functional departments |

**Activity & Engagement Fields** (Sales Navigator Only):
| Field | Description |
|-------|-------------|
| `viewedProfileRecently` | Viewed your profile |
| `viewedYourProfileRecently` | Same as above |
| `messagedRecently` | Recent conversation |
| `includeSavedLeads` | In saved leads |
| `includeSavedAccounts` | In saved accounts |
| `changedJobs` | Recent job change |
| `mentionnedInNews` | In news recently |
| `postedOnLinkedin` | Active poster |

**Other Fields**:
| Field | Description |
|-------|-------------|
| `keywords` | Free-text search keywords |

---

## Company Size Options (companyHeadcount)

| Min | Max | Label |
|-----|-----|-------|
| 1 | 10 | 1-10 employees |
| 11 | 50 | 11-50 employees |
| 51 | 200 | 51-200 employees |
| 201 | 500 | 201-500 employees |
| 501 | 1000 | 501-1,000 employees |
| 1001 | 5000 | 1,001-5,000 employees |
| 5001 | 10000 | 5,001-10,000 employees |
| 10001 | - | 10,001+ employees |

---

## Seniority Level Options

| Code | Label |
|------|-------|
| `owner/partner` | Owner/Partner |
| `cxo` | CXO (C-Suite) |
| `vice_president` | Vice President |
| `director` | Director |
| `experienced_manager` | Experienced Manager |
| `entry_level_manager` | Entry Level Manager |
| `strategic` | Strategic |
| `senior` | Senior |
| `entry_level` | Entry Level |
| `in_training` | In Training |

---

## Company Type Options

| Code | Label |
|------|-------|
| `self_employed` | Self Employed |
| `self_owned` | Self Owned |
| `government_agency` | Government Agency |
| `public_company` | Public Company |
| `privately_held` | Privately Held |
| `non_profit` | Non Profit |
| `educational_institution` | Educational Institution |
| `partnership` | Partnership |

---

## Quiz Recommendation: Hybrid Approach

### For Step 6.1 in Quiz, recommend this flow:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│         Who do you want to connect with?                                    │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                                                                     │   │
│  │  Option A: Let AI figure it out (Recommended)                       │   │
│  │  ────────────────────────────────────────────────────────           │   │
│  │  We'll use your company website to understand your ideal            │   │
│  │  customers and generate targeting criteria automatically.           │   │
│  │                                                                     │   │
│  │  Website URL: [https://_______________] (from Step 3)               │   │
│  │                                                                     │   │
│  │  Or paste a description of your ideal customer:                     │   │
│  │  ┌─────────────────────────────────────────────────────┐            │   │
│  │  │ We're looking for CTOs at Series A-C startups who   │            │   │
│  │  │ are scaling their engineering teams and need...     │            │   │
│  │  └─────────────────────────────────────────────────────┘            │   │
│  │                                                                     │   │
│  │  [ Generate Personas with AI ]                                      │   │
│  │                                                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                                                                     │   │
│  │  Option B: Quick manual setup                                       │   │
│  │  ────────────────────────────────────────────────────────           │   │
│  │                                                                     │   │
│  │  Job Titles: [ CTO | VP Engineering | + Add more ]                  │   │
│  │                                                                     │   │
│  │  Company Size:                                                      │   │
│  │  [ ] 1-10  [✓] 11-50  [✓] 51-200  [✓] 201-500  [ ] 500+            │   │
│  │                                                                     │   │
│  │  Industries: [ Technology | SaaS | + Add more ]                     │   │
│  │                                                                     │   │
│  │  Location: [ United States | United Kingdom | + Add more ]          │   │
│  │                                                                     │   │
│  │  [ Find Matching Contacts ]                                         │   │
│  │                                                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## API Flow for Quiz

### Option A: AI-Generated (Recommended)

```typescript
// Step 1: If website URL available, create source
const source = await POST('/personas/sources', {
  type: 'website',
  title: 'Company Website',
  url: organizationWebsite  // From Step 3
});

// OR if user provides description
const source = await POST('/personas/sources', {
  type: 'text',
  title: 'ICP Description',
  text: userDescription
});

// Step 2: Generate personas (this takes ~30-60 seconds)
const personas = await POST('/personas/generate', {
  icpSourceId: source.id
});

// Step 3: Show generated personas with preview contacts
// Each persona already has:
// - LinkedIn search params
// - 5 preview contacts
// - Audience size
// - Pain points, fears, barriers
```

### Option B: Manual Quick Setup

```typescript
// Step 1: Get preview contacts for criteria
const preview = await POST('/personas/preview-contacts', {
  persona: {
    fullName: 'Tech Decision Makers',
    description: 'Generated from user selections',
    searchViaNavigator: 'preferable',
    linkedinParams: {
      jobTitles: { include: selectedJobTitles, exclude: [] },
      industries: { include: selectedIndustries, exclude: [] },
      locations: { include: selectedLocations, exclude: [] },
      companyHeadcount: { min: 51, max: 500 }
    }
  },
  isSalesNavigator: hasSalesNavigator
});

// Step 2: If user likes preview, create persona
const persona = await POST('/personas', {
  fullName: 'Tech Decision Makers',
  description: 'CTOs and VPs at growth-stage startups',
  searchViaNavigator: 'preferable',
  linkedinParams: {
    jobTitles: { include: selectedJobTitles, exclude: [] },
    // ... rest of params
  }
});
```

---

## Key Insights for Quiz Design

### 1. Website URL is POWERFUL
If we have the organization website from Step 3, we can:
- Auto-generate multiple personas
- Extract pain points, fears, barriers
- Create LinkedIn params automatically
- All with one click!

### 2. Sales Navigator = More Options
Users with Sales Navigator get:
- Activity filters (changed jobs, posted recently)
- More granular tenure options
- Past company targeting
- Generally better results

### 3. Preview is Instant-ish
- `POST /personas/preview-contacts` searches LinkedIn immediately
- Returns 5 contacts + audience size
- Takes 5-15 seconds

### 4. Generation Takes Longer
- `POST /personas/generate` (AI path) takes 30-60 seconds
- Great opportunity for educational content!

### 5. Min Viable Persona
For quiz, we could create a valid persona with just:
```typescript
{
  fullName: 'My First Persona',
  description: 'Auto-generated from quiz',
  searchViaNavigator: 'preferable',
  linkedinParams: {
    jobTitles: { include: [{ name: 'CTO', code: 'cto' }], exclude: [] }
  }
}
```

---

## Recommended Quiz Flow for Step 6

```
[User has website URL from Step 3]
           │
           ▼
┌─────────────────────────┐
│ "Let's find your ideal  │
│  connections..."        │
│                         │
│ [AI Generating...]      │
│                         │
│ (Show educational       │
│  content during wait)   │
└─────────────────────────┘
           │
           ▼ (30-60 seconds)
┌─────────────────────────┐
│ "We found 3 personas    │
│  for you!"              │
│                         │
│ [✓] VP Sales (8,500)    │
│ [✓] Marketing Dir (5,200)│
│ [ ] HR Managers (3,100) │
│                         │
│ [ Continue with 2 ]     │
└─────────────────────────┘
           │
           ▼
[Show preview contacts for selected personas]
```

**If no website URL**:
```
┌─────────────────────────┐
│ Quick setup:            │
│                         │
│ Job Title: [________]   │
│ Company Size: [____]    │
│ Industry: [________]    │
│ Location: [________]    │
│                         │
│ [Find Contacts]         │
└─────────────────────────┘
           │
           ▼ (5-15 seconds)
┌─────────────────────────┐
│ Found 12,500 matches!   │
│                         │
│ [Preview 5 contacts]    │
│                         │
│ [ Save & Continue ]     │
└─────────────────────────┘
```
