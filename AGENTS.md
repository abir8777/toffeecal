# Project Architecture Rules

- Store Doctor tracker activity as per-user event type and timestamp only, protected by row-level access policies; this avoids retaining sensitive chat or symptom text.