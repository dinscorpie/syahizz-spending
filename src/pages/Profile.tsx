import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Users, Plus, Crown, Trash2, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Profile {
  id: string;
  name: string | null;
  email: string | null;
  avatar_url: string | null;
}

interface Family {
  id: string;
  name: string;
  created_at: string;
  created_by: string;
}

interface FamilyMember {
  id: string;
  user_id: string;
  role: string;
  joined_at: string;
  profile_name?: string;
  profile_email?: string;
}

interface FamilyInvitation {
  id: string;
  family_id: string;
  invited_email: string;
  invited_by: string;
  status: 'pending' | 'accepted' | 'declined';
  created_at: string;
  expires_at: string;
  family_name?: string;
  invited_by_name?: string;
}

export default function Profile() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  
  const [profile, setProfile] = useState<Profile | null>(null);
  const [families, setFamilies] = useState<Family[]>([]);
  const [selectedFamilyId, setSelectedFamilyId] = useState<string | null>(null);
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const [pendingInvitations, setPendingInvitations] = useState<FamilyInvitation[]>([]);
  const [sentInvitations, setSentInvitations] = useState<FamilyInvitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  
  const [name, setName] = useState("");
  const [familyName, setFamilyName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");

  useEffect(() => {
    if (user) {
      fetchProfile();
      fetchFamilies();
      fetchInvitations();
    }
  }, [user]);

  useEffect(() => {
    if (selectedFamilyId) {
      fetchFamilyMembers(selectedFamilyId);
      fetchInvitations();
    }
  }, [selectedFamilyId]);

  const fetchProfile = async () => {
    if (!user) return;
    
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();

    if (error) {
      console.error("Error fetching profile:", error);
    }

    if (!data) {
      // Create profile if missing
      const insertRes = await supabase
        .from("profiles")
        .insert({ id: user.id, email: user.email ?? null, name: null })
        .select("*")
        .single();

      if (insertRes.error) {
        console.error("Error creating profile:", insertRes.error);
        return;
      }
      setProfile(insertRes.data);
      setName(insertRes.data.name || "");
    } else {
      setProfile(data);
      setName(data.name || "");
    }
  };

  const fetchFamilies = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("family_members")
        .select(`
          role,
          families (*)
        `)
        .eq("user_id", user.id);

      if (error) {
        console.error("Error fetching families:", error);
        setFamilies([]);
        setSelectedFamilyId(null);
        setFamilyMembers([]);
        setFamilyName("");
        return;
      }

      const fams: Family[] = (data || [])
        .map((row: any) => row.families as Family)
        .filter(Boolean);

      setFamilies(fams);

      if (fams.length > 0) {
        const savedId = localStorage.getItem("profileSelectedFamilyId");
        const selected = fams.find(f => f.id === savedId) || fams[0];
        setSelectedFamilyId(selected.id);
        setFamilyName(selected.name);
        await fetchFamilyMembers(selected.id);
      } else {
        setSelectedFamilyId(null);
        setFamilyMembers([]);
        setFamilyName("");
      }
    } catch (e) {
      console.error("Error in fetchFamilies:", e);
    } finally {
      setLoading(false);
    }
  };

  const fetchFamilyMembers = async (familyId: string) => {
    try {
      const { data: members, error: membersError } = await supabase
        .from("family_members")
        .select(`
          id,
          user_id,
          role,
          joined_at,
          profiles!inner (
            name,
            email
          )
        `)
        .eq("family_id", familyId);

      if (membersError) {
        console.error("Error fetching family members:", membersError);
        setFamilyMembers([]);
        return;
      }

      const transformed: FamilyMember[] = (members || []).map((member: any) => ({
        id: member.id,
        user_id: member.user_id,
        role: member.role,
        joined_at: member.joined_at,
        profile_name: member.profiles?.name,
        profile_email: member.profiles?.email,
      }));
      setFamilyMembers(transformed);
    } catch (e) {
      console.error("Error in fetchFamilyMembers:", e);
    }
  };

  const updateProfile = async () => {
    if (!user) return;
    
    setUpdating(true);
    const { error } = await supabase
      .from("profiles")
      .update({ name })
      .eq("id", user.id);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to update profile",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Profile updated successfully",
      });
      fetchProfile();
    }
    setUpdating(false);
  };

  const createFamily = async () => {
    if (!user || !familyName.trim()) return;
    
    setUpdating(true);
    try {
      // Create the family
      const { data: familyData, error: familyError } = await supabase
        .from("families")
        .insert({
          name: familyName.trim(),
          created_by: user.id,
        })
        .select()
        .single();

      if (familyError) throw familyError;

      // Add user as admin
      const { error: memberError } = await supabase
        .from("family_members")
        .insert({
          family_id: familyData.id,
          user_id: user.id,
          role: "admin",
        });

      if (memberError) throw memberError;

      toast({
        title: "Success",
        description: "Family created successfully!",
      });

      fetchFamilies();
    } catch (error) {
      console.error("Error creating family:", error);
      toast({
        title: "Error",
        description: "Failed to create family",
        variant: "destructive",
      });
    }
    setUpdating(false);
  };

  const updateFamilyName = async () => {
    if (!selectedFamilyId || !user) return;
    
    setUpdating(true);
    const { error } = await supabase
      .from("families")
      .update({ name: familyName })
      .eq("id", selectedFamilyId);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to update family name",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Family name updated successfully",
      });
      fetchFamilies();
    }
    setUpdating(false);
  };

  const fetchInvitations = async () => {
    if (!user) return;

    try {
      // Fetch invitations sent to this user
      const { data: received, error: receivedError } = await supabase
        .from("family_invitations")
        .select(`
          *,
          families (name),
          profiles!family_invitations_invited_by_fkey (name)
        `)
        .eq("invited_email", user.email)
        .eq("status", "pending")
        .gt("expires_at", new Date().toISOString());

      if (receivedError) {
        console.error("Error fetching received invitations:", receivedError);
      } else {
        const transformedReceived: FamilyInvitation[] = received?.map((inv: any) => ({
          ...inv,
          family_name: inv.families?.name,
          invited_by_name: inv.profiles?.name,
          status: inv.status as 'pending' | 'accepted' | 'declined',
        })) || [];
        setPendingInvitations(transformedReceived);
      }

      // Fetch invitations sent by this user (if they're family admin)
      if (selectedFamilyId) {
        const { data: sent, error: sentError } = await supabase
          .from("family_invitations")
          .select("*")
          .eq("family_id", selectedFamilyId)
          .eq("invited_by", user.id)
          .eq("status", "pending");

        if (sentError) {
          console.error("Error fetching sent invitations:", sentError);
        } else {
          const typedSent: FamilyInvitation[] = sent?.map(inv => ({
            ...inv,
            status: inv.status as 'pending' | 'accepted' | 'declined',
          })) || [];
          setSentInvitations(typedSent);
        }
      } else {
        setSentInvitations([]);
      }
    } catch (error) {
      console.error("Error fetching invitations:", error);
    }
  };

  const inviteFamilyMember = async () => {
    if (!selectedFamilyId || !inviteEmail.trim() || !user) return;

    setUpdating(true);
    try {
      // Check if user is already a family member
      const { data: existingMember } = await supabase
        .from("profiles")
        .select("id")
        .eq("email", inviteEmail.trim())
        .single();

      if (existingMember) {
        const { data: memberCheck } = await supabase
          .from("family_members")
          .select("id")
          .eq("family_id", selectedFamilyId)
          .eq("user_id", existingMember.id)
          .single();

        if (memberCheck) {
          toast({
            title: "Error",
            description: "This user is already a member of your family",
            variant: "destructive",
          });
          setUpdating(false);
          return;
        }
      }

      // Check if invitation already exists
      const { data: existingInvitation } = await supabase
        .from("family_invitations")
        .select("id")
        .eq("family_id", selectedFamilyId)
        .eq("invited_email", inviteEmail.trim())
        .eq("status", "pending")
        .single();

      if (existingInvitation) {
        toast({
          title: "Error",
          description: "An invitation has already been sent to this email",
          variant: "destructive",
        });
        setUpdating(false);
        return;
      }

      // Create the invitation
      const { error } = await supabase
        .from("family_invitations")
        .insert({
          family_id: selectedFamilyId,
          invited_email: inviteEmail.trim(),
          invited_by: user.id,
        });

      if (error) {
        toast({
          title: "Error",
          description: "Failed to send invitation",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Success",
          description: "Invitation sent successfully",
        });
        setInviteEmail("");
        fetchInvitations();
      }
    } catch (error) {
      console.error("Error sending invitation:", error);
      toast({
        title: "Error",
        description: "Failed to send invitation",
        variant: "destructive",
      });
    }
    setUpdating(false);
  };

  const acceptInvitation = async (invitationId: string) => {
    setUpdating(true);
    try {
      const { data, error } = await supabase.rpc("accept_family_invitation", {
        invitation_id: invitationId,
      });

      if (error || !data) {
        toast({
          title: "Error",
          description: "Failed to accept invitation",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Success",
          description: "Invitation accepted! Welcome to the family!",
        });
        fetchFamilies();
        fetchInvitations();
      }
    } catch (error) {
      console.error("Error accepting invitation:", error);
      toast({
        title: "Error",
        description: "Failed to accept invitation",
        variant: "destructive",
      });
    }
    setUpdating(false);
  };

  const declineInvitation = async (invitationId: string) => {
    setUpdating(true);
    try {
      const { error } = await supabase
        .from("family_invitations")
        .update({ status: "declined" })
        .eq("id", invitationId);

      if (error) {
        toast({
          title: "Error",
          description: "Failed to decline invitation",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Success",
          description: "Invitation declined",
        });
        fetchInvitations();
      }
    } catch (error) {
      console.error("Error declining invitation:", error);
      toast({
        title: "Error",
        description: "Failed to decline invitation",
        variant: "destructive",
      });
    }
    setUpdating(false);
  };

  const cancelInvitation = async (invitationId: string) => {
    setUpdating(true);
    try {
      const { error } = await supabase
        .from("family_invitations")
        .delete()
        .eq("id", invitationId);

      if (error) {
        toast({
          title: "Error",
          description: "Failed to cancel invitation",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Success",
          description: "Invitation cancelled",
        });
        fetchInvitations();
      }
    } catch (error) {
      console.error("Error cancelling invitation:", error);
      toast({
        title: "Error",
        description: "Failed to cancel invitation",
        variant: "destructive",
      });
    }
    setUpdating(false);
  };

  const getDisplayName = (member: FamilyMember) => {
    return member.profile_name || member.profile_email || "Unknown User";
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-3xl font-bold">Profile & Family</h1>
        </div>

        {/* Profile Section */}
        <Card>
          <CardHeader>
            <CardTitle>My Profile</CardTitle>
            <CardDescription>Manage your personal information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                value={profile?.email || ""}
                disabled
                className="bg-muted"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your name"
              />
            </div>
            
            <Button onClick={updateProfile} disabled={updating}>
              {updating ? "Updating..." : "Update Profile"}
            </Button>
          </CardContent>
        </Card>

        {/* Family Invitations Section */}
        {pendingInvitations.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Family Invitations
              </CardTitle>
              <CardDescription>You have pending family invitations</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {pendingInvitations.map((invitation) => (
                <div key={invitation.id} className="p-4 border rounded-lg space-y-3">
                  <div>
                    <p className="font-medium">
                      Invitation to join "{invitation.family_name}"
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Invited by {invitation.invited_by_name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Expires: {new Date(invitation.expires_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      onClick={() => acceptInvitation(invitation.id)}
                      disabled={updating}
                      size="sm"
                    >
                      Accept
                    </Button>
                    <Button 
                      onClick={() => declineInvitation(invitation.id)}
                      disabled={updating}
                      variant="outline"
                      size="sm"
                    >
                      Decline
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Create Family Section - Only show if no families exist */}
        {families.length === 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Create Your First Family
              </CardTitle>
              <CardDescription>Start by creating a family to manage shared expenses</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="newFamilyName">Family Name</Label>
                <Input
                  id="newFamilyName"
                  value={familyName}
                  onChange={(e) => setFamilyName(e.target.value)}
                  placeholder="Enter family name"
                />
              </div>
              <Button 
                onClick={createFamily} 
                disabled={!familyName.trim() || updating}
                className="w-full"
              >
                {updating ? "Creating..." : "Create Family"}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Family Management Section - Show if families exist */}
        {families.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Family Management
              </CardTitle>
              <CardDescription>Manage your family and shared expenses</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Family Selector */}
              {families.length > 1 && (
                <div className="space-y-2">
                  <Label>Select Family</Label>
                  <Select 
                    value={selectedFamilyId || ""} 
                    onValueChange={(value) => {
                      setSelectedFamilyId(value);
                      localStorage.setItem("profileSelectedFamilyId", value);
                      const selected = families.find(f => f.id === value);
                      if (selected) {
                        setFamilyName(selected.name);
                        fetchFamilyMembers(value);
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a family" />
                    </SelectTrigger>
                    <SelectContent>
                      {families.map((family) => (
                        <SelectItem key={family.id} value={family.id}>
                          {family.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Family Name */}
              <div className="space-y-2">
                <Label htmlFor="familyName">Family Name</Label>
                <div className="flex gap-2">
                  <Input
                    id="familyName"
                    value={familyName}
                    onChange={(e) => setFamilyName(e.target.value)}
                    placeholder="Enter family name"
                  />
                  <Button onClick={updateFamilyName} disabled={updating}>
                    Update
                  </Button>
                </div>
              </div>

              <Separator />

              {/* Family Members */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Family Members</h3>
                
                <div className="space-y-2">
                  {familyMembers.map((member) => (
                    <div key={member.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <div>
                          <p className="font-medium">{getDisplayName(member)}</p>
                          <p className="text-sm text-muted-foreground">
                            {member.profile_email}
                          </p>
                        </div>
                        {member.role === "admin" && (
                          <Badge variant="secondary" className="flex items-center gap-1">
                            <Crown className="h-3 w-3" />
                            Admin
                          </Badge>
                        )}
                      </div>
                      
                      {member.user_id !== user?.id && member.role !== "admin" && (
                        <Button variant="ghost" size="sm">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>

                {/* Invite New Member */}
                <div className="space-y-2">
                  <Label htmlFor="inviteEmail">Invite Family Member</Label>
                  <div className="flex gap-2">
                    <Input
                      id="inviteEmail"
                      type="email"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      placeholder="Enter email address"
                    />
                    <Button onClick={inviteFamilyMember} disabled={!inviteEmail.trim() || updating}>
                      <Plus className="h-4 w-4 mr-2" />
                      {updating ? "Sending..." : "Invite"}
                    </Button>
                  </div>
                </div>

                {/* Sent Invitations */}
                {sentInvitations.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-medium">Sent Invitations</h4>
                    <div className="space-y-2">
                      {sentInvitations.map((invitation) => (
                        <div key={invitation.id} className="flex items-center justify-between p-3 border rounded-lg bg-muted/50">
                          <div>
                            <p className="text-sm font-medium">{invitation.invited_email}</p>
                            <p className="text-xs text-muted-foreground">
                              Sent {new Date(invitation.created_at).toLocaleDateString()}
                            </p>
                          </div>
                          <Button 
                            onClick={() => cancelInvitation(invitation.id)}
                            disabled={updating}
                            variant="ghost" 
                            size="sm"
                          >
                            Cancel
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}