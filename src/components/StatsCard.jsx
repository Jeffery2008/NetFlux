import React from 'react';
import { Card, CardContent } from "@/components/ui/card";

export function StatsCard({ title, value, unit, icon: Icon, colorClass }) {
    return (
        <Card>
            <CardContent className="p-6 flex items-center justify-between space-x-4">
                <div className="flex flex-col space-y-1">
                    <span className="text-sm font-medium text-muted-foreground">{title}</span>
                    <div className="flex items-baseline space-x-2">
                        <span className={`text-3xl font-bold tracking-tight tabular-nums ${colorClass} font-sans`}>
                            {value}
                        </span>
                        {unit && <span className="text-sm text-muted-foreground">{unit}</span>}
                    </div>
                </div>
                {Icon && <Icon className="h-8 w-8 text-muted-foreground opacity-20" />}
            </CardContent>
        </Card>
    );
}
