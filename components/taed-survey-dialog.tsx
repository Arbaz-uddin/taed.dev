'use client'

import { useState, useEffect } from 'react'
import confetti from 'canvas-confetti'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'

interface TaedSurveyDialogProps {
  trigger: React.ReactNode
}

interface VoteCounts {
  a: number
  b: number
  c: number
  d: number
}

const OPTIONS = [
  { id: 'a', label: 'Tokens Are Expensive, Damn' },
  { id: 'b', label: 'Tech Anxiety Ending Device' },
  { id: 'c', label: 'Tired And Exhausted Developers', isCorrect: true },
  { id: 'd', label: 'Text, Analytics, & Extraction Dashboard' },
] as const

export function TaedSurveyDialog({ trigger }: TaedSurveyDialogProps) {
  const [open, setOpen] = useState(false)
  const [selectedOption, setSelectedOption] = useState<string>('')
  const [voteCounts, setVoteCounts] = useState<VoteCounts>({ a: 0, b: 0, c: 0, d: 0 })
  const [hasVoted, setHasVoted] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showResult, setShowResult] = useState(false)

  // Fetch vote counts when dialog opens
  useEffect(() => {
    if (open) {
      fetchVoteCounts()
    }
  }, [open])

  const fetchVoteCounts = async () => {
    try {
      const res = await fetch('/api/taed-survey')
      if (res.ok) {
        const data = await res.json()
        setVoteCounts(data.counts)
      }
    } catch (error) {
      console.error('Failed to fetch vote counts:', error)
    }
  }

  const triggerConfetti = () => {
    const duration = 3000
    const animationEnd = Date.now() + duration
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 9999 }

    const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min

    const interval = setInterval(() => {
      const timeLeft = animationEnd - Date.now()

      if (timeLeft <= 0) {
        clearInterval(interval)
        // Close dialog after confetti ends
        setTimeout(() => {
          setOpen(false)
          // Reset state for next time
          setSelectedOption('')
          setHasVoted(false)
          setShowResult(false)
        }, 500)
        return
      }

      const particleCount = 50 * (timeLeft / duration)

      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
      })
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
      })
    }, 250)
  }

  const handleSubmit = async () => {
    if (!selectedOption || isSubmitting) return

    setIsSubmitting(true)
    try {
      const res = await fetch('/api/taed-survey', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ option: selectedOption }),
      })

      if (res.ok) {
        const data = await res.json()
        setVoteCounts(data.counts)
        setHasVoted(true)
        setShowResult(true)

        // Check if correct answer
        const isCorrect = OPTIONS.find(o => o.id === selectedOption)?.isCorrect
        if (isCorrect) {
          triggerConfetti()
        }
      }
    } catch (error) {
      console.error('Failed to submit vote:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const totalVotes = voteCounts.a + voteCounts.b + voteCounts.c + voteCounts.d

  const getPercentage = (count: number) => {
    if (totalVotes === 0) return 0
    return Math.round((count / totalVotes) * 100)
  }

  return (
    <>
      <span onClick={() => setOpen(true)} className="cursor-pointer">
        {trigger}
      </span>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center text-xl">What does TAED stand for?</DialogTitle>
            <DialogDescription className="text-center">
              Take a guess! {totalVotes > 0 && `(${totalVotes} votes so far)`}
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            {!showResult ? (
              <RadioGroup
                value={selectedOption}
                onValueChange={setSelectedOption}
                className="space-y-3"
              >
                {OPTIONS.map((option) => (
                  <div
                    key={option.id}
                    className="flex items-center space-x-3 rounded-lg border border-border p-3 hover:bg-muted/50 transition-colors cursor-pointer"
                    onClick={() => setSelectedOption(option.id)}
                  >
                    <RadioGroupItem value={option.id} id={option.id} />
                    <Label htmlFor={option.id} className="flex-1 cursor-pointer text-sm">
                      {option.id.toUpperCase()}. {option.label}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            ) : (
              <div className="space-y-3">
                {OPTIONS.map((option) => {
                  const count = voteCounts[option.id as keyof VoteCounts]
                  const percentage = getPercentage(count)
                  const isSelected = selectedOption === option.id
                  const isCorrect = option.isCorrect

                  return (
                    <div
                      key={option.id}
                      className={`relative rounded-lg border p-3 overflow-hidden ${
                        isCorrect
                          ? 'border-green-500 bg-green-500/10'
                          : isSelected
                          ? 'border-red-500 bg-red-500/10'
                          : 'border-border'
                      }`}
                    >
                      <div
                        className={`absolute inset-y-0 left-0 transition-all duration-500 ${
                          isCorrect ? 'bg-green-500/20' : 'bg-muted/50'
                        }`}
                        style={{ width: `${percentage}%` }}
                      />
                      <div className="relative flex items-center justify-between">
                        <span className="text-sm font-medium">
                          {option.id.toUpperCase()}. {option.label}
                          {isCorrect && ' ✓'}
                        </span>
                        <span className="text-sm text-muted-foreground">
                          {count} ({percentage}%)
                        </span>
                      </div>
                    </div>
                  )
                })}
                
                {selectedOption === 'c' ? (
                  <p className="text-center text-green-500 font-medium mt-4">
                    Correct! TAED was built for Tired And Exhausted Developers like you!
                  </p>
                ) : (
                  <p className="text-center text-muted-foreground mt-4">
                    Nice try! The correct answer is: Tired And Exhausted Developers
                  </p>
                )}
              </div>
            )}
          </div>

          {!showResult && (
            <Button
              onClick={handleSubmit}
              disabled={!selectedOption || isSubmitting}
              className="w-full"
            >
              {isSubmitting ? 'Submitting...' : 'Submit Answer'}
            </Button>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
