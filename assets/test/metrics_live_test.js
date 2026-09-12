// Initialize the uPlot mocks
const mockDelSeries = jest.fn()
const mockAddSeries = jest.fn()
const mockSetData = jest.fn()

jest.mock('uplot', () => {
  let defaultExport = jest.fn(() => {
    return {
      series: [],
      addSeries: mockAddSeries,
      delSeries: mockDelSeries,
      setData: mockSetData
    }
  })

  defaultExport.paths = { bars: () => { } }

  return { __esModule: true, default: defaultExport }
})

import { TelemetryChart, newSeriesConfig } from '../js/metrics_live'
import uPlot from 'uplot'

beforeEach(() => {
  // Clear all instances and calls to constructor and all methods:
  uPlot.mockClear()
  mockAddSeries.mockClear()
  mockDelSeries.mockClear()
  mockSetData.mockClear()
})

describe('TelemetryChart', () => {
  test('instantiates uPlot', () => {
    const chart = new TelemetryChart(document.body, { metric: 'counter', tagged: false })

    expect(uPlot).toHaveBeenCalledTimes(1)
  })

  test('raises without metric', () => {
    expect(() => {
      new TelemetryChart(document.body, {})
    }).toThrowError(new TypeError(`No metric type was provided`))
  })

  test('raises if metric is invalid', () => {
    expect(() => {
      new TelemetryChart(document.body, { metric: 'invalid' })
    }).toThrowError(new TypeError(`No metric defined for type invalid`))
  })
})

describe('Metrics no tags', () => {
  test('Counter', () => {
    const chart = new TelemetryChart(document.body, { metric: 'counter', tagged: false })

    chart.pushData([{ x: 'a', y: 2, z: 1 }])

    expect(mockSetData).toHaveBeenCalledWith([
      [1],
      [1]
    ])

    chart.pushData([{ x: 'b', y: 4, z: 3 }])

    expect(mockSetData).toHaveBeenCalledWith([
      [1, 3],
      [1, 2]
    ])

    chart.pushData([
      { x: 'c', y: 6, z: 5 },
      { x: 'd', y: 8, z: 7 }
    ])

    expect(mockSetData).toHaveBeenCalledWith([
      [1, 3, 5, 7],
      [1, 2, 3, 4]
    ])
  })

  test('LastValue', () => {
    const chart = new TelemetryChart(document.body, { metric: 'last_value', tagged: false })

    chart.pushData([{ x: 'a', y: 2, z: 1 }])

    expect(mockSetData).toHaveBeenCalledWith([
      [1],
      [2]
    ])

    chart.pushData([{ x: 'b', y: 4, z: 3 }])

    expect(mockSetData).toHaveBeenCalledWith([
      [1, 3],
      [2, 4]
    ])

    chart.pushData([
      { x: 'c', y: 6, z: 5 },
      { x: 'd', y: 8, z: 7 }
    ])

    expect(mockSetData).toHaveBeenCalledWith([
      [1, 3, 5, 7],
      [2, 4, 6, 8]
    ])
  })

  test('Sum', () => {
    const chart = new TelemetryChart(document.body, { metric: 'sum', tagged: false })

    chart.pushData([{ x: 'a', y: 2, z: 1 }])

    expect(mockSetData).toHaveBeenCalledWith([
      [1],
      [2]
    ])

    chart.pushData([{ x: 'b', y: 4, z: 3 }])

    expect(mockSetData).toHaveBeenCalledWith([
      [1, 3],
      [2, 6]
    ])

    chart.pushData([
      { x: 'c', y: 6, z: 5 },
      { x: 'd', y: 8, z: 7 }
    ])

    expect(mockSetData).toHaveBeenCalledWith([
      [1, 3, 5, 7],
      [2, 6, 12, 20]
    ])
  })

  test('Summary', () => {
    const chart = new TelemetryChart(document.body, { metric: 'summary', tagged: false, label: "Duration" })

    expect(chart.metric.datasets).toEqual([
      { key: "|x|", data: [] },
      {
        key: "Duration",
        data: [],
        agg: {
          avg: [],
          min: [],
          max: [],
          count: 0,
          total: 0,
          percentiles: {}
        },
        last: {
          max: null,
          min: null
        }
      }
    ])

    chart.pushData([{ x: 'a', y: 2, z: 1 }])

    expect(mockSetData).toHaveBeenCalledWith([
      [1],
      [2]
    ])

    expect(chart.metric.datasets).toEqual([
      {
        key: "|x|",
        data: [1]
      },
      {
        key: "Duration",
        data: [2],
        agg: {
          avg: [2],
          min: [2],
          max: [2],
          count: 1,
          total: 2,
          percentiles: {}
        },
        last: {
          max: 2,
          min: 2
        }
      }
    ])

    chart.pushData([{ x: 'b', y: 4, z: 3 }])

    expect(mockSetData).toHaveBeenCalledWith([
      [1, 3],
      [2, 4]
    ])

    chart.pushData([
      { x: 'c', y: 6, z: 5 },
      { x: 'd', y: 8, z: 7 }
    ])

    expect(mockSetData).toHaveBeenCalledWith([
      [1, 3, 5, 7],
      [2, 4, 6, 8]
    ])

    expect(chart.metric.datasets).toEqual([
      {
        key: "|x|",
        data: [1, 3, 5, 7]
      },
      {
        key: "Duration",
        data: [2, 4, 6, 8],
        agg: {
          avg: [2, 3, 4, 5],
          min: [2, 2, 2, 2],
          max: [2, 4, 6, 8],
          count: 4,
          total: 20,
          percentiles: {}
        },
        last: {
          max: 8,
          min: 2
        }
      }
    ])
  })

  describe('Distribution (Histogram)', () => {
    test('bucketSize default value is 20', () => {
      const chart = new TelemetryChart(document.body, { metric: 'distribution', tagged: false })

      chart.pushData([{ x: 'a', y: 2, z: 0 }])

      expect(mockSetData).toHaveBeenNthCalledWith(1, [
        [0],
        [1]
      ])

      chart.pushData([
        { x: 'a', y: 2, z: 1 },
        { x: 'a', y: 2, z: 2 }
      ])

      expect(mockSetData).toHaveBeenNthCalledWith(2, [
        [0],
        [3]
      ])

      chart.pushData([
        { x: 'a', y: 20, z: 3 },
        { x: 'a', y: 30, z: 4 }
      ])

      expect(mockSetData).toHaveBeenNthCalledWith(3, [
        [0, 20],
        [3, 2]
      ])
    })

    test('with custom bucketSize', () => {
      const chart = new TelemetryChart(document.body, { metric: 'distribution', tagged: false, bucketSize: 150 })

      chart.pushData([{ x: 'a', y: 2, z: 0 }])

      expect(mockSetData).toHaveBeenNthCalledWith(1, [
        [0],
        [1]
      ])

      chart.pushData([
        { x: 'a', y: 2, z: 1 },
        { x: 'a', y: 2, z: 2 }
      ])

      expect(mockSetData).toHaveBeenNthCalledWith(2, [
        [0],
        [3]
      ])

      chart.pushData([
        { x: 'a', y: 50, z: 3 },
        { x: 'a', y: 60, z: 4 },
        { x: 'a', y: 150, z: 5 },
        { x: 'a', y: 160, z: 6 }
      ])

      expect(mockSetData).toHaveBeenNthCalledWith(3, [
        [0, 150],
        [5, 2]
      ])
    })
  })

  test('pruneThreshold prunes datasets by half', () => {
    const chart = new TelemetryChart(document.body, { metric: 'last_value', tagged: false, pruneThreshold: 4 })

    // Fill the chart
    chart.pushData([
      { x: 'a', y: 1, z: 1 },
      { x: 'a', y: 3, z: 2 },
      { x: 'a', y: 5, z: 3 },
      { x: 'a', y: 7, z: 4 },
    ])

    expect(mockSetData).toHaveBeenCalledWith([
      [1, 2, 3, 4],
      [1, 3, 5, 7],
    ])

    // Overflow the event limit
    chart.pushData([
      { x: 'a', y: 9, z: 5 }
    ])

    expect(mockSetData).toHaveBeenCalledWith([
      [2, 3, 4, 5],
      [3, 5, 7, 9]
    ])
  })
})

describe('Metrics with tags', () => {
  describe('LastValue', () => {
    test('deletes initial dataset', () => {
      const chart = new TelemetryChart(document.body, { metric: 'last_value', tagged: true })
      expect(mockDelSeries).toHaveBeenCalledWith(1)
    })

    test('aligns data by tag', () => {
      const chart = new TelemetryChart(document.body, { metric: 'last_value', tagged: true })

      chart.pushData([{ x: 'a', y: 2, z: 1 }])
      expect(mockAddSeries).toHaveBeenCalledWith(newSeriesConfig({ label: 'a' }, 0), 1)
      expect(mockSetData).toHaveBeenCalledWith([
        [1],
        [2]
      ])

      chart.pushData([{ x: 'b', y: 4, z: 3 }])
      expect(mockAddSeries).toHaveBeenCalledWith(newSeriesConfig({ label: 'b' }, 1), 2)
      expect(mockSetData).toHaveBeenCalledWith([
        [1, 3],
        [2, null],
        [null, 4]
      ])

      chart.pushData([
        { x: 'b', y: 6, z: 5 },
        { x: 'a', y: 8, z: 7 }
      ])

      expect(mockSetData).toHaveBeenCalledWith([
        [1, 3, 5, 7],
        [2, null, null, 8],
        [null, 4, 6, null]
      ])
    })
  })

  describe('Counter', () => {
    test('deletes initial dataset', () => {
      const chart = new TelemetryChart(document.body, { metric: 'counter', tagged: true })
      expect(mockDelSeries).toHaveBeenCalledWith(1)
    })

    test('aligns data by tag', () => {
      const chart = new TelemetryChart(document.body, { metric: 'counter', tagged: true })

      chart.pushData([{ x: 'a', y: 2, z: 1 }])
      expect(mockAddSeries).toHaveBeenCalledWith(newSeriesConfig({ label: 'a' }, 0), 1)
      expect(mockSetData).toHaveBeenCalledWith([
        [1],
        [1]
      ])

      chart.pushData([{ x: 'b', y: 4, z: 3 }])
      expect(mockAddSeries).toHaveBeenCalledWith(newSeriesConfig({ label: 'b' }, 1), 2)
      expect(mockSetData).toHaveBeenCalledWith([
        [1, 3],
        [1, null],
        [null, 1]
      ])

      chart.pushData([
        { x: 'b', y: 6, z: 5 },
        { x: 'a', y: 8, z: 7 }
      ])

      expect(mockSetData).toHaveBeenCalledWith([
        [1, 3, 5, 7],
        [1, null, null, 2],
        [null, 1, 2, null]
      ])
    })
  })

  describe('Sum', () => {
    test('deletes initial dataset', () => {
      const chart = new TelemetryChart(document.body, { metric: 'sum', tagged: true })
      expect(mockDelSeries).toHaveBeenCalledWith(1)
    })

    test('aligns data by tag', () => {
      const chart = new TelemetryChart(document.body, { metric: 'sum', tagged: true })

      chart.pushData([{ x: 'a', y: 2, z: 1 }])
      expect(mockAddSeries).toHaveBeenCalledWith(newSeriesConfig({ label: 'a' }, 0), 1)
      expect(mockSetData).toHaveBeenCalledWith([
        [1],
        [2]
      ])

      chart.pushData([{ x: 'b', y: 4, z: 3 }])
      expect(mockAddSeries).toHaveBeenCalledWith(newSeriesConfig({ label: 'b' }, 1), 2)
      expect(mockSetData).toHaveBeenCalledWith([
        [1, 3],
        [2, null],
        [null, 4]
      ])

      chart.pushData([
        { x: 'b', y: 6, z: 5 },
        { x: 'a', y: 8, z: 7 }
      ])

      expect(mockSetData).toHaveBeenCalledWith([
        [1, 3, 5, 7],
        [2, null, null, 10],
        [null, 4, 10, null]
      ])
    })
  })

  describe("Summary", () => {
    test('deletes initial dataset', () => {
      const chart = new TelemetryChart(document.body, { metric: 'summary', tagged: true })
      expect(mockDelSeries).toHaveBeenCalledWith(1)
    })

    test("aligns data and aggregations by tag", () => {
      const chart = new TelemetryChart(document.body, { metric: "summary", tagged: true })
      expect(mockDelSeries).toHaveBeenCalledTimes(1)

      chart.pushData([{ x: "a", y: 2, z: 1 }])

      expect(mockSetData).toHaveBeenCalledWith([
        [1],
        [2],
      ])

      expect(chart.metric.datasets).toEqual([
        {
          key: "|x|",
          data: [1]
        },
        {
          key: "a",
          data: [2],
          agg: {
            avg: [2],
            min: [2],
            max: [2],
            count: 1,
            total: 2,
            percentiles: {}
          },
          last: {
            max: 2,
            min: 2
          }
        }
      ])

      chart.pushData([{ x: "b", y: 4, z: 3 }])

      expect(mockSetData).toHaveBeenCalledWith([
        [1, 3],
        [2, null],
        [null, 4]
      ])

      expect(chart.metric.datasets).toEqual([
        {
          key: "|x|",
          data: [1, 3]
        },
        {
          key: "a",
          data: [2, null],
          agg: {
            avg: [2, null],
            min: [2, null],
            max: [2, null],
            count: 1,
            total: 2,
            percentiles: {}
          },
          last: {
            max: 2,
            min: 2
          }
        },
        {
          key: "b",
          data: [null, 4],
          agg: {
            avg: [null, 4],
            min: [null, 4],
            max: [null, 4],
            count: 1,
            total: 4,
            percentiles: {}
          },
          last: {
            max: 4,
            min: 4
          }
        }
      ])

      chart.pushData([
        { x: 'c', y: 6, z: 5 },
        { x: 'a', y: 2, z: 7 }
      ])

      expect(mockSetData).toHaveBeenCalledWith([
        [1, 3, 5, 7],
        [2, null, null, 2],
        [null, 4, null, null],
        [null, null, 6, null]
      ])
    })

    test('when dataset > pruneThreshold, prunes data to length of pruneThreshold', () => {
      const chart = new TelemetryChart(document.body, { metric: 'summary', tagged: true, pruneThreshold: 6 })

      // Fill the chart
      chart.pushData([
        { x: "a", y: -6, z: 1 },
        { x: "b", y: -4, z: 2 },
        { x: "a", y: -2, z: 3 },
        { x: "b", y: 0, z: 4 },
        { x: "a", y: 2, z: 5 },
        { x: "b", y: 4, z: 6 }
      ])

      expect(mockSetData).toHaveBeenCalledWith([
        [1, 2, 3, 4, 5, 6],
        [-6, null, -2, null, 2, null],
        [null, -4, null, 0, null, 4]
      ])

      expect(chart.metric.datasets).toEqual([
        {
          key: "|x|",
          data: [1, 2, 3, 4, 5, 6]
        },
        {
          key: "a",
          data: [-6, null, -2, null, 2, null],
          agg: {
            avg: [-6, null, -4, null, -2, null],
            min: [-6, null, -6, null, -6, null],
            max: [-6, null, -2, null, 2, null],
            count: 3,
            total: -6,
            percentiles: {}
          },
          last: {
            max: 2,
            min: -6
          }
        },
        {
          key: "b",
          data: [null, -4, null, 0, null, 4],
          agg: {
            avg: [null, -4, null, -2, null, 0],
            min: [null, -4, null, -4, null, -4],
            max: [null, -4, null, 0, null, 4],
            count: 3,
            total: 0,
            percentiles: {}
          },
          last: {
            max: 4,
            min: -4
          }
        }
      ])

      // Overflow the event limit
      chart.pushData([
        { x: "a", y: 6, z: 7 }
      ])

      expect(mockSetData).toHaveBeenCalledWith([
        [2, 3, 4, 5, 6, 7],
        [null, -2, null, 2, null, 6],
        [-4, null, 0, null, 4, null]
      ])
    })
  })
})

describe("refresh interval", () => {
  // Applies only to tests in this describe block
  beforeEach(() => {
    return jest.useFakeTimers()
  })

  test("buffers events each interval", () => {
    const chart = new TelemetryChart(document.body, {
      metric: "counter",
      tagged: false,
      refreshInterval: 2000
    })

    chart.pushData([{ x: "a", y: 2, z: 1 }])

    // At this point in time, the chart should not have been updated yet
    expect(mockSetData).not.toBeCalled()

    // Fast-forward until all timers have been executed
    jest.runOnlyPendingTimers()

    // Now our callback should have been called!
    expect(mockSetData).toBeCalled()
    expect(mockSetData).toHaveBeenCalledWith([
      [1],
      [1]
    ])
  })

  test("when buffer is empty, chart does not update", () => {
    const chart = new TelemetryChart(document.body, {
      metric: "counter",
      tagged: false,
      refreshInterval: 2000
    })

    // Fast-forward until all timers have been executed
    jest.runOnlyPendingTimers()

    // At this point in time, the chart should not have been updated yet
    expect(mockSetData).not.toBeCalled()
  })
})

describe('Summary percentiles', () => {
  const summaryChart = (options = {}) =>
    new TelemetryChart(document.body, { metric: 'summary', tagged: false, label: "Duration", percentiles: "50,95", ...options })

  test('parses fractional percentiles as separate keys', () => {
    const chart = summaryChart({ percentiles: "50,99.9" })

    expect(chart.metric.percentiles).toEqual([50, 99.9])

    chart.pushData([
      { x: 'a', y: 1, z: 1 },
      { x: 'b', y: 2, z: 2 },
      { x: 'c', y: 3, z: 3 },
      { x: 'd', y: 4, z: 4 }
    ])

    const { percentiles } = chart.metric.datasets[1].agg
    expect(Object.keys(percentiles)).toEqual(["50", "99.9"])
    expect(percentiles[50]).toEqual([1, 1.5, 2, 2.5])
    expect(percentiles[99.9]).toEqual([1, expect.closeTo(1.999, 10), expect.closeTo(2.998, 10), expect.closeTo(3.997, 10)])
  })

  test('interpolates linearly between the two closest ranks of the retained values', () => {
    const chart = summaryChart()

    chart.pushData([
      { x: 'a', y: 30, z: 1 },
      { x: 'b', y: 10, z: 2 },
      { x: 'c', y: 40, z: 3 },
      { x: 'd', y: 20, z: 4 }
    ])

    const dataset = chart.metric.datasets[1]

    // The raw series keeps its insertion order; sorting happens on a copy
    expect(dataset.data).toEqual([30, 10, 40, 20])

    // Sorted values after each point: [30], [10, 30], [10, 30, 40], [10, 20, 30, 40]
    expect(dataset.agg.percentiles[50]).toEqual([30, 20, 30, 25])
    expect(dataset.agg.percentiles[95]).toEqual([30, expect.closeTo(29, 10), expect.closeTo(39, 10), expect.closeTo(38.5, 10)])
  })

  test('exposes percentiles in the legend values', () => {
    const chart = summaryChart()

    chart.pushData([
      { x: 'a', y: 10, z: 1 },
      { x: 'b', y: 20, z: 2 }
    ])

    expect(chart.metric.__seriesValues(null, 1, 1)).toEqual({
      Value: "20.000", Min: "10.000", Max: "20.000", Avg: "15.000", P50: "15.000", P95: "19.500"
    })

    // No point at this index
    expect(chart.metric.__seriesValues(null, 1, 2)).toEqual({
      Value: "--", Min: "--", Max: "--", Avg: "--", P50: "--", P95: "--"
    })
  })

  describe('with tags', () => {
    const taggedChart = (options = {}) =>
      new TelemetryChart(document.body, { metric: 'summary', tagged: true, percentiles: "50", ...options })

    test('aligns percentiles by tag and fills gaps with null', () => {
      const chart = taggedChart()

      chart.pushData([{ x: 'a', y: 2, z: 1 }])
      chart.pushData([{ x: 'b', y: 4, z: 3 }])
      chart.pushData([{ x: 'a', y: 6, z: 5 }])

      const [, a, b] = chart.metric.datasets

      expect(a.key).toEqual("a")
      expect(a.data).toEqual([2, null, 6])
      expect(a.agg.percentiles[50]).toEqual([2, null, 4])

      expect(b.key).toEqual("b")
      expect(b.data).toEqual([null, 4, null])
      expect(b.agg.percentiles[50]).toEqual([null, 4, null])

      // Legend values for a tick where the tag had no measurement
      expect(chart.metric.__seriesValues(null, 2, 0)).toEqual({
        Value: "--", Min: "--", Max: "--", Avg: "--", P50: "--"
      })
    })

    test('prunes percentiles together with the data', () => {
      const chart = taggedChart({ pruneThreshold: 3 })

      chart.pushData([
        { x: 'a', y: 1, z: 1 },
        { x: 'b', y: 2, z: 2 },
        { x: 'a', y: 3, z: 3 }
      ])

      // Overflow the threshold: every series is trimmed to the last 3 points
      chart.pushData([{ x: 'a', y: 5, z: 4 }])

      let [x, a, b] = chart.metric.datasets
      expect(x.data).toEqual([2, 3, 4])
      expect(a.data).toEqual([null, 3, 5])
      expect(a.agg.percentiles[50]).toEqual([null, 2, 3])
      expect(b.data).toEqual([2, null, null])
      expect(b.agg.percentiles[50]).toEqual([2, null, null])

      // Later percentiles only see the retained values ([3, 5, 7] -> 5),
      // while the average stays cumulative ((1 + 3 + 5 + 7) / 4 -> 4)
      chart.pushData([{ x: 'a', y: 7, z: 5 }])

      ;[x, a, b] = chart.metric.datasets
      expect(a.data).toEqual([3, 5, 7])
      expect(a.agg.percentiles[50]).toEqual([2, 3, 5])
      expect(a.agg.avg).toEqual([2, 3, 4])
    })
  })
})
