'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'

interface TermsDialogProps {
  trigger: React.ReactNode
  defaultOpen?: boolean
  onOpenChange?: (open: boolean) => void
}

export function TermsDialog({ trigger, defaultOpen, onOpenChange }: TermsDialogProps) {
  const [open, setOpen] = useState(defaultOpen ?? false)

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen)
    onOpenChange?.(newOpen)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Terms of Service &amp; Privacy Policy</DialogTitle>
          <DialogDescription>
            Please read our terms and privacy policy carefully before using TAED.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="h-[60vh] pr-4">
          <div className="space-y-6 text-sm text-muted-foreground">
            <p className="text-foreground font-semibold text-base">
              TAED.dev — Terms of Service &amp; Privacy Policy
            </p>
            
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4">
              <p className="text-amber-600 font-medium">Important Notice Before You Start Building:</p>
              <p className="mt-2 text-amber-600/80">
                By creating an account, authenticating via OAuth, utilizing our sandbox environments, or issuing requests to the TAED API endpoint (api.taed.dev), you explicitly agree to be bound by these Terms of Service and Privacy Policy. If you do not agree with any part of these legal frameworks, you must immediately halt usage of our services.
              </p>
            </div>

            <div className="space-y-4">
              <h3 className="text-foreground font-semibold text-lg">1. Terms of Service</h3>
              
              <div className="space-y-2">
                <h4 className="text-foreground font-medium">1.1 Architecture &amp; Scope of Service</h4>
                <p>
                  TAED (the &quot;Platform&quot;), operated and owned by Metavolv Technologies LLC, Dubai, provides a developer-first orchestration layer designed to simplify visual analysis, multi-prompt vision pipeline execution, and structured data compilation.
                </p>
                <p>
                  TAED does not train or maintain proprietary foundational vision models. Instead, the Platform acts as a processing middleware layer that interfaces with ready-to-use third-party artificial intelligence engines.
                </p>
              </div>

              <div className="space-y-2">
                <h4 className="text-foreground font-medium">1.2 Downstream AI Provider Agreement Dependency</h4>
                <p>
                  Because TAED orchestrates data pipelines across frontier foundation models, your acceptance of these Terms explicitly constitutes an operational acceptance of the independent Terms of Service and Privacy Policies of our downstream AI providers, including but not limited to:
                </p>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li>OpenAI, LLC</li>
                  <li>Google LLC (Gemini Engine)</li>
                  <li>DeepSeek Inc.</li>
                  <li>Anthropic PBC</li>
                </ul>
                <p>
                  It is your sole responsibility as a developer to ensure your data intake pipelines comply with the acceptable use guidelines issued by these downstream vendors.
                </p>
              </div>

              <div className="space-y-2">
                <h4 className="text-foreground font-medium">1.3 Usage-Based Token Compute &amp; Credits</h4>
                <p>
                  <strong>Consumption Metrics:</strong> All compute credits on the Platform (including promotional sign-up credits or paid packages) are consumed dynamically based on the exact payload footprints, and response generation lengths determined by the respective underlying AI models.
                </p>
                <p>
                  <strong>Billing Transparency:</strong> TAED reserves the right to modify its token-to-credit conversion ratios in real time to accurately reflect pricing adjustments made by upstream AI vendors. All platform credit expenditures are final and non-refundable.
                </p>
              </div>

              <div className="space-y-2">
                <h4 className="text-foreground font-medium">1.4 Bring Your Own Compute (BYOC) &amp; Enterprise Compliance</h4>
                <p>
                  For enterprise accounts configuring custom model proxy configurations: you retain absolute liability for securing your internal network access, managing rate-limit caps, and ensuring compliance within your corporate perimeter. TAED acts solely as the interface router for these custom nodes.
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-foreground font-semibold text-lg">2. Privacy Policy &amp; Data Handling Framework</h3>
              
              <div className="space-y-2">
                <h4 className="text-foreground font-medium">2.1 The Core Zero-Retention Principle</h4>
                <p>TAED is architected to prioritize absolute data minimization for engineering teams and applications:</p>
                <p>
                  <strong>Data in Transit:</strong> When payloads (images, documents, files) pass through the TAED cloud routing layer, they are processed entirely in memory.
                </p>
                <p>
                  <strong>Zero Storage Policy:</strong> TAED does not persistently store, store-and-forward, log, cache, or retain your raw source files, image uploads, or generated extraction data strings on our database servers.
                </p>
              </div>

              <div className="space-y-2">
                <h4 className="text-foreground font-medium">2.2 Upstream Provider Indemnification &amp; Data Risk</h4>
                <p>
                  TAED maintains commercial, enterprise-tier paid API subscriptions with our upstream AI providers (OpenAI, Google, DeepSeek, Anthropic). Under our commercial subscription tiers, our vendors explicitly state that they do not utilize API payload text or visual assets to train future model iterations, nor do they retain data beyond standard safety compliance windows.
                </p>
                <p>
                  To the best of our technical knowledge and engineering safeguards, your data remains completely private. However, you acknowledge and agree that:
                </p>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li>The data retention infrastructure of third-party model providers is outside the physical or software-level control of TAED.</li>
                  <li>Should any downstream foundation model provider modify their underlying internal logging, retention policies, or compliance storage mechanisms in the future, TAED cannot be held liable for any external developer data handling, leakage, or exposure occurring within their closed network perimeters.</li>
                </ul>
              </div>

              <div className="space-y-2">
                <h4 className="text-foreground font-medium">2.3 Information We Do Collect</h4>
                <p>To maintain infrastructure stability and manage customer accounts, TAED collects minimal administrative metadata:</p>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li>Developer account email addresses and authentication tokens (e.g., GitHub/Google OAuth signatures).</li>
                  <li>Transactional billing metadata and token count parameters necessary for system compute validation.</li>
                  <li>Diagnostic system error codes (e.g., SCHEMA_VALIDATION_FAILED flags) devoid of raw user file contents, stored strictly to assist with playground troubleshooting.</li>
                </ul>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-foreground font-semibold text-lg">3. Jurisdiction &amp; Dispute Resolution</h3>
              <p>
                These legal frameworks are governed, interpreted, and enforced strictly in accordance with the laws and regulations of Dubai, United Arab Emirates. Any legal action, dispute, or non-compliance arbitration arising from the use of taed.dev shall fall under the exclusive jurisdiction of the competent courts of Dubai.
              </p>
            </div>

            <div className="space-y-4">
              <h3 className="text-foreground font-semibold text-lg">4. Developer Support &amp; Corporate Contact</h3>
              <p>
                TAED values transparent engineering operations. If your compliance leads, data security teams, or legal counsel have questions regarding container architecture, or proxy endpoints, please reach out directly:
              </p>
              <ul className="list-none space-y-1">
                <li><strong>Corporate Entity:</strong> Metavolv Technologies LLC, Dubai</li>
                <li><strong>Developer Liaison Email:</strong> hi@taed.dev</li>
              </ul>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}
