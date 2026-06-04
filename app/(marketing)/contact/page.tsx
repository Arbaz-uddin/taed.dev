'use client'

import { useState } from 'react'
import { Navbar } from '@/components/navbar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { useLanguage } from '@/lib/language-context'
import { 
  Mail, 
  MessageSquare, 
  Building2,
  Send,
  CheckCircle2,
  MapPin,
  Clock
} from 'lucide-react'

export default function ContactPage() {
  const { t } = useLanguage()
  const [formState, setFormState] = useState<'idle' | 'submitting' | 'success'>('idle')
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    company: '',
    message: '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormState('submitting')
    
    // Simulate form submission
    await new Promise((resolve) => setTimeout(resolve, 1500))
    
    setFormState('success')
    setFormData({ name: '', email: '', company: '', message: '' })
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      {/* Hero Section */}
      <section className="relative pt-24 pb-12 sm:pt-32 sm:pb-16 lg:pt-40 overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[400px] sm:w-[600px] h-[300px] sm:h-[400px] bg-primary/15 rounded-full blur-[120px] opacity-50" />
        
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto">
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl text-balance">
              {t.contact.title}
            </h1>
            <p className="mt-3 sm:mt-4 text-base sm:text-lg text-muted-foreground px-2">
              {t.contact.description}
            </p>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section className="pb-16 sm:pb-24 lg:pb-32">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-8 lg:gap-12">
            {/* Contact Form */}
            <Card className="bg-card/50 border-border/50">
              <CardHeader>
                <CardTitle>{t.contact.info.title}</CardTitle>
                <CardDescription>
                  {t.contact.info.description}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {formState === 'success' ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                      <CheckCircle2 className="h-8 w-8 text-primary" />
                    </div>
                    <h3 className="text-xl font-semibold mb-2">Message Sent!</h3>
                    <p className="text-muted-foreground">
                      Thank you for reaching out. We&apos;ll be in touch soon.
                    </p>
                    <Button 
                      variant="outline" 
                      className="mt-6"
                      onClick={() => setFormState('idle')}
                    >
                      Send Another Message
                    </Button>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid gap-6 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="name">{t.contact.form.name}</Label>
                        <Input
                          id="name"
                          placeholder={t.contact.form.namePlaceholder}
                          required
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="email">{t.contact.form.email}</Label>
                        <Input
                          id="email"
                          type="email"
                          placeholder={t.contact.form.emailPlaceholder}
                          required
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="company">{t.contact.form.company}</Label>
                      <Input
                        id="company"
                        placeholder={t.contact.form.companyPlaceholder}
                        value={formData.company}
                        onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="message">{t.contact.form.message}</Label>
                      <textarea
                        id="message"
                        rows={5}
                        placeholder={t.contact.form.messagePlaceholder}
                        required
                        value={formData.message}
                        onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                        className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
                      />
                    </div>
                    <Button 
                      type="submit" 
                      className="w-full gap-2"
                      disabled={formState === 'submitting'}
                    >
                      {formState === 'submitting' ? (
                        <>{t.contact.form.sending}</>
                      ) : (
                        <>
                          {t.contact.form.submit}
                          <Send className="h-4 w-4" />
                        </>
                      )}
                    </Button>
                  </form>
                )}
              </CardContent>
            </Card>

            {/* Contact Info */}
            <div className="space-y-6 sm:space-y-8">
              <div>
                <h2 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6">{t.contact.info.title}</h2>
                <div className="space-y-4 sm:space-y-6">
                  <div className="flex items-start gap-4">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Mail className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold">{t.contact.info.email}</h3>
                      <p className="text-muted-foreground text-sm mt-1">
                        For general inquiries
                      </p>
                      <a 
                        href="mailto:hello@taed.dev" 
                        className="text-primary hover:underline text-sm"
                      >
                        hello@taed.dev
                      </a>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Building2 className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold">Enterprise Sales</h3>
                      <p className="text-muted-foreground text-sm mt-1">
                        For enterprise solutions and custom integrations
                      </p>
                      <a 
                        href="mailto:enterprise@taed.dev" 
                        className="text-primary hover:underline text-sm"
                      >
                        enterprise@taed.dev
                      </a>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <MessageSquare className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold">{t.contact.info.support}</h3>
                      <p className="text-muted-foreground text-sm mt-1">
                        {t.contact.info.supportValue}
                      </p>
                      <a 
                        href="mailto:support@taed.dev" 
                        className="text-primary hover:underline text-sm"
                      >
                        support@taed.dev
                      </a>
                    </div>
                  </div>
                </div>
              </div>

              {/* Additional Info Cards */}
              <div className="grid gap-4 sm:grid-cols-2">
                <Card className="bg-secondary/30 border-border/50">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <MapPin className="h-5 w-5 text-primary" />
                      <div>
                        <p className="font-medium text-sm">Headquarters</p>
                        <p className="text-muted-foreground text-xs">San Francisco, CA</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="bg-secondary/30 border-border/50">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <Clock className="h-5 w-5 text-primary" />
                      <div>
                        <p className="font-medium text-sm">{t.contact.info.response}</p>
                        <p className="text-muted-foreground text-xs">{t.contact.info.responseValue}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* FAQ Section */}
              <Card className="bg-gradient-to-br from-primary/10 to-card border-primary/20">
                <CardContent className="p-6">
                  <h3 className="font-semibold mb-4">{t.contact.faq.title}</h3>
                  <div className="space-y-4">
                    <div>
                      <p className="font-medium text-sm">{t.contact.faq.q1}</p>
                      <p className="text-muted-foreground text-sm mt-1">{t.contact.faq.a1}</p>
                    </div>
                    <div>
                      <p className="font-medium text-sm">{t.contact.faq.q2}</p>
                      <p className="text-muted-foreground text-sm mt-1">{t.contact.faq.a2}</p>
                    </div>
                    <div>
                      <p className="font-medium text-sm">{t.contact.faq.q3}</p>
                      <p className="text-muted-foreground text-sm mt-1">{t.contact.faq.a3}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>


    </div>
  )
}
