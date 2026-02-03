import React from 'react';
import { Card, CardContent } from "@/components/ui/card";

export function StatsCard({ title, value, unit, icon: Icon, colorClass }) {
  return (
    <Card className="overflow-hidden transition-all duration-300 hover:shadow-lg relative group">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
      <CardContent className="p-6 flex items-center justify-between space-x-4 relative">
        <div className="flex flex-col space-y-1">
          <span className="text-sm font-medium text-muted-foreground">{title}</span>
          <div className="flex items-baseline space-x-2">
            <span className={`text-3xl font-bold tracking-tight tabular-nums ${colorClass} font-sans`}>
              {value}
            </span>
            {unit && <span className="text-sm text-muted-foreground">{unit}</span>}
          </div>
        </div>
        {Icon && (
          <div className={`p-3 rounded-full bg-primary/5 ring-1 ring-inset ring-primary/10 transition-colors group-hover:bg-primary/10`}>
            <Icon className={`h-6 w-6 ${colorClass ? colorClass : 'text-primary'}`} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
