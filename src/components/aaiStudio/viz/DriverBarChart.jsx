import DriverBlockView from '../DriverBlockView'

/**
 * Premium driver bar chart. Delegates to DriverBlockView (already horizontal bars,
 * value labels, tooltip with Total/Share/Lift). Theme vars already applied.
 */
export default function DriverBarChart(props) {
  return <DriverBlockView {...props} />
}
