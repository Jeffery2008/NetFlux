import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Zap, Activity, Database, CheckCircle, XCircle, Loader2 } from 'lucide-react';

export function NodeStatusTable({ workerStats }) {
    if (!workerStats || workerStats.length === 0) return null;

    const getStatusBadge = (status) => {
        switch (status) {
            case 'pending': return <Badge variant="outline" className="text-muted-foreground">Pending</Badge>;
            case 'pinging': return <Badge variant="secondary" className="flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" /> Ping</Badge>;
            case 'downloading': return <Badge className="bg-blue-500 hover:bg-blue-600 flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" /> Running</Badge>;
            case 'done': return <Badge className="bg-green-500 hover:bg-green-600 flex items-center gap-1"><CheckCircle className="h-3 w-3" /> Done</Badge>;
            case 'error': return <Badge variant="destructive" className="flex items-center gap-1"><XCircle className="h-3 w-3" /> Error</Badge>;
            default: return <Badge variant="outline">{status}</Badge>;
        }
    };

    return (
        <Card className="animate-enter overflow-hidden border-t-0 shadow-sm" style={{ animationDelay: '350ms', animationFillMode: 'forwards' }}>
            <CardHeader className="py-3 border-b bg-muted/20">
                <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                    <Activity className="h-3 w-3" /> Node Statistics
                </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
                <div className="max-h-[300px] overflow-y-auto overflow-x-auto scroller-pretty">
                    <Table>
                        <TableHeader className="bg-background sticky top-0 z-10 shadow-sm">
                            <TableRow className="hover:bg-transparent border-b">
                                <TableHead className="w-[180px] font-semibold text-xs uppercase tracking-wider">Node Name</TableHead>
                                <TableHead className="text-right font-semibold text-xs uppercase tracking-wider">Latency</TableHead>
                                <TableHead className="text-right font-semibold text-xs uppercase tracking-wider">Speed</TableHead>
                                <TableHead className="text-right font-semibold text-xs uppercase tracking-wider">Total Data</TableHead>
                                <TableHead className="w-[100px] text-right font-semibold text-xs uppercase tracking-wider">Status</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {workerStats.map((node) => (
                                <TableRow key={node.id} className="text-xs md:text-sm hover:bg-muted/30 transition-colors">
                                    <TableCell className="font-medium truncate max-w-[150px]" title={node.name}>
                                        <div className="flex items-center space-x-2">
                                            <div className={`w-1.5 h-1.5 rounded-full ${node.status === 'downloading' ? 'bg-blue-500 animate-pulse' : node.status === 'error' ? 'bg-red-500' : 'bg-muted-foreground/30'}`} />
                                            <span>{node.name}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right tabular-nums">
                                        {node.latency ? `${node.latency} ms` : <span className="text-muted-foreground">--</span>}
                                    </TableCell>
                                    <TableCell className="text-right tabular-nums font-bold text-[#0070F3]">
                                        {node.speed} MB/s
                                    </TableCell>
                                    <TableCell className="text-right tabular-nums text-muted-foreground">
                                        {node.totalFlowStr}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        {getStatusBadge(node.status)}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
    );
}
