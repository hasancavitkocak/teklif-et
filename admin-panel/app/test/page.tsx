'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function TestPage() {
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<any>(null)

  useEffect(() => {
    testConnection()
  }, [])

  const testConnection = async () => {
    try {
      console.log('Testing Supabase connection...')
      console.log('URL:', process.env.NEXT_PUBLIC_SUPABASE_URL)
      console.log('Anon Key exists:', !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
      
      // Test with anon key first
      const { data: anonData, error: anonError, count: anonCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact' })
        .limit(5)

      console.log('Anon result:', { count: anonCount, error: anonError })

      // Now test with service role via API route
      const response = await fetch('/api/test-supabase')
      const serviceResult = await response.json()

      if (anonError && serviceResult.error) {
        setError({ anon: anonError, service: serviceResult.error })
      } else {
        setResult({ 
          anonCount, 
          anonData,
          serviceCount: serviceResult.count,
          serviceData: serviceResult.data 
        })
      }
    } catch (err) {
      console.error('Connection error:', err)
      setError(err)
    }
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Supabase Connection Test</h1>
      
      <div className="bg-white p-6 rounded-lg shadow mb-4">
        <h2 className="font-bold mb-2">Environment Variables:</h2>
        <p>URL: {process.env.NEXT_PUBLIC_SUPABASE_URL || 'MISSING'}</p>
        <p>Anon Key: {process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'EXISTS' : 'MISSING'}</p>
      </div>

      {error && (
        <div className="bg-red-100 p-6 rounded-lg mb-4">
          <h2 className="font-bold text-red-800 mb-2">Error:</h2>
          <pre className="text-sm">{JSON.stringify(error, null, 2)}</pre>
        </div>
      )}

      {result && (
        <div className="bg-green-100 p-6 rounded-lg">
          <h2 className="font-bold text-green-800 mb-2">Success!</h2>
          <p className="mb-2">Total users: {result.count}</p>
          <pre className="text-sm">{JSON.stringify(result.data, null, 2)}</pre>
        </div>
      )}
    </div>
  )
}
