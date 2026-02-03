import React, { useState, useEffect } from 'react';
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Globe, Server, Check } from "lucide-react";

export function NodeSelector({ groups = {}, onSelectionChange, disabled }) {
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
        const allNodes = getAllNodes();
        const selected = allNodes.filter(n => selectedIds.has(n.id));
        onSelectionChange(selected);
    }, [selectedIds, customNodes, groups]);

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
        setSelectedIds(new Set([...selectedIds, newNode.id]));
    };

    const removeCustomNode = (id) => {
        setCustomNodes(customNodes.filter(n => n.id !== id));
        const next = new Set(selectedIds);
        next.delete(id);
        setSelectedIds(next);
    };

    return (
        <div className="flex flex-col h-full overflow-hidden">
            <div className="flex-1 overflow-y-auto pr-2 space-y-6 hover:pr-1 transition-all custom-scrollbar">
                {/* No Groups State */}
                {Object.keys(groups).length === 0 && customNodes.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-10 text-muted-foreground opacity-50">
                        <Server className="h-10 w-10 mb-2" />
                        <span className="text-sm">No node configurations</span>
                    </div>
                )}

                {Object.entries(groups).map(([key, group]) => {
                    const groupSelectedCount = group.nodes.filter(n => selectedIds.has(n.id)).length;
                    const isAllSelected = group.nodes.length > 0 && groupSelectedCount === group.nodes.length;
                    const isPartiallySelected = groupSelectedCount > 0 && !isAllSelected;

                    return (
                        <div key={key} className="space-y-3">
                            <div 
                                className="flex items-center justify-between group cursor-pointer sticky top-0 bg-card z-10 py-2 border-b border-dashed border-muted/50 backdrop-blur-sm"
                                onClick={() => toggleGroup(group.nodes)}
                            >
                                <div className="flex items-center space-x-2">
                                <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                                    isAllSelected ? "bg-primary border-primary text-primary-foreground" : 
                                    isPartiallySelected ? "bg-primary/20 border-primary text-primary" : "border-muted-foreground"
                                }`}>
                                   {isAllSelected && <Check className="h-3 w-3" />}
                                   {isPartiallySelected && <div className="h-1.5 w-1.5 rounded-full bg-current" />}
                                </div>
                                    <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground group-hover:text-foreground transition-colors">
                                        {group.name}
                                    </h4>
                                </div>
                                <Badge variant={isAllSelected ? "default" : "secondary"} className="text-[10px] h-5 px-1.5 min-w-[1.5rem] justify-center">
                                    {groupSelectedCount}/{group.nodes.length}
                                </Badge>
                            </div>
                            
                            <div className="grid gap-2 pl-2">
                                {group.nodes.map(node => {
                                    const isSelected = selectedIds.has(node.id);
                                    return (
                                        <div 
                                            key={node.id} 
                                            onClick={() => toggleNode(node.id)}
                                            className={`
                                                relative flex items-center space-x-3 p-2.5 rounded-lg border cursor-pointer transition-all duration-200 group
                                                ${isSelected 
                                                    ? 'bg-primary/5 border-primary/20 shadow-sm' 
                                                    : 'bg-card hover:bg-muted/50 border-transparent hover:border-border'
                                                }
                                                ${disabled ? 'opacity-50 pointer-events-none' : ''}
                                            `}
                                        >
                                            <div className={`
                                                flex h-8 w-8 shrink-0 items-center justify-center rounded-full border transition-colors
                                                ${isSelected ? 'border-primary bg-primary text-primary-foreground' : 'border-muted bg-muted/20 text-muted-foreground group-hover:border-primary/50'}
                                            `}>
                                                <Globe className="h-4 w-4" />
                                            </div>
                                            
                                            <div className="flex-1 min-w-0 grid gap-0.5">
                                                <div className={`text-sm font-medium truncate transition-colors ${isSelected ? 'text-primary' : 'text-foreground'}`}>
                                                    {node.name}
                                                </div>
                                                <div className="text-[10px] text-muted-foreground/70 truncate font-mono">
                                                    {node.url}
                                                </div>
                                            </div>

                                            {isSelected && (
                                                <div className="absolute right-2 top-2 h-2 w-2 rounded-full bg-primary shadow-[0_0_8px_rgba(var(--primary),0.5)]" />
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })}

                {/* Custom Group */}
                {customNodes.length > 0 && (
                    <div className="space-y-3">
                         <div className="flex items-center justify-between sticky top-0 bg-card z-10 py-2 border-b border-dashed border-muted/50 backdrop-blur-sm">
                            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Custom Nodes</h4>
                        </div>
                        <div className="grid gap-2 pl-2">
                            {customNodes.map(node => (
                                <div 
                                    key={node.id} 
                                    className={`
                                        flex items-center space-x-3 p-2.5 rounded-lg border border-dashed border-muted bg-muted/10
                                        ${selectedIds.has(node.id) ? 'ring-1 ring-primary/20 bg-primary/5' : ''}
                                    `}
                                >
                                     <Checkbox
                                        id={`node-${node.id}`}
                                        checked={selectedIds.has(node.id)}
                                        onCheckedChange={() => toggleNode(node.id)}
                                        disabled={disabled}
                                    />
                                    <div className="flex-1 min-w-0 grid gap-0.5">
                                        <div className="text-sm font-medium truncate">{node.name}</div>
                                        <div className="text-[10px] text-muted-foreground truncate">{node.url}</div>
                                    </div>
                                    <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-full" onClick={() => removeCustomNode(node.id)}>
                                        <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            <div className="pt-4 mt-2 border-t bg-card/50 backdrop-blur-sm">
                <div className="space-y-2">
                    <Label className="text-xs font-semibold uppercase text-muted-foreground">Add Custom Target</Label>
                    <div className="grid gap-2">
                        <Input
                            placeholder="Name"
                            value={customName}
                            onChange={e => setCustomName(e.target.value)}
                            disabled={disabled}
                            className="h-8 text-sm bg-muted/20"
                        />
                        <div className="flex gap-2">
                            <Input
                                placeholder="URL (https://...)"
                                value={customUrl}
                                onChange={e => setCustomUrl(e.target.value)}
                                disabled={disabled}
                                className="h-8 text-sm bg-muted/20"
                            />
                            <Button size="icon" className="h-8 w-8 shrink-0" onClick={addCustomNode} disabled={disabled || !customName || !customUrl}>
                                <Plus className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
