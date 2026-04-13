/**
 * Chart Runtime Code (as embeddable string)
 *
 * Contains Chart.js integration and animation system.
 * This is part of the _runtime object in dom-runtime-string.ts
 */

export const CHARTS_RUNTIME = `
  // Chart.js integration
  _chartJsLoaded: false,
  _chartJsLoading: null,

  async _loadChartJs() {
    if (this._chartJsLoaded) return
    if (this._chartJsLoading) return this._chartJsLoading

    this._chartJsLoading = new Promise((resolve, reject) => {
      const script = document.createElement('script')
      script.src = 'https://cdn.jsdelivr.net/npm/chart.js'
      script.onload = () => {
        this._chartJsLoaded = true
        resolve()
      }
      script.onerror = () => reject(new Error('Failed to load Chart.js'))
      document.head.appendChild(script)
    })

    return this._chartJsLoading
  },

  _parseChartData(data, xField, yField) {
    if (!data) return { labels: [], values: [] }

    // Handle array of objects with x/y fields
    if (Array.isArray(data)) {
      if (xField && yField) {
        return {
          labels: data.map(item => item[xField]),
          values: data.map(item => item[yField])
        }
      }
      return { labels: data.map((_, i) => String(i)), values: data }
    }

    // Handle key-value object (most common case)
    if (typeof data === 'object') {
      const entries = Object.entries(data)
      // Check if values are objects with x/y fields
      if (entries.length > 0 && typeof entries[0][1] === 'object' && xField && yField) {
        return {
          labels: entries.map(([_, v]) => v[xField]),
          values: entries.map(([_, v]) => v[yField])
        }
      }
      // Simple key-value pairs
      return {
        labels: entries.map(([k]) => k),
        values: entries.map(([_, v]) => v)
      }
    }

    return { labels: [], values: [] }
  },

  async createChart(element, config) {
    await this._loadChartJs()

    // Chart.js requires a container with position:relative and overflow:hidden
    // to properly constrain the canvas size when responsive:true
    element.style.position = 'relative'
    element.style.overflow = 'hidden'

    // Create a wrapper that fills the container - Chart.js needs this structure
    const wrapper = document.createElement('div')
    wrapper.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;'
    element.appendChild(wrapper)

    const canvas = document.createElement('canvas')
    wrapper.appendChild(canvas)

    const { labels, values } = this._parseChartData(config.data, config.xField, config.yField)

    // Default colors
    const defaultColors = [
      '#2563eb', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
      '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1'
    ]
    const colors = config.colors || defaultColors
    const chartType = config.type || 'line'
    const isPieOrDoughnut = chartType === 'pie' || chartType === 'doughnut'

    // Determine fill based on config (Area charts have fill: true by default)
    const shouldFill = config.fill === true || (chartType === 'line' && config.fill === 'origin')

    // Build Chart.js config
    const chartConfig = {
      type: chartType,
      data: {
        labels: labels,
        datasets: [{
          label: config.title || '', // Empty string fallback for legend
          data: values,
          backgroundColor: isPieOrDoughnut
            ? colors.slice(0, values.length)
            : (shouldFill ? colors[0] + '40' : colors[0] + '80'),
          borderColor: isPieOrDoughnut ? colors.slice(0, values.length) : colors[0],
          borderWidth: isPieOrDoughnut ? 1 : 2,
          fill: shouldFill ? 'origin' : false,
          tension: config.tension !== undefined ? config.tension : 0.3,
          pointBackgroundColor: colors[0],
          pointBorderColor: colors[0],
          pointRadius: chartType === 'scatter' ? 5 : 3,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: config.legend === true || isPieOrDoughnut,
            labels: {
              color: '#ccc',
              // For pie/doughnut: use labels from data (each slice = label)
              // For others: use dataset labels (but we only have one dataset)
              generateLabels: isPieOrDoughnut ? undefined : (chart) => {
                // Hide legend for single-dataset charts unless explicitly requested
                if (!config.legend) return []
                return Chart.defaults.plugins.legend.labels.generateLabels(chart)
              }
            }
          },
          title: {
            display: !!config.title,
            text: config.title || '',
            color: '#fff'
          }
        },
        scales: isPieOrDoughnut ? {} : {
          x: {
            display: config.axes !== false,
            grid: { display: config.grid !== false, color: '#333' },
            ticks: { color: '#888' }
          },
          y: {
            display: config.axes !== false,
            grid: { display: config.grid !== false, color: '#333' },
            ticks: { color: '#888' },
            beginAtZero: true
          }
        }
      }
    }

    // Special handling for radar charts
    if (chartType === 'radar') {
      chartConfig.options.scales = {
        r: {
          grid: { color: '#333' },
          pointLabels: { color: '#888' },
          ticks: { color: '#888', backdropColor: 'transparent' }
        }
      }
    }

    new window.Chart(canvas.getContext('2d'), chartConfig)
  },

  // Animation registry
  _animations: new Map(),

  registerAnimation(animation) {
    if (!animation || !animation.name) return
    this._animations.set(animation.name, animation)
  },

  getAnimation(name) {
    return this._animations.get(name)
  },

  animate(animationName, elements, options = {}) {
    const animation = this._animations.get(animationName)
    if (!animation) {
      console.warn(\`Animation "\${animationName}" not found\`)
      return null
    }

    // Normalize elements to array
    let targets = []
    if (!elements) {
      return null
    } else if (Array.isArray(elements)) {
      targets = elements.map(e => e._el || e)
    } else {
      targets = [elements._el || elements]
    }

    const { delay = 0, stagger = 0, loop = false, reverse = false } = options
    const results = []

    // Easing curves
    const easingMap = {
      'linear': 'linear',
      'ease': 'ease',
      'ease-in': 'ease-in',
      'ease-out': 'ease-out',
      'ease-in-out': 'ease-in-out',
    }

    targets.forEach((el, index) => {
      if (!el) return

      const elementDelay = delay + (index * stagger)

      // Build keyframes from animation definition
      const keyframes = []
      const propertyTimelines = new Map()

      // Group properties by name to build proper keyframe sequence
      animation.keyframes.forEach(kf => {
        kf.properties.forEach(prop => {
          if (!propertyTimelines.has(prop.name)) {
            propertyTimelines.set(prop.name, [])
          }
          propertyTimelines.get(prop.name).push({
            time: kf.time,
            value: prop.value,
            easing: prop.easing || animation.easing || 'ease-out'
          })
        })
      })

      // Convert to Web Animations API format
      const duration = animation.duration * 1000
      const allTimes = [...new Set(animation.keyframes.map(kf => kf.time))].sort((a, b) => a - b)

      allTimes.forEach(time => {
        const kf = { offset: time / animation.duration }
        propertyTimelines.forEach((timeline, propName) => {
          const point = timeline.find(p => p.time === time)
          if (point) {
            // Map Mirror property names to CSS
            const cssName = this._animPropMap(propName)
            kf[cssName] = this._animValueMap(propName, point.value)
          }
        })
        keyframes.push(kf)
      })

      if (reverse) {
        keyframes.reverse()
        keyframes.forEach((kf, i) => {
          kf.offset = i / (keyframes.length - 1)
        })
      }

      const timing = {
        duration,
        delay: elementDelay,
        easing: easingMap[animation.easing] || 'ease-out',
        iterations: loop === true ? Infinity : (typeof loop === 'number' ? loop : 1),
        fill: 'forwards'
      }

      try {
        const anim = el.animate(keyframes, timing)
        results.push(anim)
      } catch (err) {
        console.warn('Animation error:', err)
      }
    })

    return results
  },

  _animPropMap(name) {
    const map = {
      'opacity': 'opacity',
      'x-offset': 'translateX',
      'y-offset': 'translateY',
      'scale': 'scale',
      'scale-x': 'scaleX',
      'scale-y': 'scaleY',
      'rotate': 'rotate',
      'background': 'backgroundColor',
      'bg': 'backgroundColor',
      'color': 'color',
      'col': 'color',
      'width': 'width',
      'height': 'height',
      'padding': 'padding',
      'pad': 'padding',
      'radius': 'borderRadius',
      'rad': 'borderRadius',
    }
    return map[name] || name
  },

  _animValueMap(propName, value) {
    if (propName === 'x-offset' || propName === 'y-offset') {
      return typeof value === 'number' ? value + 'px' : value
    }
    if (propName === 'rotate') {
      return typeof value === 'number' ? value + 'deg' : value
    }
    if (propName === 'width' || propName === 'height' || propName === 'padding' || propName === 'pad' || propName === 'radius' || propName === 'rad') {
      return typeof value === 'number' ? value + 'px' : value
    }
    return value
  },

  setupEnterExitObserver(el, onEnter, onExit) {
    if (!el) return null
    const element = el._el || el

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          if (onEnter) onEnter()
        } else {
          if (onExit) onExit()
        }
      })
    }, { threshold: 0.1 })

    observer.observe(element)
    return observer
  },
`
