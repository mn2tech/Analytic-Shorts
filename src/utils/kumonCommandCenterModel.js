const STATUS_COLORS = {
  'On Track': 'green',
  Struggling: 'yellow',
  'Needs Help': 'red',
  Completed: 'blue',
}

const STATUS_HEX = {
  green: '#22c55e',
  yellow: '#f59e0b',
  red: '#ef4444',
  blue: '#3b82f6',
  gray: '#64748b',
}

function toNumber(value, fallback = 0) {
  const n = Number(value)
  return Number.isFinite(n) ? n : fallback
}

function normalizeKey(value) {
  return String(value || '').trim().toLowerCase()
}

function getField(row, names, fallback = '') {
  if (!row || typeof row !== 'object') return fallback
  const keys = Object.keys(row)
  for (const name of names) {
    const exact = keys.find((k) => k === name)
    if (exact) return row[exact]
    const lower = keys.find((k) => normalizeKey(k) === normalizeKey(name))
    if (lower) return row[lower]
  }
  return fallback
}

function getStatusColor(status) {
  return STATUS_COLORS[status] || 'gray'
}

function inferZone(subject) {
  const normalized = normalizeKey(subject)
  return normalized.includes('read') ? 'Reading' : 'Math'
}

export function buildKumonUnifiedRows({ students = [], sessions = [], seatmap = [], alerts = [] }) {
  const studentsById = new Map(
    (students || []).map((row) => [String(getField(row, ['student_id', 'id'])), row])
  )
  const seatsById = new Map(
    (seatmap || []).map((row) => [String(getField(row, ['seat_id', 'id'])), row])
  )
  const alertsByStudent = new Map()
  for (const alert of alerts || []) {
    const sid = String(getField(alert, ['student_id', 'id']))
    if (!alertsByStudent.has(sid)) alertsByStudent.set(sid, [])
    alertsByStudent.get(sid).push(alert)
  }

  return (sessions || []).map((session, index) => {
    const studentId = String(getField(session, ['student_id', 'id']))
    const seatId = String(getField(session, ['seat_id']))
    const student = studentsById.get(studentId) || {}
    const seat = seatsById.get(seatId) || {}

    const status = String(getField(session, ['status'], getField(student, ['status'], 'On Track')))
    const actualTime = toNumber(getField(session, ['actual_time_min'], 0))
    const targetTime = toNumber(getField(session, ['target_time_min'], 0))
    const accuracy = toNumber(getField(session, ['accuracy'], 0))
    const helpWait = toNumber(getField(session, ['help_wait_min'], 0))
    const subject = String(getField(session, ['subject'], getField(student, ['subject'], 'Math')))
    const level = String(
      getField(session, ['current_level', 'level'], getField(student, ['current_level', 'level'], 'A'))
    )
    const instructor = String(
      getField(session, ['instructor'], getField(student, ['instructor'], 'Unassigned'))
    )

    const ruleAlerts = []
    if (helpWait > 5) ruleAlerts.push('Instructor Delay')
    if (accuracy < 80) ruleAlerts.push('Low Accuracy')
    if (actualTime > targetTime) ruleAlerts.push('Slow Progress')

    const importedReasons = (alertsByStudent.get(studentId) || []).map((a) =>
      String(getField(a, ['alert_reason', 'reason', 'type'], '')).trim()
    ).filter(Boolean)

    const alertReasons = [...new Set([...ruleAlerts, ...importedReasons])]
    const alertFlag = actualTime > targetTime || accuracy < 85 || helpWait > 5

    const statusColor = getStatusColor(status)
    const x = toNumber(getField(seat, ['x'], (index % 8) * 80 + 80))
    const y = toNumber(getField(seat, ['y'], Math.floor(index / 8) * 90 + 80))

    const priorityScore = (helpWait * 2) + Math.max(0, 90 - accuracy) + Math.max(0, actualTime - targetTime)
    const critical = helpWait > 8 || accuracy < 75 || (actualTime - targetTime) > 10

    return {
      id: `${studentId}-${seatId || index}`,
      student_id: studentId,
      seat_id: seatId || `seat-${index + 1}`,
      student_name: String(getField(student, ['student_name', 'name'], `Student ${index + 1}`)),
      instructor,
      subject,
      zone: inferZone(subject),
      current_level: level,
      status,
      status_color: statusColor,
      status_hex: STATUS_HEX[statusColor] || STATUS_HEX.gray,
      actual_time_min: actualTime,
      target_time_min: targetTime,
      accuracy,
      help_wait_min: helpWait,
      x,
      y,
      alert_flag: alertFlag,
      alert_reasons: alertReasons,
      critical,
      priority_score: priorityScore,
      flashing: critical || alertReasons.length > 0,
    }
  })
}

export function applyDemoSurge(rows, enabled, phase = 0) {
  if (!enabled) return rows
  const safePhase = Math.max(0, Math.min(5, Number(phase) || 0))
  const progression = safePhase / 5
  const impacted = rows
    .map((row, idx) => ({ row, idx }))
    .filter(({ idx }) => (idx % 10) < 3) // deterministic 30%
  const activeImpactCount = Math.max(1, Math.floor(impacted.length * progression))
  const activeImpactSeatIds = new Set(
    impacted.slice(0, activeImpactCount).map(({ row }) => row.seat_id)
  )

  return rows.map((row, idx) => {
    const waitBump = safePhase // increase every 2 seconds over 10s timeline
    const isActiveImpacted = activeImpactSeatIds.has(row.seat_id)
    const accDropBase = (idx % 2 === 0) ? 9 : 5
    const nextAccuracy = isActiveImpacted
      ? Math.max(55, row.accuracy - Math.round(accDropBase * progression))
      : row.accuracy
    const nextWait = row.help_wait_min + waitBump
    const nextActual = row.actual_time_min + Math.round(((idx % 2 === 0) ? 6 : 3) * progression)
    const status = nextAccuracy < 75 ? 'Needs Help' : (nextAccuracy < 86 ? 'Struggling' : row.status)
    const statusColor = getStatusColor(status)
    const alertReasons = [...new Set([
      ...row.alert_reasons,
      nextWait > 5 ? 'Instructor Delay' : null,
      nextAccuracy < 80 ? 'Low Accuracy' : null,
      nextActual > row.target_time_min ? 'Slow Progress' : null,
    ].filter(Boolean))]
    return {
      ...row,
      help_wait_min: nextWait,
      accuracy: nextAccuracy,
      actual_time_min: nextActual,
      status,
      status_color: statusColor,
      status_hex: STATUS_HEX[statusColor] || STATUS_HEX.gray,
      alert_reasons: alertReasons,
      alert_flag: nextActual > row.target_time_min || nextAccuracy < 85 || nextWait > 5,
      critical: nextWait > 8 || nextAccuracy < 75 || (nextActual - row.target_time_min) > 10,
      flashing: true,
    }
  })
}

export function buildKpis(rows) {
  const total = rows.length || 1
  const onTrack = rows.filter((r) => r.status === 'On Track').length
  const struggling = rows.filter((r) => r.status === 'Struggling').length
  const waitingHelp = rows.filter((r) => r.help_wait_min > 5).length
  const avgTime = rows.reduce((sum, r) => sum + r.actual_time_min, 0) / total
  const avgAccuracy = rows.reduce((sum, r) => sum + r.accuracy, 0) / total
  return {
    total_students: rows.length,
    pct_on_track: (onTrack / total) * 100,
    pct_struggling: (struggling / total) * 100,
    avg_time_per_packet: avgTime,
    avg_accuracy: avgAccuracy,
    students_waiting_help: waitingHelp,
  }
}

export function buildTrends(rows) {
  const timeByLevelMap = new Map()
  const accuracyBySubjectMap = new Map()
  const statusMap = new Map()

  for (const row of rows) {
    const level = row.current_level || 'Unknown'
    if (!timeByLevelMap.has(level)) timeByLevelMap.set(level, { level, total: 0, count: 0 })
    const lv = timeByLevelMap.get(level)
    lv.total += row.actual_time_min
    lv.count += 1

    const subject = row.subject || 'Unknown'
    if (!accuracyBySubjectMap.has(subject)) accuracyBySubjectMap.set(subject, { subject, total: 0, count: 0 })
    const sb = accuracyBySubjectMap.get(subject)
    sb.total += row.accuracy
    sb.count += 1

    statusMap.set(row.status, (statusMap.get(row.status) || 0) + 1)
  }

  return {
    time_spent_by_level: Array.from(timeByLevelMap.values()).map((d) => ({
      level: d.level,
      avg_time: d.count ? d.total / d.count : 0,
    })),
    accuracy_by_subject: Array.from(accuracyBySubjectMap.values()).map((d) => ({
      subject: d.subject,
      avg_accuracy: d.count ? d.total / d.count : 0,
    })),
    students_by_status: Array.from(statusMap.entries()).map(([status, count]) => ({ status, count })),
  }
}

export function buildAlertQueue(rows) {
  const severityRank = {
    Critical: 3,
    Warning: 2,
    Info: 1,
  }

  return rows
    .filter((r) => r.alert_reasons.length > 0 || r.alert_flag)
    .map((r) => {
      const isCritical = r.accuracy < 80 || r.help_wait_min > 7
      const isWarning = r.accuracy < 85 || r.help_wait_min > 5
      const severity = isCritical ? 'Critical' : (isWarning ? 'Warning' : 'Info')
      const severityIcon = isCritical ? '🔴' : (isWarning ? '🟠' : '🟢')
      return {
        id: r.id,
        student_name: r.student_name,
        alert_reason: r.alert_reasons.join(', ') || 'At Risk',
        help_wait_min: r.help_wait_min,
        accuracy: r.accuracy,
        priority_score: r.priority_score,
        critical: isCritical,
        severity,
        severity_icon: severityIcon,
        severity_rank: severityRank[severity] || 1,
      }
    })
    .sort((a, b) => {
      if (b.severity_rank !== a.severity_rank) return b.severity_rank - a.severity_rank
      if ((b.help_wait_min || 0) !== (a.help_wait_min || 0)) return (b.help_wait_min || 0) - (a.help_wait_min || 0)
      return String(a.student_name || '').localeCompare(String(b.student_name || ''))
    })
}

export function buildDashboardSpec(rows) {
  return {
    title: 'Kumon Learning Command Center',
    filters: [
      { id: 'subject-filter', type: 'select', label: 'Subject', field: 'subject' },
      { id: 'instructor-filter', type: 'select', label: 'Instructor', field: 'instructor' },
      { id: 'level-filter', type: 'select', label: 'Level', field: 'current_level' },
    ],
    kpis: [
      { id: 'kpi-total-students', label: 'Total Students', field: 'student_id', aggregation: 'count' },
      { id: 'kpi-avg-accuracy', label: 'Average Accuracy', field: 'accuracy', aggregation: 'avg' },
      { id: 'kpi-avg-time', label: 'Avg Time per Packet', field: 'actual_time_min', aggregation: 'avg' },
      { id: 'kpi-help-queue', label: 'Students Waiting Help', field: 'help_wait_min', aggregation: 'count' },
    ],
    charts: [
      { id: 'trend-time-by-level', type: 'bar', title: 'Time Spent by Level', xField: 'current_level', yField: 'actual_time_min', aggregation: 'avg' },
      { id: 'trend-accuracy-by-subject', type: 'bar', title: 'Accuracy by Subject', xField: 'subject', yField: 'accuracy', aggregation: 'avg' },
      { id: 'trend-status', type: 'pie', title: 'Students by Status', dimension: 'status', metric: 'student_id', aggregation: 'count' },
      { id: 'table-alerts', type: 'table', title: 'Alerts Queue', columns: ['student_name', 'alert_reasons', 'help_wait_min', 'accuracy'], limit: 20 },
      { id: 'custom-seatmap', type: 'table', title: 'Seatmap Anchor', columns: ['seat_id', 'x', 'y', 'status_color'], limit: 200 },
    ],
    layout: [
      { type: 'row', items: ['filter-bar'] },
      { type: 'row', items: ['kpi-total-students', 'kpi-avg-accuracy', 'kpi-avg-time', 'kpi-help-queue'] },
      { type: 'row', items: ['custom-seatmap', 'trend-time-by-level', 'trend-accuracy-by-subject'] },
      { type: 'row', items: ['trend-status', 'table-alerts'] },
    ],
    style: { theme: 'dark' },
    warnings: [],
    custom: {
      seatmap_component: 'KumonSeatMapPanel',
      alert_table_component: 'KumonAlertQueuePanel',
      generated_for: rows.length,
    },
  }
}

export function buildFallbackKumonData() {
  const students = [
    { student_id: 'S-001', student_name: 'Ari Chen', subject: 'Math', current_level: 'C', instructor: 'Ms. Lee' },
    { student_id: 'S-002', student_name: 'Jules Park', subject: 'Reading', current_level: 'D', instructor: 'Mr. Mason' },
    { student_id: 'S-003', student_name: 'Noah Kim', subject: 'Math', current_level: 'C', instructor: 'Ms. Lee' },
    { student_id: 'S-004', student_name: 'Mila Ortiz', subject: 'Math', current_level: 'B', instructor: 'Ms. Lee' },
    { student_id: 'S-005', student_name: 'Zoe Young', subject: 'Reading', current_level: 'C', instructor: 'Mr. Mason' },
    { student_id: 'S-006', student_name: 'Luca James', subject: 'Math', current_level: 'E', instructor: 'Ms. Patel' },
    { student_id: 'S-007', student_name: 'Eli Carter', subject: 'Reading', current_level: 'B', instructor: 'Ms. Patel' },
    { student_id: 'S-008', student_name: 'Nia Brooks', subject: 'Math', current_level: 'C', instructor: 'Ms. Patel' },
  ]
  const sessions = [
    { student_id: 'S-001', seat_id: 'A1', status: 'Struggling', actual_time_min: 32, target_time_min: 25, accuracy: 81, help_wait_min: 6, subject: 'Math', current_level: 'C', instructor: 'Ms. Lee' },
    { student_id: 'S-002', seat_id: 'A2', status: 'On Track', actual_time_min: 22, target_time_min: 25, accuracy: 91, help_wait_min: 1, subject: 'Reading', current_level: 'D', instructor: 'Mr. Mason' },
    { student_id: 'S-003', seat_id: 'A3', status: 'Needs Help', actual_time_min: 36, target_time_min: 24, accuracy: 74, help_wait_min: 8, subject: 'Math', current_level: 'C', instructor: 'Ms. Lee' },
    { student_id: 'S-004', seat_id: 'B1', status: 'On Track', actual_time_min: 24, target_time_min: 24, accuracy: 88, help_wait_min: 2, subject: 'Math', current_level: 'B', instructor: 'Ms. Lee' },
    { student_id: 'S-005', seat_id: 'B2', status: 'Completed', actual_time_min: 20, target_time_min: 23, accuracy: 95, help_wait_min: 0, subject: 'Reading', current_level: 'C', instructor: 'Mr. Mason' },
    { student_id: 'S-006', seat_id: 'B3', status: 'Struggling', actual_time_min: 34, target_time_min: 27, accuracy: 79, help_wait_min: 5, subject: 'Math', current_level: 'E', instructor: 'Ms. Patel' },
    { student_id: 'S-007', seat_id: 'C1', status: 'On Track', actual_time_min: 23, target_time_min: 24, accuracy: 90, help_wait_min: 1, subject: 'Reading', current_level: 'B', instructor: 'Ms. Patel' },
    { student_id: 'S-008', seat_id: 'C2', status: 'Struggling', actual_time_min: 29, target_time_min: 24, accuracy: 83, help_wait_min: 4, subject: 'Math', current_level: 'C', instructor: 'Ms. Patel' },
  ]
  const seatmap = [
    { seat_id: 'A1', x: 80, y: 80 },
    { seat_id: 'A2', x: 190, y: 80 },
    { seat_id: 'A3', x: 300, y: 80 },
    { seat_id: 'B1', x: 80, y: 185 },
    { seat_id: 'B2', x: 190, y: 185 },
    { seat_id: 'B3', x: 300, y: 185 },
    { seat_id: 'C1', x: 80, y: 290 },
    { seat_id: 'C2', x: 190, y: 290 },
  ]
  const alerts = [
    { student_id: 'S-001', alert_reason: 'Instructor Delay' },
    { student_id: 'S-003', alert_reason: 'Low Accuracy' },
  ]
  return { students, sessions, seatmap, alerts }
}
