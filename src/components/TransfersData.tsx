import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown } from "lucide-react";
import { useState } from "react";

interface TransferData {
  gameweek: number;
  transfers_made: number;
  transfer_cost: number;
  points: number;
}

interface Manager {
  rank: number;
  entry: number;
  entry_name: string;
  player_name: string;
  total: number;
  gameweek_points: { [key: string]: number };
  chips: any[];
  transfers: TransferData[];
}

interface TransfersDataProps {
  leagueData: Manager[];
}

export const TransfersData = ({ leagueData }: TransfersDataProps) => {
  const [openManagers, setOpenManagers] = useState<Set<number>>(new Set());

  const toggleManager = (entry: number) => {
    const newOpen = new Set(openManagers);
    if (newOpen.has(entry)) {
      newOpen.delete(entry);
    } else {
      newOpen.add(entry);
    }
    setOpenManagers(newOpen);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-heading">Transfer Activity</CardTitle>
        <CardDescription>
          View each manager's transfer activity and point hits for every gameweek
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {leagueData.map((manager) => {
          const isOpen = openManagers.has(manager.entry);
          const totalTransferCost = manager.transfers.reduce(
            (sum, t) => sum + t.transfer_cost,
            0
          );
          const transfersMade = manager.transfers.reduce(
            (sum, t) => sum + t.transfers_made,
            0
          );

          return (
            <Collapsible
              key={manager.entry}
              open={isOpen}
              onOpenChange={() => toggleManager(manager.entry)}
            >
              <Card className="border-border">
                <CollapsibleTrigger className="w-full">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                    <div className="flex flex-col items-start space-y-1">
                      <CardTitle className="font-heading text-base">
                        {manager.player_name}
                      </CardTitle>
                      <p className="text-sm text-muted-foreground">
                        {manager.entry_name}
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-sm font-medium">
                          {transfersMade} transfers
                        </p>
                        <p className="text-xs text-destructive">
                          -{totalTransferCost} pts
                        </p>
                      </div>
                      <ChevronDown
                        className={`h-5 w-5 transition-transform ${
                          isOpen ? "rotate-180" : ""
                        }`}
                      />
                    </div>
                  </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent className="pt-0">
                    <div className="w-full rounded-md border overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-[100px]">GW</TableHead>
                            <TableHead>Transfers</TableHead>
                            <TableHead>TC</TableHead>
                            <TableHead className="text-right">Points</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {manager.transfers.map((transfer) => (
                            <TableRow key={transfer.gameweek}>
                              <TableCell className="font-medium">
                                GW {transfer.gameweek}
                              </TableCell>
                              <TableCell>{transfer.transfers_made}</TableCell>
                              <TableCell
                                className={
                                  transfer.transfer_cost > 0
                                    ? "text-destructive font-medium"
                                    : ""
                                }
                              >
                                {transfer.transfer_cost > 0
                                  ? `-${transfer.transfer_cost}`
                                  : "0"}
                              </TableCell>
                              <TableCell className="text-right">
                                {transfer.points}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>
          );
        })}
      </CardContent>
    </Card>
  );
};
