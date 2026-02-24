import { useState, useMemo, useCallback, useEffect } from 'react'
import { getStateAbbr, getStateDisplayLabel } from './widgets/ContractMapWidget'

const PREDEFINED_KEYWORDS = ['IT', 'AI', 'Data Analytics', 'House Keeping', 'Cybersecurity', 'Facilities']
const BASE_TYPE_VALUES = ['Solicitation', 'Presolicitation', 'Sources Sought']
const FAVORITES_STORAGE_KEY = 'nm2-opportunity-favorites'

const idFromRow = (row) =>
  String(row?.noticeId || row?.uiLink || `${row?.title || ''}-${row?.solicitationNumber || ''}`)

export default function MatchingOpportunitiesPanel({
  filteredData,
  columns = [],
  chartFilter,
  onChartFilter,
  selectedCategorical,
  categoricalColumns = [],
  initialOpportunityKeyword = '',
  initialOpportunityDateRangeDays = 30,
  initialOpportunityViewFilter = 'all',
  initialOpportunityFavorites = [],
  initialOpportunityFavoriteRows = [],
  sharedSnapshot = false,
}) {
  const defaultDays = sharedSnapshot ? 364 : 30
  const [opportunityKeyword, setOpportunityKeyword] = useState(initialOpportunityKeyword)
  const [opportunityDateRangeDays, setOpportunityDateRangeDays] = useState(
    initialOpportunityDateRangeDays || defaultDays
  )
  const [opportunityViewFilter, setOpportunityViewFilter] = useState(initialOpportunityViewFilter)
  const [opportunityFavorites, setOpportunityFavorites] = useState(() => {
    try {
      const raw = localStorage.getItem(FAVORITES_STORAGE_KEY)
      const fromPayload = Array.isArray(initialOpportunityFavorites)
        ? initialOpportunityFavorites
        : initialOpportunityFavorites
          ? Array.from(initialOpportunityFavorites)
          : []
      const fromPayloadRows = Array.isArray(initialOpportunityFavoriteRows) ? initialOpportunityFavoriteRows : []
      const payloadIds = new Set(fromPayload.length ? fromPayload : fromPayloadRows.map(idFromRow))
      if (!raw) return new Set(payloadIds)
      const data = JSON.parse(raw)
      const storedIds = Array.isArray(data?.ids) ? data.ids : []
      const storedRows = Array.isArray(data?.rows) ? data.rows : []
      const merged = new Set(payloadIds)
      storedIds.forEach((id) => merged.add(id))
      storedRows.forEach((r) => merged.add(idFromRow(r)))
      return merged
    } catch {
      return new Set(
        Array.isArray(initialOpportunityFavorites) ? initialOpportunityFavorites : initialOpportunityFavoriteRows?.map(idFromRow) || []
      )
    }
  })
  const [opportunityFavoriteRows, setOpportunityFavoriteRows] = useState(() => {
    try {
      const raw = localStorage.getItem(FAVORITES_STORAGE_KEY)
      const fromPayload = Array.isArray(initialOpportunityFavoriteRows)
        ? initialOpportunityFavoriteRows.map((r) => ({ ...r }))
        : []
      if (!raw) return fromPayload
      const data = JSON.parse(raw)
      const stored = Array.isArray(data?.rows) ? data.rows.map((r) => ({ ...r })) : []
      const seen = new Set(fromPayload.map(idFromRow))
      const merged = [...fromPayload]
      stored.forEach((r) => {
        if (!seen.has(idFromRow(r))) {
          seen.add(idFromRow(r))
          merged.push(r)
        }
      })
      return merged
    } catch {
      return Array.isArray(initialOpportunityFavoriteRows)
        ? initialOpportunityFavoriteRows.map((r) => ({ ...r }))
        : []
    }
  })
  const [selectedOpportunityOrg, setSelectedOpportunityOrg] = useState('')

  useEffect(() => {
    try {
      localStorage.setItem(
        FAVORITES_STORAGE_KEY,
        JSON.stringify({ ids: [...opportunityFavorites], rows: opportunityFavoriteRows })
      )
    } catch {
      // ignore
    }
  }, [opportunityFavorites, opportunityFavoriteRows])

  const isOpportunityDataset = useMemo(() => {
    const colSet = new Set((columns || []).map((c) => String(c)))
    return colSet.has('noticeId') && colSet.has('title') && colSet.has('uiLink')
  }, [columns])

  const getOpportunityNoticeType = useCallback((row) => {
    const rawType = String(row?.baseType || row?.type || '').trim()
    const t = rawType.toLowerCase()
    if (t.includes('sources sought') || t.includes('source sought')) return 'Sources Sought'
    if (t.includes('presolicitation') || t.includes('pre-solicitation')) return 'Presolicitation'
    if (t.includes('solicitation')) return 'Solicitation'
    return rawType || 'Unknown'
  }, [])

  const getOpportunityId = useCallback((row) => idFromRow(row), [])

  const selectedOpportunityNoticeType =
    chartFilter?.type === 'category' && BASE_TYPE_VALUES.includes(String(chartFilter?.value))
      ? String(chartFilter.value)
      : null

  const allOpportunityRows = useMemo(() => {
    if (!isOpportunityDataset) return []
    const rows = Array.isArray(filteredData) ? filteredData : []
    if (!rows.length) return []
    const seen = new Set()
    const out = []
    for (const row of rows) {
      if (!row) continue
      const key = getOpportunityId(row)
      if (seen.has(key)) continue
      seen.add(key)
      out.push(row)
    }
    return out
  }, [filteredData, isOpportunityDataset, getOpportunityId])

  const dateFilteredOpportunityRows = useMemo(() => {
    if (!isOpportunityDataset || allOpportunityRows.length === 0) return allOpportunityRows
    const days = Math.min(Math.max(Number(opportunityDateRangeDays) || defaultDays, 1), 364)
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - days)
    const postedKey =
      columns?.find(
        (c) => String(c).toLowerCase() === 'posteddate' || String(c).toLowerCase() === 'posted_date'
      ) || 'postedDate'
    return allOpportunityRows.filter((row) => {
      const d = row?.[postedKey]
      if (!d) return true
      const date = new Date(d)
      return !Number.isNaN(date.getTime()) && date >= cutoff
    })
  }, [isOpportunityDataset, allOpportunityRows, opportunityDateRangeDays, columns, defaultDays])

  const stateCol = columns?.find((c) => String(c).toLowerCase() === 'state')
  const isStateFilterActive = !!(
    chartFilter?.type === 'category' &&
    chartFilter?.value &&
    String(chartFilter.value).length === 2 &&
    stateCol &&
    getStateAbbr(chartFilter.value) === chartFilter.value
  )
  const rowLimit = isStateFilterActive ? 200 : 20

  const opportunityRows = useMemo(() => {
    const q = String(opportunityKeyword || '').trim().toLowerCase()
    const sourceRows = Array.isArray(dateFilteredOpportunityRows) ? dateFilteredOpportunityRows : []

    const normalize = (s) =>
      String(s || '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, ' ')
        .trim()
    const matchTerm = (term, haystack, tokenSet) => {
      const t = normalize(term)
      if (!t) return false
      if (t.length <= 3 && !t.includes(' ')) return tokenSet.has(t)
      return haystack.includes(t)
    }
    const domainProfiles = {
      it: {
        phrases: [
          'information technology', 'it services', 'it support', 'software development',
          'application development', 'systems integration', 'network operations', 'cloud migration',
        ],
        naicsPrefixes: ['518', '519', '541511', '541512', '541513', '541519'],
        pscPrefixes: ['D3', '7A'],
      },
      ai: {
        phrases: [
          'artificial intelligence', 'machine learning', 'generative ai', 'large language model',
          'llm', 'nlp', 'natural language processing', 'computer vision', 'neural network',
        ],
        requirePhrase: true,
      },
      'data analytics': {
        phrases: [
          'data analytics', 'analytics', 'business intelligence', 'bi dashboard', 'dashboarding',
          'data visualization', 'reporting', 'etl', 'data engineering', 'data science',
          'predictive analytics', 'decision support',
        ],
        requirePhrase: true,
      },
      cybersecurity: {
        phrases: [
          'cybersecurity', 'cyber security', 'zero trust', 'incident response', 'threat hunting',
          'vulnerability assessment', 'penetration testing', 'security operations center', 'soc',
        ],
        naicsPrefixes: ['541512', '541519'],
        pscPrefixes: ['D310', 'D311', 'D312'],
      },
    }
    const synonymMap = {
      'house keeping': ['house keeping', 'housekeeping', 'janitorial', 'custodial', 'cleaning services'],
      facilities: ['facilities', 'facility', 'building maintenance', 'operations support'],
      software: ['software', 'application', 'platform', 'development', 'engineering'],
    }
    const expandedTerms = !q
      ? []
      : Array.from(
          new Set([
            ...q.split(/\s+/).filter(Boolean),
            ...(synonymMap[q] || []).map(normalize).filter(Boolean),
          ])
        )

    const filtered = !q
      ? sourceRows.map((row) => ({ ...row, _matchReason: '' }))
      : sourceRows
          .map((row) => {
            const haystackRaw = [
              row?.title,
              row?.solicitationNumber,
              row?.organization,
              row?.setAside,
              row?.type,
              row?.baseType,
              row?.noticeId,
              row?.naicsCode,
              row?.classificationCode,
              row?.description,
            ]
              .filter((v) => v != null)
              .map((v) => String(v))
              .join(' ')
            const haystack = normalize(haystackRaw)
            if (!haystack) return null
            const tokenSet = new Set(haystack.split(/\s+/).filter(Boolean))
            const qNorm = normalize(q)
            const profile = domainProfiles[qNorm]
            if (profile) {
              const naics = String(row?.naicsCode || '').replace(/\D+/g, '')
              const psc = String(row?.classificationCode || '').toUpperCase().replace(/[^A-Z0-9]/g, '')
              const matchedPhrase = (profile.phrases || []).find((term) => matchTerm(term, haystack, tokenSet))
              if (profile.requirePhrase) {
                if (!matchedPhrase) return null
                return { ...row, _matchReason: `Matched phrase: ${matchedPhrase}` }
              }
              const naicsHit = (profile.naicsPrefixes || []).find((p) => naics.startsWith(p))
              const pscHit = (profile.pscPrefixes || []).find((p) => psc.startsWith(p))
              const reason =
                (matchedPhrase && `Matched phrase: ${matchedPhrase}`) ||
                (naicsHit && `Matched NAICS: ${naics}`) ||
                (pscHit && `Matched classification: ${psc}`) ||
                ''
              if (!reason) return null
              return { ...row, _matchReason: reason }
            }
            const genericMatch = expandedTerms.find((term) => matchTerm(term, haystack, tokenSet))
            if (!genericMatch) return null
            return { ...row, _matchReason: `Matched keyword: ${genericMatch}` }
          })
          .filter(Boolean)
    return filtered.slice(0, rowLimit)
  }, [dateFilteredOpportunityRows, opportunityKeyword, rowLimit])

  const opportunityByOrganization = useMemo(() => {
    if (!selectedOpportunityNoticeType || !isOpportunityDataset) return []
    const typeFiltered = opportunityRows.filter(
      (row) => getOpportunityNoticeType(row) === selectedOpportunityNoticeType
    )
    const byOrg = new Map()
    for (const row of typeFiltered) {
      const org = String(row?.organization || '').trim() || 'Unknown organization'
      if (!byOrg.has(org)) byOrg.set(org, [])
      byOrg.get(org).push(row)
    }
    return Array.from(byOrg.entries())
      .map(([organization, rows]) => ({ organization, count: rows.length, rows }))
      .sort((a, b) => b.count - a.count)
  }, [selectedOpportunityNoticeType, isOpportunityDataset, opportunityRows, getOpportunityNoticeType])

  const toggleOpportunityFavorite = useCallback(
    (row) => {
      const id = getOpportunityId(row)
      setOpportunityFavorites((prev) => {
        const next = new Set(prev)
        if (next.has(id)) next.delete(id)
        else next.add(id)
        return next
      })
      setOpportunityFavoriteRows((prev) => {
        const has = prev.some((r) => getOpportunityId(r) === id)
        if (has) return prev.filter((r) => getOpportunityId(r) !== id)
        return [...prev, { ...row }]
      })
    },
    [getOpportunityId]
  )

  const isOpportunityFavorite = useCallback(
    (row) => opportunityFavorites.has(getOpportunityId(row)),
    [opportunityFavorites, getOpportunityId]
  )

  const getOpportunityNoticeTypeClass = useCallback((label) => {
    const l = String(label || '').toLowerCase()
    if (l === 'solicitation') return 'bg-blue-100 text-blue-800 border border-blue-200'
    if (l === 'presolicitation') return 'bg-purple-100 text-purple-800 border border-purple-200'
    if (l === 'sources sought') return 'bg-amber-100 text-amber-800 border border-amber-200'
    return 'bg-gray-100 text-gray-700 border border-gray-200'
  }, [])

  if (!isOpportunityDataset || allOpportunityRows.length === 0) return null

  const showKeywordTypeCounts = !!opportunityKeyword
  const noticeTypeCounts = opportunityRows.reduce(
    (acc, row) => {
      const type = getOpportunityNoticeType(row)
      if (type === 'Solicitation') acc.solicitation += 1
      else if (type === 'Presolicitation') acc.presolicitation += 1
      else if (type === 'Sources Sought') acc.sourcesSought += 1
      return acc
    },
    { solicitation: 0, presolicitation: 0, sourcesSought: 0 }
  )

  let visibleOpportunityRows
  if (opportunityViewFilter === 'favorites') {
    const savedIds = new Set(opportunityFavoriteRows.map((r) => getOpportunityId(r)))
    const fromCurrent = (Array.isArray(allOpportunityRows) ? allOpportunityRows : []).filter(
      (row) => opportunityFavorites.has(getOpportunityId(row)) && !savedIds.has(getOpportunityId(row))
    )
    visibleOpportunityRows = [...opportunityFavoriteRows, ...fromCurrent]
    const postedKey =
      columns?.find(
        (c) => String(c).toLowerCase() === 'posteddate' || String(c).toLowerCase() === 'posted_date'
      ) || 'postedDate'
    visibleOpportunityRows.sort((a, b) => {
      const da = a?.[postedKey] ? new Date(a[postedKey]).getTime() : 0
      const db = b?.[postedKey] ? new Date(b[postedKey]).getTime() : 0
      return db - da
    })
  } else {
    visibleOpportunityRows = selectedOpportunityNoticeType
      ? opportunityRows.filter((row) => getOpportunityNoticeType(row) === selectedOpportunityNoticeType)
      : opportunityRows
    if (selectedOpportunityOrg) {
      visibleOpportunityRows = visibleOpportunityRows.filter(
        (row) => (String(row?.organization || '').trim() || 'Unknown organization') === selectedOpportunityOrg
      )
    }
  }

  const stateLabel = chartFilter?.value || ''

  const setBaseTypeFilter = (value) => {
    onChartFilter(value ? { type: 'category', value } : null)
    setSelectedOpportunityOrg('')
  }

  return (
    <div className="mb-6 bg-white rounded-lg border border-gray-200 shadow-sm">
      <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between flex-wrap gap-3">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Matching Opportunities</h3>
          <p className="text-sm text-gray-600">
            Showing{' '}
            {opportunityViewFilter === 'favorites'
              ? `${visibleOpportunityRows.length} favorites`
              : `${visibleOpportunityRows.length} of ${allOpportunityRows.length} filtered opportunities`}
            {chartFilter?.type === 'category' &&
            chartFilter?.value &&
            String(chartFilter.value).length === 2
              ? ` in ${getStateDisplayLabel(chartFilter.value)}`
              : ''}
            {opportunityKeyword ? ' • API keyword matches: 0' : ''}
            {selectedOpportunityNoticeType ? ` • Base type: ${selectedOpportunityNoticeType}` : ''}
            {selectedOpportunityOrg ? ` • Org: ${selectedOpportunityOrg}` : ''}
          </p>
          {showKeywordTypeCounts && (
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
              <button
                type="button"
                onClick={() => setBaseTypeFilter(selectedOpportunityNoticeType === 'Solicitation' ? '' : 'Solicitation')}
                className={`px-2 py-0.5 rounded-full border ${
                  selectedOpportunityNoticeType === 'Solicitation'
                    ? 'bg-blue-600 text-white border-blue-700'
                    : 'bg-blue-100 text-blue-800 border-blue-200'
                }`}
              >
                Solicitation: {noticeTypeCounts.solicitation}
              </button>
              <button
                type="button"
                onClick={() =>
                  setBaseTypeFilter(selectedOpportunityNoticeType === 'Presolicitation' ? '' : 'Presolicitation')
                }
                className={`px-2 py-0.5 rounded-full border ${
                  selectedOpportunityNoticeType === 'Presolicitation'
                    ? 'bg-purple-600 text-white border-purple-700'
                    : 'bg-purple-100 text-purple-800 border-purple-200'
                }`}
              >
                Presolicitation: {noticeTypeCounts.presolicitation}
              </button>
              <button
                type="button"
                onClick={() =>
                  setBaseTypeFilter(selectedOpportunityNoticeType === 'Sources Sought' ? '' : 'Sources Sought')
                }
                className={`px-2 py-0.5 rounded-full border ${
                  selectedOpportunityNoticeType === 'Sources Sought'
                    ? 'bg-amber-600 text-white border-amber-700'
                    : 'bg-amber-100 text-amber-800 border-amber-200'
                }`}
              >
                Sources Sought: {noticeTypeCounts.sourcesSought}
              </button>
              {selectedOpportunityNoticeType && (
                <button
                  type="button"
                  onClick={() => {
                    onChartFilter(null)
                    setSelectedOpportunityOrg('')
                  }}
                  className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 border border-gray-300"
                >
                  Clear base type filter
                </button>
              )}
            </div>
          )}
          {selectedOpportunityNoticeType && opportunityByOrganization.length > 0 && (
            <div className="mt-3 pt-3 border-t border-gray-100">
              <h4 className="text-xs font-semibold text-gray-700 mb-2">By agency / organization</h4>
              <div className="flex flex-wrap gap-2">
                {selectedOpportunityOrg && (
                  <button
                    type="button"
                    onClick={() => setSelectedOpportunityOrg('')}
                    className="px-2 py-0.5 text-xs rounded-full bg-gray-200 text-gray-700 hover:bg-gray-300"
                  >
                    Clear org filter
                  </button>
                )}
                {opportunityByOrganization.slice(0, 20).map(({ organization, count }) => {
                  const isSelected = selectedOpportunityOrg === organization
                  const maxCount = Math.max(...opportunityByOrganization.map((o) => o.count), 1)
                  const pct = Math.max(8, Math.round((count / maxCount) * 100))
                  return (
                    <button
                      key={organization}
                      type="button"
                      onClick={() => setSelectedOpportunityOrg(isSelected ? '' : organization)}
                      className={`text-left px-2.5 py-1.5 rounded-lg border text-xs transition-colors ${
                        isSelected
                          ? 'bg-blue-600 text-white border-blue-700'
                          : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                      }`}
                      title={`${count} ${selectedOpportunityNoticeType}(s)`}
                    >
                      <span className="font-medium block truncate max-w-[200px]" title={organization}>
                        {organization}
                      </span>
                      <span className="text-[10px] opacity-90">{count} opportunities</span>
                      <div className="mt-1 h-1 w-full rounded bg-gray-200 overflow-hidden">
                        <div
                          className={`h-1 rounded ${isSelected ? 'bg-white' : 'bg-blue-500'}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </button>
                  )
                })}
              </div>
              {opportunityByOrganization.length > 20 && (
                <p className="text-[10px] text-gray-500 mt-1">
                  Showing top 20 of {opportunityByOrganization.length} organizations.
                </p>
              )}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex rounded-lg border border-gray-200 p-0.5 bg-gray-50">
            <button
              type="button"
              onClick={() => setOpportunityViewFilter('all')}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                opportunityViewFilter === 'all' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              All
            </button>
            <button
              type="button"
              onClick={() => setOpportunityViewFilter('favorites')}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors flex items-center gap-1 ${
                opportunityViewFilter === 'favorites'
                  ? 'bg-white text-amber-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <span aria-hidden>★</span> Favorites{' '}
              {opportunityFavorites.size > 0 ? `(${opportunityFavorites.size})` : ''}
            </button>
          </div>
          {chartFilter ? (
            <span className="text-xs px-2.5 py-1 rounded-full bg-blue-100 text-blue-800 font-medium">
              {chartFilter.type === 'category'
                ? (() => {
                    const isStateF =
                      stateCol &&
                      chartFilter.value &&
                      String(chartFilter.value).length === 2 &&
                      getStateAbbr(chartFilter.value) === chartFilter.value
                    return `${chartFilter.dimension || stateCol || 'Filter'}: ${
                      isStateF ? getStateDisplayLabel(chartFilter.value) : chartFilter.value
                    }`
                  })()
                : 'Date filter applied'}
            </span>
          ) : (
            <span className="text-xs px-2.5 py-1 rounded-full bg-gray-100 text-gray-700 font-medium">
              All filtered opportunities
            </span>
          )}
        </div>
      </div>
      <div className="px-5 py-3 border-b border-gray-100 bg-gray-50/60">
        <div className="flex items-center gap-3 mb-3">
          <label className="text-xs font-medium text-gray-600 whitespace-nowrap">Posted in</label>
          <select
            value={opportunityDateRangeDays}
            onChange={(e) => setOpportunityDateRangeDays(Number(e.target.value))}
            className="px-2.5 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
          >
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
            <option value={364}>Last year</option>
          </select>
        </div>
        <label className="block text-xs font-medium text-gray-600 mb-1">
          {isStateFilterActive ? 'Drill down by keyword' : 'Keyword Search'}
        </label>
        <input
          type="text"
          value={opportunityKeyword}
          onChange={(e) => setOpportunityKeyword(e.target.value)}
          placeholder={
            isStateFilterActive
              ? `Search within ${stateLabel} (title, org, solicitation…)`
              : 'Search title, solicitation, organization...'
          }
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <div className="mt-2 flex flex-wrap gap-2">
          {PREDEFINED_KEYWORDS.map((kw) => {
            const active = opportunityKeyword.toLowerCase() === kw.toLowerCase()
            return (
              <button
                key={kw}
                type="button"
                onClick={() => setOpportunityKeyword(active ? '' : kw)}
                className={`px-2.5 py-1 text-xs rounded-full border transition-colors ${
                  active
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }`}
              >
                {kw}
              </button>
            )
          })}
        </div>
      </div>
      <div className="divide-y divide-gray-100 max-h-[420px] overflow-y-auto">
        {visibleOpportunityRows.length === 0 ? (
          <div className="px-5 py-8 text-sm text-gray-600">
            {opportunityViewFilter === 'favorites'
              ? 'No favorites yet. Click the star on any opportunity to add it here.'
              : 'No opportunities match this keyword/type in the current filtered set.'}
          </div>
        ) : (
          visibleOpportunityRows.map((row, idx) => (
            <div key={String(row.noticeId || row.uiLink || idx)} className="px-5 py-4">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-base font-semibold text-gray-900 break-words">
                    {row.title || 'Untitled Opportunity'}
                  </p>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-gray-600">
                    <span
                      className={`px-2 py-0.5 rounded-full font-medium ${getOpportunityNoticeTypeClass(
                        getOpportunityNoticeType(row)
                      )}`}
                    >
                      {getOpportunityNoticeType(row)}
                    </span>
                    {row.solicitationNumber && (
                      <span className="px-2 py-0.5 rounded bg-gray-100 text-gray-700">
                        Solicitation: {row.solicitationNumber}
                      </span>
                    )}
                    {row.state && (
                      <span>
                        State: {getStateDisplayLabel(row.state)}
                      </span>
                    )}
                    {opportunityKeyword && row._matchReason && (
                      <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-100">
                        {row._matchReason}
                      </span>
                    )}
                  </div>
                  <div className="mt-2 text-sm text-gray-600 space-y-1">
                    {row.organization && (
                      <p className="break-words">Organization: {row.organization}</p>
                    )}
                    <p>
                      Posted: {row.postedDate || 'N/A'}
                      {row.responseDeadLine ? ` • Due: ${row.responseDeadLine}` : ''}
                    </p>
                  </div>
                </div>
                <div className="shrink-0 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => toggleOpportunityFavorite(row)}
                    className={`p-1.5 rounded-lg border transition-colors ${
                      isOpportunityFavorite(row)
                        ? 'bg-amber-50 border-amber-300 text-amber-600 hover:bg-amber-100'
                        : 'bg-gray-50 border-gray-200 text-gray-400 hover:border-amber-200 hover:text-amber-500'
                    }`}
                    title={isOpportunityFavorite(row) ? 'Remove from favorites' : 'Add to favorites'}
                    aria-label={isOpportunityFavorite(row) ? 'Remove from favorites' : 'Add to favorites'}
                  >
                    <span className="text-lg leading-none">
                      {isOpportunityFavorite(row) ? '★' : '☆'}
                    </span>
                  </button>
                  {row.uiLink && (
                    <a
                      href={row.uiLink}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center px-3 py-1.5 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                    >
                      Open
                    </a>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
