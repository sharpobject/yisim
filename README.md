# How to yisim

1. Get https://bun.sh/
2. `git clone https://github.com/sharpobject/yisim.git`
3. Run `bun install` in the yisim directory
4. (Optional) Get a sqlite browser

If you want to sim one battle, you can do `bun just_run.js < example.yaml`

I am told that in powershell you can instead use `Get-Content example.yaml | bun just_run.js`, and in cmd you can use `type example.yaml | bun just_run`.

If you want to search for a winning deck, you can do it the original way, which is to edit `riddle_data.json`, then run `bun swogi.js`

Or you can do it Xom's way, which is to run `bun enqueue.js example.yaml` then run `bun dispatcher.js` in which case you will want a sqlite browser. Then you can open `yisim.sqlite` in it, and the most basic thing you can do is sort the BATTLE table by `T_SIGMOID`, which represents the winning margin. (Pretty much it prioritizes the fastest win, then among wins on the same turn, it prioritizes by hp difference.) You can view the battle output by doing `bun just_run.js <BATTLE.ID>`
