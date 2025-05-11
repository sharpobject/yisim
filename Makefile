# Phony target for the default action
.PHONY: all
all: gamestate_nolog.js gamestate_full_nolog.js

# Target to generate gamestate_nolog.js
gamestate_nolog.js: gamestate.js
	sed '/^[[:space:]]*this\.log/d' gamestate.js > gamestate_nolog.js

# Target to generate gamestate_nolog.js
gamestate_full_nolog.js: gamestate_full.js
	sed '/^[[:space:]]*this\.log/d' gamestate_full.js > gamestate_full_nolog.js

gamestate_full.js: gamestate.jscpp preprocess.js
	bun preprocess.js

# Phony target to remove the generated file
.PHONY: clean
clean:
	rm -f gamestate_nolog.js gamestate_full_nolog.js gamestate_full.js gamestate_full_nolog_ui.js
