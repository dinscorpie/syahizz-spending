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
  profiles: Profile;
}

export default function Profile() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  
  const [profile, setProfile] = useState<Profile | null>(null);
  const [family, setFamily] = useState<Family | null>(null);
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  
  const [name, setName] = useState("");
  const [familyName, setFamilyName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");

  useEffect(() => {
    if (user) {
      fetchProfile();
      fetchFamily();
    }
  }, [user]);

  const fetchProfile = async () => {
    if (!user) return;
    
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    if (error) {
      console.error("Error fetching profile:", error);
    } else if (data) {
      setProfile(data);
      setName(data.name || "");
    }
  };

  const fetchFamily = async () => {
    if (!user) return;
    
    try {
      // Get user's family
      const { data: familyMember, error: memberError } = await supabase
        .from("family_members")
        .select(`
          family_id,
          role,
          families (*)
        `)
        .eq("user_id", user.id)
        .single();

      if (memberError) {
        console.error("Error fetching family member:", memberError);
        return;
      }

      if (familyMember?.families) {
        const familyData = familyMember.families as Family;
        setFamily(familyData);
        setFamilyName(familyData.name);
        
        // Get all family members
        const { data: members, error: membersError } = await supabase
          .from("family_members")
          .select(`
            id,
            user_id,
            role,
            joined_at,
            profiles!inner (
              id,
              name,
              email,
              avatar_url
            )
          `)
          .eq("family_id", familyData.id);

        if (membersError) {
          console.error("Error fetching family members:", membersError);
        } else {
          setFamilyMembers(members as FamilyMember[] || []);
        }
      }
    } catch (error) {
      console.error("Error in fetchFamily:", error);
    } finally {
      setLoading(false);
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

  const updateFamilyName = async () => {
    if (!family || !user) return;
    
    setUpdating(true);
    const { error } = await supabase
      .from("families")
      .update({ name: familyName })
      .eq("id", family.id);

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
      fetchFamily();
    }
    setUpdating(false);
  };

  const inviteFamilyMember = async () => {
    if (!family || !inviteEmail.trim()) return;

    // For now, we'll show a message about inviting members
    // In a real app, you'd implement email invitations
    toast({
      title: "Feature Coming Soon",
      description: "Family member invitations will be available soon. For now, ask them to create an account and you can add them manually.",
    });
    setInviteEmail("");
  };

  const getDisplayName = (member: FamilyMember) => {
    return member.profiles?.name || member.profiles?.email || "Unknown User";
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

        {/* Family Section */}
        {family && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Family Management
              </CardTitle>
              <CardDescription>Manage your family and shared expenses</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
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
                            {member.profiles?.email}
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
                    <Button onClick={inviteFamilyMember} disabled={!inviteEmail.trim()}>
                      <Plus className="h-4 w-4 mr-2" />
                      Invite
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}