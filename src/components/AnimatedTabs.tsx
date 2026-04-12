import { memo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Trophy, ArrowLeftRight, Users, TrendingUp, Zap } from "lucide-react";
import { contentVariants, springTransition, softSpringTransition } from "@/lib/animations";

interface AnimatedTabsProps {
  children: {
    standings: React.ReactNode;
    transfers: React.ReactNode;
    compare: React.ReactNode;
    stats: React.ReactNode;
    chips: React.ReactNode;
    pitch?: React.ReactNode; // Optional mini-pitch tab
  };
  defaultTab?: string;
}

const tabs = [
  { id: "standings", label: "Standings", icon: Trophy },
  { id: "transfers", label: "Transfers", icon: ArrowLeftRight },
  { id: "compare", label: "Compare", icon: Users },
  { id: "stats", label: "Stats", icon: TrendingUp },
  { id: "chips", label: "Chips", icon: Zap },
];


export const AnimatedTabs = memo(({ children, defaultTab = "standings" }: AnimatedTabsProps) => {
  const [activeTab, setActiveTab] = useState(defaultTab);

  const renderContent = (tabId: string) => {
    const content = children[tabId as keyof typeof children];
    if (!content) return null;

    return (
      <motion.div
        key={tabId}
        variants={contentVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
      >
        {content}
      </motion.div>
    );
  };

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
      <TabsList className="grid w-full grid-cols-5 h-12 p-1 bg-muted/50">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <TabsTrigger
              key={tab.id}
              value={tab.id}
              className="relative flex items-center justify-center gap-2 data-[state=active]:bg-transparent"
            >
              {/* Animated background pill */}
              {isActive && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute inset-0 bg-background rounded-md shadow-sm border"
                  transition={springTransition}
                />
              )}
              
              {/* Icon with micro-animation */}
              <motion.div
                animate={isActive ? { scale: 1.1 } : { scale: 1 }}
                transition={softSpringTransition}
                className="relative z-10"
              >
                <Icon className={`h-4 w-4 ${isActive ? "text-primary" : "text-muted-foreground"}`} />
              </motion.div>
              
              {/* Label */}
              <span className={`relative z-10 hidden sm:inline text-sm font-medium ${
                isActive ? "text-primary" : "text-muted-foreground"
              }`}>
                {tab.label}
              </span>

              {/* Active indicator dot */}
              {isActive && (
                <motion.div
                  layoutId="activeIndicator"
                  className="absolute -bottom-1 w-1 h-1 bg-primary rounded-full"
                  transition={springTransition}
                />
              )}
            </TabsTrigger>
          );
        })}
      </TabsList>

      {/* Content with AnimatePresence for smooth transitions */}
      <AnimatePresence mode="wait">
        {renderContent(activeTab)}
      </AnimatePresence>
    </Tabs>
  );
});

