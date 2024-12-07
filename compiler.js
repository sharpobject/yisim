function compileAction(action, card, indentLevel = 0) {
    if (!Array.isArray(action)) return null;

    if (action.length === 0) return "";

    // If we get an array of actions, compile each one
    if (Array.isArray(action[0])) {
        return action.map(a => compileAction(a, card, indentLevel)).join('\n');
    }
    
    const indent = '    '.repeat(indentLevel);
    const [cmd, ...args] = action;
    
    // Handle if-clauses uniformly
    const ifClauses = {
        'cloud_hit': 'if_cloud_hit',
        'wood_spirit': 'if_wood_spirit',
        'fire_spirit': 'if_fire_spirit',
        'earth_spirit': 'if_earth_spirit',
        'metal_spirit': 'if_metal_spirit',
        'water_spirit': 'if_water_spirit',
        'star_point': 'if_star_point',
        'injured': 'if_injured',
        'if_c_pct_do': 'if_c_pct',
        'if_played_continuous_do': 'if_played_continuous',
        'if_any_element_activated_do': 'if_any_element_activated',
        'if_either_has_def_do': 'if_either_has_def',
        'if_enemy_has_debuff_do': 'if_enemy_has_debuff',
        'if_no_debuff_do': 'if_no_debuff',
        'post_action': 'if_post_action'
    };

    if (cmd in ifClauses) {
        const condition = ifClauses[cmd];
        if (args.length === 2 && !cmd.endsWith('_do')) {
            // Has both true and false branches
            return `${indent}if (game.${condition}()) {\n` +
                   compileAction(args[0], card, indentLevel + 1) + '\n' +
                   `${indent}} else {\n` +
                   compileAction(args[1], card, indentLevel + 1) + '\n' +
                   `${indent}}`;
        } else {
            // Just true branch
            const actionArg = cmd === 'if_c_pct_do' ? args[1] : args[0];
            const condArgs = cmd === 'if_c_pct_do' ? `(${args[0]})` : '()';
            return `${indent}if (game.${condition}${condArgs}) {\n` +
                   compileAction(actionArg, card, indentLevel + 1) + '\n' +
                   `${indent}}`;
        }
    }

    // Special handling for x/c conditions
    if (cmd === 'if_x_at_least_c_do' || cmd === 'if_x_at_most_c_do') {
        const operator = cmd === 'if_x_at_least_c_do' ? '>=' : '<=';
        return `${indent}if (game.players[0].${args[0]} ${operator} ${args[1]}) {\n` +
               compileAction(args[2], card, indentLevel + 1) + '\n' +
               `${indent}}`;
    }

    // rep needs special handling for bonus_rep_amt
    if (cmd === 'rep') {
        const count = args[0];
        const usesBonusRep = JSON.stringify(card.actions).includes('bonus_rep_amt');
        const loopCount = usesBonusRep ? 
            `${count} + game.players[0].bonus_rep_amt` : 
            count;
        return `${indent}for (let i = 0; i < ${loopCount}; i++) {\n` +
               compileAction(args[1], card, indentLevel + 1) + '\n' +
               `${indent}}`;
    }

    if (cmd === 'do_one_randomly') {
        const choices = args[0];
        let result = `${indent}switch (game.random_int(${choices.length})) {\n`;
        choices.forEach((choice, i) => {
            result += `${indent}    case ${i}:\n`;
            if (Array.isArray(choice[0])) {
                // Multiple actions for this choice
                choice.forEach(action => {
                    result += compileAction(action, card, indentLevel + 2);
                    result += '\n';
                });
            } else {
                // Single action for this choice
                result += compileAction(choice, card, indentLevel + 2);
                result += '\n';
            }
            result += `${indent}        break;\n`;
        });
        result += `${indent}}`;
        return result;
    }

    // Default case - direct function call with proper argument handling
    const processedArgs = args.map(arg => {
        if (typeof arg === 'string' && !arg.match(/^[0-9.]+$/)) {
            return `"${arg}"`;
        }
        if (Array.isArray(arg)) {
            return JSON.stringify(arg);
        }
        return arg;
    }).join(', ');

    return `${indent}game.${cmd}(${processedArgs});`;
}

function compileCard(cardId, card) {
    let output = `card_actions["${cardId}"] = (game) => {\n`;
    output += compileAction([card.actions], card, 1) + '\n';
    output += '}';
    return output;
}

function compileSwogi(swogi) {
    let output = 'export const card_actions = {};\n\n';

    for (const [cardId, card] of Object.entries(swogi)) {
        if (!card.actions) continue;

        output += `// ${card.name || cardId}\n`;
        output += compileCard(cardId, card) + '\n\n';
    }

    return output;
}

if (require.main === module) {
    const swogi = require('./swogi.json');
    console.log(compileSwogi(swogi));
}

module.exports = { compileAction, compileCard, compileSwogi };
