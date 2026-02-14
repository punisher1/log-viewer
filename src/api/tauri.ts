import { invoke } from '@tauri-apps/api/core';
import type { FileMeta, IndexStatus, SearchOptions, MatchResult } from '../types';

export async function openFile(path: string): Promise<FileMeta> {
  return invoke('open_file', { path });
}

export async function buildIndex(path: string): Promise<{
  path: string;
  totalLines: number;
}> {
  return invoke('build_index', { path });
}

export async function getIndexStatus(path: string): Promise<IndexStatus> {
  return invoke('get_index_status', { path });
}

export async function readLines(
  path: string,
  start: number,
  count: number
): Promise<string[]> {
  return invoke('read_lines', { path, start, count });
}

export async function search(
  path: string,
  options: SearchOptions
): Promise<MatchResult[]> {
  return invoke('search', { path, options });
}
