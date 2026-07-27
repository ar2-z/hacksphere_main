import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from './supabase'
import type { RealtimeChannel } from '@supabase/supabase-js'

export function useFetch<T>(
  table: string,
  options?: {
    columns?: string
    filters?: Record<string, unknown>
    order?: { column: string; ascending?: boolean }
    limit?: number
    single?: boolean
  },
  deps: unknown[] = []
) {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      let query = supabase.from(table).select(options?.columns || '*')

      if (options?.filters) {
        for (const [key, value] of Object.entries(options.filters)) {
          if (value !== undefined && value !== null) {
            query = query.eq(key, value)
          }
        }
      }

      if (options?.order) {
        query = query.order(options.order.column, {
          ascending: options.order.ascending ?? false,
        })
      }

      if (options?.limit) {
        query = query.limit(options.limit)
      }

      if (options?.single) {
        const { data: result, error: err } = await query.single()
        if (err) throw err
        setData(result as T)
      } else {
        const { data: result, error: err } = await query
        if (err) throw err
        setData(result as T)
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Request failed'
      setError(msg)
    } finally {
      setLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [table, JSON.stringify(options), ...deps])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return { data, loading, error, refetch: fetchData }
}

export function useSupabaseInsert(table: string) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const insert = async (row: Record<string, unknown>) => {
    setLoading(true)
    setError(null)
    const { data, error: err } = await supabase.from(table).insert(row).select().single()
    setLoading(false)
    if (err) {
      setError(err.message)
      throw err
    }
    return data
  }

  return { insert, loading, error }
}

export function useSupabaseUpdate(table: string) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const update = async (filters: Record<string, unknown>, updates: Record<string, unknown>) => {
    setLoading(true)
    setError(null)
    let query = supabase.from(table).update(updates)
    for (const [key, value] of Object.entries(filters)) {
      query = query.eq(key, value as string)
    }
    const { data, error: err } = await query.select()
    setLoading(false)
    if (err) {
      setError(err.message)
      throw err
    }
    return data
  }

  return { update, loading, error }
}

export function useRealtime<T>(
  table: string,
  options?: {
    filter?: string
    event?: 'INSERT' | 'UPDATE' | 'DELETE' | '*'
  },
  onData?: (data: T) => void
) {
  const [data, setData] = useState<T | null>(null)
  const [connected, setConnected] = useState(false)
  const channelRef = useRef<RealtimeChannel | null>(null)

  useEffect(() => {
    const channel = supabase
      .channel(`${table}-realtime`)
      .on(
        'postgres_changes',
        {
          event: options?.event || '*',
          schema: 'public',
          table,
          filter: options?.filter,
        },
        (payload) => {
          const newData = payload.new as T
          setData(newData)
          onData?.(newData)
        }
      )
      .subscribe((status) => {
        setConnected(status === 'SUBSCRIBED')
      })

    channelRef.current = channel

    return () => {
      channel.unsubscribe()
      channelRef.current = null
    }
  }, [table])

  return { data, connected }
}

export function useWebSocket(url: string | null, onMessage?: (data: Record<string, unknown>) => void) {
  const wsRef = useRef<WebSocket | null>(null)
  const [connected, setConnected] = useState(false)

  useEffect(() => {
    if (!url) return
    const token = localStorage.getItem('access_token')
    const wsUrl = `${url}${url.includes('?') ? '&' : '?'}token=${token}`
    const ws = new WebSocket(wsUrl)
    wsRef.current = ws

    ws.onopen = () => setConnected(true)
    ws.onclose = () => setConnected(false)
    ws.onerror = () => setConnected(false)
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        onMessage?.(data)
      } catch {}
    }

    return () => {
      ws.close()
      wsRef.current = null
    }
  }, [url])

  const send = useCallback((data: Record<string, unknown>) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(data))
    }
  }, [])

  return { connected, send }
}
