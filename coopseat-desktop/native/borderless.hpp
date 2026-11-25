#pragma once
// Asks Windows to allow capture without the yellow privacy border.
// Returns the AppCapabilityAccessStatus, or -1 when the API is unavailable.
int allowBorderless();
