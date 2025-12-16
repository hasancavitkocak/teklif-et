'use client'

import { useEffect, useState } from 'react'
import { 
  Play, 
  RefreshCw, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  Calendar,
  Database,
  Crown,
  FileText,
  Heart
} from 'lucide-react'

interface JobLog {
  id: string
  job_name: string
  job_type: string
  status: 'running' | 'success' | 'failed'
  started_at: string
  completed_at?: string
  duration_ms?: number
  affected_rows: number
  error_message?: string
  details?: any
  created_at: string
}

interface JobStats {
  total_runs: number
  success_rate: number
  avg_duration: number
  last_run?: string
}

export default function JobsPage() {
  const [logs, setLogs] = useState<JobLog[]>([])
  const [stats, setStats] = useState<Record<string, JobStats>>({})
  const [loading, setLoading] = useState(true)
  const [runningJobs, setRunningJobs] = useState<Set<string>>(new Set())
  const [filter, setFilter] = useState<'all' | 'success' | 'failed' | 'running'>('all')

  useEffect(() => {
    loadJobData()
    const interval = setInterval(loadJobData, 30000) // 30 saniyede bir yenile
    return () => clearInterval(interval)
  }, [])

  const loadJobData = async () => {
    try {
      const [logsResponse, statsResponse] = await Promise.all([
        fetch('/api/jobs/logs'),
        fetch('/api/jobs/stats')
      ])
      
      const logsData = await logsResponse.json()
      const statsData = await statsResponse.json()
      
      // API'den gelen veriyi kontrol et ve varsayılan değerler ata
      setLogs(Array.isArray(logsData) ? logsData : [])
      setStats(typeof statsData === 'object' && statsData !== null ? statsData : {})
    } catch (error) {
      console.error('Error loading job data:', error)
      // Hata durumunda boş değerler ata
      setLogs([])
      setStats({})
    } finally {
      setLoading(false)
    }
  }

  const runJob = async (jobName: string) => {
    setRunningJobs(prev => new Set(prev).add(jobName))
    
    try {
      const response = await fetch('/api/jobs/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobName })
      })
      
      const result = await response.json()
      
      if (result.success) {
        alert(`Job başarıyla çalıştırıldı: ${result.message}`)
      } else {
        alert(`Job hatası: ${result.error}`)
      }
      
      // Logları yenile
      await loadJobData()
    } catch (error) {
      console.error('Error running job:', error)
      alert('Job çalıştırılırken hata oluştu')
    } finally {
      setRunningJobs(prev => {
        const newSet = new Set(prev)
        newSet.delete(jobName)
        return newSet
      })
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-500" />
      case 'failed':
        return <XCircle className="w-5 h-5 text-red-500" />
      case 'running':
        return <RefreshCw className="w-5 h-5 text-blue-500 animate-spin" />
      default:
        return <AlertCircle className="w-5 h-5 text-gray-500" />
    }
  }

  const getJobIcon = (jobType: string) => {
    switch (jobType) {
      case 'daily_reset':
        return <Calendar className="w-5 h-5 text-blue-500" />
      case 'premium_check':
        return <Crown className="w-5 h-5 text-yellow-500" />
      case 'maintenance':
        return <Database className="w-5 h-5 text-gray-500" />
      case 'auto_reject':
        return <FileText className="w-5 h-5 text-red-500" />
      default:
        return <Clock className="w-5 h-5 text-gray-500" />
    }
  }

  const formatDuration = (ms?: number) => {
    if (!ms) return '-'
    if (ms < 1000) return `${ms}ms`
    return `${(ms / 1000).toFixed(2)}s`
  }

  const filteredLogs = logs.filter(log => {
    if (filter === 'all') return true
    return log.status === filter
  })

  const availableJobs = [
    {
      name: 'daily_proposal_reset',
      title: 'Günlük Teklif Sıfırlama',
      description: 'Tüm kullanıcıların günlük teklif sayılarını sıfırlar',
      type: 'daily_reset'
    },
    {
      name: 'daily_super_like_reset',
      title: 'Günlük Super Like Sıfırlama',
      description: 'Tüm kullanıcıların günlük super like sayılarını sıfırlar',
      type: 'daily_reset'
    },
    {
      name: 'premium_expire_check',
      title: 'Premium Abonelik Kontrolü',
      description: 'Süresi dolan premium abonelikleri kontrol eder ve pasif yapar',
      type: 'premium_check'
    }
  ]

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-48 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-32 bg-gray-200 rounded-xl"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-gray-900 mb-1">Job Yönetimi</h1>
        <p className="text-sm text-gray-500">Sistem job'larını yönetin ve loglarını görüntüleyin</p>
      </div>

      {/* Manuel Job Çalıştırma */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {availableJobs.map((job) => {
          const jobStats = stats[job.name]
          const isRunning = runningJobs.has(job.name)
          
          return (
            <div key={job.name} className="bg-white p-6 rounded-xl border border-gray-200">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  {getJobIcon(job.type)}
                  <div>
                    <h3 className="font-semibold text-gray-900">{job.title}</h3>
                    <p className="text-sm text-gray-500 mt-1">{job.description}</p>
                  </div>
                </div>
              </div>
              
              {jobStats && (
                <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                  <div>
                    <span className="text-gray-500">Toplam Çalışma:</span>
                    <div className="font-semibold">{jobStats.total_runs}</div>
                  </div>
                  <div>
                    <span className="text-gray-500">Başarı Oranı:</span>
                    <div className="font-semibold">{jobStats.success_rate.toFixed(1)}%</div>
                  </div>
                  <div>
                    <span className="text-gray-500">Ort. Süre:</span>
                    <div className="font-semibold">{formatDuration(jobStats.avg_duration)}</div>
                  </div>
                  <div>
                    <span className="text-gray-500">Son Çalışma:</span>
                    <div className="font-semibold text-xs">
                      {jobStats.last_run ? new Date(jobStats.last_run).toLocaleString('tr-TR') : 'Hiç'}
                    </div>
                  </div>
                </div>
              )}
              
              <button
                onClick={() => runJob(job.name)}
                disabled={isRunning}
                className={`w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                  isRunning
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                {isRunning ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Çalışıyor...
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4" />
                    Çalıştır
                  </>
                )}
              </button>
            </div>
          )
        })}
      </div>

      {/* Job Logları */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Job Logları</h2>
            <div className="flex items-center gap-4">
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value as any)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
              >
                <option value="all">Tümü</option>
                <option value="success">Başarılı</option>
                <option value="failed">Başarısız</option>
                <option value="running">Çalışıyor</option>
              </select>
              <button
                onClick={loadJobData}
                className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                Yenile
              </button>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Job</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Durum</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Başlangıç</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Süre</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Etkilenen</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Detay</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredLogs.map((log) => (
                <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      {getJobIcon(log.job_type)}
                      <div>
                        <div className="font-medium text-gray-900">{log.job_name}</div>
                        <div className="text-sm text-gray-500">{log.job_type}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(log.status)}
                      <span className={`text-sm font-medium ${
                        log.status === 'success' ? 'text-green-700' :
                        log.status === 'failed' ? 'text-red-700' :
                        log.status === 'running' ? 'text-blue-700' :
                        'text-gray-700'
                      }`}>
                        {log.status}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {new Date(log.started_at).toLocaleString('tr-TR')}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {formatDuration(log.duration_ms)}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {log.affected_rows.toLocaleString()}
                  </td>
                  <td className="px-6 py-4">
                    {log.error_message ? (
                      <div className="text-sm text-red-600 max-w-xs truncate" title={log.error_message}>
                        {log.error_message}
                      </div>
                    ) : log.details ? (
                      <div className="text-sm text-gray-600">
                        {JSON.stringify(log.details)}
                      </div>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {filteredLogs.length === 0 && (
            <div className="text-center py-12">
              <Clock className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">Henüz job logu bulunmuyor</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}