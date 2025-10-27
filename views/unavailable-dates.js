/**
 * Google Sheets Integration for Unavailable Dates
 * This file handles fetching unavailable dates from a Google Sheet
 */

class UnavailableDatesManager {
  constructor(sheetUrl) {
    this.sheetUrl = sheetUrl;
    this.unavailableDates = new Set(); // For ALL DAY blocks
    this.unavailableTimes = new Map(); // For specific time blocks: date -> Set of times
    this.lastFetch = null;
    this.cacheTime = 5 * 60 * 1000; // 5 minutes cache
  }

  /**
   * Fetch unavailable dates from Google Sheet
   */
  async fetchUnavailableDates() {
    try {
      // Check cache first
      if (this.lastFetch && Date.now() - this.lastFetch < this.cacheTime) {
        return Array.from(this.unavailableDates);
      }

      console.log('Fetching unavailable dates from Google Sheets...');
      
      const response = await fetch(this.sheetUrl);
      const data = await response.json();
      
      // Clear existing dates and times
      this.unavailableDates.clear();
      this.unavailableTimes.clear();
      
      // Process the data
      if (data.values && data.values.length > 1) { // Skip header row
        data.values.slice(1).forEach(row => {
          if (row[0]) { // Check if date cell has value
            const dateStr = row[0];
            const timeStr = row[1] || 'ALL DAY';
            const reason = row[2] || 'Unavailable';
            
            // Parse date
            const date = this.parseDate(dateStr);
            if (date) {
              const dateKey = this.formatDateKey(date);
              
              if (timeStr.toUpperCase() === 'ALL DAY') {
                // Block entire day
                this.unavailableDates.add(dateKey);
                console.log(`Blocked entire day: ${dateKey} (${reason})`);
              } else {
                // Block specific time
                if (!this.unavailableTimes.has(dateKey)) {
                  this.unavailableTimes.set(dateKey, new Set());
                }
                this.unavailableTimes.get(dateKey).add(timeStr);
                console.log(`Blocked time: ${dateKey} at ${timeStr} (${reason})`);
              }
            }
          }
        });
      }
      
      this.lastFetch = Date.now();
      console.log(`Loaded ${this.unavailableDates.size} unavailable dates`);
      
      return Array.from(this.unavailableDates);
      
    } catch (error) {
      console.error('Error fetching unavailable dates:', error);
      // Return cached dates on error
      return Array.from(this.unavailableDates);
    }
  }

  /**
   * Parse various date formats
   */
  parseDate(dateStr) {
    // Try different date formats
    const formats = [
      // MM/DD/YYYY
      /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/,
      // YYYY-MM-DD
      /^(\d{4})-(\d{1,2})-(\d{1,2})$/,
      // MM-DD-YYYY
      /^(\d{1,2})-(\d{1,2})-(\d{4})$/
    ];

    for (const format of formats) {
      const match = dateStr.match(format);
      if (match) {
        let year, month, day;
        
        if (format.source.startsWith('^(\\d{4})')) {
          // YYYY-MM-DD format
          [, year, month, day] = match;
        } else {
          // MM/DD/YYYY or MM-DD-YYYY format
          [, month, day, year] = match;
        }
        
        const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
        
        // Validate the date
        if (date.getFullYear() == year && 
            date.getMonth() == month - 1 && 
            date.getDate() == day) {
          return date;
        }
      }
    }
    
    // Try native Date parsing as fallback
    const date = new Date(dateStr);
    return isNaN(date.getTime()) ? null : date;
  }

  /**
   * Format date as YYYY-MM-DD for consistent comparison
   */
  formatDateKey(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * Check if a specific date is completely unavailable (ALL DAY block)
   */
  isDateUnavailable(date) {
    const dateKey = this.formatDateKey(date);
    return this.unavailableDates.has(dateKey);
  }

  /**
   * Check if a specific time slot is unavailable
   */
  isTimeUnavailable(date, time) {
    const dateKey = this.formatDateKey(date);
    
    // If entire day is blocked, all times are unavailable
    if (this.unavailableDates.has(dateKey)) {
      return true;
    }
    
    // Check if specific time is blocked
    const blockedTimes = this.unavailableTimes.get(dateKey);
    return blockedTimes ? blockedTimes.has(time) : false;
  }

  /**
   * Get available time slots for a specific date
   */
  getAvailableTimesForDate(date) {
    const allTimes = ['8:00 AM', '10:00 AM', '12:00 PM', '2:00 PM', '4:00 PM'];
    const dateKey = this.formatDateKey(date);
    
    // If entire day is blocked, no times available
    if (this.unavailableDates.has(dateKey)) {
      return [];
    }
    
    // Filter out blocked times
    const blockedTimes = this.unavailableTimes.get(dateKey) || new Set();
    return allTimes.filter(time => !blockedTimes.has(time));
  }

  /**
   * Get unavailable times for a specific date
   */
  getUnavailableTimesForDate(date) {
    const dateKey = this.formatDateKey(date);
    
    // If entire day is blocked, return all times
    if (this.unavailableDates.has(dateKey)) {
      return ['8:00 AM', '10:00 AM', '12:00 PM', '2:00 PM', '4:00 PM'];
    }
    
    // Return specific blocked times
    const blockedTimes = this.unavailableTimes.get(dateKey);
    return blockedTimes ? Array.from(blockedTimes) : [];
  }

  /**
   * Get all unavailable dates as Date objects
   */
  getUnavailableDatesAsObjects() {
    return Array.from(this.unavailableDates).map(dateStr => {
      const [year, month, day] = dateStr.split('-');
      return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    });
  }

  /**
   * Add a date range as unavailable (useful for vacations)
   */
  addDateRange(startDate, endDate, reason = 'Unavailable') {
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dateKey = this.formatDateKey(d);
      this.unavailableDates.add(dateKey);
    }
  }

  /**
   * Get unavailable dates for a specific month (useful for calendar display)
   */
  getUnavailableDatesForMonth(year, month) {
    const monthStr = String(month).padStart(2, '0');
    return Array.from(this.unavailableDates)
      .filter(dateStr => dateStr.startsWith(`${year}-${monthStr}`))
      .map(dateStr => {
        const [, , day] = dateStr.split('-');
        return parseInt(day);
      });
  }
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
  module.exports = UnavailableDatesManager;
} else {
  window.UnavailableDatesManager = UnavailableDatesManager;
}