import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Zap, Clock, Check, X } from "lucide-react";
import { memo, useMemo } from "react";

interface Chip {
  name: string;
  time: string;
  event: number;
}

interface Manager {
  rank: number;
  entry: number;
  entry_name: string;
  player_name: string;
  total: number;
  gameweek_points: { [key: string]: number };
  chips: Chip[];
}

interface ChipsUsedProps {
  leagueData: Manager[];
}

const chipDisplayNames: { [key: string]: string } = {
  "3xc": "Triple Captain",
  "bboost": "Bench Boost",
  "freehit": "Free Hit",
  "wildcard": "Wildcard",
};

const chipColors: { [key: string]: { used: string; available: string; expired: string } } = {
  "3xc": {
    used: "bg-purple-500 text-white border-purple-600",
    available: "bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/20",
    expired: "bg-gray-500/20 text-gray-500 border-gray-500/30"
  },
  "bboost": {
    used: "bg-blue-500 text-white border-blue-600",
    available: "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20",
    expired: "bg-gray-500/20 text-gray-500 border-gray-500/30"
  },
  "freehit": {
    used: "bg-green-500 text-white border-green-600",
    available: "bg-green-500/10 text-green-700 dark:text-green-300 border-green-500/20",
    expired: "bg-gray-500/20 text-gray-500 border-gray-500/30"
  },
  "wildcard": {
    used: "bg-orange-500 text-white border-orange-600",
    available: "bg-orange-500/10 text-orange-700 dark:text-orange-300 border-orange-500/20",
    expired: "bg-gray-500/20 text-gray-500 border-gray-500/30"
  },
};

// Get current gameweek from data or fallback
const getCurrentGameweek = (leagueData: Manager[]): number => {
  // Find the highest gameweek key across all managers
  let maxGW = 0;
  leagueData.forEach(manager => {
    Object.keys(manager.gameweek_points).forEach(key => {
      const gw = parseInt(key, 10);
      if (!isNaN(gw) && gw > maxGW) maxGW = gw;
    });
  });
  return maxGW > 0 ? maxGW : 19; // Default to 19 if can't determine
};

// Get all instances of a chip type, sorted by event
const getChipUses = (chips: Chip[], chipType: string): number[] => {
  // Debug: log what we're searching
  console.log(`[ChipsDebug] Searching for ${chipType} in:`, chips);
  
  const matchingChips = chips.filter(chip => {
    const match = chip.name === chipType;
    if (match) {
      console.log(`[ChipsDebug] Found ${chipType}: event=${chip.event}, type=${typeof chip.event}`);
    }
    return match;
  });
  
  const events = matchingChips.map(chip => {
    // Ensure event is a number
    const eventNum = typeof chip.event === 'string' ? parseInt(chip.event, 10) : chip.event;
    return eventNum;
  }).filter(n => !isNaN(n));
  
  const sorted = events.sort((a, b) => a - b);
  console.log(`[ChipsDebug] ${chipType} sorted events:`, sorted);
  return sorted;
};

// Render chip status with 2025/26 double-chip rules
const ChipStatus = memo(({ 
  chipUses, 
  chipType, 
  currentGW 
}: { 
  chipUses: number[]; 
  chipType: string; 
  currentGW: number;
}) => {
  const colors = chipColors[chipType];
  
  // 2025/26 Rules: Independent slots for each chip
  // Slot 1: GW 1-19 (use it or lose it)
  // Slot 2: GW 20-38 (fresh slot, independent of Slot 1)
  const FIRST_HALF_DEADLINE = 19;
  const SECOND_HALF_START = 20;
  
  // Debug logging
  console.log(`[ChipStatus] ${chipType}: chipUses=${JSON.stringify(chipUses)}, currentGW=${currentGW}`);
  
  // Categorize uses by gameweek - explicitly check boundaries
  const slot1Candidates = chipUses.filter(gw => gw >= 1 && gw <= FIRST_HALF_DEADLINE);
  const slot2Candidates = chipUses.filter(gw => gw >= SECOND_HALF_START);
  
  const slot1Use = slot1Candidates.length > 0 ? slot1Candidates[0] : null;
  const slot2Use = slot2Candidates.length > 0 ? slot2Candidates[0] : null;
  
  console.log(`[ChipStatus] ${chipType}: slot1Candidates=${JSON.stringify(slot1Candidates)}, slot2Candidates=${JSON.stringify(slot2Candidates)}`);
  console.log(`[ChipStatus] ${chipType}: slot1Use=${slot1Use}, slot2Use=${slot2Use}`);
  
  // Slot 1: GW 1-19
  const getSlot1Status = (): { text: string; variant: 'used' | 'available' | 'expired' } => {
    if (slot1Use) {
      return { text: `GW ${slot1Use}`, variant: 'used' };
    }
    // Past GW 19 and not used = Expired
    if (currentGW > FIRST_HALF_DEADLINE) {
      return { text: 'Expired', variant: 'expired' };
    }
    // Still in first half
    return { text: 'Available', variant: 'available' };
  };
  
  // Slot 2: GW 20-38 (Independent of Slot 1!)
  const getSlot2Status = (): { text: string; variant: 'used' | 'available' | 'expired' } => {
    if (slot2Use) {
      return { text: `GW ${slot2Use}`, variant: 'used' };
    }
    // Not used yet - always Available (doesn't depend on Slot 1)
    return { text: 'Available', variant: 'available' };
  };
  
  const slot1Status = getSlot1Status();
  const slot2Status = getSlot2Status();
  
  console.log(`[ChipStatus] ${chipType}: slot1Status=${JSON.stringify(slot1Status)}, slot2Status=${JSON.stringify(slot2Status)}`);
  
  return (
    <div className="flex flex-col gap-1 min-w-[90px]">
      {/* First Chip Slot (GW 1-19) */}
      <Badge
        variant="outline"
        className={`${colors[slot1Status.variant]} text-xs px-2 py-0.5 justify-center`}
      >
        {slot1Status.variant === 'used' && <Check className="h-3 w-3 mr-1" />}
        {slot1Status.variant === 'expired' && <X className="h-3 w-3 mr-1" />}
        {slot1Status.variant === 'available' && <Clock className="h-3 w-3 mr-1" />}
        {slot1Status.text}
      </Badge>
      
      {/* Second Chip Slot (GW 20-38) */}
      <Badge
        variant="outline"
        className={`${colors[slot2Status.variant]} text-xs px-2 py-0.5 justify-center`}
      >
        {slot2Status.variant === 'used' && <Check className="h-3 w-3 mr-1" />}
        {slot2Status.variant === 'available' && <Clock className="h-3 w-3 mr-1" />}
        {slot2Status.text}
      </Badge>
    </div>
  );
});

export const ChipsUsed = memo(({ leagueData }: ChipsUsedProps) => {
  const allChips = ["3xc", "bboost", "freehit", "wildcard"];
  
  const currentGW = useMemo(() => getCurrentGameweek(leagueData), [leagueData]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="h-5 w-5 text-accent" />
          Chips Used (2025/26 Rules)
        </CardTitle>
        <CardDescription>
          Two independent slots per chip. First slot (GW 1-19) expires if unused. Second slot (GW 20+) always available.
          {currentGW > 0 && (
            <span className="ml-1 text-xs text-muted-foreground">
              (Current: GW {currentGW})
            </span>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="w-full rounded-md border overflow-x-auto overflow-y-auto max-h-[600px] relative">
          <Table className="min-w-[900px]">
            <TableHeader className="sticky top-0 bg-card z-10 shadow-sm">
              <TableRow>
                <TableHead className="sticky top-0 bg-card z-10 w-[60px]">Rank</TableHead>
                <TableHead className="sticky top-0 bg-card z-10">Manager</TableHead>
                <TableHead className="sticky top-0 bg-card z-10">Team</TableHead>
                {allChips.map((chip) => (
                  <TableHead key={chip} className="sticky top-0 bg-card z-10 text-center w-[120px]">
                    <div className="flex flex-col items-center">
                      <span>{chipDisplayNames[chip]}</span>
                      <span className="text-[10px] text-muted-foreground">Slot 1 / Slot 2</span>
                    </div>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {leagueData.map((manager) => {
                // Debug: Log manager's chips
                console.log(`[ChipsUsed] Manager ${manager.player_name} (${manager.entry}):`, 
                  manager.chips.length, 'chips:', 
                  manager.chips.map(c => `${c.name}@GW${c.event}`).join(', '));
                
                return (
                  <TableRow key={manager.entry}>
                    <TableCell className="font-medium text-center">{manager.rank}</TableCell>
                    <TableCell className="font-medium">{manager.player_name}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{manager.entry_name}</TableCell>
                    {allChips.map((chip) => {
                      const chipUses = getChipUses(manager.chips, chip);
                      return (
                        <TableCell key={chip} className="text-center">
                          <ChipStatus 
                            chipUses={chipUses} 
                            chipType={chip} 
                            currentGW={currentGW}
                          />
                        </TableCell>
                      );
                    })}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
        
        {/* Legend */}
        <div className="mt-4 flex flex-wrap gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <Check className="h-3 w-3 text-green-500" />
            <span>Used</span>
          </div>
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3 text-blue-500" />
            <span>Available</span>
          </div>
          <div className="flex items-center gap-1">
            <X className="h-3 w-3 text-gray-500" />
            <span>Expired (Slot 1 only)</span>
          </div>
          <div className="ml-auto text-xs italic">
            * Slots are independent - Slot 2 available regardless of Slot 1
          </div>
        </div>
      </CardContent>
    </Card>
  );
});
