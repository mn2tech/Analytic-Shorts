import { useEffect, useMemo, useState } from 'react'

const COST_PER_INPATIENT_DAY = 1200
export const DEFAULT_OPERATIONAL_IMPACT_INPUTS = {
  patientsPerDay: 180,
  minutesSavedPerPatient: 10,
  dailyAdmissions: 25,
  extraMinutesSaved: 30,
}

export function calculateOperationalImpactRoi({
  patientsPerDay,
  minutesSavedPerPatient,
  dailyAdmissions,
  extraMinutesSaved,
}) {
  const generalTimeSavedMinutes = patientsPerDay * minutesSavedPerPatient
  const admitTimeSavedMinutes = dailyAdmissions * extraMinutesSaved
  const totalMinutesSavedPerDay = generalTimeSavedMinutes + admitTimeSavedMinutes
  const hoursSavedPerDay = totalMinutesSavedPerDay / 60
  const annualHoursSaved = hoursSavedPerDay * 365

  const admitHoursSavedPerDay = admitTimeSavedMinutes / 60
  const patientDaysSaved = admitHoursSavedPerDay / 24
  const dailyCostImpact = patientDaysSaved * COST_PER_INPATIENT_DAY
  const annualCostImpact = dailyCostImpact * 365

  return {
    generalTimeSavedMinutes,
    admitTimeSavedMinutes,
    totalMinutesSavedPerDay,
    hoursSavedPerDay,
    annualHoursSaved,
    annualCostImpact,
  }
}

function SliderRow({ label, min, max, value, onChange, step = 1 }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-slate-400">{label}</span>
        <span className="font-semibold text-white">{value}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-teal-500"
      />
    </div>
  )
}

export default function OperationalImpactROIPanel({
  initialValues = DEFAULT_OPERATIONAL_IMPACT_INPUTS,
  onMetricsChange,
}) {
  const [patientsPerDay, setPatientsPerDay] = useState(initialValues.patientsPerDay ?? DEFAULT_OPERATIONAL_IMPACT_INPUTS.patientsPerDay)
  const [minutesSavedPerPatient, setMinutesSavedPerPatient] = useState(initialValues.minutesSavedPerPatient ?? DEFAULT_OPERATIONAL_IMPACT_INPUTS.minutesSavedPerPatient)
  const [dailyAdmissions, setDailyAdmissions] = useState(initialValues.dailyAdmissions ?? DEFAULT_OPERATIONAL_IMPACT_INPUTS.dailyAdmissions)
  const [extraMinutesSaved, setExtraMinutesSaved] = useState(initialValues.extraMinutesSaved ?? DEFAULT_OPERATIONAL_IMPACT_INPUTS.extraMinutesSaved)

  const roi = useMemo(() => {
    return calculateOperationalImpactRoi({
      patientsPerDay,
      minutesSavedPerPatient,
      dailyAdmissions,
      extraMinutesSaved,
    })
  }, [patientsPerDay, minutesSavedPerPatient, dailyAdmissions, extraMinutesSaved])

  useEffect(() => {
    if (typeof onMetricsChange === 'function') {
      onMetricsChange({
        inputs: {
          patientsPerDay,
          minutesSavedPerPatient,
          dailyAdmissions,
          extraMinutesSaved,
        },
        roi,
      })
    }
  }, [onMetricsChange, patientsPerDay, minutesSavedPerPatient, dailyAdmissions, extraMinutesSaved, roi])

  return (
    <div className="rounded-xl border border-white/10 bg-slate-800/60 px-4 py-4 space-y-4">
      <div>
        <h3 className="text-xs font-bold text-slate-300 uppercase tracking-widest">
          Operational Impact & ROI (Demo)
        </h3>
      </div>

      <div className="space-y-3">
        <SliderRow
          label="Patients Per Day"
          min={100}
          max={300}
          value={patientsPerDay}
          onChange={setPatientsPerDay}
        />
        <SliderRow
          label="Minutes Saved Per Patient"
          min={5}
          max={20}
          value={minutesSavedPerPatient}
          onChange={setMinutesSavedPerPatient}
        />
        <SliderRow
          label="Daily Admissions"
          min={10}
          max={40}
          value={dailyAdmissions}
          onChange={setDailyAdmissions}
        />
        <SliderRow
          label="Extra Minutes Saved For Admitted Patients"
          min={15}
          max={60}
          value={extraMinutesSaved}
          onChange={setExtraMinutesSaved}
        />
      </div>

      <div className="space-y-2 pt-1 border-t border-white/10">
        <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2">
          <div className="text-xs text-emerald-300/90 font-semibold">⏱ Time Saved</div>
          <div className="text-sm text-white mt-1">
            <div>Minutes Saved / Day: <span className="font-bold">{Math.round(roi.totalMinutesSavedPerDay).toLocaleString()}</span></div>
            <div>Hours Saved / Day: <span className="font-bold text-emerald-300">{roi.hoursSavedPerDay.toFixed(1)}</span></div>
          </div>
        </div>

        <div className="rounded-lg border border-sky-500/30 bg-sky-500/10 px-3 py-2">
          <div className="text-xs text-sky-300/90 font-semibold">📊 Capacity Improvement</div>
          <div className="text-sm text-white mt-1">
            Annual Hours Saved: <span className="font-bold text-sky-300">{Math.round(roi.annualHoursSaved).toLocaleString()}</span>
          </div>
        </div>

        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2">
          <div className="text-xs text-amber-300/90 font-semibold">💰 Financial Impact</div>
          <div className="text-sm text-white mt-1">
            Estimated Annual Operational Value:{' '}
            <span className="font-bold text-amber-300">
              {roi.annualCostImpact.toLocaleString(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })}
            </span>
          </div>
        </div>
      </div>

      <p className="text-[11px] leading-snug text-slate-500 pt-1 border-t border-white/10">
        Demo estimate based on typical emergency department volumes. Actual impact varies by hospital operations.
      </p>
    </div>
  )
}

