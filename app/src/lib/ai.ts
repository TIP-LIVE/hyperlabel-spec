import { VertexAI } from '@google-cloud/vertexai'

// GCP project and location for Vertex AI
const projectId = process.env.GCP_PROJECT_ID
const location = process.env.GCP_LOCATION || 'us-central1'

// Initialize Vertex AI client (uses Application Default Credentials)
const vertexAI = projectId ? new VertexAI({ project: projectId, location }) : null

/**
 * Check if AI services are configured
 */
export function isAIConfigured(): boolean {
  return Boolean(projectId && !projectId.startsWith('REPLACE'))
}

/**
 * Get the Gemini Flash model for fast, cheap inference
 */
export function getFlashModel() {
  if (!vertexAI) throw new Error('AI service not configured')
  return vertexAI.getGenerativeModel({ model: 'gemini-2.0-flash' })
}

// ============================================
// Cargo Photo Analysis
// ============================================

export interface CargoAnalysis {
  labelVisible: boolean
  labelAttachmentQuality: 'good' | 'poor' | 'not_visible'
  cargoType: string | null
  packageCount: number | null
  existingLabels: string[]
  hazardWarnings: string[]
  cargoCondition: 'good' | 'damaged' | 'unknown'
  confidence: number
  summary: string
}

const CARGO_PHOTO_PROMPT = `You are analyzing a cargo photo for a shipping/tracking platform called TIP.

Analyze this image and return a JSON object with these fields:
{
  "labelVisible": boolean - Is a TIP tracking label visible on the cargo?
  "labelAttachmentQuality": "good" | "poor" | "not_visible" - How well is the label attached?
  "cargoType": string | null - Type of cargo (e.g., "cardboard boxes", "palletized goods", "electronics", "machinery")
  "packageCount": number | null - Estimated number of packages/boxes visible
  "existingLabels": string[] - Any other shipping labels visible (e.g., "DHL", "FedEx", "fragile sticker")
  "hazardWarnings": string[] - Any hazard indicators (e.g., "flammable symbol", "heavy load", "fragile")
  "cargoCondition": "good" | "damaged" | "unknown" - Visible condition of cargo
  "confidence": number - Your confidence in the analysis (0.0 to 1.0)
  "summary": string - One sentence summary of what you see
}

Return ONLY valid JSON, no markdown formatting or code blocks.`

/**
 * Analyze a cargo photo using Gemini Vision via Vertex AI
 */
export async function analyzeCargoPhoto(imageBase64: string, mimeType: string): Promise<CargoAnalysis> {
  const model = getFlashModel()

  const result = await model.generateContent({
    contents: [
      {
        role: 'user',
        parts: [
          { text: CARGO_PHOTO_PROMPT },
          {
            inlineData: {
              data: imageBase64,
              mimeType,
            },
          },
        ],
      },
    ],
  })

  const response = result.response
  const text = response.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || ''

  // Parse JSON — handle potential markdown code fences
  const jsonStr = text.replace(/^```json?\s*/, '').replace(/```\s*$/, '').trim()

  try {
    const parsed = JSON.parse(jsonStr) as CargoAnalysis
    return parsed
  } catch {
    // If Gemini returns something unparseable, return defaults
    return {
      labelVisible: false,
      labelAttachmentQuality: 'not_visible',
      cargoType: null,
      packageCount: null,
      existingLabels: [],
      hazardWarnings: [],
      cargoCondition: 'unknown',
      confidence: 0,
      summary: 'Unable to analyze image',
    }
  }
}

// ============================================
// Smart Address Normalization
// ============================================

export interface NormalizedAddress {
  normalized: string
  street: string | null
  city: string | null
  state: string | null
  postalCode: string | null
  country: string | null
  countryCode: string | null
  confidence: number
  corrections: string[]
}

const ADDRESS_NORMALIZE_PROMPT = `You are an address normalization service for an international shipping platform.

Given a raw address input, normalize it into a clean, standardized format. Fix typos, expand abbreviations, add missing components if obvious, and standardize formatting.

Return ONLY valid JSON with these fields:
{
  "normalized": string - The full normalized address string
  "street": string | null - Street address
  "city": string | null - City name
  "state": string | null - State/province/region
  "postalCode": string | null - Postal/ZIP code
  "country": string | null - Full country name
  "countryCode": string | null - ISO 3166-1 alpha-2 country code (e.g., "GB", "US", "DE")
  "confidence": number - Your confidence in the normalization (0.0 to 1.0)
  "corrections": string[] - List of corrections made (e.g., "Fixed typo: Londn → London", "Added postal code")
}

Return ONLY valid JSON, no markdown formatting or code blocks.`

/**
 * Normalize an address using Gemini via Vertex AI
 */
export async function normalizeAddress(rawAddress: string): Promise<NormalizedAddress> {
  const model = getFlashModel()

  const result = await model.generateContent({
    contents: [
      {
        role: 'user',
        parts: [
          { text: ADDRESS_NORMALIZE_PROMPT },
          { text: `Address to normalize: "${rawAddress}"` },
        ],
      },
    ],
  })

  const response = result.response
  const text = response.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || ''
  const jsonStr = text.replace(/^```json?\s*/, '').replace(/```\s*$/, '').trim()

  try {
    const parsed = JSON.parse(jsonStr) as NormalizedAddress
    return parsed
  } catch {
    return {
      normalized: rawAddress,
      street: null,
      city: null,
      state: null,
      postalCode: null,
      country: null,
      countryCode: null,
      confidence: 0,
      corrections: [],
    }
  }
}
