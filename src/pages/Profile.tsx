import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useFamilyData } from "@/hooks/useFamilyData";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { User, Mail, Calendar, UserCheck } from "lucide-react";
import { format } from "date-fns";
import { FamilyManager } from "@/components/FamilyManager";

interface PendingInvitation {
  id: string;
  family_id: string;
  invited_email: string;
  invited_by: string;
  invited_by_name?: string | null;
  expires_at: string;
  created_at: string;
  families?: {
    name: string;
  } | null;
  profiles?: {
    name: string;
    email: string;
  } | null;
}

const Profile = () => {
  const { user, signOut } = useAuth();
  const { families, userProfile, loading, refetch } = useFamilyData();
  const [profileForm, setProfileForm] = useState({
    name: "",
    email: "",
  });
  const [pendingInvitations, setPendingInvitations] = useState<PendingInvitation[]>([]);
  const [updatingProfile, setUpdatingProfile] = useState(false);

  useEffect(() => {
    if (userProfile) {
      setProfileForm({
        name: userProfile.name || "",
        email: userProfile.email || "",
      });
    }
  }, [userProfile]);

  useEffect(() => {
    fetchPendingInvitations();
  }, [user]);

  const fetchPendingInvitations = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("family_invitations")
        .select("id, family_id, invited_email, invited_by, invited_by_name, expires_at, created_at, status")
        .eq("invited_email", user.email)
        .eq("status", "pending")
        .gt("expires_at", new Date().toISOString());

      if (error) throw error;
      
      // Fetch additional data for each invitation
      const enrichedInvitations = await Promise.all((data || []).map(async (invitation) => {
        // Fetch family name
        const { data: familyData } = await supabase
          .from("families")
          .select("name")
          .eq("id", invitation.family_id)
          .maybeSingle();

        // Fetch inviter profile
        const { data: profileData } = await supabase
          .from("profiles")
          .select("name, email")
          .eq("id", invitation.invited_by)
          .maybeSingle();

        return {
          ...invitation,
          families: familyData,
          profiles: profileData
        };
      }));

      setPendingInvitations(enrichedInvitations);
    } catch (error) {
      console.error("Error fetching pending invitations:", error);
    }
  };

  const handleUpdateProfile = async () => {
    if (!user) return;

    setUpdatingProfile(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          name: profileForm.name,
          email: profileForm.email,
        })
        .eq("id", user.id);

      if (error) throw error;

      toast.success("Profile updated successfully");
      refetch();
    } catch (error) {
      console.error("Error updating profile:", error);
      toast.error("Failed to update profile");
    } finally {
      setUpdatingProfile(false);
    }
  };

  const handleAcceptInvitation = async (invitationId: string) => {
    try {
      const { data, error } = await supabase.rpc('accept_family_invitation', {
        invitation_id: invitationId
      });

      if (error) throw error;

      if (data) {
        toast.success("Invitation accepted successfully!");
        fetchPendingInvitations();
        refetch();
      } else {
        toast.error("Failed to accept invitation. It may have expired.");
      }
    } catch (error) {
      console.error("Error accepting invitation:", error);
      toast.error("Failed to accept invitation");
    }
  };

  const handleDeclineInvitation = async (invitationId: string) => {
    try {
      const { error } = await supabase
        .from("family_invitations")
        .update({ status: "declined" })
        .eq("id", invitationId);

      if (error) throw error;

      toast.success("Invitation declined");
      fetchPendingInvitations();
    } catch (error) {
      console.error("Error declining invitation:", error);
      toast.error("Failed to decline invitation");
    }
  };

  if (loading) {
    return (
      <div className="container py-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading profile...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Profile & Family Management</h1>
        <p className="text-muted-foreground">Manage your profile and family settings</p>
      </div>

      <Tabs defaultValue="profile" className="space-y-6 max-w-4xl">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="families">Families</TabsTrigger>
          <TabsTrigger value="invitations" className="relative">
            Invitations
            {pendingInvitations.length > 0 && (
              <Badge 
                variant="destructive" 
                className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
              >
                {pendingInvitations.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Personal Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center gap-4">
                <Avatar className="h-20 w-20">
                  <AvatarImage src={""} alt={userProfile?.name || ""} />
                  <AvatarFallback className="text-lg">
                    {userProfile?.name?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="text-lg font-semibold">{userProfile?.name || "No name set"}</h3>
                  <p className="text-muted-foreground">{userProfile?.email}</p>
                  <p className="text-sm text-muted-foreground">
                    Member since {userProfile?.created_at ? format(new Date(userProfile.created_at), "MMM yyyy") : "Unknown"}
                  </p>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <div>
                  <Label htmlFor="name">Display Name</Label>
                  <Input
                    id="name"
                    value={profileForm.name}
                    onChange={(e) => setProfileForm(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Enter your display name"
                  />
                </div>
                <div>
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    value={profileForm.email}
                    onChange={(e) => setProfileForm(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="Enter your email address"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-4">
                <Button onClick={handleUpdateProfile} disabled={updatingProfile}>
                  {updatingProfile ? "Updating..." : "Update Profile"}
                </Button>
                <Button variant="outline" onClick={signOut}>
                  Sign Out
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="families" className="w-full overflow-hidden">
          <FamilyManager />
        </TabsContent>

        <TabsContent value="invitations">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Family Invitations
              </CardTitle>
            </CardHeader>
            <CardContent>
              {pendingInvitations.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  No pending invitations
                </p>
              ) : (
                <div className="space-y-4">
                  {pendingInvitations.map((invitation) => (
                    <Card key={invitation.id} className="border-l-4 border-l-blue-500">
                      <CardContent className="pt-4">
                        <div className="flex justify-between items-start">
                          <div className="space-y-2">
                            <h4 className="font-semibold">
                              Invitation to join "{invitation.families?.name || "a family"}"
                            </h4>
                            <p className="text-sm text-muted-foreground">
                              From: {invitation.invited_by_name || invitation.profiles?.name || invitation.profiles?.email || "Family admin"}
                            </p>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Calendar className="h-4 w-4" />
                              Expires: {format(new Date(invitation.expires_at), "dd MMM yyyy")}
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={() => handleAcceptInvitation(invitation.id)}
                            >
                              <UserCheck className="h-4 w-4 mr-2" />
                              Accept
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDeclineInvitation(invitation.id)}
                            >
                              Decline
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Profile;