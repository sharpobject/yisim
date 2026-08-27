# Live room observer

The installed service reads its observable-character allowlist from
`/home/sharpobject/.config/yisim/live-observer-characters.json` on every poll.
The file accepts either a JSON array or an object with a `characterIds` array:

```json
{
  "characterIds": [1000004]
}
```

Lin Xiaoyue retains the configured Dao Mindset/ranked score criteria. Other
allowlisted characters use the existing fallback ordering after eligible Lin
Xiaoyue targets. An empty array pauses all new observation targets. Invalid
edits are logged and the last valid allowlist remains active.

`systemctl --user reload yisim-live-room-observer.service` requests a deferred
restart. New room admissions pause immediately; the process exits for its
systemd restart after in-progress admissions settle and no observed Lin
Xiaoyue with a queue rating of 6000 or higher remains.
