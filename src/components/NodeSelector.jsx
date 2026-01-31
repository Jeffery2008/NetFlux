import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2 } from "lucide-react";

export function NodeSelector({ groups, onSelectionChange, disabled }) {
    const [selectedIds, setSelectedIds] = useState(new Set());
    const [customNodes, setCustomNodes] = useState([]);
    const [customName, setCustomName] = useState('');
    const [customUrl, setCustomUrl] = useState('');

    // Flatten available nodes for easier lookup
    const getAllNodes = () => {
        let nodes = [];
        Object.values(groups).forEach(g => {
            nodes = [...nodes, ...g.nodes];
        });
        return [...nodes, ...customNodes];
    };

    useEffect(() => {
        // Notify parent whenever selection changes
        const allNodes = getAllNodes();
        const selected = allNodes.filter(n => selectedIds.has(n.id));
        onSelectionChange(selected);
    }, [selectedIds, customNodes, groups]); // Dependencies need care to avoid infinite loops if groups change often (they shouldn't)

    const toggleNode = (id) => {
        if (disabled) return;
        const next = new Set(selectedIds);
        if (next.has(id)) {
            next.delete(id);
        } else {
            next.add(id);
        }
        setSelectedIds(next);
    };

    const toggleGroup = (groupNodes) => {
        if (disabled) return;
        const next = new Set(selectedIds);
        const allSelected = groupNodes.every(n => next.has(n.id));

        if (allSelected) {
            groupNodes.forEach(n => next.delete(n.id));
        } else {
            groupNodes.forEach(n => next.add(n.id));
        }
        setSelectedIds(next);
    };

    const addCustomNode = () => {
        if (!customName || !customUrl) return;
        const newNode = {
            id: `custom-${Date.now()}`,
            name: customName,
            url: customUrl
        };
        setCustomNodes([...customNodes, newNode]);
        setCustomName('');
        setCustomUrl('');
        // Auto select
        setSelectedIds(new Set([...selectedIds, newNode.id]));
    };

    const removeCustomNode = (id) => {
        setCustomNodes(customNodes.filter(n => n.id !== id));
        const next = new Set(selectedIds);
        next.delete(id);
        setSelectedIds(next);
    };

    return (
        <div className="flex flex-col h-full space-y-4">
            <div className="space-y-4 overflow-y-auto max-h-[600px] pr-2">
                {Object.entries(groups).map(([key, group]) => (
                    <div key={key} className="space-y-3">
                        <div className="flex items-center justify-between">
                            <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                                {group.name}
                                <Badge variant="outline" className="text-xs font-normal">{group.nodes.length}</Badge>
                            </h4>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 text-xs"
                                onClick={() => toggleGroup(group.nodes)}
                                disabled={disabled}
                            >
                                Toggle All
                            </Button>
                        </div>
                        <div className="grid gap-2">
                            {group.nodes.map(node => (
                                <div key={node.id} className="flex items-start space-x-3 p-2 rounded-md hover:bg-muted/50 transition-colors border border-transparent hover:border-border">
                                    <Checkbox
                                        id={`node-${node.id}`}
                                        checked={selectedIds.has(node.id)}
                                        onCheckedChange={() => toggleNode(node.id)}
                                        disabled={disabled}
                                        className="mt-1"
                                    />
                                    <div className="grid gap-1.5 leading-none">
                                        <Label
                                            htmlFor={`node-${node.id}`}
                                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                                        >
                                            {node.name}
                                        </Label>
                                        <p className="text-xs text-muted-foreground break-all">
                                            {node.url}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <Separator className="my-2" />
                    </div>
                ))}

                {/* Custom Group */}
                {customNodes.length > 0 && (
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Custom Nodes</h4>
                        </div>
                        <div className="grid gap-2">
                            {customNodes.map(node => (
                                <div key={node.id} className="flex items-start space-x-3 p-2 rounded-md bg-muted/30 border border-dashed border-border">
                                    <Checkbox
                                        id={`node-${node.id}`}
                                        checked={selectedIds.has(node.id)}
                                        onCheckedChange={() => toggleNode(node.id)}
                                        disabled={disabled}
                                        className="mt-1"
                                    />
                                    <div className="grid gap-1.5 leading-none flex-1">
                                        <Label htmlFor={`node-${node.id}`} className="text-sm font-medium cursor-pointer">{node.name}</Label>
                                        <p className="text-xs text-muted-foreground break-all">{node.url}</p>
                                    </div>
                                    <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive" onClick={() => removeCustomNode(node.id)}>
                                        <Trash2 className="h-3 w-3" />
                                    </Button>
                                </div>
                            ))}
                        </div>
                        <Separator className="my-2" />
                    </div>
                )}
            </div>

            <div className="space-y-3 pt-4 border-t bg-card">
                <h4 className="text-sm font-medium">Add Custom Link</h4>
                <div className="grid gap-2">
                    <Input
                        placeholder="Node Name (e.g., My Server)"
                        value={customName}
                        onChange={e => setCustomName(e.target.value)}
                        disabled={disabled}
                    />
                    <div className="flex gap-2">
                        <Input
                            placeholder="https://..."
                            value={customUrl}
                            onChange={e => setCustomUrl(e.target.value)}
                            disabled={disabled}
                        />
                        <Button size="icon" onClick={addCustomNode} disabled={disabled || !customName || !customUrl}>
                            <Plus className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
