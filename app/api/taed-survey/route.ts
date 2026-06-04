import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

// Helper to create admin client lazily (not at module level to avoid build errors)
function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// In-memory fallback if database table doesn't exist yet
let inMemoryVotes = { a: 0, b: 0, c: 0, d: 0 }

export async function GET() {
  try {
    const supabase = getSupabaseAdmin()
    
    // Try to get counts from database
    const { data, error } = await supabase
      .from('taed_survey_votes')
      .select('option')
    
    if (error) {
      // If table doesn't exist, return in-memory counts
      console.log('Using in-memory votes:', error.message)
      return NextResponse.json({ counts: inMemoryVotes })
    }
    
    // Count votes by option
    const counts = { a: 0, b: 0, c: 0, d: 0 }
    data?.forEach((vote: { option: string }) => {
      if (vote.option in counts) {
        counts[vote.option as keyof typeof counts]++
      }
    })
    
    return NextResponse.json({ counts })
  } catch (error) {
    console.error('Error fetching votes:', error)
    return NextResponse.json({ counts: inMemoryVotes })
  }
}

export async function POST(request: Request) {
  try {
    const { option } = await request.json()
    
    if (!option || !['a', 'b', 'c', 'd'].includes(option)) {
      return NextResponse.json({ error: 'Invalid option' }, { status: 400 })
    }
    
    const supabase = getSupabaseAdmin()
    
    // Try to insert vote into database
    const { error: insertError } = await supabase
      .from('taed_survey_votes')
      .insert({ option })
    
    if (insertError) {
      // If table doesn't exist, use in-memory storage
      console.log('Using in-memory storage:', insertError.message)
      inMemoryVotes[option as keyof typeof inMemoryVotes]++
      return NextResponse.json({ counts: inMemoryVotes })
    }
    
    // Get updated counts
    const { data, error: selectError } = await supabase
      .from('taed_survey_votes')
      .select('option')
    
    if (selectError) {
      return NextResponse.json({ counts: inMemoryVotes })
    }
    
    // Count votes by option
    const counts = { a: 0, b: 0, c: 0, d: 0 }
    data?.forEach((vote: { option: string }) => {
      if (vote.option in counts) {
        counts[vote.option as keyof typeof counts]++
      }
    })
    
    return NextResponse.json({ counts })
  } catch (error) {
    console.error('Error submitting vote:', error)
    return NextResponse.json({ error: 'Failed to submit vote' }, { status: 500 })
  }
}
