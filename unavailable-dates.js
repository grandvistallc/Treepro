class UnavailableDatesManager {
  constructor() {
    // Your Google Sheets ID extracted from the sharing link
    this.sheetId = '1oB7T73PHL4gdmqG4ymG20ROdkARXsSRW1-XRiyc1pBg';
    this.sheetName = 'UnavailableDates';
    this.csvUrl = `https://docs.google.com/spreadsheets/d/${this.sheetId}/gviz/tq?tqx=out:csv&sheet=${this.sheetName}`;
    
    // Cache data for 5 minutes to avoid excessive API calls
    this.cache = {
      data: null,
      timestamp: 0,
      duration: 5 * 60 * 1000 // 5 minutes
    };
    
    // Store unavailable dates and times
    this.unavailableDates = new Set(); // For full day blocks
    this.unavailableTimes = new Map(); // For specific time blocks: date -> Set of times
    this.dateReasons = new Map(); // Store reasons for dates/times
  }

  // Check if cache is still valid
  isCacheValid() {
    return this.cache.data && (Date.now() - this.cache.timestamp) < this.cache.duration;
  }

  // Parse date from various formats
  parseDate(dateStr) {
    if (!dateStr) return null;
    
    // Remove any extra whitespace
    dateStr = dateStr.trim();
    
    // Try different date formats
    const formats = [
      /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/, // MM/DD/YYYY or M/D/YYYY
      /^(\d{4})-(\d{1,2})-(\d{1,2})$/, // YYYY-MM-DD or YYYY-M-D
      /^(\d{1,2})-(\d{1,2})-(\d{4})$/, // MM-DD-YYYY or M-D-YYYY
    ];
    
    for (let i = 0; i < formats.length; i++) {
      const match = dateStr.match(formats[i]);
      if (match) {
        let year, month, day;
        
        if (i === 0 || i === 2) { // MM/DD/YYYY or MM-DD-YYYY
          month = parseInt(match[1]);
          day = parseInt(match[2]);
          year = parseInt(match[3]);
        } else { // YYYY-MM-DD
          year = parseInt(match[1]);
          month = parseInt(match[2]);
          day = parseInt(match[3]);
        }
        
        // Create date object (month is 0-indexed in JavaScript)
        const date = new Date(year, month - 1, day);
        
        // Validate the date
        if (date.getFullYear() === year && 
            date.getMonth() === month - 1 && 
            date.getDate() === day) {
          return date;
        }
      }
    }
    
    return null;
  }

  // Parse time from various formats
  parseTime(timeStr) {
    if (!timeStr) return null;
    
    timeStr = timeStr.trim().toUpperCase();
    
    // Check for "ALL DAY"
    if (timeStr === 'ALL DAY') {
      return 'ALL DAY';
    }
    
    // Check for time ranges like "9:00 AM - 12:00 PM" or "9:00 AM-12:00 PM"
    const rangeMatch = timeStr.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)\s*-\s*(\d{1,2}):(\d{2})\s*(AM|PM)$/);
    if (rangeMatch) {
      const startTime = `${rangeMatch[1]}:${rangeMatch[2]} ${rangeMatch[3]}`;
      const endTime = `${rangeMatch[4]}:${rangeMatch[5]} ${rangeMatch[6]}`;
      return { type: 'range', start: startTime, end: endTime, original: timeStr };
    }
    
    // Parse single time formats like "8:00 AM", "10:30 PM", etc.
    const timeMatch = timeStr.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/);
    if (timeMatch) {
      return { type: 'single', time: timeStr, original: timeStr };
    }
    
    return null;
  }

  // Convert time string to minutes for easy comparison
  timeToMinutes(timeStr) {
    const match = timeStr.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/);
    if (!match) return null;
    
    let hours = parseInt(match[1]);
    const minutes = parseInt(match[2]);
    const period = match[3];
    
    if (period === 'PM' && hours !== 12) {
      hours += 12;
    } else if (period === 'AM' && hours === 12) {
      hours = 0;
    }
    
    return hours * 60 + minutes;
  }

  // Generate all time slots that fall within a range
  expandTimeRange(startTime, endTime) {
    const allTimes = [
      '8:00 AM', '9:00 AM', '10:00 AM', '11:00 AM',
      '12:00 PM', '1:00 PM', '2:00 PM', '3:00 PM', '4:00 PM'
    ];
    
    const startMinutes = this.timeToMinutes(startTime);
    const endMinutes = this.timeToMinutes(endTime);
    
    if (startMinutes === null || endMinutes === null) return [];
    
    return allTimes.filter(time => {
      const timeMinutes = this.timeToMinutes(time);
      return timeMinutes !== null && timeMinutes >= startMinutes && timeMinutes <= endMinutes;
    });
  }
  formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  // Fetch data from Google Sheets
  async fetchData() {
    try {
      if (this.isCacheValid()) {
        return this.cache.data;
      }

      console.log('Fetching unavailable dates from Google Sheets...');
      const response = await fetch(this.csvUrl);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const csvText = await response.text();
      
      // Update cache
      this.cache.data = csvText;
      this.cache.timestamp = Date.now();
      
      return csvText;
    } catch (error) {
      console.error('Error fetching unavailable dates:', error);
      
      // Return cached data if available, even if expired
      if (this.cache.data) {
        console.log('Using cached data due to fetch error');
        return this.cache.data;
      }
      
      return '';
    }
  }

  // Parse CSV data and populate date/time sets
  async loadUnavailableDates() {
    try {
      const csvData = await this.fetchData();
      
      // Clear existing data
      this.unavailableDates.clear();
      this.unavailableTimes.clear();
      this.dateReasons.clear();
      
      if (!csvData) return;
      
      const lines = csvData.split('\n');
      
      // Skip header row if it exists
      const startIndex = lines[0] && lines[0].toLowerCase().includes('date') ? 1 : 0;
      
      for (let i = startIndex; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        
        // Parse CSV line (simple comma split - assumes no commas in data)
        const columns = line.split(',').map(col => col.replace(/^"|"$/g, '').trim());
        
        if (columns.length < 1) continue;
        
        const dateStr = columns[0];
        const timeStr = columns[1] || 'ALL DAY';
        const reason = columns[2] || '';
        
        const date = this.parseDate(dateStr);
        if (!date) continue;
        
        const formattedDate = this.formatDate(date);
        const parsedTime = this.parseTime(timeStr);
        
        if (parsedTime === 'ALL DAY') {
          // Block entire day
          this.unavailableDates.add(formattedDate);
          if (reason) {
            this.dateReasons.set(formattedDate, reason);
          }
        } else if (parsedTime) {
          if (parsedTime.type === 'range') {
            // Block time range - expand to individual times
            const timesToBlock = this.expandTimeRange(parsedTime.start, parsedTime.end);
            
            if (!this.unavailableTimes.has(formattedDate)) {
              this.unavailableTimes.set(formattedDate, new Set());
            }
            
            const timeSet = this.unavailableTimes.get(formattedDate);
            timesToBlock.forEach(time => {
              timeSet.add(time);
              if (reason) {
                this.dateReasons.set(`${formattedDate}_${time}`, `${reason} (${parsedTime.original})`);
              }
            });
            
          } else if (parsedTime.type === 'single') {
            // Block specific single time
            if (!this.unavailableTimes.has(formattedDate)) {
              this.unavailableTimes.set(formattedDate, new Set());
            }
            this.unavailableTimes.get(formattedDate).add(parsedTime.time);
            
            if (reason) {
              this.dateReasons.set(`${formattedDate}_${parsedTime.time}`, reason);
            }
          }
        }
      }
      
      console.log(`Loaded ${this.unavailableDates.size} unavailable dates and ${this.unavailableTimes.size} dates with specific time blocks`);
      
    } catch (error) {
      console.error('Error loading unavailable dates:', error);
    }
  }

  // Check if a date is completely unavailable
  isDateUnavailable(date) {
    if (!date) return false;
    const formattedDate = this.formatDate(date);
    return this.unavailableDates.has(formattedDate);
  }

  // Check if a specific time on a date is unavailable
  isTimeUnavailable(date, time) {
    if (!date || !time) return false;
    
    const formattedDate = this.formatDate(date);
    
    // Check if entire day is blocked
    if (this.unavailableDates.has(formattedDate)) {
      return true;
    }
    
    // Check if specific time is blocked
    const timeSet = this.unavailableTimes.get(formattedDate);
    return timeSet && timeSet.has(time);
  }

  // Get reason for unavailable date
  getUnavailableReason(date, time = null) {
    if (!date) return null;
    
    const formattedDate = this.formatDate(date);
    
    if (time) {
      // Check for specific time reason first
      const timeReason = this.dateReasons.get(`${formattedDate}_${time}`);
      if (timeReason) return timeReason;
    }
    
    // Check for date reason
    return this.dateReasons.get(formattedDate) || null;
  }

  // Get all available times for a specific date
  getAvailableTimesForDate(date) {
    const allTimes = [
      '8:00 AM', '9:00 AM', '10:00 AM', '11:00 AM',
      '12:00 PM', '1:00 PM', '2:00 PM', '3:00 PM', '4:00 PM'
    ];
    
    if (!date) return allTimes;
    
    const formattedDate = this.formatDate(date);
    
    // If entire day is blocked, return empty array
    if (this.unavailableDates.has(formattedDate)) {
      return [];
    }
    
    // Filter out blocked times
    const blockedTimes = this.unavailableTimes.get(formattedDate);
    if (!blockedTimes) return allTimes;
    
    return allTimes.filter(time => !blockedTimes.has(time));
  }

  // Get all unavailable times for a specific date
  getUnavailableTimesForDate(date) {
    if (!date) return [];
    
    const formattedDate = this.formatDate(date);
    
    // If entire day is blocked, return all times
    if (this.unavailableDates.has(formattedDate)) {
      return [
        '8:00 AM', '9:00 AM', '10:00 AM', '11:00 AM',
        '12:00 PM', '1:00 PM', '2:00 PM', '3:00 PM', '4:00 PM'
      ];
    }
    
    // Return specific blocked times
    const blockedTimes = this.unavailableTimes.get(formattedDate);
    return blockedTimes ? Array.from(blockedTimes) : [];
  }

  // Initialize the manager (call this when page loads)
  async init() {
    await this.loadUnavailableDates();
  }

  // Force refresh data (useful for testing)
  async refresh() {
    this.cache.timestamp = 0; // Invalidate cache
    await this.loadUnavailableDates();
  }
}

// Create global instance
const unavailableDatesManager = new UnavailableDatesManager();
