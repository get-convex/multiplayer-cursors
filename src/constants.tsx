// How often to flush client samples to the server.
export const FLUSH_FREQUENCY = 1000;

// We'll drop client samples that are within this duration of each other. For
// example, setting it to 4ms yields ~250 samples per second.
export const MIN_SAMPLE_DURATION = 4;
