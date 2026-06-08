import { generateText, Output } from 'ai'
import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { z } from 'zod'
import type { ModelProvider } from '@/lib/types/database'

// Direct Google provider (billed via GOOGLE_GENERATIVE_AI_API_KEY, not the AI Gateway)
const google = createGoogleGenerativeAI({
  apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
})

// Error codes for extraction pipeline
export const ERROR_CODES = {
  EXTRACTION_PIPELINE_FAILURE: {
    code: 'EXTRACTION_PIPELINE_FAILURE',
    status: 500,
    message: 'The extraction pipeline encountered an unexpected error. Please try again or contact support.',
  },
  MODEL_COMPLIANCE_REFUSAL: {
    code: 'MODEL_COMPLIANCE_REFUSAL',
    status: 403,
    message: 'The AI model refused to process this content due to safety/compliance policies.',
  },
  SCHEMA_MISMATCH_EMPTY_OUTPUT: {
    code: 'SCHEMA_MISMATCH_EMPTY_OUTPUT',
    status: 422,
    message: 'The extraction returned empty or invalid data. The document may not contain the requested fields.',
  },
  UNREADABLE_IMAGE_CONTENT: {
    code: 'UNREADABLE_IMAGE_CONTENT',
    status: 422,
    message: 'The image/document could not be read. Please ensure the file is clear, properly oriented, and not corrupted.',
  },
  MODEL_NOT_FOUND: {
    code: 'MODEL_NOT_FOUND',
    status: 400,
    message: 'The selected model is no longer available. Please choose a different model and try again.',
  },
  PAYMENT_REQUIRED: {
    code: 'PAYMENT_REQUIRED',
    status: 402,
    message: 'This model requires a paid plan. Add credits/billing for this provider (Vercel AI Gateway for OpenAI/Anthropic, or Google AI Studio for Gemini), then try again.',
  },
  RATE_LIMITED: {
    code: 'RATE_LIMITED',
    status: 429,
    message: 'The model provider is rate-limiting requests. Please wait a moment and try again.',
  },
  MODEL_AUTH_FAILURE: {
    code: 'MODEL_AUTH_FAILURE',
    status: 401,
    message: 'Authentication with the model provider failed. The API key for this provider is missing or invalid.',
  },
} as const

export type ErrorCode = keyof typeof ERROR_CODES

export class ExtractionError extends Error {
  code: ErrorCode
  status: number

  constructor(code: ErrorCode, customMessage?: string) {
    const errorDef = ERROR_CODES[code]
    super(customMessage || errorDef.message)
    this.code = code
    this.status = errorDef.status
    this.name = 'ExtractionError'
  }
}

// Model pricing per 1M tokens
export const MODEL_PRICING: Record<string, { input: number; output: number }> = {
  // OpenAI (via Vercel AI Gateway)
  'gpt-4o-mini': { input: 0.15, output: 0.60 },
  'gpt-4o': { input: 2.50, output: 10.00 },
  // Gemini (via direct Google API)
  'gemini-2.5-flash': { input: 0.30, output: 2.50 },
  'gemini-2.5-pro': { input: 1.25, output: 10.00 },
  // Anthropic (via Vercel AI Gateway)
  'claude-haiku-4.5': { input: 1.00, output: 5.00 },
  'claude-sonnet-4.5': { input: 3.00, output: 15.00 },
}

// Markup percentage (100% margin = 2x cost)
const MARKUP = 2.00

// Minimum cost per extraction in USD
const MINIMUM_COST = 0.01

// Map provider + model to a model usable by the AI SDK.
// Gemini uses the direct Google provider (billed via GOOGLE_GENERATIVE_AI_API_KEY).
// OpenAI and Anthropic route through the Vercel AI Gateway (billed via AI_GATEWAY_API_KEY).
function getGatewayModel(provider: ModelProvider, model: string): string {
  switch (provider) {
    case 'OPENAI':
      return `openai/${model}`
    case 'GEMINI':
      return `google/${model}`
    case 'ANTHROPIC':
      return `anthropic/${model}`
    case 'CUSTOM':
      // Custom models are handled separately
      return model
    default:
      return 'openai/gpt-4o-mini'
  }
}

// Resolve the actual model instance/string passed to generateText.
function resolveModel(provider: ModelProvider, model: string) {
  if (provider === 'GEMINI') {
    // Use the direct Google provider so Gemini is billed through Google AI Studio.
    return google(model)
  }
  return getGatewayModel(provider, model)
}

interface ExtractionField {
  name: string
  description: string
}

interface OrchestrationConfig {
  provider: ModelProvider
  model: string
  isCustom: boolean
  customEndpointUrl?: string | null
  customApiKey?: string | null
}

interface ExtractionInput {
  base64Image: string
  mimeType: string
  fields: ExtractionField[]
}

interface ExtractionOutput {
  data: Record<string, string | null>
  usage: {
    promptTokens: number
    completionTokens: number
  }
  cost: number
}

// Build dynamic Zod schema from user-defined fields
function buildExtractionSchema(fields: ExtractionField[]) {
  const schemaShape: Record<string, z.ZodNullable<z.ZodString>> = {}
  for (const field of fields) {
    schemaShape[field.name] = z.string().nullable().describe(field.description)
  }
  return z.object(schemaShape)
}

// Build extraction prompt
function buildExtractionPrompt(fields: ExtractionField[]): string {
  const fieldDescriptions = fields
    .map((f) => `- ${f.name}: ${f.description}`)
    .join('\n')

  return `You are an OCR extraction expert. Analyze this document/image and extract the following information.

Fields to extract:
${fieldDescriptions}

Important instructions:
1. Extract the exact text as it appears in the document
2. If a field is not found in the document, return null for that field
3. Be precise and accurate with the extraction
4. For dates, preserve the original format
5. For numbers, preserve formatting (commas, decimals, currency symbols)

Return the extracted data as a JSON object.`
}

// Calculate cost based on token usage
function calculateCost(
  model: string, 
  promptTokens: number, 
  completionTokens: number
): number {
  const pricing = MODEL_PRICING[model] || { input: 0.15, output: 0.60 }
  const inputCost = (promptTokens / 1_000_000) * pricing.input
  const outputCost = (completionTokens / 1_000_000) * pricing.output
  const totalCost = (inputCost + outputCost) * MARKUP
  // Enforce minimum cost of $0.01 per extraction
  return Math.max(totalCost, MINIMUM_COST)
}

// Execute extraction using standard providers via Vercel AI Gateway
async function executeStandardExtraction(
  config: OrchestrationConfig,
  input: ExtractionInput
): Promise<ExtractionOutput> {
  const gatewayModel = resolveModel(config.provider, config.model)
  const extractionSchema = buildExtractionSchema(input.fields)
  const prompt = buildExtractionPrompt(input.fields)

  try {
    const result = await generateText({
      model: gatewayModel,
      output: Output.object({ schema: extractionSchema }),
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              image: `data:${input.mimeType};base64,${input.base64Image}`,
            },
            {
              type: 'text',
              text: prompt,
            },
          ],
        },
      ],
    })

    const promptTokens = result.usage?.inputTokens || 0
    const completionTokens = result.usage?.outputTokens || 0
    const cost = calculateCost(config.model, promptTokens, completionTokens)

    const outputData = result.output as Record<string, string | null>
    
    // Check for empty or all-null output (schema mismatch)
    if (!outputData || Object.keys(outputData).length === 0) {
      throw new ExtractionError('SCHEMA_MISMATCH_EMPTY_OUTPUT')
    }
    
    const allNull = Object.values(outputData).every(v => v === null)
    if (allNull) {
      throw new ExtractionError('SCHEMA_MISMATCH_EMPTY_OUTPUT', 
        'No data could be extracted from the document. The requested fields may not be present.')
    }

    return {
      data: outputData,
      usage: { promptTokens, completionTokens },
      cost,
    }
  } catch (error) {
    // Re-throw ExtractionErrors as-is
    if (error instanceof ExtractionError) {
      throw error
    }

    const errorMessage = error instanceof Error ? error.message.toLowerCase() : ''

    // Payment / paid-plan required (free tier blocked or credits depleted)
    if (
      errorMessage.includes('prepayment') ||
      errorMessage.includes('credits are depleted') ||
      errorMessage.includes('free tier') ||
      errorMessage.includes('payment required') ||
      errorMessage.includes('billing') ||
      errorMessage.includes('quota') ||
      errorMessage.includes('insufficient_quota') ||
      errorMessage.includes('upgrade to paid')
    ) {
      throw new ExtractionError('PAYMENT_REQUIRED')
    }

    // Model not found / retired / invalid id
    if (
      errorMessage.includes('model not found') ||
      errorMessage.includes('not found') ||
      errorMessage.includes('does not exist') ||
      errorMessage.includes('unknown model') ||
      errorMessage.includes('no endpoints found') ||
      errorMessage.includes('unsupported model')
    ) {
      throw new ExtractionError('MODEL_NOT_FOUND')
    }

    // Authentication failures (missing / invalid API key)
    if (
      errorMessage.includes('api key') ||
      errorMessage.includes('unauthorized') ||
      errorMessage.includes('authentication') ||
      errorMessage.includes('401') ||
      errorMessage.includes('invalid_api_key')
    ) {
      throw new ExtractionError('MODEL_AUTH_FAILURE')
    }

    // Rate limiting
    if (
      errorMessage.includes('rate limit') ||
      errorMessage.includes('rate_limit') ||
      errorMessage.includes('too many requests') ||
      errorMessage.includes('429')
    ) {
      throw new ExtractionError('RATE_LIMITED')
    }

    // Check for model compliance/safety refusal
    if (
      errorMessage.includes('safety') ||
      errorMessage.includes('refused') ||
      errorMessage.includes('policy') ||
      errorMessage.includes('content policy') ||
      errorMessage.includes('harmful') ||
      errorMessage.includes('inappropriate')
    ) {
      throw new ExtractionError('MODEL_COMPLIANCE_REFUSAL')
    }
    
    // Check for unreadable image content
    if (
      errorMessage.includes('image') ||
      errorMessage.includes('unreadable') ||
      errorMessage.includes('corrupt') ||
      errorMessage.includes('invalid file') ||
      errorMessage.includes('cannot process') ||
      errorMessage.includes('unable to read')
    ) {
      throw new ExtractionError('UNREADABLE_IMAGE_CONTENT')
    }
    
    // Generic pipeline failure
    throw new ExtractionError('EXTRACTION_PIPELINE_FAILURE', 
      error instanceof Error ? error.message : 'Unknown extraction error')
  }
}

// Execute extraction using custom enterprise endpoint
async function executeCustomExtraction(
  config: OrchestrationConfig,
  input: ExtractionInput
): Promise<ExtractionOutput> {
  if (!config.customEndpointUrl) {
    throw new ExtractionError('EXTRACTION_PIPELINE_FAILURE', 
      'Custom endpoint URL is required for enterprise models')
  }

  if (!config.customApiKey) {
    throw new ExtractionError('EXTRACTION_PIPELINE_FAILURE', 
      'Custom API key is required for enterprise models')
  }

  const prompt = buildExtractionPrompt(input.fields)
  
  // Build the request for OpenAI-compatible API
  const requestBody = {
    model: config.model,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image_url',
            image_url: {
              url: `data:${input.mimeType};base64,${input.base64Image}`,
            },
          },
          {
            type: 'text',
            text: prompt,
          },
        ],
      },
    ],
    response_format: { type: 'json_object' },
    max_tokens: 4096,
  }

  try {
    const response = await fetch(config.customEndpointUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.customApiKey}`,
      },
      body: JSON.stringify(requestBody),
    })

    if (!response.ok) {
      const errorText = await response.text()
      
      // Check for compliance refusal (403)
      if (response.status === 403) {
        throw new ExtractionError('MODEL_COMPLIANCE_REFUSAL')
      }
      
      throw new ExtractionError('EXTRACTION_PIPELINE_FAILURE', 
        `Custom endpoint error: ${response.status} - ${errorText}`)
    }

    const result = await response.json()
    
    // Parse the response (OpenAI-compatible format)
    const content = result.choices?.[0]?.message?.content || '{}'
    let parsedData: Record<string, string | null>
    
    try {
      parsedData = JSON.parse(content)
    } catch {
      throw new ExtractionError('SCHEMA_MISMATCH_EMPTY_OUTPUT', 
        'Failed to parse extraction response as JSON')
    }

    // Check for empty output
    if (!parsedData || Object.keys(parsedData).length === 0) {
      throw new ExtractionError('SCHEMA_MISMATCH_EMPTY_OUTPUT')
    }

    const promptTokens = result.usage?.prompt_tokens || 0
    const completionTokens = result.usage?.completion_tokens || 0
    
    // For custom models, we don't have pricing info, so use a default
    const cost = calculateCost('gpt-4o-mini', promptTokens, completionTokens)

    return {
      data: parsedData,
      usage: { promptTokens, completionTokens },
      cost,
    }
  } catch (error) {
    if (error instanceof ExtractionError) {
      throw error
    }
    
    throw new ExtractionError('EXTRACTION_PIPELINE_FAILURE', 
      error instanceof Error ? error.message : 'Custom endpoint extraction failed')
  }
}

// Main orchestration function
export async function executeExtraction(
  config: OrchestrationConfig,
  input: ExtractionInput
): Promise<ExtractionOutput> {
  if (config.isCustom && config.provider === 'CUSTOM') {
    return executeCustomExtraction(config, input)
  }
  
  return executeStandardExtraction(config, input)
}

// Export utilities
export { buildExtractionSchema, buildExtractionPrompt, calculateCost, getGatewayModel }
