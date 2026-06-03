import { generateText, Output } from 'ai'
import { z } from 'zod'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'

// OpenAI GPT-4o-mini pricing per 1M tokens
const INPUT_COST_PER_1M = 0.15
const OUTPUT_COST_PER_1M = 0.60
const MARKUP = 1.30 // 30% markup

// Create admin client for wallet operations
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: Request) {
  try {
    // Get user session
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
        },
      }
    )
    
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's wallet balance
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('wallet_balance')
      .eq('id', user.id)
      .single()

    if (!profile || Number(profile.wallet_balance) <= 0) {
      return Response.json({ 
        error: 'Insufficient wallet balance. Please add funds to continue.',
        wallet_balance: profile?.wallet_balance || 0,
        action_required: 'add_funds',
        contact_url: '/contact'
      }, { status: 402 })
    }

    const formData = await req.formData()
    const file = formData.get('file') as File
    const fieldsJson = formData.get('fields') as string

    if (!file) {
      return Response.json({ error: 'No file uploaded' }, { status: 400 })
    }

    const fields = JSON.parse(fieldsJson) as { name: string; description: string }[]

    if (!fields || fields.length === 0) {
      return Response.json({ error: 'No extraction fields defined' }, { status: 400 })
    }

    // Convert file to base64
    const bytes = await file.arrayBuffer()
    const base64 = Buffer.from(bytes).toString('base64')
    const mimeType = file.type || 'image/png'

    // Build dynamic schema based on user-defined fields
    const schemaShape: Record<string, z.ZodString | z.ZodOptional<z.ZodString>> = {}
    for (const field of fields) {
      schemaShape[field.name] = z.string().nullable().describe(field.description)
    }
    const extractionSchema = z.object(schemaShape)

    // Build field descriptions for the prompt
    const fieldDescriptions = fields
      .map((f) => `- ${f.name}: ${f.description}`)
      .join('\n')

    const result = await generateText({
      model: 'openai/gpt-4o-mini',
      output: Output.object({ schema: extractionSchema }),
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              image: `data:${mimeType};base64,${base64}`,
            },
            {
              type: 'text',
              text: `You are an OCR extraction expert. Analyze this document/image and extract the following information.

Fields to extract:
${fieldDescriptions}

Important instructions:
1. Extract the exact text as it appears in the document
2. If a field is not found in the document, return null for that field
3. Be precise and accurate with the extraction
4. For dates, preserve the original format
5. For numbers, preserve formatting (commas, decimals, currency symbols)

Return the extracted data as a JSON object.`,
            },
          ],
        },
      ],
    })

    // Calculate actual cost based on token usage
    const inputTokens = result.usage?.promptTokens || 0
    const outputTokens = result.usage?.completionTokens || 0
    
    const inputCost = (inputTokens / 1_000_000) * INPUT_COST_PER_1M
    const outputCost = (outputTokens / 1_000_000) * OUTPUT_COST_PER_1M
    const totalCost = (inputCost + outputCost) * MARKUP
    const finalCost = Math.max(totalCost, 0.0001) // Minimum cost

    // Check if user has enough balance for the actual cost
    const currentBalance = Number(profile.wallet_balance)
    const newBalance = currentBalance - finalCost
    
    if (newBalance < 0) {
      return Response.json({ 
        error: 'Insufficient wallet balance for this extraction.',
        cost: finalCost.toFixed(6),
        wallet_balance: profile.wallet_balance,
        action_required: 'add_funds',
        contact_url: '/contact'
      }, { status: 402 })
    }

    // Deduct from wallet
    await supabaseAdmin
      .from('profiles')
      .update({ wallet_balance: newBalance })
      .eq('id', user.id)

    // Log usage with cost
    const { data: usageLog } = await supabaseAdmin.from('api_usage_logs').insert({
      user_id: user.id,
      file_name: file.name,
      file_type: file.type,
      success: true,
      cost: finalCost,
    }).select().single()

    // Record transaction
    await supabaseAdmin.from('wallet_transactions').insert({
      user_id: user.id,
      amount: -finalCost,
      type: 'debit',
      description: `Dashboard extraction: ${file.name}`,
      api_log_id: usageLog?.id,
      balance_after: newBalance,
    })

    return Response.json({
      success: true,
      data: result.output,
      fields: fields.map((f) => f.name),
      cost: finalCost.toFixed(6),
      wallet_balance: newBalance.toFixed(4),
    })
  } catch (error) {
    console.error('Extraction error:', error)
    return Response.json(
      { error: error instanceof Error ? error.message : 'Failed to extract data' },
      { status: 500 }
    )
  }
}
