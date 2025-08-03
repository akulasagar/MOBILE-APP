// In utils/timeUtils.js

const parseTime = (timeString) => {
    if (!timeString) return { hours: NaN, minutes: NaN };
    const lowerTimeString = timeString.toLowerCase().trim();
    let hours = 0;
    let minutes = 0;

    if (lowerTimeString.includes('pm') && !lowerTimeString.startsWith('12')) {
        hours = 12;
    }
    // Handle 12 AM case
    if (lowerTimeString.startsWith('12') && lowerTimeString.includes('am')) {
        hours = -12; // 12am will become 00 hours
    }
    
    const parts = lowerTimeString.replace(/am|pm/g, '').trim().split(':');
    
    if (parts[0]) {
        const parsedHours = parseInt(parts[0], 10);
        if (!isNaN(parsedHours)) {
           hours += parsedHours;
        }
    }
    if (parts[1]) {
        const parsedMinutes = parseInt(parts[1], 10);
        if (!isNaN(parsedMinutes)) {
            minutes = parsedMinutes;
        }
    }
    
    // Correct for 12 PM, which should not be 24
    if (hours === 24) {
      hours = 12;
    }
    
    return { hours, minutes };
};


const normalizeTime = (timeString) => {
    const parsed = parseTime(timeString);

    if (isNaN(parsed.hours) || isNaN(parsed.minutes)) {
        return timeString;
    }

    // Handle 12 AM which becomes 00 hours after parsing logic
    let finalHours = parsed.hours;
    if (timeString.toLowerCase().trim() === '12am' || timeString.toLowerCase().trim().startsWith('12:')) {
        if (timeString.toLowerCase().includes('am')) {
            finalHours = 0;
        }
    }
    
    const normalizedHours = String(finalHours).padStart(2, '0');
    const normalizedMinutes = String(parsed.minutes).padStart(2, '0');

    return `${normalizedHours}:${normalizedMinutes}`;
};

module.exports = { normalizeTime, parseTime };