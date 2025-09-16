import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useFamilyData } from "@/hooks/useFamilyData";
import { Users, Plus, UserPlus, Mail, Crown, User, Trash2, LogOut, UserMinus } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

export const FamilyManager = () => {
  const { families, familyMembers, userProfile, refetch, getUserRole } = useFamilyData();
  const [newFamilyName, setNewFamilyName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [selectedFamilyForInvite, setSelectedFamilyForInvite] = useState<string>("");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [inviteDialogOpen, setInviteDialogOpen] = useState<Record<string, boolean>>({});
  const [pendingInvitations, setPendingInvitations] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const handleCreateFamily = async () => {
    if (!newFamilyName.trim()) {
      toast.error("Please enter a family name");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.rpc('create_family_with_admin', {
        family_name: newFamilyName.trim()
      });

      if (error) throw error;

      toast.success("Family created successfully!");
      setNewFamilyName("");
      setCreateDialogOpen(false);
      refetch();
    } catch (error) {
      console.error("Error creating family:", error);
      toast.error("Failed to create family");
    } finally {
      setLoading(false);
    }
  };

  const handleInviteUser = async () => {
    if (!inviteEmail.trim() || !selectedFamilyForInvite) {
      toast.error("Please fill in all fields");
      return;
    }

    setLoading(true);
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      const inviterId = userProfile?.id || authUser?.id;
      const inviterName = (userProfile?.name?.trim()) || userProfile?.email || authUser?.email || "Unknown";

      if (!inviterId) {
        throw new Error("Unable to determine inviter. Please try again.");
      }

      const { error } = await supabase
        .from("family_invitations")
        .insert({
          family_id: selectedFamilyForInvite,
          invited_email: inviteEmail.trim(),
          invited_by: inviterId,
          invited_by_name: inviterName,
        });

      if (error) throw error;

      toast.success("Invitation sent successfully!");
      setInviteEmail("");
      setSelectedFamilyForInvite("");
      setInviteDialogOpen({}); // close any open invite dialog
      fetchPendingInvitations();
    } catch (error) {
      console.error("Error sending invitation:", error);
      toast.error("Failed to send invitation");
    } finally {
      setLoading(false);
    }
  };

  const fetchPendingInvitations = async () => {
    try {
      if (families.length === 0) return;
      
      const { data, error } = await supabase
        .from("family_invitations")
        .select(`
          *,
          families (
            name
          )
        `)
        .in("family_id", families.map(f => f.id))
        .eq("status", "pending");

      if (error) throw error;
      setPendingInvitations(data || []);
    } catch (error) {
      console.error("Error fetching invitations:", error);
    }
  };

  const handleDeleteInvitation = async (invitationId: string) => {
    try {
      const { error } = await supabase
        .from("family_invitations")
        .delete()
        .eq("id", invitationId);

      if (error) throw error;

      toast.success("Invitation cancelled");
      fetchPendingInvitations();
    } catch (error) {
      console.error("Error deleting invitation:", error);
      toast.error("Failed to cancel invitation");
    }
  };

  const handleLeaveFamily = async (familyId: string) => {
    if (!userProfile?.id) return;
    
    try {
      const { error } = await supabase
        .from("family_members")
        .delete()
        .eq("family_id", familyId)
        .eq("user_id", userProfile.id);

      if (error) throw error;

      toast.success("Left family successfully");
      refetch();
    } catch (error) {
      console.error("Error leaving family:", error);
      toast.error("Failed to leave family");
    }
  };

  const handleRemoveMember = async (familyId: string, userId: string) => {
    try {
      const { error } = await supabase
        .from("family_members")
        .delete()
        .eq("family_id", familyId)
        .eq("user_id", userId);

      if (error) throw error;

      toast.success("Member removed successfully");
      refetch();
    } catch (error) {
      console.error("Error removing member:", error);
      toast.error("Failed to remove member");
    }
  };

  const handleDeleteFamily = async (familyId: string) => {
    try {
      const { error } = await supabase
        .from("families")
        .delete()
        .eq("id", familyId);

      if (error) throw error;

      toast.success("Family deleted successfully");
      refetch();
    } catch (error) {
      console.error("Error deleting family:", error);
      toast.error("Failed to delete family");
    }
  };

  // Fetch pending invitations when families change
  useEffect(() => {
    if (families.length > 0) {
      fetchPendingInvitations();
    }
  }, [families]);

  const canManageFamily = (familyId: string) => getUserRole(familyId) === 'admin';

  return (
    <div className="space-y-6">
      {/* Header with Create Family Button */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Family Management</h2>
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create New Family
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Family</DialogTitle>
              <DialogDescription>
                Create a new family account to share expenses with others.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="familyName">Family Name</Label>
                <Input
                  id="familyName"
                  value={newFamilyName}
                  onChange={(e) => setNewFamilyName(e.target.value)}
                  placeholder="Enter family name..."
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateFamily} disabled={loading}>
                {loading ? "Creating..." : "Create Family"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Families List */}
      <div className="grid gap-4">
        {families.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8">
              <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No families yet</h3>
              <p className="text-muted-foreground mb-4">
                Create your first family to start sharing expenses with others
              </p>
            </CardContent>
          </Card>
        ) : (
          families.map((family) => (
            <Card key={family.id}>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    <CardTitle>{family.name}</CardTitle>
                    <Badge variant={canManageFamily(family.id) ? "default" : "secondary"}>
                      {getUserRole(family.id)}
                    </Badge>
                  </div>
                  <div className="flex gap-2">
                    {canManageFamily(family.id) && (
                      <>
                        <Dialog 
                          open={inviteDialogOpen[family.id] || false} 
                          onOpenChange={(open) => setInviteDialogOpen(prev => ({ ...prev, [family.id]: open }))}
                        >
                          <DialogTrigger asChild>
                            <Button size="sm" variant="outline">
                              <UserPlus className="h-4 w-4 mr-2" />
                              Invite Member
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Invite Family Member</DialogTitle>
                              <DialogDescription>
                                Send an invitation to join your family.
                              </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div>
                                <Label htmlFor="familySelect">Select Family</Label>
                                <Select 
                                  value={selectedFamilyForInvite} 
                                  onValueChange={setSelectedFamilyForInvite}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Choose which family to invite to..." />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {families
                                      .filter(f => canManageFamily(f.id))
                                      .map((family) => (
                                        <SelectItem key={family.id} value={family.id}>
                                          {family.name}
                                        </SelectItem>
                                      ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div>
                                <Label htmlFor="inviteEmail">Email Address</Label>
                                <Input
                                  id="inviteEmail"
                                  type="email"
                                  value={inviteEmail}
                                  onChange={(e) => setInviteEmail(e.target.value)}
                                  placeholder="Enter email address..."
                                />
                              </div>
                            </div>
                            <DialogFooter>
                              <Button variant="outline" onClick={() => setInviteDialogOpen(prev => ({ ...prev, [family.id]: false }))}>
                                Cancel
                              </Button>
                              <Button onClick={handleInviteUser} disabled={loading}>
                                {loading ? "Sending..." : "Send Invitation"}
                              </Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button size="sm" variant="destructive">
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete Family
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Family</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete "{family.name}"? This action cannot be undone and will remove all members and data associated with this family.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction 
                                onClick={() => handleDeleteFamily(family.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Delete Family
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </>
                    )}
                    {getUserRole(family.id) === 'member' && (
                      <Button 
                        size="sm" 
                        variant="destructive"
                        onClick={() => handleLeaveFamily(family.id)}
                      >
                        <LogOut className="h-4 w-4 mr-2" />
                        Leave Family
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <h4 className="font-medium text-sm">Members:</h4>
                  <div className="space-y-2">
                    {(familyMembers[family.id] || []).map((member) => (
                      <div key={member.id} className="flex items-center justify-between p-2 bg-muted rounded-md">
                        <div className="flex items-center gap-2">
                          {member.role === 'admin' ? (
                            <Crown className="h-4 w-4 text-yellow-600" />
                          ) : (
                            <User className="h-4 w-4 text-gray-600" />
                          )}
                          <span className="font-medium">
                            {member.profile_name || member.profile_email}
                          </span>
                          {member.user_id === userProfile?.id && (
                            <Badge variant="outline" className="text-xs">You</Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={member.role === 'admin' ? "default" : "secondary"}>
                            {member.role}
                          </Badge>
                          {canManageFamily(family.id) && member.user_id !== userProfile?.id && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleRemoveMember(family.id, member.user_id)}
                            >
                              <UserMinus className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Pending Invitations */}
      {pendingInvitations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Pending Invitations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {pendingInvitations.map((invitation) => (
                <div key={invitation.id} className="flex items-center justify-between p-2 bg-muted rounded-md">
                  <div>
                    <span className="font-medium">{invitation.invited_email}</span>
                    <span className="text-sm text-muted-foreground ml-2">
                      → {(invitation.families as any)?.name}
                    </span>
                  </div>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleDeleteInvitation(invitation.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};