import { getSupabase } from '../supabase';
import { rowToScenario, scenarioToRow, type ScenarioInput, type ScenarioPatch } from './mappers';
import { deleteOwned, getOwned, insertOne, rows, updateWithRevision } from './repoUtils';
import type { CareerScenario } from './types';

// Saved what-if comparisons. Assumptions are always user-entered and stored
// separately from verified inputs.

const TABLE = 'career_scenarios';
const ENTITY = 'career_scenario';

export async function list(userId: string): Promise<CareerScenario[]> {
  return (await rows(
    getSupabase().from(TABLE).select('*').eq('user_id', userId).order('updated_at', { ascending: false }),
  )).map(rowToScenario);
}

export async function get(userId: string, id: string): Promise<CareerScenario> {
  return rowToScenario(await getOwned(TABLE, ENTITY, userId, id));
}

export async function create(userId: string, input: ScenarioInput): Promise<CareerScenario> {
  return rowToScenario(await insertOne(TABLE, scenarioToRow({ kind: 'goals', options: [], priorities: [], assumptions: [], result: null, ...input }, userId)));
}

export async function update(userId: string, id: string, patch: ScenarioPatch, expectedRevision: number): Promise<CareerScenario> {
  const row = scenarioToRow(patch, userId);
  delete row.user_id;
  return rowToScenario(await updateWithRevision(TABLE, ENTITY, userId, id, expectedRevision, row));
}

export const remove = (userId: string, id: string) => deleteOwned(TABLE, userId, id);
