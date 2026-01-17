/**
 * Cybozu Office to Google Calendar Sync Script (iCal Method)
 * 
 * This script fetches schedule events from a Cybozu Office iCalendar URL 
 * and syncs them to a specific Google Calendar.
 */

// ==========================================
// CONFIGURATION (PLEASE UPDATE THIS SECTION)
// ==========================================
const CONFIG = {
    // Your Cybozu iCalendar URL
    // Get this from: Personal Settings -> Schedule -> iCalendar Output
    // It should look like: https://sapporo-dc.cybozu.com/o/ag.cgi?page=ScheduleICal&...
    CYBOZU_ICAL_URL: 'YOUR_ICAL_URL_HERE',

    // Google Calendar ID to sync TO
    // Use 'primary' for your main calendar
    GOOGLE_CALENDAR_ID: 'primary',

    // Sync Range (Days) - Note: Cybozu iCal usually exports fixed range (e.g. -1 week to +1 year)
    // We filter what we sync here.
    SYNC_DAYS_AFTER: 90, // Sync next 90 days
};

// ==========================================
// MAIN FUNCTION
// ==========================================

function main() {
    const calendar = CalendarApp.getCalendarById(CONFIG.GOOGLE_CALENDAR_ID);
    if (!calendar) {
        Logger.log('Error: Google Calendar not found. Check GOOGLE_CALENDAR_ID.');
        return;
    }

    Logger.log('Starting Sync...');

    // 1. Fetch & Parse iCal from Cybozu
    const events = fetchAndParseICal();
    Logger.log(`Fetched ${events.length} events from Cybozu.`);

    // 2. Sync to Google Calendar
    syncEventsToGoogleCalendar(calendar, events);

    Logger.log('Sync Completed.');
}

// ==========================================
// HELPER FUNCTIONS
// ==========================================

/**
 * Test Connection
 */
function testConnection() {
    try {
        const events = fetchAndParseICal();
        Logger.log('Connection Successful!');
        Logger.log(`Retrieved ${events.length} events.`);
        if (events.length > 0) {
            Logger.log('Sample Event: ' + events[0].summary);
        }
    } catch (e) {
        Logger.log('Connection Failed: ' + e.message);
    }
}

/**
 * Fetches iCal content and parses it into objects
 */
function fetchAndParseICal() {
    const url = CONFIG.CYBOZU_ICAL_URL;
    if (!url || url.indexOf('http') !== 0) {
        throw new Error('Invalid iCal URL. Please check CONFIG.');
    }

    const response = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
    if (response.getResponseCode() !== 200) {
        throw new Error(`Failed to fetch iCal. Status: ${response.getResponseCode()}`);
    }

    const iCalData = response.getContentText();
    return parseICal(iCalData);
}

/**
 * Simple iCal Parser
 */
function parseICal(data) {
    const events = [];
    const lines = data.split(/\r\n|\n|\r/);
    let currentEvent = null;

    for (let i = 0; i < lines.length; i++) {
        let line = lines[i];

        // Handle line folding (lines starting with space are continuation)
        while (i + 1 < lines.length && (lines[i + 1].startsWith(' ') || lines[i + 1].startsWith('\t'))) {
            line += lines[i + 1].substring(1);
            i++;
        }

        if (line.startsWith('BEGIN:VEVENT')) {
            currentEvent = {};
        } else if (line.startsWith('END:VEVENT')) {
            if (currentEvent) events.push(currentEvent);
            currentEvent = null;
        } else if (currentEvent) {
            const parts = line.split(':');
            const keyPart = parts.shift();
            const value = parts.join(':'); // Rejoin in case value has colons (like URLs or times)

            // Extract params if any (e.g., DTSTART;VALUE=DATE)
            const keyParams = keyPart.split(';');
            const key = keyParams[0];

            if (key === 'UID') currentEvent.uid = value;
            if (key === 'SUMMARY') currentEvent.summary = unescapeICal(value);
            if (key === 'DESCRIPTION') currentEvent.description = unescapeICal(value);
            if (key === 'LOCATION') currentEvent.location = unescapeICal(value);

            if (key === 'DTSTART') {
                currentEvent.start = parseICalDate(value);
                currentEvent.isAllDay = keyParams.includes('VALUE=DATE');
            }
            if (key === 'DTEND') {
                currentEvent.end = parseICalDate(value);
            }
        }
    }

    // Filter by date range (optional optimization)
    const now = new Date();
    const futureLimit = new Date();
    futureLimit.setDate(now.getDate() + CONFIG.SYNC_DAYS_AFTER);

    return events.filter(e => e.start && e.start < futureLimit);
}

function unescapeICal(str) {
    return str.replace(/\\,/g, ',').replace(/\\;/g, ';').replace(/\\n/g, '\n').replace(/\\\\/g, '\\');
}

function parseICalDate(dateStr) {
    // Format: YYYYMMDD or YYYYMMDDTHHMMSSZ
    if (!dateStr) return null;

    const year = parseInt(dateStr.substring(0, 4));
    const month = parseInt(dateStr.substring(4, 6)) - 1;
    const day = parseInt(dateStr.substring(6, 8));

    if (dateStr.length === 8) {
        // All day
        return new Date(year, month, day);
    } else {
        // Time
        const hour = parseInt(dateStr.substring(9, 11));
        const minute = parseInt(dateStr.substring(11, 13));
        const second = parseInt(dateStr.substring(13, 15));

        // Assume JST if no Z, or handle Z as UTC
        // Cybozu often exports in JST or UTC. 
        // If it ends in Z, it's UTC.
        if (dateStr.endsWith('Z')) {
            return new Date(Date.UTC(year, month, day, hour, minute, second));
        } else {
            // Treat as local time (JST)
            return new Date(year, month, day, hour, minute, second);
        }
    }
}

/**
 * Syncs parsed events to Google Calendar
 */
function syncEventsToGoogleCalendar(calendar, sourceEvents) {
    // We use the UID from Cybozu to track events
    // However, searching by tag is slow if we have many events.
    // Efficient strategy: Get all future events in GCal, build a map of UIDs.

    const now = new Date();
    const futureLimit = new Date();
    futureLimit.setDate(now.getDate() + CONFIG.SYNC_DAYS_AFTER);

    const gEvents = calendar.getEvents(now, futureLimit);
    const gEventMap = {}; // UID -> Event Object

    gEvents.forEach(e => {
        const uid = e.getTag('CYBOZU_UID');
        if (uid) {
            gEventMap[uid] = e;
        }
    });

    sourceEvents.forEach(sEvent => {
        // Skip past events
        if (sEvent.end < now) return;

        const uid = sEvent.uid;
        const subject = `[Cybozu] ${sEvent.summary}`;
        const description = sEvent.description || '';
        const location = sEvent.location || '';

        if (gEventMap[uid]) {
            // Update existing
            const gEvent = gEventMap[uid];
            let needsUpdate = false;

            if (gEvent.getTitle() !== subject) needsUpdate = true;
            if (gEvent.getDescription() !== description) needsUpdate = true;
            // Time check is tricky due to object equality, skip for simplicity unless critical

            if (needsUpdate) {
                gEvent.setTitle(subject);
                gEvent.setDescription(description);
                gEvent.setLocation(location);
                // Update time if needed (complex due to all-day switching)
                // For now, assume time doesn't change often or user accepts delete/re-create for major shifts
                Logger.log(`Updated: ${subject}`);
            }

            // Remove from map to mark as processed
            delete gEventMap[uid];

        } else {
            // Create new
            let newEvent;
            if (sEvent.isAllDay) {
                newEvent = calendar.createAllDayEvent(subject, sEvent.start);
            } else {
                newEvent = calendar.createEvent(subject, sEvent.start, sEvent.end);
            }
            newEvent.setTag('CYBOZU_UID', uid);
            newEvent.setDescription(description);
            newEvent.setLocation(location);
            Logger.log(`Created: ${subject}`);
        }
    });

    // Optional: Delete events in GCal that are no longer in Cybozu (within the sync window)
    // Be careful with this! Only delete if we are sure.
    // For safety, let's NOT auto-delete for now, or uncomment below if desired.
    /*
    for (const uid in gEventMap) {
      const e = gEventMap[uid];
      e.deleteEvent();
      Logger.log(`Deleted event: ${e.getTitle()}`);
    }
    */
}
