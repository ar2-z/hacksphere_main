import { useState, useEffect, useCallback, useRef } from 'react'
import api from './api'

export function useFetch<T>(url: string | null, deps: unknown[] = []) {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    if (!url) { setLoading(false); return }
    try {
      setLoading(true)
      setError(null)
      const res = await api.get(url)
      const body = res.data
      if (body && typeof body === 'object' && Array.isArray(body.data) && 'total' in body) {
        setData(body.data as T)
      } else {
        setData(body as T)
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Request failed'
      setError(msg)
    } finally {
      setLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, ...deps])

  useEffect(() => { fetchData() }, [fetchData])
  return { data, loading, error, refetch: fetchData }
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

    return () => { ws.close(); wsRef.current = null }
  }, [url])

  const send = useCallback((data: Record<string, unknown>) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(data))
    }
  }, [])

  return { connected, send }
}
