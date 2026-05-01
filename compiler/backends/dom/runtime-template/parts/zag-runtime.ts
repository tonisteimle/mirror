/**
 * Zag Component Runtime Code (as embeddable string)
 *
 * Only DatePicker remains as a Zag component. All other components are now
 * Pure-Mirror templates (studio/panels/components/component-templates.ts).
 */

export const ZAG_RUNTIME = `
  // ========================================
  // DatePicker Component
  // ========================================
  initDatePickerComponent(el) {
    if (!el || !el._zagConfig) return

    const config = el._zagConfig

    // Create missing elements if needed (robust initialization)
    let control = el.querySelector('[data-slot="Control"]')
    let input = el.querySelector('[data-slot="Input"]')
    let trigger = el.querySelector('[data-slot="Trigger"]')
    let content = el.querySelector('[data-slot="Content"]')

    // Auto-create structure if missing
    if (!control) {
      control = document.createElement('div')
      control.dataset.slot = 'Control'
      el.appendChild(control)
    }
    if (!input) {
      input = document.createElement('input')
      input.type = 'text'
      input.dataset.slot = 'Input'
      input.placeholder = config.machineConfig?.placeholder || 'Select date...'
      control.appendChild(input)
    }
    if (!trigger) {
      trigger = document.createElement('button')
      trigger.type = 'button'
      trigger.dataset.slot = 'Trigger'
      trigger.setAttribute('aria-label', 'Open calendar')
      trigger.innerHTML = _runtime._icons.calendar(16)
      control.appendChild(trigger)
    }
    if (!content) {
      content = document.createElement('div')
      content.dataset.slot = 'Content'
      el.appendChild(content)
    }

    // Get config values
    const locale = config.machineConfig?.locale || 'en-US'
    const selectionMode = config.machineConfig?.selectionMode || 'single'
    const startOfWeek = config.machineConfig?.startOfWeek ?? 0
    const isDisabled = config.machineConfig?.disabled || false
    const isReadOnly = config.machineConfig?.readOnly || false
    const isInline = config.machineConfig?.inline || false
    const closeOnSelect = config.machineConfig?.closeOnSelect !== false
    const minDate = config.machineConfig?.min ? new Date(config.machineConfig.min) : null
    const maxDate = config.machineConfig?.max ? new Date(config.machineConfig.max) : null

    // Initialize state
    const today = new Date()
    el._datePickerState = {
      open: isInline,
      focusedDate: today,
      viewDate: new Date(today.getFullYear(), today.getMonth(), 1),
      selectedDates: [],
      view: 'day', // day, month, year
    }

    // Parse initial value
    if (config.machineConfig?.value || config.machineConfig?.defaultValue) {
      const dateStr = config.machineConfig?.value || config.machineConfig?.defaultValue
      const parsed = new Date(dateStr)
      if (!isNaN(parsed.getTime())) {
        el._datePickerState.selectedDates = [parsed]
        el._datePickerState.viewDate = new Date(parsed.getFullYear(), parsed.getMonth(), 1)
      }
    }

    // ========================================
    // HELPER FUNCTIONS
    // ========================================

    const formatDate = (date, fmt = 'short') => {
      if (!date) return ''
      try {
        return new Intl.DateTimeFormat(locale, { dateStyle: fmt }).format(date)
      } catch {
        // Intl.DateTimeFormat failed (unsupported format/locale) - use basic fallback
        return date.toLocaleDateString()
      }
    }

    const isSameDay = (a, b) => {
      if (!a || !b) return false
      return a.getFullYear() === b.getFullYear() &&
             a.getMonth() === b.getMonth() &&
             a.getDate() === b.getDate()
    }

    const isDateDisabled = (date) => {
      if (minDate && date < minDate) return true
      if (maxDate && date > maxDate) return true
      return false
    }

    const getDaysInMonth = (year, month) => {
      return new Date(year, month + 1, 0).getDate()
    }

    const getWeekdayNames = () => {
      const names = []
      const date = new Date(2024, 0, startOfWeek) // Start from a known Sunday (Jan 2024)
      // Adjust to get first day of week
      while (date.getDay() !== startOfWeek) {
        date.setDate(date.getDate() + 1)
      }
      for (let i = 0; i < 7; i++) {
        names.push(new Intl.DateTimeFormat(locale, { weekday: 'short' }).format(date))
        date.setDate(date.getDate() + 1)
      }
      return names
    }

    const getMonthName = (month, year) => {
      const date = new Date(year, month, 1)
      return new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' }).format(date)
    }

    // ========================================
    // DEFAULT STYLING
    // ========================================

    const setDefault = (element, prop, value) => {
      if (!element.style[prop]) element.style[prop] = value
    }

    // Root styling
    setDefault(el, 'position', 'relative')
    setDefault(el, 'display', 'inline-block')

    // Control styling
    setDefault(control, 'display', 'flex')
    setDefault(control, 'alignItems', 'center')
    setDefault(control, 'gap', '0')
    setDefault(control, 'background', '#1a1a1a')
    setDefault(control, 'border', '1px solid #333')
    setDefault(control, 'borderRadius', '6px')
    setDefault(control, 'overflow', 'hidden')

    // Input styling
    setDefault(input, 'flex', '1')
    setDefault(input, 'padding', '8px 12px')
    setDefault(input, 'background', 'transparent')
    setDefault(input, 'border', 'none')
    setDefault(input, 'outline', 'none')
    setDefault(input, 'color', '#e0e0e0')
    setDefault(input, 'fontSize', '13px')
    setDefault(input, 'minWidth', '140px')
    input.readOnly = true

    // Trigger styling
    setDefault(trigger, 'padding', '8px 10px')
    setDefault(trigger, 'background', 'transparent')
    setDefault(trigger, 'border', 'none')
    setDefault(trigger, 'borderLeft', '1px solid #333')
    setDefault(trigger, 'cursor', isDisabled ? 'not-allowed' : 'pointer')
    setDefault(trigger, 'color', '#888')
    setDefault(trigger, 'display', 'flex')
    setDefault(trigger, 'alignItems', 'center')
    setDefault(trigger, 'justifyContent', 'center')

    // Content (calendar popup) styling
    content.style.position = isInline ? 'relative' : 'absolute'
    content.style.top = isInline ? '0' : '100%'
    content.style.left = '0'
    content.style.marginTop = isInline ? '0' : '4px'
    content.style.zIndex = '1000'
    setDefault(content, 'background', '#1a1a1a')
    setDefault(content, 'border', '1px solid #333')
    setDefault(content, 'borderRadius', '8px')
    setDefault(content, 'padding', '12px')
    setDefault(content, 'boxShadow', '0 4px 20px rgba(0,0,0,0.4)')
    setDefault(content, 'minWidth', '280px')

    if (!isInline) {
      content.style.display = 'none'
    }

    // ========================================
    // CALENDAR RENDERING
    // ========================================

    const renderCalendar = () => {
      const state = el._datePickerState
      const { viewDate, selectedDates, view } = state

      if (view === 'day') {
        renderDayView(viewDate, selectedDates)
      } else if (view === 'month') {
        renderMonthView(viewDate.getFullYear())
      } else if (view === 'year') {
        renderYearView(viewDate.getFullYear())
      }
    }

    const renderDayView = (viewDate, selectedDates) => {
      const year = viewDate.getFullYear()
      const month = viewDate.getMonth()
      const daysInMonth = getDaysInMonth(year, month)
      const firstDayOfMonth = new Date(year, month, 1).getDay()
      const offset = (firstDayOfMonth - startOfWeek + 7) % 7
      const weekdays = getWeekdayNames()

      let html = \`
        <div data-part="view-control" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
          <button data-part="prev-trigger" type="button" style="background: transparent; border: none; color: #888; cursor: pointer; padding: 4px 8px; border-radius: 4px;">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 18l-6-6 6-6"/></svg>
          </button>
          <button data-part="view-trigger" type="button" style="background: transparent; border: none; color: #e0e0e0; cursor: pointer; font-size: 14px; font-weight: 500; padding: 4px 8px; border-radius: 4px;">
            \${getMonthName(month, year)}
          </button>
          <button data-part="next-trigger" type="button" style="background: transparent; border: none; color: #888; cursor: pointer; padding: 4px 8px; border-radius: 4px;">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18l6-6-6-6"/></svg>
          </button>
        </div>
        <table data-part="table" style="width: 100%; border-collapse: collapse; text-align: center;">
          <thead data-part="table-head">
            <tr>\${weekdays.map(d => \`<th style="color: #666; font-size: 11px; font-weight: 500; padding: 4px 0;">\${d}</th>\`).join('')}</tr>
          </thead>
          <tbody data-part="table-body">
      \`

      let day = 1
      for (let week = 0; week < 6; week++) {
        html += '<tr>'
        for (let dow = 0; dow < 7; dow++) {
          const cellIndex = week * 7 + dow
          if (cellIndex < offset || day > daysInMonth) {
            html += '<td style="padding: 2px;"></td>'
          } else {
            const date = new Date(year, month, day)
            const isSelected = selectedDates.some(d => isSameDay(d, date))
            const isToday = isSameDay(date, new Date())
            const disabled = isDateDisabled(date)

            const cellStyle = \`
              padding: 2px;
            \`
            const btnStyle = \`
              width: 32px;
              height: 32px;
              border: none;
              border-radius: 6px;
              cursor: \${disabled ? 'not-allowed' : 'pointer'};
              font-size: 13px;
              background: \${isSelected ? '#4f46e5' : 'transparent'};
              color: \${disabled ? '#444' : isSelected ? '#fff' : isToday ? '#4f46e5' : '#e0e0e0'};
              font-weight: \${isToday ? '600' : '400'};
              opacity: \${disabled ? '0.5' : '1'};
            \`

            html += \`
              <td data-part="day-table-cell" style="\${cellStyle}">
                <button
                  data-part="day-table-cell-trigger"
                  data-day="\${day}"
                  data-date="\${date.toISOString()}"
                  type="button"
                  style="\${btnStyle}"
                  \${disabled ? 'disabled' : ''}
                  \${isSelected ? 'data-selected="true"' : ''}
                  \${isToday ? 'data-today="true"' : ''}
                >\${day}</button>
              </td>
            \`
            day++
          }
        }
        html += '</tr>'
        if (day > daysInMonth) break
      }

      html += '</tbody></table>'
      content.innerHTML = html

      // Bind events
      bindCalendarEvents()
    }

    const renderMonthView = (year) => {
      const months = []
      for (let i = 0; i < 12; i++) {
        const date = new Date(year, i, 1)
        months.push(new Intl.DateTimeFormat(locale, { month: 'short' }).format(date))
      }

      let html = \`
        <div data-part="view-control" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
          <button data-part="prev-trigger" type="button" style="background: transparent; border: none; color: #888; cursor: pointer; padding: 4px 8px;">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 18l-6-6 6-6"/></svg>
          </button>
          <button data-part="view-trigger" type="button" style="background: transparent; border: none; color: #e0e0e0; cursor: pointer; font-size: 14px; font-weight: 500; padding: 4px 8px;">
            \${year}
          </button>
          <button data-part="next-trigger" type="button" style="background: transparent; border: none; color: #888; cursor: pointer; padding: 4px 8px;">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18l6-6-6-6"/></svg>
          </button>
        </div>
        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px;">
      \`

      months.forEach((name, i) => {
        const isCurrentMonth = el._datePickerState.viewDate.getMonth() === i && el._datePickerState.viewDate.getFullYear() === year
        html += \`
          <button
            data-part="month-table-cell-trigger"
            data-month="\${i}"
            type="button"
            style="padding: 12px 8px; background: \${isCurrentMonth ? '#4f46e5' : 'transparent'}; color: \${isCurrentMonth ? '#fff' : '#e0e0e0'}; border: none; border-radius: 6px; cursor: pointer; font-size: 13px;"
          >\${name}</button>
        \`
      })

      html += '</div>'
      content.innerHTML = html
      bindCalendarEvents()
    }

    const renderYearView = (centerYear) => {
      const startYear = centerYear - 5
      const years = []
      for (let i = 0; i < 12; i++) {
        years.push(startYear + i)
      }

      let html = \`
        <div data-part="view-control" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
          <button data-part="prev-trigger" type="button" style="background: transparent; border: none; color: #888; cursor: pointer; padding: 4px 8px;">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 18l-6-6 6-6"/></svg>
          </button>
          <span style="color: #e0e0e0; font-size: 14px; font-weight: 500;">\${startYear} - \${startYear + 11}</span>
          <button data-part="next-trigger" type="button" style="background: transparent; border: none; color: #888; cursor: pointer; padding: 4px 8px;">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18l6-6-6-6"/></svg>
          </button>
        </div>
        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px;">
      \`

      years.forEach(y => {
        const isCurrentYear = el._datePickerState.viewDate.getFullYear() === y
        html += \`
          <button
            data-part="year-table-cell-trigger"
            data-year="\${y}"
            type="button"
            style="padding: 12px 8px; background: \${isCurrentYear ? '#4f46e5' : 'transparent'}; color: \${isCurrentYear ? '#fff' : '#e0e0e0'}; border: none; border-radius: 6px; cursor: pointer; font-size: 13px;"
          >\${y}</button>
        \`
      })

      html += '</div>'
      content.innerHTML = html
      bindCalendarEvents()
    }

    const bindCalendarEvents = () => {
      const state = el._datePickerState

      // Day selection
      content.querySelectorAll('[data-part="day-table-cell-trigger"]').forEach(btn => {
        btn.addEventListener('click', () => {
          if (btn.disabled) return
          const dateStr = btn.getAttribute('data-date')
          const date = new Date(dateStr)
          selectDate(date)
        })
        btn.addEventListener('mouseenter', () => {
          if (!btn.disabled) btn.style.background = btn.hasAttribute('data-selected') ? '#4f46e5' : '#252525'
        })
        btn.addEventListener('mouseleave', () => {
          if (!btn.disabled) btn.style.background = btn.hasAttribute('data-selected') ? '#4f46e5' : 'transparent'
        })
      })

      // Month selection
      content.querySelectorAll('[data-part="month-table-cell-trigger"]').forEach(btn => {
        btn.addEventListener('click', () => {
          const month = parseInt(btn.getAttribute('data-month'))
          state.viewDate = new Date(state.viewDate.getFullYear(), month, 1)
          state.view = 'day'
          renderCalendar()
        })
      })

      // Year selection
      content.querySelectorAll('[data-part="year-table-cell-trigger"]').forEach(btn => {
        btn.addEventListener('click', () => {
          const year = parseInt(btn.getAttribute('data-year'))
          state.viewDate = new Date(year, state.viewDate.getMonth(), 1)
          state.view = 'month'
          renderCalendar()
        })
      })

      // View trigger (month/year header)
      const viewTrigger = content.querySelector('[data-part="view-trigger"]')
      if (viewTrigger) {
        viewTrigger.addEventListener('click', () => {
          if (state.view === 'day') {
            state.view = 'month'
          } else if (state.view === 'month') {
            state.view = 'year'
          }
          renderCalendar()
        })
      }

      // Prev/Next navigation
      const prevTrigger = content.querySelector('[data-part="prev-trigger"]')
      const nextTrigger = content.querySelector('[data-part="next-trigger"]')

      if (prevTrigger) {
        prevTrigger.addEventListener('click', () => {
          if (state.view === 'day') {
            state.viewDate = new Date(state.viewDate.getFullYear(), state.viewDate.getMonth() - 1, 1)
          } else if (state.view === 'month') {
            state.viewDate = new Date(state.viewDate.getFullYear() - 1, state.viewDate.getMonth(), 1)
          } else if (state.view === 'year') {
            state.viewDate = new Date(state.viewDate.getFullYear() - 12, state.viewDate.getMonth(), 1)
          }
          renderCalendar()
        })
      }

      if (nextTrigger) {
        nextTrigger.addEventListener('click', () => {
          if (state.view === 'day') {
            state.viewDate = new Date(state.viewDate.getFullYear(), state.viewDate.getMonth() + 1, 1)
          } else if (state.view === 'month') {
            state.viewDate = new Date(state.viewDate.getFullYear() + 1, state.viewDate.getMonth(), 1)
          } else if (state.view === 'year') {
            state.viewDate = new Date(state.viewDate.getFullYear() + 12, state.viewDate.getMonth(), 1)
          }
          renderCalendar()
        })
      }
    }

    // ========================================
    // DATE SELECTION
    // ========================================

    const selectDate = (date) => {
      const state = el._datePickerState

      if (selectionMode === 'single') {
        state.selectedDates = [date]
      } else if (selectionMode === 'multiple') {
        const idx = state.selectedDates.findIndex(d => isSameDay(d, date))
        if (idx >= 0) {
          state.selectedDates.splice(idx, 1)
        } else {
          state.selectedDates.push(date)
        }
      } else if (selectionMode === 'range') {
        if (state.selectedDates.length === 0 || state.selectedDates.length === 2) {
          state.selectedDates = [date]
        } else {
          const start = state.selectedDates[0]
          if (date < start) {
            state.selectedDates = [date, start]
          } else {
            state.selectedDates = [start, date]
          }
        }
      }

      updateInputValue()
      renderCalendar()

      // Fire change event
      el.dispatchEvent(new CustomEvent('change', {
        detail: {
          value: state.selectedDates.map(d => d.toISOString().split('T')[0]),
          dates: state.selectedDates,
        },
        bubbles: true
      }))

      // Close popup if configured
      if (closeOnSelect && !isInline && selectionMode === 'single') {
        closeCalendar()
      }
      if (closeOnSelect && !isInline && selectionMode === 'range' && state.selectedDates.length === 2) {
        closeCalendar()
      }
    }

    const updateInputValue = () => {
      const state = el._datePickerState
      if (state.selectedDates.length === 0) {
        input.value = ''
      } else if (selectionMode === 'range' && state.selectedDates.length === 2) {
        input.value = \`\${formatDate(state.selectedDates[0])} - \${formatDate(state.selectedDates[1])}\`
      } else {
        input.value = state.selectedDates.map(d => formatDate(d)).join(', ')
      }
    }

    // ========================================
    // OPEN/CLOSE
    // ========================================

    const openCalendar = () => {
      if (isDisabled || isInline) return
      el._datePickerState.open = true
      el._datePickerState.view = 'day'
      content.style.display = 'block'
      el.setAttribute('data-state', 'open')
      renderCalendar()

      el.dispatchEvent(new CustomEvent('open', { bubbles: true }))
    }

    const closeCalendar = () => {
      if (isInline) return
      el._datePickerState.open = false
      content.style.display = 'none'
      el.setAttribute('data-state', 'closed')

      el.dispatchEvent(new CustomEvent('close', { bubbles: true }))
    }

    // ========================================
    // EVENT HANDLERS
    // ========================================

    // Debounce flag to prevent double-firing from pointerdown + click
    let lastToggleTime = 0

    // Toggle calendar helper with debounce
    const toggleCalendar = (e) => {
      const now = Date.now()
      if (now - lastToggleTime < 100) return // Debounce 100ms
      lastToggleTime = now

      if (e) {
        e.preventDefault()
        e.stopPropagation()
      }
      if (el._datePickerState.open) {
        closeCalendar()
      } else {
        openCalendar()
      }
    }

    // Trigger click - multiple event types for robustness
    // Using both click and pointerdown ensures compatibility with
    // different browsers, Shadow DOM, and automation tools
    trigger.addEventListener('click', toggleCalendar)
    trigger.addEventListener('pointerdown', (e) => {
      // Only handle primary button (left click)
      if (e.button !== 0) return
      toggleCalendar(e)
    })

    // Input click (also opens) - same robust handling
    let lastInputOpenTime = 0
    const openFromInput = (e) => {
      const now = Date.now()
      if (now - lastInputOpenTime < 100) return
      lastInputOpenTime = now

      if (e) {
        e.preventDefault()
        e.stopPropagation()
      }
      if (!el._datePickerState.open) {
        openCalendar()
      }
    }
    input.addEventListener('click', openFromInput)
    input.addEventListener('pointerdown', (e) => {
      if (e.button !== 0) return
      openFromInput(e)
    })

    // Click outside to close (use composedPath for Shadow DOM compatibility)
    document.addEventListener('click', (e) => {
      if (el._datePickerState.open && !e.composedPath().includes(el)) {
        closeCalendar()
      }
    })

    // Keyboard navigation
    el.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && el._datePickerState.open) {
        closeCalendar()
        trigger.focus()
      }
    })

    // ========================================
    // ACCESSIBILITY
    // ========================================

    el.setAttribute('role', 'group')
    trigger.setAttribute('aria-label', 'Open calendar')
    trigger.setAttribute('aria-haspopup', 'dialog')

    // ========================================
    // DISABLED STATE
    // ========================================

    if (isDisabled) {
      el.setAttribute('data-disabled', 'true')
      el.style.opacity = '0.5'
      el.style.pointerEvents = 'none'
    }

    // ========================================
    // INITIAL RENDER
    // ========================================

    updateInputValue()
    el.setAttribute('data-state', isInline ? 'open' : 'closed')
    if (isInline) {
      renderCalendar()
    }
  },
`
