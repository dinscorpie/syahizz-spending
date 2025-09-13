import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useState } from "react";
import { useAccountContext, Account } from "@/hooks/useAccountContext";

interface AccountSelectorProps {
  className?: string;
  placeholder?: string;
}

export const AccountSelector = ({ className, placeholder = "Select account..." }: AccountSelectorProps) => {
  const { currentAccount, availableAccounts, setCurrentAccount } = useAccountContext();
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("w-[200px] justify-between", className)}
        >
          {currentAccount ? (
            <div className="flex items-center">
              <div className={cn(
                "w-2 h-2 rounded-full mr-2",
                currentAccount.type === 'personal' ? "bg-blue-500" : "bg-green-500"
              )} />
              {currentAccount.name}
            </div>
          ) : (
            placeholder
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[200px] p-0">
        <Command>
          <CommandList>
            <CommandEmpty>No accounts found.</CommandEmpty>
            <CommandGroup>
              {availableAccounts.map((account) => (
                <CommandItem
                  key={account.id}
                  value={account.id}
                  onSelect={() => {
                    setCurrentAccount(account);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      currentAccount?.id === account.id ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <div className="flex items-center">
                    <div className={cn(
                      "w-2 h-2 rounded-full mr-2",
                      account.type === 'personal' ? "bg-blue-500" : "bg-green-500"
                    )} />
                    {account.name}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};