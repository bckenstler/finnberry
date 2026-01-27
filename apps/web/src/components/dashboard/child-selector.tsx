"use client";

import { useRouter } from "next/navigation";
import { ChevronDown, Plus, Check } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Child {
  id: string;
  name: string;
  birthDate: Date | string;
}

interface ChildSelectorProps {
  currentChild: Child;
  allChildren: Child[];
  householdId: string;
}

export function ChildSelector({
  currentChild,
  allChildren,
  householdId,
}: ChildSelectorProps) {
  const router = useRouter();

  const handleChildSelect = (childId: string) => {
    router.push(`/dashboard/${childId}`);
  };

  const handleAddChild = () => {
    router.push(`/dashboard/${householdId}/child/new`);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex items-center gap-1 hover:bg-muted rounded-lg px-2 py-1 transition-colors -ml-2">
        <div className="text-left">
          <h1 className="text-2xl font-bold">{currentChild.name}</h1>
          <p className="text-sm text-muted-foreground">
            Born {new Date(currentChild.birthDate).toLocaleDateString()}
          </p>
        </div>
        <ChevronDown className="h-5 w-5 text-muted-foreground" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        {allChildren.map((child) => (
          <DropdownMenuItem
            key={child.id}
            onClick={() => handleChildSelect(child.id)}
            className="flex items-center justify-between cursor-pointer"
          >
            <div>
              <p className="font-medium">{child.name}</p>
              <p className="text-xs text-muted-foreground">
                Born {new Date(child.birthDate).toLocaleDateString()}
              </p>
            </div>
            {child.id === currentChild.id && (
              <Check className="h-4 w-4 text-primary" />
            )}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={handleAddChild}
          className="cursor-pointer"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Child
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
