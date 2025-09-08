import rollupData from '../../public/federal_budget/rollup.json';
import macroData from '../../public/federal_budget/macro.json';
import termsData from '../../public/federal_budget/terms.json';
import hierarchyData from '../../public/federal_budget/hierarchy.json';
import eventsData from '../../public/federal_budget/events.json';
import cboProjectionData from '../../public/federal_budget/cbo_projection.json'; // Import CBO projection data
import cpiData from '../../public/federal_budget/cpi.json'; // Import CPI data

import { BudgetRollup, BudgetHierarchyData, PresidentTerm, EventAnnotation, MacroSeries, Projection, RawCBOProjectionData } from '../types/budget';
import { TaxPolicyBundle } from '../types/tax';
import { baselinePolicy } from '../lib/baselinePolicies'; // Import the actual baseline policy

// Type the imported data
export const budgetRollup = rollupData as BudgetRollup;
export const macroSeries = macroData as MacroSeries;
export const presidentTerms = termsData as PresidentTerm[];
const hierarchyDataTyped = hierarchyData as BudgetHierarchyData;
export const budgetHierarchy = hierarchyDataTyped; // Keep the whole object to access units
export const budgetEvents = eventsData as EventAnnotation[];
export const baselineTaxPolicy = baselinePolicy as TaxPolicyBundle; // Export baseline tax policy
export const cboProjection = cboProjectionData as RawCBOProjectionData; // Correctly type CBO projection data
export const cpiSeries = cpiData; // Export CPI data