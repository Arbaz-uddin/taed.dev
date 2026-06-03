'use client'

import { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { 
  Sparkles, 
  Zap, 
  DollarSign, 
  Clock, 
  FileText, 
  ChevronDown,
  Building2,
  Lock,
  Info,
  Server
} from 'lucide-react'
import type { ModelProvider, ModelConfig } from '@/lib/types/database'

// Model definitions with pricing and capabilities
export const MODEL_PROVIDERS = {
  OPENAI: {
    name: 'OpenAI',
    models: [
      { 
        id: 'gpt-4o-mini', 
        name: 'GPT-4o Mini', 
        inputCost: 0.15, 
        outputCost: 0.60,
        contextWindow: 128000,
        strengths: ['Fast', 'Cost-effective', 'Good accuracy'],
        bestFor: 'Simple extractions, small files'
      },
      { 
        id: 'gpt-4o', 
        name: 'GPT-4o', 
        inputCost: 2.50, 
        outputCost: 10.00,
        contextWindow: 128000,
        strengths: ['High accuracy', 'Complex reasoning', 'Multi-modal'],
        bestFor: 'Complex documents, high accuracy needs'
      },
    ]
  },
  GEMINI: {
    name: 'Google Gemini',
    models: [
      { 
        id: 'gemini-1.5-flash', 
        name: 'Gemini 1.5 Flash', 
        inputCost: 0.075, 
        outputCost: 0.30,
        contextWindow: 1000000,
        strengths: ['Massive context', 'Fast', 'Great for PDFs'],
        bestFor: 'Large documents, multi-page PDFs'
      },
      { 
        id: 'gemini-1.5-pro', 
        name: 'Gemini 1.5 Pro', 
        inputCost: 1.25, 
        outputCost: 5.00,
        contextWindow: 2000000,
        strengths: ['Best context window', 'Superior document understanding'],
        bestFor: 'Massive documents, complex layouts'
      },
    ]
  },
  ANTHROPIC: {
    name: 'Anthropic',
    models: [
      { 
        id: 'claude-3-5-haiku-latest', 
        name: 'Claude 3.5 Haiku', 
        inputCost: 0.80, 
        outputCost: 4.00,
        contextWindow: 200000,
        strengths: ['Fast', 'Great reasoning', 'Long context'],
        bestFor: 'Quick extractions, balanced performance'
      },
      { 
        id: 'claude-sonnet-4-20250514', 
        name: 'Claude Sonnet 4', 
        inputCost: 3.00, 
        outputCost: 15.00,
        contextWindow: 200000,
        strengths: ['Best accuracy', 'Complex documents', 'Superior reasoning'],
        bestFor: 'High-stakes extractions, complex layouts'
      },
    ]
  },
  CUSTOM: {
    name: 'Enterprise Custom (BYOC)',
    models: []
  }
} as const

interface VaultKey {
  id: string
  key_name: string
  key_description: string | null
}

interface ModelSelectorProps {
  value: ModelConfig
  onChange: (config: ModelConfig) => void
  fileSizeBytes?: number
  fieldCount?: number
  vaultKeys?: VaultKey[]
  disabled?: boolean
}

// Smart recommendation engine
function getRecommendation(fileSizeBytes: number, fieldCount: number): {
  provider: ModelProvider
  model: string
  reason: string
} {
  const fileSizeMB = fileSizeBytes / (1024 * 1024)
  
  // Large files (>5MB) or many fields - recommend Gemini for context window
  if (fileSizeMB > 5 || fieldCount > 10) {
    return {
      provider: 'GEMINI',
      model: 'gemini-1.5-flash',
      reason: 'Superior Context Window & Document Layout Recovery'
    }
  }
  
  // Medium files (1-5MB) with moderate complexity
  if (fileSizeMB > 1 && fileSizeMB <= 5) {
    return {
      provider: 'OPENAI',
      model: 'gpt-4o-mini',
      reason: 'Optimal Balance of Cost & Accuracy'
    }
  }
  
  // Small files (<1MB) with simple fields - recommend cost-effective options
  if (fileSizeMB < 1 && fieldCount <= 5) {
    return {
      provider: 'ANTHROPIC',
      model: 'claude-3-5-haiku-latest',
      reason: 'Fast & Accurate for Simple Documents'
    }
  }
  
  // Default recommendation
  return {
    provider: 'OPENAI',
    model: 'gpt-4o-mini',
    reason: 'Reliable Performance & Value'
  }
}

export function ModelSelector({
  value,
  onChange,
  fileSizeBytes = 0,
  fieldCount = 1,
  vaultKeys = [],
  disabled = false
}: ModelSelectorProps) {
  const [isEnterpriseOpen, setIsEnterpriseOpen] = useState(value.isCustom)
  
  const recommendation = useMemo(() => 
    getRecommendation(fileSizeBytes, fieldCount),
    [fileSizeBytes, fieldCount]
  )
  
  const isRecommended = value.provider === recommendation.provider && 
    value.model === recommendation.model

  const currentProviderModels = value.provider !== 'CUSTOM' 
    ? MODEL_PROVIDERS[value.provider].models 
    : []

  const selectedModelInfo = currentProviderModels.find(m => m.id === value.model)

  const handleProviderChange = (provider: ModelProvider) => {
    if (provider === 'CUSTOM') {
      onChange({
        ...value,
        provider,
        model: '',
        isCustom: true
      })
      setIsEnterpriseOpen(true)
    } else {
      const defaultModel = MODEL_PROVIDERS[provider].models[0]?.id || ''
      onChange({
        provider,
        model: defaultModel,
        isCustom: false,
        customEndpointUrl: undefined,
        customModelAuthKeyEnvVar: undefined
      })
      setIsEnterpriseOpen(false)
    }
  }

  const handleModelChange = (model: string) => {
    onChange({ ...value, model })
  }

  const applyRecommendation = () => {
    onChange({
      provider: recommendation.provider,
      model: recommendation.model,
      isCustom: false,
      customEndpointUrl: undefined,
      customModelAuthKeyEnvVar: undefined
    })
    setIsEnterpriseOpen(false)
  }

  return (
    <Card className="border-border/50 bg-card/50">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Server className="h-4 w-4 text-cyan-400" />
              Model Configuration
            </CardTitle>
            <CardDescription className="text-xs mt-1">
              Select AI model for extraction processing
            </CardDescription>
          </div>
          {fileSizeBytes > 0 && (
            <Badge 
              variant="outline" 
              className={`text-xs cursor-pointer transition-colors ${
                isRecommended 
                  ? 'border-green-500/50 bg-green-500/10 text-green-400' 
                  : 'border-cyan-500/50 bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20'
              }`}
              onClick={!isRecommended ? applyRecommendation : undefined}
            >
              <Sparkles className="h-3 w-3 mr-1" />
              {isRecommended ? 'Optimal Choice' : `Recommended: ${recommendation.model}`}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Recommendation Banner */}
        {fileSizeBytes > 0 && !isRecommended && (
          <div 
            className="flex items-start gap-3 p-3 rounded-lg bg-cyan-500/10 border border-cyan-500/20 cursor-pointer hover:bg-cyan-500/15 transition-colors"
            onClick={applyRecommendation}
          >
            <Sparkles className="h-4 w-4 text-cyan-400 mt-0.5 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-cyan-400">
                Recommended: {MODEL_PROVIDERS[recommendation.provider].name} - {recommendation.model}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {recommendation.reason}
              </p>
            </div>
            <Button size="sm" variant="ghost" className="text-xs text-cyan-400 hover:text-cyan-300 shrink-0">
              Apply
            </Button>
          </div>
        )}

        {/* Provider Selection */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {(Object.keys(MODEL_PROVIDERS) as ModelProvider[]).map((provider) => (
            <button
              key={provider}
              disabled={disabled}
              onClick={() => handleProviderChange(provider)}
              className={`p-3 rounded-lg border text-left transition-all ${
                value.provider === provider
                  ? 'border-cyan-500 bg-cyan-500/10'
                  : 'border-border/50 bg-background/50 hover:border-border hover:bg-background'
              } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            >
              <div className="flex items-center gap-2 mb-1">
                {provider === 'CUSTOM' ? (
                  <Building2 className="h-4 w-4 text-amber-400" />
                ) : provider === 'GEMINI' ? (
                  <Sparkles className="h-4 w-4 text-blue-400" />
                ) : provider === 'DEEPSEEK' ? (
                  <Zap className="h-4 w-4 text-green-400" />
                ) : (
                  <FileText className="h-4 w-4 text-emerald-400" />
                )}
                <span className={`text-xs font-medium ${
                  value.provider === provider ? 'text-foreground' : 'text-muted-foreground'
                }`}>
                  {MODEL_PROVIDERS[provider].name}
                </span>
              </div>
              {provider !== 'CUSTOM' && (
                <p className="text-[10px] text-muted-foreground">
                  {MODEL_PROVIDERS[provider].models.length} models
                </p>
              )}
              {provider === 'CUSTOM' && (
                <p className="text-[10px] text-amber-400/70">Enterprise</p>
              )}
            </button>
          ))}
        </div>

        {/* Model Selection (for non-custom providers) */}
        {value.provider !== 'CUSTOM' && (
          <div className="space-y-3">
            <Label className="text-xs text-muted-foreground">Select Model</Label>
            <Select
              value={value.model}
              onValueChange={handleModelChange}
              disabled={disabled}
            >
              <SelectTrigger className="bg-background/50">
                <SelectValue placeholder="Select a model" />
              </SelectTrigger>
              <SelectContent>
                {currentProviderModels.map((model) => (
                  <SelectItem key={model.id} value={model.id}>
                    <div className="flex items-center gap-2">
                      <span>{model.name}</span>
                      <span className="text-xs text-muted-foreground">
                        ${model.inputCost}/1M in
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Model Info Card */}
            {selectedModelInfo && (
              <div className="p-3 rounded-lg bg-background/50 border border-border/50 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{selectedModelInfo.name}</span>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <DollarSign className="h-3 w-3" />
                      ${selectedModelInfo.inputCost}/1M in
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {(selectedModelInfo.contextWindow / 1000).toFixed(0)}K ctx
                    </span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {selectedModelInfo.strengths.map((strength, i) => (
                    <Badge key={i} variant="secondary" className="text-[10px] px-1.5 py-0">
                      {strength}
                    </Badge>
                  ))}
                </div>
                <p className="text-[10px] text-muted-foreground">
                  Best for: {selectedModelInfo.bestFor}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Enterprise BYOC Panel */}
        {value.provider === 'CUSTOM' && (
          <Collapsible open={isEnterpriseOpen} onOpenChange={setIsEnterpriseOpen}>
            <CollapsibleTrigger asChild>
              <Button
                variant="outline"
                className="w-full justify-between border-amber-500/30 bg-amber-500/5 hover:bg-amber-500/10"
              >
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-amber-400" />
                  <span className="text-sm">Enterprise Custom Configuration</span>
                </div>
                <ChevronDown className={`h-4 w-4 text-amber-400 transition-transform ${isEnterpriseOpen ? 'rotate-180' : ''}`} />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-3 space-y-4">
              <div className="p-4 rounded-lg border border-amber-500/20 bg-amber-500/5 space-y-4">
                <div className="flex items-start gap-2 text-xs text-amber-400/80">
                  <Info className="h-4 w-4 shrink-0 mt-0.5" />
                  <p>
                    Configure your own AI endpoint for data residency compliance. 
                    Supports Azure OpenAI, Google Vertex AI, or any OpenAI-compatible API.
                  </p>
                </div>

                <div className="space-y-3">
                  <div>
                    <Label className="text-xs text-muted-foreground mb-1.5 block">
                      Base API Endpoint URL
                    </Label>
                    <Input
                      placeholder="https://your-endpoint.openai.azure.com/v1"
                      value={value.customEndpointUrl || ''}
                      onChange={(e) => onChange({ ...value, customEndpointUrl: e.target.value })}
                      disabled={disabled}
                      className="bg-background/50 text-sm"
                    />
                  </div>

                  <div>
                    <Label className="text-xs text-muted-foreground mb-1.5 block">
                      Model Name / Deployment ID
                    </Label>
                    <Input
                      placeholder="gpt-4o-deployment"
                      value={value.model}
                      onChange={(e) => handleModelChange(e.target.value)}
                      disabled={disabled}
                      className="bg-background/50 text-sm"
                    />
                  </div>

                  <div>
                    <Label className="text-xs text-muted-foreground mb-1.5 block">
                      <div className="flex items-center gap-1.5">
                        <Lock className="h-3 w-3" />
                        Vault Key for Authorization
                      </div>
                    </Label>
                    {vaultKeys.length > 0 ? (
                      <Select
                        value={value.customModelAuthKeyEnvVar || ''}
                        onValueChange={(v) => onChange({ ...value, customModelAuthKeyEnvVar: v })}
                        disabled={disabled}
                      >
                        <SelectTrigger className="bg-background/50">
                          <SelectValue placeholder="Select a vault key" />
                        </SelectTrigger>
                        <SelectContent>
                          {vaultKeys.map((key) => (
                            <SelectItem key={key.id} value={key.key_name}>
                              <div className="flex items-center gap-2">
                                <Lock className="h-3 w-3 text-amber-400" />
                                <span>{key.key_name}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <div className="p-2 rounded bg-background/50 border border-dashed border-border text-xs text-muted-foreground text-center">
                        No vault keys configured. Add keys in Team Settings.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}
      </CardContent>
    </Card>
  )
}

// Export utility functions
export function getModelPricing(provider: ModelProvider, model: string) {
  if (provider === 'CUSTOM') {
    return { inputCost: 0, outputCost: 0 } // Custom pricing handled separately
  }
  const modelInfo = MODEL_PROVIDERS[provider].models.find(m => m.id === model)
  return modelInfo 
    ? { inputCost: modelInfo.inputCost, outputCost: modelInfo.outputCost }
    : { inputCost: 0.15, outputCost: 0.60 } // Default fallback
}

export { getRecommendation }
