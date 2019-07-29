/*
Copyright 2019 The Kubernetes Authors.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

package docs

// OnOff defines setting with values 'on' or 'off'
type OnOff string

const (
	// On defines an enabled setting
	On OnOff = "on"

	// Off defines a disabled setting
	Off OnOff = "off"
)

// Size can be specified in bytes, kilobytes (suffixes k and K) or
// megabytes (suffixes m and M), for example, "1024", "8k", "1m".
type Size string

// Validate returns if the Size is valid
func (s Size) Validate() bool {
	return false
}

// Time intervals can be specified in milliseconds, seconds, minutes,
// hours, days and so on, using the following suffixes:
// ms	milliseconds
// s	seconds
// m	minutes
// h	hours
// d	days
// w	weeks
// M	months, 30 days
// y	years, 365 days
// Multiple units can be combined in a single value by specifying them in the
// order from the most to the least significant,
// and optionally separated by whitespace. For example, “1h 30m” specifies the
// same time as “90m” or “5400s”. A value without a suffix means seconds.
// It is recommended to always specify a suffix.
//
// Some of the time intervals can be specified only with a seconds resolution.
type Time string

// Validate returns if the Time is valid
func (s Time) Validate() bool {
	return false
}
