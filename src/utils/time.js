
export function getISTTime() {
    return new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
}

export function formatToIST(date) {
    if (!date) return 'N/A';
    const d = new Date(date);
    return d.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
}

export function getCurrentTimeContext() {
    const now = new Date();
    return {
        iso: now.toISOString(),
        ist: getISTTime(),
        timezone: 'Asia/Kolkata',
        timestamp: now.getTime()
    };
}
