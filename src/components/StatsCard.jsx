import React from 'react';
import { Card, CardContent } from "@/components/ui/card";

export function StatsCard({ title, value, unit, icon: Icon, colorClass, detail }) {
  return (
    <Card className="group relative min-h-[10.5rem] overflow-hidden transition-all duration-300 hover:shadow-lg sm:min-h-0">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
      <CardContent className="relative flex h-full min-w-0 flex-col justify-between gap-5 p-5 sm:p-6">
        <div className="flex min-w-0 items-start justify-between gap-4">
          <span className="min-w-0 break-words text-sm font-medium leading-tight text-muted-foreground">{title}</span>
          {Icon && (
            <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-primary/5 ring-1 ring-inset ring-primary/10 transition-colors group-hover:bg-primary/10 sm:h-11 sm:w-11">
              <Icon className={`h-5 w-5 sm:h-6 sm:w-6 ${colorClass ? colorClass : 'text-primary'}`} />
            </div>
          )}
        </div>
        <div className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-1">
          <span className={`min-w-0 break-words text-[clamp(1.85rem,7.6vw,3rem)] font-bold leading-none tracking-tight tabular-nums ${colorClass} font-sans sm:text-3xl`}>
              {value}
          </span>
          {unit && <span className="text-sm text-muted-foreground">{unit}</span>}
        </div>
        {detail && (
          <div className="text-xs font-medium text-muted-foreground">
            {detail}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
