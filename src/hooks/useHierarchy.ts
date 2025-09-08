"use client";
import { useMemo } from 'react';
import { useBudgetData } from './useBudgetData';
import { BudgetNode, BudgetHierarchyData } from '@/types';

// Define a type for the processed node, which includes children
export interface ProcessedBudgetNode extends BudgetNode {
  children: ProcessedBudgetNode[];
  parent?: ProcessedBudgetNode; // Add parent reference
}

export function useHierarchy() {
  const { hierarchy, isLoading, isError } = useBudgetData();

  const { root, nodeMap } = useMemo(() => {
    if (!hierarchy || !hierarchy.nodes) return { root: null, nodeMap: new Map<string, ProcessedBudgetNode>() };

    const nodes = hierarchy.nodes;
    const units = hierarchy.units;

    let multiplier = 1;
    if (units.values_nominal === 'USD_thousands') {
        multiplier = 1000;
    } else if (units.values_nominal === 'USD_millions') {
        multiplier = 1000000;
    }

    // Create a map to store all processed nodes, keyed by their ID
    // This allows easy lookup when building the tree
    const tempNodeMap = new Map<string, ProcessedBudgetNode>();

    // First pass: Process each node, apply multiplier, map labels, and initialize children array
    nodes.forEach(node => {
      const newNode: ProcessedBudgetNode = {
        ...node,
        id: String(node.id).trim(), // Ensure ID is clean
        children: [], // Initialize children array
      };

      // Apply multiplier to nominal values
      Object.keys(newNode.values).forEach(yearStr => {
        const year = Number(yearStr);
        if (newNode.values[year]) {
          newNode.values[year].nominal *= multiplier;
        }
      });

      // The name from the data should be correct. Just trim it.
      newNode.name = String(newNode.name).trim();
      
      tempNodeMap.set(newNode.id, newNode);
    });

    // Second pass: Build the tree structure by assigning children to their parents
    const topLevelNodes: ProcessedBudgetNode[] = [];
    tempNodeMap.forEach(node => {
      if (node.parentId && tempNodeMap.has(node.parentId)) {
        const parent = tempNodeMap.get(node.parentId)!;
        parent.children.push(node);
        node.parent = parent; // Set parent reference
      } else {
        // If no parentId or parent not found in the map, it's a top-level node
        topLevelNodes.push(node);
      }
    });

    // Sort children arrays for consistent display order
    tempNodeMap.forEach(node => {
      node.children.sort((a, b) => a.name.localeCompare(b.name));
    });
    topLevelNodes.sort((a, b) => a.name.localeCompare(b.name));

    // Create a single conceptual root node
    const finalRoot: ProcessedBudgetNode = {
      id: 'root',
      name: 'Total Federal Spending',
      level: 0,
      kind: 'root', // Conceptual kind for the root
      path: ['root'],
      values: {}, // Will be aggregated from its direct children
      children: topLevelNodes,
    };

    // Aggregate values for the final root from its direct children
    const allYears = new Set<number>();
    topLevelNodes.forEach(node => Object.keys(node.values).forEach(year => allYears.add(Number(year))));
    allYears.forEach(year => {
      const total = topLevelNodes.reduce((sum, child) => {
        return sum + (child.values[year]?.nominal || 0);
      }, 0);
      finalRoot.values[year] = { nominal: total };
    });
    
    // Add the final root to the map
    tempNodeMap.set('root', finalRoot);

    return { root: finalRoot, nodeMap: tempNodeMap };
  }, [hierarchy]);

  const getNode = (id: string) => nodeMap.get(id);

  const getPath = (id: string) => {
    const node = getNode(id);
    if (!node) return [];
    // Reconstruct path from node's path array, fetching each node from the map
    return node.path.map(pathId => getNode(pathId)).filter(Boolean) as ProcessedBudgetNode[];
  };

  return {
    root,
    nodeMap,
    getNode,
    getPath,
    isLoading,
    isError,
  };
}