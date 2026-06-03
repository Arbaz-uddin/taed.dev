'use server'

import { createClient } from '@supabase/supabase-js'
import { executeExtraction, ExtractionError, ERROR_CODES } from '@/lib/llm-orchestrator'
import type { ModelProvider } from '@/lib/types/database'

// Helper to create admin client lazily (not at module level to avoid build errors)
function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function POST(request: Request) {
  const startTime = Date.now()
  
  try {
    // Get API key from header
    const apiKey = request.headers.get('X-API-Key') || request.headers.get('Authorization')?.replace('Bearer ', '')
    
    if (!apiKey) {
      return Response.json({ error: 'Missing API key. Provide X-API-Key header or Authorization: Bearer <key>' }, { status: 401 })
    }

    // Validate API key and get user with wallet balance
    const { data: profile, error: profileError } = await getSupabaseAdmin()
      .from('profiles')
      .select('id, team_id, wallet_balance')
      .eq('api_key', apiKey)
      .single()

    if (profileError || !profile) {
      return Response.json({ error: 'Invalid API key' }, { status: 401 })
    }

    // Check wallet balance
    if (Number(profile.wallet_balance) <= 0) {
      return Response.json({ 
        error: 'Insufficient wallet balance. Please add funds to your wallet or contact sales.',
        wallet_balance: profile.wallet_balance,
        action_required: 'add_funds',
        contact_url: '/contact'
      }, { status: 402 })
    }

    // Parse form data
    const formData = await request.formData()
    const file = formData.get('file') as File
    const apiId = formData.get('api_id') as string

    if (!file) {
      return Response.json({ error: 'No file provided' }, { status: 400 })
    }

    if (!apiId) {
      return Response.json({ error: 'No api_id provided' }, { status: 400 })
    }

    // Get saved API configuration
    const { data: savedApi, error: apiError } = await getSupabaseAdmin()
      .from('saved_apis')
      .select('*')
      .eq('id', apiId)
      .single()

    if (apiError || !savedApi) {
      return Response.json({ error: 'Invalid API ID or API not found' }, { status: 404 })
    }

    // Check if user has access to this API (own API or team API)
    const hasAccess = savedApi.user_id === profile.id || 
                      (savedApi.team_id && savedApi.team_id === profile.team_id)
    
    if (!hasAccess) {
      return Response.json({ error: 'Access denied to this API' }, { status: 403 })
    }

    // Get fields from saved API
    const fields = savedApi.fields as { name: string; description: string }[]
    
    if (!fields || fields.length === 0) {
      return Response.json({ error: 'API has no extraction fields configured' }, { status: 400 })
    }

    // Convert file to base64
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    const base64 = buffer.toString('base64')
    const mimeType = file.type || 'application/octet-stream'

    // Get model configuration from saved API (with defaults)
    const provider = (savedApi.selected_provider as ModelProvider) || 'OPENAI'
    const model = savedApi.selected_model || 'gpt-4o-mini'
    const isCustom = savedApi.is_custom_model || false

    // Execute extraction using orchestrator
    const result = await executeExtraction(
      {
        provider,
        model,
        isCustom,
        customEndpointUrl: savedApi.custom_endpoint_url,
        customApiKey: null, // Would need to fetch from vault for custom models
      },
      {
        base64Image: base64,
        mimeType,
        fields,
      }
    )

    const processingTime = Date.now() - startTime

    // Check if user has enough balance for the actual cost
    const newBalance = Number(profile.wallet_balance) - result.cost
    
    if (newBalance < 0) {
      return Response.json({ 
        error: 'Insufficient wallet balance for this extraction.',
        error_code: 'INSUFFICIENT_BALANCE',
        cost: result.cost.toFixed(6),
        wallet_balance: profile.wallet_balance,
        action_required: 'add_funds',
        contact_url: '/contact'
      }, { status: 402 })
    }

    // Deduct from wallet
    const { error: walletError } = await getSupabaseAdmin()
      .from('profiles')
      .update({ wallet_balance: newBalance })
      .eq('id', profile.id)

    if (walletError) {
      console.error('Wallet update error:', walletError)
    }

    // Log usage with cost and model info
    const { data: usageLog } = await getSupabaseAdmin().from('api_usage_logs').insert({
      user_id: profile.id,
      api_id: apiId,
      team_id: profile.team_id,
      file_name: file.name,
      file_type: file.type,
      success: true,
      processing_time_ms: processingTime,
      api_key_used: apiKey,
      cost: result.cost,
      model_provider: provider,
      model_name: model,
    }).select().single()

    // Record transaction
    await getSupabaseAdmin().from('wallet_transactions').insert({
      user_id: profile.id,
      amount: -result.cost,
      type: 'debit',
      description: `API extraction via ${provider}/${model}: ${savedApi.name}`,
      api_log_id: usageLog?.id,
      balance_after: newBalance,
    })

    return Response.json({
      success: true,
      data: result.data,
      fields: fields.map((f) => f.name),
      api_name: savedApi.name,
      processing_time_ms: processingTime,
      cost: result.cost.toFixed(6),
      wallet_balance: newBalance.toFixed(4),
      model: {
        provider,
        model,
      },
      usage: result.usage,
    })

  } catch (error) {
    const processingTime = Date.now() - startTime
    
    // Handle ExtractionError with proper error codes
    if (error instanceof ExtractionError) {
      return Response.json({ 
        success: false,
        error: error.message,
        error_code: error.code,
        error_details: ERROR_CODES[error.code],
        processing_time_ms: processingTime,
      }, { status: error.status })
    }
    
    // Fallback to generic pipeline failure
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    
    return Response.json({ 
      success: false,
      error: errorMessage,
      error_code: 'EXTRACTION_PIPELINE_FAILURE',
      error_details: ERROR_CODES.EXTRACTION_PIPELINE_FAILURE,
      processing_time_ms: processingTime,
    }, { status: 500 })
  }
}
