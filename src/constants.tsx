// How often to flush client samples to the server.
export const FLUSH_FREQUENCY = 1000;

// We'll drop client samples that are within this duration of each other. For
// example, setting it to 4ms yields ~250 samples per second.
export const MIN_SAMPLE_DURATION = 4;

// The maximum amount of time we'll buffer samples from the server before we
// start dropping them.
export const MAX_SERVER_BUFFER_AGE = 1500;

// Threshold after which we'll start speeding time forward to catch up on
// our accumulated buffer.
export const SOFT_MAX_SERVER_BUFFER_AGE = 1250;

// Threshold after which we'll start slowing time down to avoid running
// out of buffer.
export const SOFT_MIN_SERVER_BUFFER_AGE = 250;
