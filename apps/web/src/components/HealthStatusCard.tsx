'use client';

import React, { useEffect, useState, useCallback } from 'react';
import type { HealthCheckResponse } from '@pharmacy/shared-types';

interface HealthState {
  data: HealthCheckResponse | null;
  loading: boolean;
  error: string | null;
  latencyMs: number | null;
  lastChecked: Date | null;
}

export function HealthStatusCard() {
  const [state, setState] = useState<HealthState>({
    data: null,
    loading: true,
    error: null,
    latencyMs: null,
    lastChecked: null,
  });

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

  const checkHealth = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    const startTime = performance.now();

    try {
      const res = await fetch(`${apiUrl}/api/v1/health`, {
        cache: 'no-store',
      });
      const endTime = performance.now();
      const latencyMs = Math.round(endTime - startTime);

      const json: HealthCheckResponse = await res.json();

      if (!res.ok && res.status !== 503) {
        throw new Error(`API responded with HTTP ${res.status}`);
      }

      setState({
        data: json,
        loading: false,
        error: null,
        latencyMs,
        lastChecked: new Date(),
      });
    } catch (err: unknown) {
      setState({
        data: null,
        loading: false,
        error: err instanceof Error ? err.message : 'Failed to reach API endpoint',
        latencyMs: null,
        lastChecked: new Date(),
      });
    }
  }, [apiUrl]);

  useEffect(() => {
    checkHealth();
  }, [checkHealth]);

  const isHealthy = state.data?.status === 'ok';
  const isDegraded = state.data?.status === 'degraded';
  const isError = !state.loading && (state.error !== null || (!isHealthy && !isDegraded));

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 max-w-xl w-full">
      <div className="flex items-center justify-between pb-4 border-b border-slate-100">
        <div>
          <h3 className="text-lg font-semibold text-slate-800">Backend Connectivity</h3>
          <p className="text-xs text-slate-500 font-mono mt-0.5">{apiUrl}/api/v1/health</p>
        </div>
        <button
          onClick={checkHealth}
          disabled={state.loading}
          className="px-3 py-1.5 text-xs font-medium rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 disabled:opacity-50 transition"
        >
          {state.loading ? 'Checking...' : 'Refresh'}
        </button>
      </div>

      <div className="mt-4 space-y-4">
        {/* Status Badge */}
        <div className="flex items-center justify-between bg-slate-50 p-3 rounded-lg">
          <span className="text-sm font-medium text-slate-600">API Gateway Status</span>
          <div>
            {state.loading && !state.data ? (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-200 text-slate-700 animate-pulse">
                Probing...
              </span>
            ) : isHealthy ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                Connected (Healthy)
              </span>
            ) : isDegraded ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">
                <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                Degraded
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800">
                <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                Unreachable
              </span>
            )}
          </div>
        </div>

        {/* Error message if disconnected */}
        {isError && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700">
            <span className="font-semibold">Connection Error:</span> {state.error}
            <p className="mt-1 text-slate-500">
              Ensure the NestJS backend is running on port 3001 (`pnpm dev:api`).
            </p>
          </div>
        )}

        {/* Infrastructure dependencies */}
        {state.data?.dependencies && (
          <div className="space-y-2 pt-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Infrastructure Services
            </span>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-2.5 rounded-lg border border-slate-100 bg-slate-50 flex items-center justify-between">
                <span className="font-medium text-slate-700">PostgreSQL</span>
                <span
                  className={`font-semibold uppercase text-[11px] ${
                    state.data.dependencies.database === 'ok' ? 'text-emerald-600' : 'text-rose-600'
                  }`}
                >
                  {state.data.dependencies.database}
                </span>
              </div>
              <div className="p-2.5 rounded-lg border border-slate-100 bg-slate-50 flex items-center justify-between">
                <span className="font-medium text-slate-700">Redis</span>
                <span
                  className={`font-semibold uppercase text-[11px] ${
                    state.data.dependencies.redis === 'ok' ? 'text-emerald-600' : 'text-rose-600'
                  }`}
                >
                  {state.data.dependencies.redis}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Metadata */}
        <div className="pt-2 text-xs text-slate-500 flex items-center justify-between border-t border-slate-100">
          <span>
            {state.latencyMs !== null ? `Response time: ${state.latencyMs}ms` : 'Latency: --'}
          </span>
          <span>
            {state.lastChecked
              ? `Updated: ${state.lastChecked.toLocaleTimeString()}`
              : 'Not checked yet'}
          </span>
        </div>
      </div>
    </div>
  );
}
