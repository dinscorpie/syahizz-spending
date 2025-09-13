import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from './useAuth';
import { useFamilyData } from './useFamilyData';

export interface Account {
  id: string;
  name: string;
  type: 'personal' | 'family';
  familyId?: string;
}

interface AccountContextType {
  currentAccount: Account | null;
  availableAccounts: Account[];
  setCurrentAccount: (account: Account) => void;
  loading: boolean;
}

const AccountContext = createContext<AccountContextType | undefined>(undefined);

export const useAccountContext = () => {
  const context = useContext(AccountContext);
  if (!context) {
    throw new Error('useAccountContext must be used within an AccountProvider');
  }
  return context;
};

interface AccountProviderProps {
  children: ReactNode;
}

export const AccountProvider = ({ children }: AccountProviderProps) => {
  const { user } = useAuth();
  const { families, familyMembers, loading: familyLoading } = useFamilyData();
  const [currentAccount, setCurrentAccountState] = useState<Account | null>(null);
  const [availableAccounts, setAvailableAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);

  // Update available accounts when family data changes
  useEffect(() => {
    if (user && !familyLoading) {
      const accounts: Account[] = [
        {
          id: `personal-${user.id}`,
          name: 'Personal Account',
          type: 'personal',
        }
      ];

      if (families && families.length > 0) {
        families.forEach(family => {
          accounts.push({
            id: `family-${family.id}`,
            name: family.name,
            type: 'family',
            familyId: family.id,
          });
        });
      }

      setAvailableAccounts(accounts);

      // Set default account if none is selected
      if (!currentAccount) {
        const savedAccountId = localStorage.getItem('currentAccountId');
        const savedAccount = accounts.find(acc => acc.id === savedAccountId);
        
        if (savedAccount) {
          setCurrentAccountState(savedAccount);
        } else {
          // Default to personal account
          setCurrentAccountState(accounts[0]);
        }
      }
      setLoading(false);
    }
  }, [user, families, familyLoading, currentAccount]);

  const setCurrentAccount = (account: Account) => {
    setCurrentAccountState(account);
    localStorage.setItem('currentAccountId', account.id);
  };

  return (
    <AccountContext.Provider
      value={{
        currentAccount,
        availableAccounts,
        setCurrentAccount,
        loading: loading || familyLoading,
      }}
    >
      {children}
    </AccountContext.Provider>
  );
};