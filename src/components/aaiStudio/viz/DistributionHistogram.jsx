import DistributionBlockView from '../DistributionBlockView'

/**
 * Premium histogram wrapper. For now delegates to existing DistributionBlockView
 * which already uses theme vars and bar chart. Can add KDE smoothing later.
 */
export default function DistributionHistogram(props) {
  return <DistributionBlockView {...props} />
}
