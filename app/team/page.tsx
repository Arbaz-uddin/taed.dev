'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ArrowLeft, Users, UserPlus, Mail, Check, X, Loader2, Crown, FileText, Clock, Trash2 } from 'lucide-react'
import type { Profile, Team, TeamInvitation } from '@/lib/types/database'
import { useIdleTimeout } from '@/hooks/use-idle-timeout'

interface TeamMember extends Profile {
  isCreator: boolean
}

export default function TeamPage() {
  // Enable idle timeout - logs out user after 10 minutes of inactivity
  useIdleTimeout()
  
  const [user, setUser] = useState<{ id: string; email: string } | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [team, setTeam] = useState<Team | null>(null)
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [pendingInvitations, setPendingInvitations] = useState<TeamInvitation[]>([])
  const [receivedInvitations, setReceivedInvitations] = useState<(TeamInvitation & { team: Team })[]>([])
  
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Create team state
  const [showCreateTeam, setShowCreateTeam] = useState(false)
  const [teamName, setTeamName] = useState('')

  // Invite state
  const [showInviteDialog, setShowInviteDialog] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')

  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser()
      
      if (!authUser) {
        window.location.href = '/auth/login'
        return
      }

      setUser({ id: authUser.id, email: authUser.email || '' })

      // Load profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authUser.id)
        .single()

      if (profileData) {
        setProfile(profileData)

        // Load team if user has one
        if (profileData.team_id) {
          const { data: teamData } = await supabase
            .from('teams')
            .select('*')
            .eq('id', profileData.team_id)
            .single()
          
          if (teamData) {
            setTeam(teamData)

            // Load team members
            const { data: members } = await supabase
              .from('profiles')
              .select('*')
              .eq('team_id', profileData.team_id)

            if (members) {
              setTeamMembers(members.map((m: Profile) => ({
                ...m,
                isCreator: m.id === teamData.created_by
              })))
            }

            // Load pending invitations sent by the team
            const { data: invitations } = await supabase
              .from('team_invitations')
              .select('*')
              .eq('team_id', profileData.team_id)
              .eq('status', 'pending')

            if (invitations) {
              setPendingInvitations(invitations)
            }
          }
        } else {
          // Load invitations received by the user
          const { data: received } = await supabase
            .from('team_invitations')
            .select('*, teams(*)')
            .eq('invited_email', authUser.email)
            .eq('status', 'pending')

          if (received) {
            setReceivedInvitations(received.map((inv: TeamInvitation & { teams: Team }) => ({
              ...inv,
              team: inv.teams as Team
            })))
          }
        }
      }
    } catch (err) {
      console.error('Error loading data:', err)
      setError('Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateTeam = async () => {
    if (!teamName.trim() || !user) return
    
    setActionLoading(true)
    setError(null)

    try {
      // Create team
      const { data: newTeam, error: teamError } = await supabase
        .from('teams')
        .insert({
          name: teamName.trim(),
          created_by: user.id,
        })
        .select()
        .single()

      if (teamError) throw teamError

      // Update user's profile with team_id
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ team_id: newTeam.id })
        .eq('id', user.id)

      if (profileError) throw profileError

      setTeam(newTeam)
      setProfile(prev => prev ? { ...prev, team_id: newTeam.id } : null)
      setTeamMembers([{
        ...profile!,
        team_id: newTeam.id,
        isCreator: true,
      }])
      setShowCreateTeam(false)
      setTeamName('')
      setSuccess('Team created successfully!')
      setTimeout(() => setSuccess(null), 3000)
    } catch (err) {
      console.error('Error creating team:', err)
      setError('Failed to create team')
    } finally {
      setActionLoading(false)
    }
  }

  const handleSendInvitation = async () => {
    if (!inviteEmail.trim() || !team || !user) return

    setActionLoading(true)
    setError(null)

    try {
      // Check if user is already in a team
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('team_id')
        .eq('email', inviteEmail.trim())
        .single()

      if (existingProfile?.team_id) {
        setError('This user is already a member of a team')
        setActionLoading(false)
        return
      }

      // Check for existing pending invitation
      const { data: existingInvite } = await supabase
        .from('team_invitations')
        .select('id')
        .eq('team_id', team.id)
        .eq('invited_email', inviteEmail.trim())
        .eq('status', 'pending')
        .single()

      if (existingInvite) {
        setError('An invitation has already been sent to this email')
        setActionLoading(false)
        return
      }

      const { data: invitation, error: inviteError } = await supabase
        .from('team_invitations')
        .insert({
          team_id: team.id,
          invited_email: inviteEmail.trim(),
          invited_by: user.id,
        })
        .select()
        .single()

      if (inviteError) throw inviteError

      setPendingInvitations([...pendingInvitations, invitation])
      setShowInviteDialog(false)
      setInviteEmail('')
      setSuccess('Invitation sent successfully!')
      setTimeout(() => setSuccess(null), 3000)
    } catch (err) {
      console.error('Error sending invitation:', err)
      setError('Failed to send invitation')
    } finally {
      setActionLoading(false)
    }
  }

  const handleAcceptInvitation = async (invitation: TeamInvitation & { team: Team }) => {
    if (!user) return

    setActionLoading(true)
    setError(null)

    try {
      // Update invitation status
      const { error: inviteError } = await supabase
        .from('team_invitations')
        .update({ status: 'accepted' })
        .eq('id', invitation.id)

      if (inviteError) throw inviteError

      // Update user's profile with team_id
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ team_id: invitation.team_id })
        .eq('id', user.id)

      if (profileError) throw profileError

      // Reload data
      await loadData()
      setSuccess('You have joined the team!')
      setTimeout(() => setSuccess(null), 3000)
    } catch (err) {
      console.error('Error accepting invitation:', err)
      setError('Failed to accept invitation')
    } finally {
      setActionLoading(false)
    }
  }

  const handleDeclineInvitation = async (invitation: TeamInvitation) => {
    setActionLoading(true)
    setError(null)

    try {
      const { error: inviteError } = await supabase
        .from('team_invitations')
        .update({ status: 'declined' })
        .eq('id', invitation.id)

      if (inviteError) throw inviteError

      setReceivedInvitations(receivedInvitations.filter(inv => inv.id !== invitation.id))
      setSuccess('Invitation declined')
      setTimeout(() => setSuccess(null), 3000)
    } catch (err) {
      console.error('Error declining invitation:', err)
      setError('Failed to decline invitation')
    } finally {
      setActionLoading(false)
    }
  }

  const handleCancelInvitation = async (invitationId: string) => {
    setActionLoading(true)
    setError(null)

    try {
      const { error } = await supabase
        .from('team_invitations')
        .delete()
        .eq('id', invitationId)

      if (error) throw error

      setPendingInvitations(pendingInvitations.filter(inv => inv.id !== invitationId))
      setSuccess('Invitation cancelled')
      setTimeout(() => setSuccess(null), 3000)
    } catch (err) {
      console.error('Error cancelling invitation:', err)
      setError('Failed to cancel invitation')
    } finally {
      setActionLoading(false)
    }
  }

  const getUserInitials = (name: string | null, email: string) => {
    if (name) {
      return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    }
    return email.slice(0, 2).toUpperCase()
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <main className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-4xl items-center gap-4 px-4 py-3">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="font-semibold text-foreground">Team Management</h1>
              <p className="text-xs text-muted-foreground">Manage your team and invitations</p>
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-4xl px-4 py-6">
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert className="mb-6 border-green-500/50 bg-green-500/10">
            <Check className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-600">{success}</AlertDescription>
          </Alert>
        )}

        {/* No Team - Show options */}
        {!team && (
          <div className="space-y-6">
            {/* Received Invitations */}
            {receivedInvitations.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Mail className="h-5 w-5" />
                    Pending Invitations
                  </CardTitle>
                  <CardDescription>
                    You have been invited to join the following teams
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {receivedInvitations.map((invitation) => (
                      <div
                        key={invitation.id}
                        className="flex items-center justify-between rounded-lg border border-border p-4"
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                            <Users className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium text-foreground">{invitation.team.name}</p>
                            <p className="text-xs text-muted-foreground">
                              Invited {new Date(invitation.created_at).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => handleAcceptInvitation(invitation)}
                            disabled={actionLoading}
                          >
                            <Check className="mr-1 h-4 w-4" />
                            Accept
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDeclineInvitation(invitation)}
                            disabled={actionLoading}
                          >
                            <X className="mr-1 h-4 w-4" />
                            Decline
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Create Team */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UserPlus className="h-5 w-5" />
                  Create a Team
                </CardTitle>
                <CardDescription>
                  Create a new team to collaborate with others on OCR extraction APIs
                </CardDescription>
              </CardHeader>
              <CardContent>
                {!showCreateTeam ? (
                  <Button onClick={() => setShowCreateTeam(true)}>
                    <UserPlus className="mr-2 h-4 w-4" />
                    Create New Team
                  </Button>
                ) : (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="team-name">Team Name</Label>
                      <Input
                        id="team-name"
                        value={teamName}
                        onChange={(e) => setTeamName(e.target.value)}
                        placeholder="e.g., Acme Corp, Finance Team"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={handleCreateTeam} disabled={!teamName.trim() || actionLoading}>
                        {actionLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Create Team
                      </Button>
                      <Button variant="outline" onClick={() => setShowCreateTeam(false)}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Info */}
            <Card className="border-dashed">
              <CardContent className="flex items-center gap-4 py-6">
                <FileText className="h-10 w-10 text-muted-foreground/50" />
                <div>
                  <p className="font-medium text-foreground">Why create a team?</p>
                  <p className="text-sm text-muted-foreground">
                    Teams allow you to share OCR extraction APIs with your colleagues.
                    All team members can view and use APIs created by other team members.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Has Team - Show team details */}
        {team && (
          <div className="space-y-6">
            {/* Team Info */}
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-xl">
                      <Users className="h-5 w-5 text-primary" />
                      {team.name}
                    </CardTitle>
                    <CardDescription>
                      Created {new Date(team.created_at).toLocaleDateString()}
                    </CardDescription>
                  </div>
                  <Button onClick={() => setShowInviteDialog(true)}>
                    <UserPlus className="mr-2 h-4 w-4" />
                    Invite Member
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <h3 className="text-sm font-medium text-foreground">Team Members ({teamMembers.length})</h3>
                  <div className="rounded-lg border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Member</TableHead>
                          <TableHead>Role</TableHead>
                          <TableHead>Joined</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {teamMembers.map((member) => (
                          <TableRow key={member.id}>
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <Avatar className="h-8 w-8">
                                  <AvatarFallback className="text-xs">
                                    {getUserInitials(member.full_name, member.email)}
                                  </AvatarFallback>
                                </Avatar>
                                <div>
                                  <p className="font-medium text-foreground">
                                    {member.full_name || member.email}
                                    {member.id === user?.id && (
                                      <span className="ml-2 text-xs text-muted-foreground">(You)</span>
                                    )}
                                  </p>
                                  <p className="text-xs text-muted-foreground">{member.email}</p>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              {member.isCreator ? (
                                <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                                  <Crown className="h-3 w-3" />
                                  Owner
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                                  Member
                                </span>
                              )}
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {new Date(member.created_at).toLocaleDateString()}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Pending Invitations */}
            {pendingInvitations.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Clock className="h-5 w-5" />
                    Pending Invitations
                  </CardTitle>
                  <CardDescription>
                    Invitations that have been sent but not yet accepted
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {pendingInvitations.map((invitation) => (
                      <div
                        key={invitation.id}
                        className="flex items-center justify-between rounded-lg border border-border p-3"
                      >
                        <div className="flex items-center gap-3">
                          <Mail className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="text-sm font-medium text-foreground">{invitation.invited_email}</p>
                            <p className="text-xs text-muted-foreground">
                              Sent {new Date(invitation.created_at).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCancelInvitation(invitation.id)}
                          disabled={actionLoading}
                        >
                          <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>

      {/* Invite Dialog */}
      <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              Invite Team Member
            </DialogTitle>
            <DialogDescription>
              Enter the email address of the person you want to invite to your team.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="invite-email">Email Address</Label>
              <Input
                id="invite-email"
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="colleague@example.com"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              The invited person will receive an invitation they can accept when they log in.
              They must sign up with this email address to join your team.
            </p>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowInviteDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSendInvitation} disabled={!inviteEmail.trim() || actionLoading}>
              {actionLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Send Invitation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  )
}
