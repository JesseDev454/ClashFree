import type { GridEvent } from './types'

export type PositionedEvent = GridEvent & { lane: number; lanes: number }

/** Places overlapping events side by side, calendar-style. */
export function layoutDay(events: GridEvent[]): PositionedEvent[] {
  const sorted = [...events].sort((a, b) => a.start - b.start || b.duration - a.duration)
  const result: PositionedEvent[] = []
  let cluster: PositionedEvent[] = []
  let clusterEnd = -1
  let laneEnds: number[] = []

  const flush = () => {
    const lanes = laneEnds.length
    for (const item of cluster) {
      item.lanes = lanes
    }
    result.push(...cluster)
    cluster = []
    laneEnds = []
  }

  for (const event of sorted) {
    const end = event.start + event.duration
    if (cluster.length > 0 && event.start >= clusterEnd) {
      flush()
      clusterEnd = -1
    }
    let lane = laneEnds.findIndex((laneEnd) => laneEnd <= event.start)
    if (lane === -1) {
      lane = laneEnds.length
      laneEnds.push(end)
    } else {
      laneEnds[lane] = end
    }
    cluster.push({ ...event, lane, lanes: 1 })
    clusterEnd = Math.max(clusterEnd, end)
  }
  flush()
  return result
}
