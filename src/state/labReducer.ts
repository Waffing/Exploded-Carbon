import type { Mode, Selections, SpecimenId } from '../domain/types.ts';
import { specimens } from '../data/specimens.ts';
export type LabState = { specimenId: SpecimenId; layerIndex: number; mode: Mode; explosion: number; selections: Record<SpecimenId, Selections>; frequencies: Record<SpecimenId, number> };
export const initialState: LabState = { specimenId: 'coffee', layerIndex: 1, mode: 'carbon', explosion: 45, selections: { coffee: {}, meal: {}, shirt: {}, ai: {} }, frequencies: { coffee: 4, meal: 4, shirt: 12, ai: 1 } };
export type Action = { type: 'specimen'; id: SpecimenId } | { type: 'layer'; index: number } | { type: 'mode'; mode: Mode } | { type: 'explosion'; value: number } | { type: 'variant'; layerId: string; variantId: string } | { type: 'preset' } | { type: 'reset' } | { type: 'frequency'; value: number };
export function labReducer(state: LabState, action: Action): LabState {
  switch (action.type) {
    case 'specimen': return { ...state, specimenId: action.id, layerIndex: 1 };
    case 'layer': return { ...state, layerIndex: action.index };
    case 'mode': return { ...state, mode: action.mode };
    case 'explosion': return { ...state, explosion: Math.max(0, Math.min(100, action.value)) };
    case 'variant': return { ...state, selections: { ...state.selections, [state.specimenId]: { ...state.selections[state.specimenId], [action.layerId]: action.variantId } } };
    case 'preset': return { ...state, selections: { ...state.selections, [state.specimenId]: { ...state.selections[state.specimenId], ...specimens.find(s => s.id === state.specimenId)!.preset } } };
    case 'reset': return { ...state, selections: { ...state.selections, [state.specimenId]: {} } };
    case 'frequency': return Number.isFinite(action.value) && action.value >= 0 && action.value <= 366 ? { ...state, frequencies: { ...state.frequencies, [state.specimenId]: action.value } } : state;
  }
}
