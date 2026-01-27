# Quiz Persona Creation - Two Options Spec

## Overview

Two paths for persona creation in the quiz:

| Path | Input | Processing | Time | Best For |
|------|-------|------------|------|----------|
| **A: AI from URL** | Website URL (optional) | Full RAG + ICP generation | 30-60s | Users with company website |
| **B: Natural Language** | Text description | Direct LLM parsing to params | 5-10s | Quick setup, no website |

---

## Path A: AI-Generated from URL (Existing)

### Flow
```
User enters URL → Ingest website → Generate ICPs → Create personas
```

### Existing Endpoints
```typescript
// Step 1: Ingest website
POST /personas/sources
{
  type: 'website',
  title: 'Company Website',
  url: 'https://example.com'
}

// Step 2: Generate personas (takes 30-60s)
POST /personas/generate
{
  icpSourceId: 'source-123'
}

// Response: Array of full personas with LinkedIn params
```

### Output
- Multiple personas (typically 2-4)
- Complete LinkedIn params
- Pain points, fears, barriers
- Confidence scores
- Preview contacts

### Quiz UI
```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│  Option A: Generate from your website                           │
│                                                                 │
│  Your website: https://mycompany.com ✓                          │
│  (from earlier step)                                            │
│                                                                 │
│  We'll analyze your website to understand:                      │
│  • Who your ideal customers are                                 │
│  • Their pain points and challenges                             │
│  • The best way to reach them                                   │
│                                                                 │
│  [ Generate Personas from Website ]                             │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Path B: Natural Language to Params (NEW)

### Concept
User describes their ideal contact in plain English → AI converts to structured LinkedIn search parameters.

### Example Input/Output

**User Input**:
```
"CTOs and VPs of Engineering at Series A-C fintech startups 
in the US and UK who are scaling their teams"
```

**AI Output**:
```typescript
{
  personaName: "Tech Leaders at Growth-Stage Fintech",
  description: "CTOs and VPs of Engineering at Series A-C fintech startups in the US and UK who are scaling their teams",
  linkedinParams: {
    jobTitles: {
      include: [
        { name: "CTO", code: "cto" },
        { name: "Chief Technology Officer", code: "chief-technology-officer" },
        { name: "VP of Engineering", code: "vp-of-engineering" },
        { name: "VP Engineering", code: "vp-engineering" },
        { name: "Vice President of Engineering", code: "vice-president-of-engineering" }
      ],
      exclude: []
    },
    industries: {
      include: [
        { name: "Financial Services", code: "financial-services" },
        { name: "Fintech", code: "fintech" },
        { name: "Banking", code: "banking" }
      ],
      exclude: []
    },
    locations: {
      include: [
        { name: "United States", code: "united-states" },
        { name: "United Kingdom", code: "united-kingdom" }
      ],
      exclude: []
    },
    companyHeadcount: {
      min: 11,    // Series A typical
      max: 500    // Series C typical
    },
    seniority: {
      include: [
        { name: "CXO", code: "cxo" },
        { name: "Vice President", code: "vice_president" }
      ],
      exclude: []
    },
    companyTypes: [
      { name: "Privately Held", code: "privately_held" }
    ]
  },
  suggestedKeywords: "scaling OR growth OR hiring OR engineering team"
}
```

### New Backend Endpoint Needed

**Endpoint**: `POST /personas/parse-description`

**Request**:
```typescript
interface ParsePersonaDescriptionInput {
  description: string;           // Natural language input
  isSalesNavigator?: boolean;    // Enable Sales Nav specific fields
  locale?: string;               // For location/industry name localization
}
```

**Response**:
```typescript
interface ParsePersonaDescriptionOutput {
  // Generated metadata
  personaName: string;
  personaDescription: string;
  
  // LinkedIn params (ready for persona creation)
  linkedinParams: {
    jobTitles: LinkedinSearchParam;
    industries?: LinkedinSearchParam;
    locations?: LinkedinSearchParam;
    companyHeadcount?: LinkedinHeadcountParam;
    companyTypes?: LinkedinCompanyTypeParam[];
    companyLocations?: LinkedinSearchParam;
    departments?: LinkedinSearchParam;
    seniority?: LinkedinSeniorityLevelParam;
    tenure?: LinkedinTenureParam;
    keywords?: string;
    // Sales Nav only fields
    tenureAtCompany?: LinkedinTenureParam;
    tenureAtRole?: LinkedinTenureParam;
    pastCompany?: LinkedinSearchParam;
    changedJobs?: boolean;
    postedOnLinkedin?: boolean;
  };
  
  // For UI feedback
  confidence: number;            // 0-1 how confident AI is in parsing
  missingInfo?: string[];        // What user could add for better results
  suggestions?: string[];        // "Did you mean..." suggestions
}
```

### AI Service Implementation

**New method in `AIService`**:
```typescript
async parsePersonaDescription({
  description,
  isSalesNavigator = false,
}: {
  description: string;
  isSalesNavigator?: boolean;
}): Promise<ParsePersonaDescriptionOutput> {
  const { data, status } = await this.fetchRetry<ParsePersonaDescriptionOutput>({
    path: 'personas/parse',
    body: {
      description,
      is_sales_navigator: isSalesNavigator,
      // Include valid options for structured output
      valid_seniority_levels: Object.keys(SENIORITY_LEVEL_CODE_TO_LABEL),
      valid_company_types: Object.keys(COMPANY_TYPE_CODE_TO_LABEL),
      valid_headcount_ranges: COMPANY_HEADCOUNT_RANGES,
    },
  });
  return data;
}
```

### AI Prompt Strategy

The AI endpoint should:

1. **Extract entities** from natural language:
   - Job titles (expand to variations)
   - Industries (map to LinkedIn codes)
   - Locations (map to LinkedIn location codes)
   - Company size signals ("startup", "enterprise", "Series A")
   - Seniority signals ("senior", "VP", "manager")

2. **Map to LinkedIn params**:
   - Use predefined mappings for company size:
     - "startup" / "early stage" → 1-50
     - "Series A" → 11-50
     - "Series B" → 51-200
     - "Series C" → 201-500
     - "growth stage" → 51-500
     - "enterprise" / "large" → 1000+
   
3. **Expand job titles**:
   - "CTO" → ["CTO", "Chief Technology Officer", "Chief Tech Officer"]
   - "VP Engineering" → ["VP Engineering", "VP of Engineering", "Vice President Engineering"]

4. **Handle ambiguity**:
   - Return confidence score
   - Suggest clarifications if needed

### Quiz UI for Path B

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│  Option B: Describe who you want to meet                        │
│                                                                 │
│  Tell us in your own words:                                     │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ CTOs and engineering leaders at Series A-C startups     │    │
│  │ in fintech who are building their teams...              │    │
│  │                                                         │    │
│  │                                                         │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                 │
│  💡 Examples:                                                   │
│  • "Marketing directors at e-commerce companies in Europe"      │
│  • "Founders of AI startups with 10-50 employees"               │
│  • "HR managers at healthcare companies in California"          │
│                                                                 │
│  [ Find Matching Contacts ]                                     │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### After Parsing - Review & Refine

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│  ✨ We understood your request!                                 │
│                                                                 │
│  Here's what we'll search for:                                  │
│                                                                 │
│  Job Titles:     CTO, VP Engineering, Head of Tech  [Edit]      │
│  Industries:     Fintech, Financial Services        [Edit]      │
│  Locations:      United States, United Kingdom      [Edit]      │
│  Company Size:   11-500 employees                   [Edit]      │
│  Seniority:      C-Level, VP                        [Edit]      │
│                                                                 │
│  ─────────────────────────────────────────────────────────────  │
│                                                                 │
│  Estimated audience: ~8,500 people                              │
│                                                                 │
│  [ ← Refine description ]    [ Find Contacts → ]                │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Combined Quiz Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│     Who do you want to connect with?                            │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                                                         │    │
│  │  ○ Use my company website (recommended)                 │    │
│  │    We'll analyze your site to find ideal customers      │    │
│  │    [Uses: https://mycompany.com from earlier]           │    │
│  │                                                         │    │
│  │  ● Describe in my own words                             │    │
│  │    Tell us who you're looking for                       │    │
│  │                                                         │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                 │
│  [If "Describe in my own words" selected:]                      │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ I'm looking for decision makers at mid-size tech        │    │
│  │ companies who need better sales tools...                │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                 │
│                                  [ Continue → ]                 │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Implementation Tasks

### Backend Tasks

#### Task 1: Create Parse Description Endpoint

**File**: `backend/apps/api/src/persona/persona.controller.ts`

```typescript
@Post('parse-description')
@ApiOperation({ summary: 'Parse natural language to LinkedIn params' })
@ApiBody({ type: ParsePersonaDescriptionInput })
@ApiResponse({ status: 200, type: ParsePersonaDescriptionOutput })
async parsePersonaDescription(
  @Body() input: ParsePersonaDescriptionInput,
  @AuthData() authData: AuthObject,
) {
  return this.personaService.parseDescription(input);
}
```

#### Task 2: Add AI Service Method

**File**: `backend/libs/common/src/ai-service/ai-service.service.ts`

```typescript
async parsePersonaDescription(input: {
  description: string;
  isSalesNavigator?: boolean;
}): Promise<ParsePersonaDescriptionOutput> {
  const { data } = await this.fetchRetry<ParsePersonaDescriptionOutput>({
    path: 'personas/parse',
    body: {
      description: input.description,
      is_sales_navigator: input.isSalesNavigator,
      valid_options: {
        seniority_levels: Object.entries(SENIORITY_LEVEL_CODE_TO_LABEL),
        company_types: Object.entries(COMPANY_TYPE_CODE_TO_LABEL),
        headcount_ranges: COMPANY_HEADCOUNT_RANGES,
      },
    },
  });
  return data;
}
```

#### Task 3: AI Service Endpoint (Python)

**New endpoint in AI service**: `POST /personas/parse`

Prompt structure:
```
You are an expert at understanding professional networking requests.

Parse the following description into LinkedIn search parameters.

Description: "{user_input}"

Return a JSON object with:
- personaName: A short name for this persona (e.g., "Tech Leaders at Startups")
- linkedinParams: Structured search parameters

Available seniority levels: {seniority_options}
Available company types: {company_types}
Available headcount ranges: {headcount_ranges}

For job titles, include common variations.
For company size, map descriptions like "startup" or "Series A" to appropriate headcount ranges.
```

### Frontend Tasks

#### Task 1: Create Description Input Component

**File**: `frontend/src/modules/onboarding/steps/PersonaDescriptionInput.tsx`

#### Task 2: Create Parsed Params Review Component

**File**: `frontend/src/modules/onboarding/steps/ParsedParamsReview.tsx`

#### Task 3: Add API Hook

**File**: `frontend/src/api/entities/persona/persona-mutations.ts`

```typescript
export const useParsePersonaDescription = () => {
  const { mutate, mutateAsync, isPending } = $api.useMutation(
    'post',
    '/personas/parse-description',
  );
  
  return {
    parseDescription: mutate,
    parseDescriptionAsync: mutateAsync,
    isParsing: isPending,
  };
};
```

---

## User Experience Comparison

| Aspect | Path A (URL) | Path B (Natural Language) |
|--------|--------------|---------------------------|
| **Input effort** | Just click (URL from earlier) | Type 1-2 sentences |
| **Wait time** | 30-60 seconds | 5-10 seconds |
| **Output** | Multiple complete personas | Single persona params |
| **Pain points included** | Yes | No |
| **Confidence** | Higher (more data) | Medium (depends on input) |
| **Editable** | Yes, full form | Yes, parsed params |

---

## Fallback Strategy

If user provides neither URL nor description:

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│  Quick setup - just the basics:                                 │
│                                                                 │
│  What job titles are you looking for?                           │
│  [ CTO ] [ VP Engineering ] [ + Add ]                           │
│                                                                 │
│  What industries?                                               │
│  [ Technology ] [ SaaS ] [ + Add ]                              │
│                                                                 │
│  Where are they located?                                        │
│  [ United States ] [ + Add ]                                    │
│                                                                 │
│  Company size?                                                  │
│  [ ] 1-10  [✓] 11-50  [✓] 51-200  [ ] 200+                     │
│                                                                 │
│                               [ Find Contacts → ]               │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

This ensures every user can create a persona, regardless of input preference.
