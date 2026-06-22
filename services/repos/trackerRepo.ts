import { getSupabase } from '../supabase';
import { rowToJob, jobToRow } from './mappers';
import type { JobApplication } from '../../types';

export async function list(userId: string): Promise<JobApplication[]> {
  const { data, error } = await getSupabase().from('job_applications')
    .select('*').eq('user_id', userId).order('sort_order', { ascending: true });
  if (error) throw error;
  return (data ?? []).map((d) => rowToJob(d as Record<string, unknown>));
}

export async function upsert(userId: string, job: JobApplication): Promise<JobApplication> {
  const { data, error } = await getSupabase().from('job_applications')
    .upsert(jobToRow(job, userId)).select('*').single();
  if (error) throw error;
  return rowToJob(data as Record<string, unknown>);
}

export async function remove(userId: string, id: string): Promise<void> {
  const { error } = await getSupabase().from('job_applications')
    .delete().eq('user_id', userId).eq('id', id);
  if (error) throw error;
}
