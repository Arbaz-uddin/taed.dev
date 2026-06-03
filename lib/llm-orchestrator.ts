import { generateText, Output } from 'ai'
import { z } from 'zod'
import type { ModelProvider } from '@/lib/types/database'

// Model pricing per 1M tokens
export const MODEL_PRICING: Record<string, { input: number; output: number }> = {
  // OpenAI
  'gpt-4o-mini': { input: 0.15, output: 0.60 },
  'gpt-4o': { input: 2.50, output: 10.00 },
  // Gemini
  'gemini-1.5-flash': { input: 0.075, output: 0.30 },
  'gemini-1.5-pro': { input: 1.25, output: 5.00 },
  // Anthropic
  'claude-3-5-haiku-latest': { input: 0.80, output: 4.00 },
  'claude-sonnet-4-20250514': { input: 3.00, output: 15.00 },
}

// Markup percentage
const MARKUP = 1.30

// Map provider + model to Vercel AI Gateway model string
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
  return Math.max(totalCost, 0.0001) // Minimum cost
}

// Execute extraction using standard providers via Vercel AI Gateway
async function executeStandardExtraction(
  config: OrchestrationConfig,
  input: ExtractionInput
): Promise<ExtractionOutput> {
  const gatewayModel = getGatewayModel(config.provider, config.model)
  const extractionSchema = buildExtractionSchema(input.fields)
  const prompt = buildExtractionPrompt(input.fields)

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

  return {
    data: result.output as Record<string, string | null>,
    usage: { promptTokens, completionTokens },
    cost,
  }
}

// Execute extraction using custom enterprise endpoint
async function executeCustomExtraction(
  config: OrchestrationConfig,
  input: ExtractionInput
): Promise<ExtractionOutput> {
  if (!config.customEndpointUrl) {
    throw new Error('Custom endpoint URL is required for enterprise models')
  }

  if (!config.customApiKey) {
    throw new Error('Custom API key is required for enterprise models')
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
    throw new Error(`Custom endpoint error: ${response.status} - ${errorText}`)
  }

  const result = await response.json()
  
  // Parse the response (OpenAI-compatible format)
  const content = result.choices?.[0]?.message?.content || '{}'
  let parsedData: Record<string, string | null>
  
  try {
    parsedData = JSON.parse(content)
  } catch {
    // If parsing fails, try to extract fields from the text
    parsedData = {}
    for (const field of input.fields) {
      parsedData[field.name] = null
    }
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
