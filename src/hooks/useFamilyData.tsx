import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

interface Profile {
  id: string;
  name: string | null;
  email: string | null;
  created_at?: string;
}

interface Family {
  id: string;
  name: string;
}

interface FamilyMember {
  id: string;
  user_id: string;
  role: string;
  profile_name?: string;
  profile_email?: string;
}

export const useFamilyData = () => {
  const { user } = useAuth();
  const [families, setFamilies] = useState<Family[]>([]);
  const [familyMembers, setFamilyMembers] = useState<Record<string, FamilyMember[]>>({});
  const [membershipRoles, setMembershipRoles] = useState<Record<string, string>>({});
  const [userProfile, setUserProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchFamilyData();
    } else {
      // If no user, reset state and stop loading
      setFamilies([]);
      setFamilyMembers({});
      setMembershipRoles({});
      setUserProfile(null);
      setLoading(false);
    }
  }, [user]);

  const fetchFamilyData = async () => {
    if (!user) return;
    
    try {
      // Get user profile
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();

      if (profileError) {
        console.warn("Profile not found or error fetching profile:", profileError.message);
      }
      setUserProfile(profile || null);

      // Get all user's families
      const { data: familyMemberships } = await supabase
        .from("family_members")
        .select(`
          family_id,
          role,
          families (
            id,
            name
          )
        `)
        .eq("user_id", user.id);

      if (familyMemberships && familyMemberships.length > 0) {
        const userFamilies = familyMemberships
          .filter(membership => membership.families)
          .map(membership => membership.families as Family);
        const rolesMap: Record<string, string> = {};
        familyMemberships.forEach((m: any) => {
          if (m.families) rolesMap[(m.families as Family).id] = m.role;
        });
        setFamilies(userFamilies);
        setMembershipRoles(rolesMap);
        
        // Get members for each family
        const allFamilyMembers: Record<string, FamilyMember[]> = {};
        
        for (const familyMembership of familyMemberships) {
          if (familyMembership.families) {
            const familyId = (familyMembership.families as Family).id;
            
            const { data: members, error: membersError } = await supabase
              .from("family_members")
              .select("id,user_id,role")
              .eq("family_id", familyId);

            if (membersError) {
              console.error("Error fetching family members:", membersError);
              continue;
            }

            const userIds = (members || []).map((m: any) => m.user_id).filter(Boolean);
            let profilesById: Record<string, { name: string | null; email: string | null }> = {};
            if (userIds.length) {
              const { data: profilesData } = await supabase
                .from("profiles")
                .select("id,name,email")
                .in("id", userIds);
              profilesById = (profilesData || []).reduce((acc: any, p: any) => {
                acc[p.id] = { name: p.name, email: p.email };
                return acc;
              }, {});
            }

            const transformedMembers: FamilyMember[] = (members || []).map((member: any) => ({
              id: member.id,
              user_id: member.user_id,
              role: member.role,
              profile_name: profilesById[member.user_id]?.name,
              profile_email: profilesById[member.user_id]?.email,
            }));
            allFamilyMembers[familyId] = transformedMembers;
          }
        }
        
        setFamilyMembers(allFamilyMembers);
      } else {
        setFamilies([]);
        setFamilyMembers({});
      }
    } catch (error) {
      console.error("Error fetching family data:", error);
      setFamilies([]);
      setFamilyMembers({});
    } finally {
      setLoading(false);
    }
  };

  const getDisplayName = (userId: string, familyId?: string) => {
    if (userId === user?.id) {
      return userProfile?.name || userProfile?.email || "You";
    }
    const familyMembersList = familyId ? familyMembers[familyId] : Object.values(familyMembers).flat();
    const member = familyMembersList?.find(m => m.user_id === userId);
    return member?.profile_name || member?.profile_email || "Unknown User";
  };

  const getUserRole = (familyId: string) => {
    return membershipRoles[familyId] || 'member';
  };

  return {
    families,
    familyMembers,
    userProfile,
    loading,
    getDisplayName,
    getUserRole,
    refetch: fetchFamilyData,
  };
};