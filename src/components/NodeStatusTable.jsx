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
        <Card className="animate-enter" style={{ animationDelay: '350ms', animationFillMode: 'forwards' }}>
            <CardHeader className="py-3 border-b">
                <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                    <Activity className="h-3 w-3" /> Node Statistics
                </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
                <div className="max-h-[300px] overflow-y-auto overflow-x-auto">
                    <Table>
                        <TableHeader className="bg-muted/50 sticky top-0 backdrop-blur z-10">
                            <TableRow>
                                <TableHead className="w-[180px]">Node Name</TableHead>
                                <TableHead className="text-right">Latency</TableHead>
                                <TableHead className="text-right">Speed</TableHead>
                                <TableHead className="text-right">Total Data</TableHead>
                                <TableHead className="w-[100px] text-right">Status</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {workerStats.map((node) => (
                                <TableRow key={node.id} className="text-xs md:text-sm">
                                    <TableCell className="font-medium truncate max-w-[150px]" title={node.name}>
                                        {node.name}
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
