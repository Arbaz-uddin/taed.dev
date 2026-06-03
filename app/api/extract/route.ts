import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { executeExtraction, ExtractionError, ERROR_CODES } from '@/lib/llm-orchestrator'
import type { ModelProvider } from '@/lib/types/database'

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
      .select('wallet_balance, team_id')
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
    
    // Model configuration from request (with defaults)
    const provider = (formData.get('provider') as ModelProvider) || 'OPENAI'
    const model = (formData.get('model') as string) || 'gpt-4o-mini'
    const isCustom = formData.get('isCustom') === 'true'
    const customEndpointUrl = formData.get('customEndpointUrl') as string | null
    const customAuthKeyEnvVar = formData.get('customAuthKeyEnvVar') as string | null

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

    // Get custom API key from vault if using enterprise custom model
    let customApiKey: string | null = null
    if (isCustom && customAuthKeyEnvVar) {
      const { data: vaultKey } = await supabaseAdmin
        .from('enterprise_vault_keys')
        .select('encrypted_key_reference')
        .eq('user_id', user.id)
        .eq('key_name', customAuthKeyEnvVar)
        .single()
      
      if (vaultKey) {
        // In production, this would decrypt the key from a secure vault
        // For now, we'll use the reference as the key (should be encrypted)
        customApiKey = vaultKey.encrypted_key_reference
      }
    }

    // Execute extraction with the orchestrator
    const result = await executeExtraction(
      {
        provider,
        model,
        isCustom,
        customEndpointUrl,
        customApiKey,
      },
      {
        base64Image: base64,
        mimeType,
        fields,
      }
    )

    // Check if user has enough balance for the actual cost
    const currentBalance = Number(profile.wallet_balance)
    const newBalance = currentBalance - result.cost
    
    if (newBalance < 0) {
      return Response.json({ 
        error: 'Insufficient wallet balance for this extraction.',
        cost: result.cost.toFixed(6),
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

    // Log usage with model info
    const { data: usageLog } = await supabaseAdmin.from('api_usage_logs').insert({
      user_id: user.id,
      team_id: profile.team_id,
      file_name: file.name,
      file_type: file.type,
      success: true,
      cost: result.cost,
      model_provider: provider,
      model_name: model,
    }).select().single()

    // Record transaction
    await supabaseAdmin.from('wallet_transactions').insert({
      user_id: user.id,
      amount: -result.cost,
      type: 'debit',
      description: `Extraction via ${provider}/${model}: ${file.name}`,
      api_log_id: usageLog?.id,
      balance_after: newBalance,
    })

    return Response.json({
      success: true,
      data: result.data,
      fields: fields.map((f) => f.name),
      cost: result.cost.toFixed(6),
      wallet_balance: newBalance.toFixed(4),
      model: {
        provider,
        model,
      },
      usage: result.usage,
    })
  } catch (error) {
    console.error('Extraction error:', error)
    
    // Handle ExtractionError with proper error codes
    if (error instanceof ExtractionError) {
      return Response.json(
        { 
          success: false,
          error: error.message,
          error_code: error.code,
          error_details: ERROR_CODES[error.code],
        },
        { status: error.status }
      )
    }
    
    // Fallback to generic pipeline failure
    return Response.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : 'Failed to extract data',
        error_code: 'EXTRACTION_PIPELINE_FAILURE',
        error_details: ERROR_CODES.EXTRACTION_PIPELINE_FAILURE,
      },
      { status: 500 }
    )
  }
}
