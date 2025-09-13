import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

interface Profile {
  id: string;
  name: string | null;
  email: string | null;
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
  const [userProfile, setUserProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchFamilyData();
    }
  }, [user]);

  const fetchFamilyData = async () => {
    if (!user) return;
    
    try {
      // Get user profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();
      
      setUserProfile(profile);

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

      if (familyMemberships) {
        const userFamilies = familyMemberships
          .filter(membership => membership.families)
          .map(membership => membership.families as Family);
        
        setFamilies(userFamilies);
        
        // Get members for each family
        const allFamilyMembers: Record<string, FamilyMember[]> = {};
        
        for (const familyMembership of familyMemberships) {
          if (familyMembership.families) {
            const familyId = (familyMembership.families as Family).id;
            
            const { data: members } = await supabase
              .from("family_members")
              .select(`
                id,
                user_id,
                role,
                profiles!inner (
                  name,
                  email
                )
              `)
              .eq("family_id", familyId);

            if (members) {
              const transformedMembers: FamilyMember[] = members.map((member: any) => ({
                id: member.id,
                user_id: member.user_id,
                role: member.role,
                profile_name: member.profiles?.name,
                profile_email: member.profiles?.email,
              }));
              allFamilyMembers[familyId] = transformedMembers;
            }
          }
        }
        
        setFamilyMembers(allFamilyMembers);
      }
    } catch (error) {
      console.error("Error fetching family data:", error);
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

  return {
    families,
    familyMembers,
    userProfile,
    loading,
    getDisplayName,
    refetch: fetchFamilyData,
  };
};