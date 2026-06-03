'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Navbar } from '@/components/navbar'
import { Footer } from '@/components/footer'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { useTheme } from 'next-themes'
import type { User } from '@supabase/supabase-js'
import { 
  ArrowRight,
  Zap,
  Shield,
  Layers,
  RefreshCw,
  Server,
  Copy,
  Check,
  FileText,
  AlertTriangle,
  Building2,
  CreditCard,
  Image as ImageIcon
} from 'lucide-react'

export default function HomePage() {
  const { resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [curlCopied, setCurlCopied] = useState(false)
  const [user, setUser] = useState<User | null>(null)

  useEffect(() => {
    setMounted(true)
    
    // Non-blocking auth check
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user: authUser } }) => {
      setUser(authUser as User | null)
    })
  }, [])

  const logoSrc = mounted && resolvedTheme === 'light' ? '/logo-light.png' : '/logo-dark.png'

  const copyCurl = async () => {
    const curlCommand = `fetch('https://api.taed.dev/v1/engine', {
  method: 'POST',
  headers: { 'Authorization': \`Bearer \${KEY}\` },
  body: JSON.stringify({
    pipelineId: "invoice_and_risk_check",
    fileUrl: "https://assets.dev/inv_01.pdf"
  })
}).then(res => res.json());`
    try {
      await navigator.clipboard.writeText(curlCommand)
      setCurlCopied(true)
      setTimeout(() => setCurlCopied(false), 2000)
    } catch {
      // Fallback for environments where clipboard API is blocked
      const textArea = document.createElement('textarea')
      textArea.value = curlCommand
      textArea.style.position = 'fixed'
      textArea.style.left = '-9999px'
      document.body.appendChild(textArea)
      textArea.select()
      try {
        document.execCommand('copy')
        setCurlCopied(true)
        setTimeout(() => setCurlCopied(false), 2000)
      } catch {
        // Silent fail if copy not supported
      }
      document.body.removeChild(textArea)
    }
  }

  const valueProps = [
    {
      icon: Layers,
      title: 'Multi-Prompt Chain Architectures',
      description: 'Single, massive prompts cause LLMs to hallucinate or miss critical details. Our platform lets you chain micro-prompts visually. Let Step 1 handle the extraction, Step 2 run the logic, and Step 3 execute the compliance checking.',
    },
    {
      icon: Shield,
      title: 'Type-Safe JSON Assured',
      description: 'Never write regex to strip out json wrappers from raw AI outputs again. Define your expected data schema natively in our canvas, and our middleware guarantees a clean, predictable, validated data payload delivered straight to your backend every single time.',
    },
    {
      icon: RefreshCw,
      title: 'Absolute Model Agnosticism',
      description: 'Model performance and pricing change rapidly. Don\'t couple your application infrastructure to a single API. Switch the underlying processing engine from Gemini Pro to GPT-4o with a single click in your dashboard—zero code changes required at your end.',
    },
    {
      icon: Server,
      title: 'Zero-Maintenance Infrastructure',
      description: 'Get infinite horizontal scaling out of the box. We handle parallel inference routing, cold-start latency reduction, and multi-modal pipeline optimization so your engineering team doesn\'t maintain complex GPU orchestration or infrastructure.',
    },
  ]

  const useCases = [
    {
      icon: CreditCard,
      title: 'Digital Onboarding & KYC',
      description: 'Extract text from variable national identity cards, auto-verify data fields, and run tampering/forgery flags simultaneously.',
    },
    {
      icon: FileText,
      title: 'Financial Document Auditing',
      description: 'Convert complex, multi-page financial statements, tables, and receipts into structured schemas without layout corruption.',
    },
    {
      icon: ImageIcon,
      title: 'Media & Content Moderation',
      description: 'Scan user-uploaded files for explicit content, analyze image contexts, count specific objects, and flag brand safety violations in a single pass.',
    },
  ]

  // Dynamic CTA based on auth state
  const HeroCTA = () => {
    if (user) {
      return (
        <Link href="/app" className="w-full sm:w-auto">
          <Button size="lg" className="w-full sm:w-auto gap-2 text-base px-6 sm:px-8 bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-600 hover:to-cyan-700">
            Go to Dashboard
            <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
      )
    }
    return (
      <Link href="/auth/sign-up" className="w-full sm:w-auto">
        <Button size="lg" className="w-full sm:w-auto gap-2 text-base px-6 sm:px-8 bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-600 hover:to-cyan-700">
          Create Free API Key
          <ArrowRight className="h-4 w-4" />
        </Button>
      </Link>
    )
  }

  const FinalCTA = () => {
    if (user) {
      return (
        <Link href="/app" className="w-full sm:w-auto">
          <Button size="lg" className="w-full sm:w-auto gap-2 text-base px-6 sm:px-8 bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-600 hover:to-cyan-700">
            Go to Dashboard
            <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
      )
    }
    return (
      <Link href="/auth/sign-up" className="w-full sm:w-auto">
        <Button size="lg" className="w-full sm:w-auto gap-2 text-base px-6 sm:px-8 bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-600 hover:to-cyan-700">
          Deploy Your First Engine Free
          <ArrowRight className="h-4 w-4" />
        </Button>
      </Link>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      {/* Hero Section */}
      <section className="relative pt-24 pb-16 sm:pt-32 sm:pb-20 lg:pt-40 lg:pb-28 overflow-hidden">
        {/* Background Glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] sm:w-[800px] h-[400px] sm:h-[600px] bg-cyan-500/20 rounded-full blur-[150px] opacity-50" />
        
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-4xl mx-auto">
            <h1 className="text-3xl font-bold tracking-tight sm:text-5xl lg:text-7xl text-balance">
              The Vision Layer for{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-cyan-600">Modern Apps.</span>
            </h1>
            
            <p className="mt-4 sm:mt-6 text-base sm:text-lg text-muted-foreground leading-relaxed max-w-3xl mx-auto text-pretty px-2">
              Stop writing fragile prompt wrappers, handling multi-modal latency, and parsing messy Markdown strings for OpenAI and Gemini. Chain your visual logic, define your JSON schema, and deploy a production-grade vision engine in 60 seconds.
            </p>
            
            <div className="mt-8 sm:mt-10 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4">
              <HeroCTA />
              <Button size="lg" variant="outline" className="w-full sm:w-auto text-base px-6 sm:px-8 gap-2" onClick={copyCurl}>
                {curlCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {curlCopied ? 'Copied!' : 'Copy Quickstart cURL'}
              </Button>
            </div>

            {!user && (
              <p className="mt-4 text-sm text-muted-foreground">
                No credit card required. Free $10 credit applies automatically upon email verification.
              </p>
            )}
          </div>

          {/* Interactive Hero Sandbox */}
          <div className="mt-12 sm:mt-16 relative">
            <div className="rounded-xl border border-border bg-zinc-950 shadow-2xl shadow-cyan-500/10 overflow-hidden">
              <div className="grid lg:grid-cols-2">
                {/* Left Panel - Input & Chain */}
                <div className="border-b lg:border-b-0 lg:border-r border-border p-4 sm:p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="h-3 w-3 rounded-full bg-red-500" />
                    <div className="h-3 w-3 rounded-full bg-yellow-500" />
                    <div className="h-3 w-3 rounded-full bg-green-500" />
                    <span className="ml-2 text-xs text-muted-foreground">Input & Chain</span>
                  </div>
                  
                  <div className="rounded-lg border border-dashed border-border bg-zinc-900/50 p-4 mb-4 text-center">
                    <FileText className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">invoice_sample.pdf</p>
                  </div>

                  <div className="space-y-3">
                    <div className="rounded-lg bg-cyan-500/10 border border-cyan-500/20 p-3">
                      <p className="text-xs text-cyan-400 font-medium mb-1">Step 1</p>
                      <p className="text-sm text-foreground">Extract all table data and metadata.</p>
                    </div>
                    <div className="rounded-lg bg-cyan-500/10 border border-cyan-500/20 p-3">
                      <p className="text-xs text-cyan-400 font-medium mb-1">Step 2</p>
                      <p className="text-sm text-foreground">Flag any anomalous fields or mismatch errors.</p>
                    </div>
                  </div>
                </div>

                {/* Right Panel - Output Preview */}
                <div className="p-4 sm:p-6 bg-zinc-900/30">
                  <div className="flex items-center gap-2 mb-4">
                    <span className="text-xs text-muted-foreground">Output Preview</span>
                    <span className="ml-auto px-2 py-0.5 rounded text-xs bg-green-500/20 text-green-400">Live</span>
                  </div>
                  
                  <pre className="text-xs sm:text-sm font-mono overflow-x-auto">
                    <code className="text-zinc-300">
{`{
  `}<span className="text-cyan-400">&quot;status&quot;</span>{`: `}<span className="text-green-400">&quot;success&quot;</span>{`,
  `}<span className="text-cyan-400">&quot;meta&quot;</span>{`: { 
    `}<span className="text-cyan-400">&quot;document_type&quot;</span>{`: `}<span className="text-green-400">&quot;invoice&quot;</span>{`,
    `}<span className="text-cyan-400">&quot;confidence&quot;</span>{`: `}<span className="text-yellow-400">0.99</span>{`
  },
  `}<span className="text-cyan-400">&quot;extracted_data&quot;</span>{`: { 
    `}<span className="text-cyan-400">&quot;total&quot;</span>{`: `}<span className="text-yellow-400">1420.50</span>{`,
    `}<span className="text-cyan-400">&quot;currency&quot;</span>{`: `}<span className="text-green-400">&quot;AED&quot;</span>{`
  },
  `}<span className="text-cyan-400">&quot;compliance_flags&quot;</span>{`: { 
    `}<span className="text-cyan-400">&quot;is_tampered&quot;</span>{`: `}<span className="text-red-400">false</span>{`,
    `}<span className="text-cyan-400">&quot;review_required&quot;</span>{`: `}<span className="text-red-400">false</span>{`
  }
}`}
                    </code>
                  </pre>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Launch Special Ticker */}
      {!user && (
        <section className="py-3 sm:py-4 border-y border-cyan-500/20 bg-gradient-to-r from-cyan-500/10 via-cyan-500/5 to-cyan-500/10">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-3 text-center">
              <Zap className="h-5 w-5 text-cyan-400 shrink-0" />
              <p className="text-xs sm:text-sm font-medium">
                <span className="text-cyan-400">Vibe-Coder Launch Special:</span>{' '}
                <span className="text-muted-foreground">Sign up today and get $10 in production compute credits.</span>
              </p>
            </div>
          </div>
        </section>
      )}

      {/* Problem Section */}
      <section className="py-16 sm:py-24 lg:py-32">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-2xl sm:text-3xl font-bold sm:text-4xl text-balance">
              Why are you still building custom vision microservices?
            </h2>
            <p className="mt-4 sm:mt-6 text-base sm:text-lg text-muted-foreground leading-relaxed">
              Building production-grade visual intelligence shouldn&apos;t mean managing your own Python execution environments, handling API rate limits, or fighting unstructured text responses.
            </p>
            <p className="mt-4 text-base sm:text-lg text-muted-foreground leading-relaxed">
              Every time you want to add a new use case—whether it&apos;s parsing a complex PDF, detecting an object, or flagging an explicit image—your engineering team shouldn&apos;t have to spin up a new pipeline.
            </p>
          </div>
        </div>
      </section>

      {/* Value Props Grid */}
      <section className="py-16 sm:py-24 lg:py-32 bg-card/30">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-10 sm:mb-16">
            <h2 className="text-2xl sm:text-3xl font-bold sm:text-4xl text-balance">
              Engineered for Speed. Built for Production.
            </h2>
          </div>

          <div className="grid gap-4 sm:gap-8 md:grid-cols-2">
            {valueProps.map((prop) => (
              <Card key={prop.title} className="bg-card/50 border-border/50 hover:border-cyan-500/30 transition-colors">
                <CardContent className="p-6">
                  <div className="inline-flex h-12 w-12 items-center justify-center rounded-lg bg-cyan-500/10 text-cyan-400 mb-4">
                    <prop.icon className="h-6 w-6" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">{prop.title}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    {prop.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Enterprise BYOC Section */}
      <section className="py-16 sm:py-24 lg:py-32">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3 sm:px-4 py-1.5 text-xs sm:text-sm text-cyan-400 mb-4 sm:mb-6">
                <Building2 className="h-4 w-4" />
                Enterprise Ready
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold sm:text-4xl text-balance">
                Cloud-Native Today. On-Premise Tomorrow.
              </h2>
              <p className="mt-4 sm:mt-6 text-base sm:text-lg text-muted-foreground leading-relaxed">
                Start prototyping on our blazing-fast, managed cloud infrastructure tonight. When your security, compliance, or legal teams demand strict data residency, don&apos;t worry—you won&apos;t have to rebuild a thing.
              </p>
              <p className="mt-4 text-base sm:text-lg text-muted-foreground leading-relaxed">
                With our <span className="text-foreground font-medium">Bring Your Own Compute (BYOC)</span> architecture, you can export the entire orchestration container and deploy it locally within your own secure perimeter.
              </p>
              <Link href="/contact" className="mt-6 sm:mt-8 inline-block">
                <Button size="lg" variant="outline" className="gap-2">
                  Talk to Enterprise Sales
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
            <div className="rounded-xl border border-border bg-card p-4 sm:p-8">
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                  <Check className="h-5 w-5 text-green-400" />
                  <span className="text-sm">SOC 2 Type II Compliant</span>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                  <Check className="h-5 w-5 text-green-400" />
                  <span className="text-sm">GDPR & HIPAA Ready</span>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                  <Check className="h-5 w-5 text-green-400" />
                  <span className="text-sm">On-Premise Deployment</span>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                  <Check className="h-5 w-5 text-green-400" />
                  <span className="text-sm">Private Cloud VPC Support</span>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                  <Check className="h-5 w-5 text-green-400" />
                  <span className="text-sm">Custom SLA & Priority Support</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Code Comparison Section */}
      <section className="py-16 sm:py-24 lg:py-32 bg-card/30">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-10 sm:mb-16">
            <h2 className="text-2xl sm:text-3xl font-bold sm:text-4xl text-balance">
              Ship code, not boilerplate.
            </h2>
          </div>

          <div className="grid lg:grid-cols-2 gap-4 sm:gap-6">
            {/* Old Way */}
            <div className="rounded-xl border border-red-500/20 bg-zinc-950 overflow-hidden">
              <div className="flex items-center gap-2 px-3 sm:px-4 py-2 sm:py-3 border-b border-border bg-red-500/10">
                <AlertTriangle className="h-4 w-4 text-red-400" />
                <span className="text-xs sm:text-sm font-medium text-red-400">THE OLD WAY (80+ Lines)</span>
              </div>
              <pre className="p-3 sm:p-4 text-xs sm:text-sm font-mono text-zinc-400 overflow-x-auto">
{`import openai
import pdfplumber
# Parse messy multi-part files...
# Handle asynchronous retries...
# Write prompt template arrays...
# Run complex regex to fix JSON...
# Pray the format doesn't break...
# Cache intermediate steps...
# Debug production failures at 3am...`}
              </pre>
            </div>

            {/* TAED Way */}
            <div className="rounded-xl border border-cyan-500/20 bg-zinc-950 overflow-hidden">
              <div className="flex items-center gap-2 px-3 sm:px-4 py-2 sm:py-3 border-b border-border bg-cyan-500/10">
                <Zap className="h-4 w-4 text-cyan-400" />
                <span className="text-xs sm:text-sm font-medium text-cyan-400">THE TAED WAY (1 Endpoint)</span>
              </div>
              <pre className="p-3 sm:p-4 text-xs sm:text-sm font-mono overflow-x-auto">
                <code className="text-zinc-300">
{`fetch('`}<span className="text-cyan-400">https://api.taed.dev/v1/engine</span>{`', {
  method: 'POST',
  headers: { 
    'Authorization': \`Bearer \${KEY}\` 
  },
  body: JSON.stringify({
    pipelineId: `}<span className="text-green-400">&quot;invoice_and_risk_check&quot;</span>{`,
    fileUrl: `}<span className="text-green-400">&quot;https://assets.dev/inv_01.pdf&quot;</span>{`
  })
}).then(res => res.json());`}
                </code>
              </pre>
            </div>
          </div>
        </div>
      </section>

      {/* Use Cases Section */}
      <section className="py-16 sm:py-24 lg:py-32">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-10 sm:mb-16">
            <h2 className="text-2xl sm:text-3xl font-bold sm:text-4xl text-balance">
              One platform. Infinite engineering solutions.
            </h2>
          </div>

          <div className="grid gap-4 sm:gap-8 md:grid-cols-3">
            {useCases.map((useCase) => (
              <Card key={useCase.title} className="bg-card/50 border-border/50 hover:border-cyan-500/30 transition-colors">
                <CardContent className="p-4 sm:p-6">
                  <div className="inline-flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-lg bg-cyan-500/10 text-cyan-400 mb-3 sm:mb-4">
                    <useCase.icon className="h-5 w-5 sm:h-6 sm:w-6" />
                  </div>
                  <h3 className="text-base sm:text-lg font-semibold mb-2">{useCase.title}</h3>
                  <p className="text-muted-foreground text-xs sm:text-sm leading-relaxed">
                    {useCase.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="py-16 sm:py-24 lg:py-32 bg-gradient-to-b from-card/50 to-background">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="relative rounded-2xl border border-cyan-500/20 bg-gradient-to-br from-cyan-500/10 via-card to-card p-6 sm:p-8 md:p-16 text-center overflow-hidden">
            <div className="absolute top-0 right-0 w-[300px] sm:w-[400px] h-[300px] sm:h-[400px] bg-cyan-500/10 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2" />
            <div className="relative">
              <h2 className="text-2xl sm:text-3xl font-bold sm:text-4xl text-balance">
                Stop configuring infrastructure. Start shipping vision logic.
              </h2>
              <p className="mt-4 text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto">
                {user 
                  ? 'Your dashboard is ready. Start building your next vision pipeline.'
                  : 'Join thousands of high-velocity developers and enterprise engineering teams leveraging the ultimate visual engine.'
                }
              </p>
              <div className="mt-6 sm:mt-8 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4">
                <FinalCTA />
              </div>
              {!user && (
                <p className="mt-4 text-xs sm:text-sm text-muted-foreground">
                  Claim your $10 free signup credit. Start parsing, chaining, and shipping in less than 2 minutes.
                </p>
              )}
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}
