package marketdata

import "sync/atomic"

// swapIfZero atomically flips a 0 → 1 flag, reporting whether this caller won
// the swap (used to single-flight background refreshes).
func swapIfZero(p *int32) bool {
	return atomic.CompareAndSwapInt32(p, 0, 1)
}

// storeZero resets a single-flight flag.
func storeZero(p *int32) {
	atomic.StoreInt32(p, 0)
}
