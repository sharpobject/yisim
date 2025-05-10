export const card_actions = {};
export const card_opening = {};

// Cloud Sword - Touch Sky
card_actions["111011"] = (game) => {
    game.atk(6);
}

// 111012
card_actions["111012"] = (game) => {
    game.atk(9);
}

// 111013
card_actions["111013"] = (game) => {
    game.atk(12);
}

// Cloud Sword - Fleche
card_actions["111021"] = (game) => {
    game.atk(5);
    if (game.if_cloud_hit()) {
        game.atk(3);
    }
}

// 111022
card_actions["111022"] = (game) => {
    game.atk(6);
    if (game.if_cloud_hit()) {
        game.atk(5);
    }
}

// 111023
card_actions["111023"] = (game) => {
    game.atk(7);
    if (game.if_cloud_hit()) {
        game.atk(7);
    }
}

// Cloud Sword - Touch Earth
card_actions["111031"] = (game) => {
    game.atk(4);
    if (game.if_cloud_hit()) {
        game.increase_idx_def(0, 4);
    }
}

// 111032
card_actions["111032"] = (game) => {
    game.atk(6);
    if (game.if_cloud_hit()) {
        game.increase_idx_def(0, 6);
    }
}

// 111033
card_actions["111033"] = (game) => {
    game.atk(8);
    if (game.if_cloud_hit()) {
        game.increase_idx_def(0, 8);
    }
}

// Light Sword
card_actions["111041"] = (game) => {
    game.atk(4);
    game.increase_idx_qi(0, 1);
}

// 111042
card_actions["111042"] = (game) => {
    game.atk(4);
    game.increase_idx_qi(0, 2);
}

// 111043
card_actions["111043"] = (game) => {
    game.atk(4);
    game.increase_idx_qi(0, 3);
}

// Guard Qi
card_actions["111051"] = (game) => {
    game.increase_idx_qi(0, 1);
    game.increase_idx_def(0, 5);
}

// 111052
card_actions["111052"] = (game) => {
    game.increase_idx_qi(0, 2);
    game.increase_idx_def(0, 5);
}

// 111053
card_actions["111053"] = (game) => {
    game.increase_idx_qi(0, 3);
    game.increase_idx_def(0, 5);
}

// Qi Perfusion
card_actions["111061"] = (game) => {
    game.increase_idx_qi(0, 2);
    game.increase_idx_x_by_c(0, "ignore_def", 1);
}

// 111062
card_actions["111062"] = (game) => {
    game.increase_idx_qi(0, 3);
    game.increase_idx_x_by_c(0, "ignore_def", 1);
}

// 111063
card_actions["111063"] = (game) => {
    game.increase_idx_qi(0, 4);
    game.increase_idx_x_by_c(0, "ignore_def", 1);
}

// Giant Tiger Spirit Sword
card_actions["111071"] = (game) => {
    game.atk(10);
}

// 111072
card_actions["111072"] = (game) => {
    game.atk(13);
}

// 111073
card_actions["111073"] = (game) => {
    game.atk(16);
}

// Thunder Sword
card_actions["111081"] = (game) => {
    game.atk(5);
    if (game.if_injured()) {
        game.atk(6);
    }
}

// 111082
card_actions["111082"] = (game) => {
    game.atk(6);
    if (game.if_injured()) {
        game.atk(8);
    }
}

// 111083
card_actions["111083"] = (game) => {
    game.atk(7);
    if (game.if_injured()) {
        game.atk(10);
    }
}

// Sword Slash
card_actions["111091"] = (game) => {
    game.atk(4);
    game.increase_idx_x_by_c(0, "sword_intent", 2);
}

// 111092
card_actions["111092"] = (game) => {
    game.atk(5);
    game.increase_idx_x_by_c(0, "sword_intent", 3);
}

// 111093
card_actions["111093"] = (game) => {
    game.atk(6);
    game.increase_idx_x_by_c(0, "sword_intent", 4);
}

// Sword Defence
card_actions["111101"] = (game) => {
    game.increase_idx_def(0, 4);
    game.increase_idx_x_by_c(0, "sword_intent", 2);
}

// 111102
card_actions["111102"] = (game) => {
    game.increase_idx_def(0, 5);
    game.increase_idx_x_by_c(0, "sword_intent", 3);
}

// 111103
card_actions["111103"] = (game) => {
    game.increase_idx_def(0, 6);
    game.increase_idx_x_by_c(0, "sword_intent", 4);
}

// Flying Fang Sword
card_actions["111111"] = (game) => {
    game.atk(8);
    if (game.if_injured()) {
        game.regain_sword_intent();
    }
}

// 111112
card_actions["111112"] = (game) => {
    game.atk(11);
    if (game.if_injured()) {
        game.regain_sword_intent();
    }
}

// 111113
card_actions["111113"] = (game) => {
    game.atk(14);
    if (game.if_injured()) {
        game.regain_sword_intent();
    }
}

// Wind Sword
card_actions["111121"] = (game) => {
    for (let i = 0; i < 2; i++) {
        game.atk(3);
    }
}

// 111122
card_actions["111122"] = (game) => {
    for (let i = 0; i < 2; i++) {
        game.atk(4);
    }
}

// 111123
card_actions["111123"] = (game) => {
    for (let i = 0; i < 2; i++) {
        game.atk(6);
    }
}

// Cloud Sword - Reguard
card_actions["112011"] = (game) => {
    game.increase_idx_def(0, 8);
    if (game.if_cloud_hit()) {
        game.increase_idx_hp(0, 3);
    }
}

// 112012
card_actions["112012"] = (game) => {
    game.increase_idx_def(0, 11);
    if (game.if_cloud_hit()) {
        game.increase_idx_hp(0, 5);
    }
}

// 112013
card_actions["112013"] = (game) => {
    game.increase_idx_def(0, 14);
    if (game.if_cloud_hit()) {
        game.increase_idx_hp(0, 7);
    }
}

// Cloud Sword - Riddle
card_actions["112021"] = (game) => {
    game.atk(6);
    if (game.if_cloud_hit()) {
        game.increase_idx_x_by_c(0, "sword_intent", 2);
    }
}

// 112022
card_actions["112022"] = (game) => {
    game.atk(8);
    if (game.if_cloud_hit()) {
        game.increase_idx_x_by_c(0, "sword_intent", 3);
    }
}

// 112023
card_actions["112023"] = (game) => {
    game.atk(10);
    if (game.if_cloud_hit()) {
        game.increase_idx_x_by_c(0, "sword_intent", 4);
    }
}

// Cloud Sword - Conceal
card_actions["112031"] = (game) => {
    if (game.if_cloud_hit()) {
        game.atk(9);
    }
}

// 112032
card_actions["112032"] = (game) => {
    if (game.if_cloud_hit()) {
        game.atk(13);
    }
}

// 112033
card_actions["112033"] = (game) => {
    if (game.if_cloud_hit()) {
        game.atk(17);
    }
}

// Transforming Spirits Rhythm
card_actions["112041"] = (game) => {
    game.increase_idx_qi(0, 3);
}

// 112042
card_actions["112042"] = (game) => {
    game.increase_idx_qi(0, 4);
}

// 112043
card_actions["112043"] = (game) => {
    game.increase_idx_qi(0, 5);
}

// Spiritage Sword
card_actions["112051"] = (game) => {
    game.increase_idx_qi(0, 2);
    if (game.players[0].qi >= 3) {
        for (let i = 0; i < 2; i++) {
            game.atk(3);
        }
    }
}

// 112052
card_actions["112052"] = (game) => {
    game.increase_idx_qi(0, 3);
    if (game.players[0].qi >= 4) {
        for (let i = 0; i < 2; i++) {
            game.atk(3);
        }
    }
}

// 112053
card_actions["112053"] = (game) => {
    game.increase_idx_qi(0, 4);
    if (game.players[0].qi >= 5) {
        for (let i = 0; i < 2; i++) {
            game.atk(3);
        }
    }
}

// Giant Whale Spirit Sword
card_actions["112061"] = (game) => {
    game.atk(16);
}

// 112062
card_actions["112062"] = (game) => {
    game.atk(20);
}

// 112063
card_actions["112063"] = (game) => {
    game.atk(24);
}

// Contemplate Spirits Rhythm
card_actions["112071"] = (game) => {
    game.increase_idx_qi(0, 1);
    game.increase_idx_x_by_c(0, "sword_intent", 3);
}

// 112072
card_actions["112072"] = (game) => {
    game.increase_idx_qi(0, 1);
    game.increase_idx_x_by_c(0, "sword_intent", 4);
}

// 112073
card_actions["112073"] = (game) => {
    game.increase_idx_qi(0, 1);
    game.increase_idx_x_by_c(0, "sword_intent", 5);
}

// Consonance Sword Formation
card_actions["112081"] = (game) => {
    game.increase_idx_def(0, 9);
    game.exhaust_x_to_add_y("sword_intent", "qi");
}

// 112082
card_actions["112082"] = (game) => {
    game.increase_idx_def(0, 14);
    game.exhaust_x_to_add_y("sword_intent", "qi");
}

// 112083
card_actions["112083"] = (game) => {
    game.increase_idx_def(0, 19);
    game.exhaust_x_to_add_y("sword_intent", "qi");
}

// Earth Evil Sword
card_actions["112091"] = (game) => {
    game.atk(8);
    if (game.if_injured()) {
        game.for_each_x_add_y("damage_dealt_to_hp_by_atk", "def");
    }
}

// 112092
card_actions["112092"] = (game) => {
    game.atk(11);
    if (game.if_injured()) {
        game.for_each_x_add_y("damage_dealt_to_hp_by_atk", "def");
    }
}

// 112093
card_actions["112093"] = (game) => {
    game.atk(14);
    if (game.if_injured()) {
        game.for_each_x_add_y("damage_dealt_to_hp_by_atk", "def");
    }
}

// Form-Intention Sword
card_actions["112101"] = (game) => {
    game.atk(8);
    if (game.if_injured()) {
        game.increase_idx_x_by_c(0, "sword_intent", 3);
    }
}

// 112102
card_actions["112102"] = (game) => {
    game.atk(11);
    if (game.if_injured()) {
        game.increase_idx_x_by_c(0, "sword_intent", 4);
    }
}

// 112103
card_actions["112103"] = (game) => {
    game.atk(14);
    if (game.if_injured()) {
        game.increase_idx_x_by_c(0, "sword_intent", 5);
    }
}

// Unrestrained Sword - One
card_actions["112111"] = (game) => {
    game.atk(5 + game.players[0].unrestrained_sword_count * 2);
}

// 112112
card_actions["112112"] = (game) => {
    game.atk(8 + game.players[0].unrestrained_sword_count * 3);
}

// 112113
card_actions["112113"] = (game) => {
    game.atk(10 + game.players[0].unrestrained_sword_count * 5);
}

// Cloud Sword - Softheart
card_actions["113011"] = (game) => {
    game.continuous();
    game.add_c_of_x(2, "cloud_sword_softheart_stacks");
}

// 113012
card_actions["113012"] = (game) => {
    game.continuous();
    game.add_c_of_x(3, "cloud_sword_softheart_stacks");
}

// 113013
card_actions["113013"] = (game) => {
    game.continuous();
    game.add_c_of_x(4, "cloud_sword_softheart_stacks");
}

// Cloud Sword - Necessity
card_actions["113021"] = (game) => {
    for (let i = 0; i < 2; i++) {
        game.atk(4);
    }
    if (game.if_cloud_hit()) {
        game.increase_idx_x_by_c(0, "ignore_def", 1);
    }
}

// 113022
card_actions["113022"] = (game) => {
    for (let i = 0; i < 2; i++) {
        game.atk(6);
    }
    if (game.if_cloud_hit()) {
        game.increase_idx_x_by_c(0, "ignore_def", 1);
    }
}

// 113023
card_actions["113023"] = (game) => {
    for (let i = 0; i < 2; i++) {
        game.atk(8);
    }
    if (game.if_cloud_hit()) {
        game.increase_idx_x_by_c(0, "ignore_def", 2);
    }
}

// Cloud Sword - Pierce the Star
card_actions["113031"] = (game) => {
    game.increase_idx_qi(0, 2);
    game.atk(game.players[0].qi);
}

// 113032
card_actions["113032"] = (game) => {
    game.increase_idx_qi(0, 3);
    game.atk(game.players[0].qi);
}

// 113033
card_actions["113033"] = (game) => {
    game.increase_idx_qi(0, 4);
    game.atk(game.players[0].qi);
}

// Cloud Sword - Spirit Coercion
card_actions["113041"] = (game) => {
    game.atk(7);
    if (game.if_cloud_hit()) {
        game.for_each_x_add_y("cloud_sword_chain_count", "qi");
    }
}

// 113042
card_actions["113042"] = (game) => {
    game.atk(11);
    if (game.if_cloud_hit()) {
        game.for_each_x_add_y("cloud_sword_chain_count", "qi");
    }
}

// 113043
card_actions["113043"] = (game) => {
    game.atk(15);
    if (game.if_cloud_hit()) {
        game.for_each_x_add_y("cloud_sword_chain_count", "qi");
    }
}

// Cloud Dance Rhythm
card_actions["113051"] = (game) => {
    game.increase_idx_qi(0, 2);
    game.increase_idx_def(0, 2);
    game.increase_idx_x_by_c(0, "sword_intent", 2);
}

// 113052
card_actions["113052"] = (game) => {
    game.increase_idx_qi(0, 3);
    game.increase_idx_def(0, 3);
    game.increase_idx_x_by_c(0, "sword_intent", 3);
}

// 113053
card_actions["113053"] = (game) => {
    game.increase_idx_qi(0, 4);
    game.increase_idx_def(0, 4);
    game.increase_idx_x_by_c(0, "sword_intent", 4);
}

// Raven Spirit Sword
card_actions["113061"] = (game) => {
    game.atk(6);
    game.for_each_x_add_c_y("qi", 2, "def");
}

// 113062
card_actions["113062"] = (game) => {
    game.atk(6);
    game.for_each_x_add_c_y("qi", 3, "def");
}

// 113063
card_actions["113063"] = (game) => {
    game.atk(6);
    game.for_each_x_add_c_y("qi", 4, "def");
}

// Burst Sword
card_actions["113071"] = (game) => {
    game.atk(11);
    if (game.if_injured()) {
        game.reduce_enemy_c_of_x(1, "qi");
    }
}

// 113072
card_actions["113072"] = (game) => {
    game.atk(13);
    if (game.if_injured()) {
        game.reduce_enemy_c_of_x(2, "qi");
    }
}

// 113073
card_actions["113073"] = (game) => {
    game.atk(15);
    if (game.if_injured()) {
        game.reduce_enemy_c_of_x(3, "qi");
    }
}

// Giant Roc Spirit Sword
card_actions["113081"] = (game) => {
    game.atk(9);
    if (game.players[0].qi >= 1) {
        game.chase();
    }
}

// 113082
card_actions["113082"] = (game) => {
    game.atk(12);
    if (game.players[0].qi >= 1) {
        game.chase();
    }
}

// 113083
card_actions["113083"] = (game) => {
    game.atk(15);
    if (game.players[0].qi >= 1) {
        game.chase();
    }
}

// Reflexive Sword
card_actions["113091"] = (game) => {
    game.atk(11);
    if (game.if_injured()) {
        game.next_turn_def(7);
    }
}

// 113092
card_actions["113092"] = (game) => {
    game.atk(14);
    if (game.if_injured()) {
        game.next_turn_def(10);
    }
}

// 113093
card_actions["113093"] = (game) => {
    game.atk(17);
    if (game.if_injured()) {
        game.next_turn_def(13);
    }
}

// Mirror Flower Sword Formation
card_actions["113101"] = (game) => {
    game.increase_idx_def(0, 3);
    game.atk(game.players[0].def);
}

// 113102
card_actions["113102"] = (game) => {
    game.increase_idx_def(0, 5);
    game.atk(game.players[0].def);
}

// 113103
card_actions["113103"] = (game) => {
    game.increase_idx_def(0, 8);
    game.atk(game.players[0].def);
}

// Tri-Peak Sword
card_actions["113111"] = (game) => {
    for (let i = 0; i < 3; i++) {
        game.atk(3);
    }
}

// 113112
card_actions["113112"] = (game) => {
    for (let i = 0; i < 3; i++) {
        game.atk(4);
    }
}

// 113113
card_actions["113113"] = (game) => {
    for (let i = 0; i < 3; i++) {
        game.atk(5);
    }
}

// Cloud Sword - Flash Wind
card_actions["114011"] = (game) => {
    game.atk(4);
    if (game.if_cloud_hit()) {
        game.chase();
    }
}

// 114012
card_actions["114012"] = (game) => {
    game.atk(8);
    if (game.if_cloud_hit()) {
        game.chase();
    }
}

// 114013
card_actions["114013"] = (game) => {
    game.atk(12);
    if (game.if_cloud_hit()) {
        game.chase();
    }
}

// Cloud Sword - Moon Shade
card_actions["114021"] = (game) => {
    game.increase_idx_def(0, 1);
    if (game.if_cloud_hit()) {
        game.add_c_of_x(2, "increase_atk");
    }
}

// 114022
card_actions["114022"] = (game) => {
    game.increase_idx_def(0, 2);
    if (game.if_cloud_hit()) {
        game.add_c_of_x(3, "increase_atk");
    }
}

// 114023
card_actions["114023"] = (game) => {
    game.increase_idx_def(0, 3);
    if (game.if_cloud_hit()) {
        game.add_c_of_x(4, "increase_atk");
    }
}

// Spirit Gather Citta-Dharma
card_actions["114031"] = (game) => {
    game.increase_idx_qi(0, 1);
    game.continuous();
    game.add_c_of_x(1, "spirit_gather_citta_dharma_stacks");
}

// 114032
card_actions["114032"] = (game) => {
    game.increase_idx_qi(0, 1);
    game.continuous();
    game.add_c_of_x(2, "spirit_gather_citta_dharma_stacks");
}

// 114033
card_actions["114033"] = (game) => {
    game.increase_idx_qi(0, 3);
    game.continuous();
    game.add_c_of_x(2, "spirit_gather_citta_dharma_stacks");
}

// CentiBird Spirit Sword Rhythm
card_actions["114041"] = (game) => {
    game.increase_idx_qi(0, 1);
    game.continuous();
    game.add_c_of_x(1, "centibird_spirit_sword_rhythm_stacks");
}

// 114042
card_actions["114042"] = (game) => {
    game.increase_idx_qi(0, 3);
    game.continuous();
    game.add_c_of_x(1, "centibird_spirit_sword_rhythm_stacks");
}

// 114043
card_actions["114043"] = (game) => {
    game.increase_idx_qi(0, 3);
    game.continuous();
    game.add_c_of_x(2, "centibird_spirit_sword_rhythm_stacks");
}

// Egret Spirit Sword
card_actions["114051"] = (game) => {
    game.atk(5 + game.players[0].qi * 2);
}

// 114052
card_actions["114052"] = (game) => {
    game.atk(5 + game.players[0].qi * 3);
}

// 114053
card_actions["114053"] = (game) => {
    game.atk(5 + game.players[0].qi * 4);
}

// Giant Kun Spirit Sword
card_actions["114061"] = (game) => {
    game.atk(10);
    game.increase_idx_def(0, 10);
    game.chase();
}

// 114062
card_actions["114062"] = (game) => {
    game.atk(13);
    game.increase_idx_def(0, 13);
    game.chase();
}

// 114063
card_actions["114063"] = (game) => {
    game.atk(16);
    game.increase_idx_def(0, 16);
    game.chase();
}

// Inspiration Sword
card_actions["114071"] = (game) => {
    game.atk(8);
    if (game.if_injured()) {
        game.for_each_x_up_to_c_add_y("qi", 7, "sword_intent");
    } else {
        game.for_each_x_up_to_c_add_y("qi", 4, "sword_intent");
    }
}

// 114072
card_actions["114072"] = (game) => {
    game.atk(12);
    if (game.if_injured()) {
        game.for_each_x_up_to_c_add_y("qi", 10, "sword_intent");
    } else {
        game.for_each_x_up_to_c_add_y("qi", 5, "sword_intent");
    }
}

// 114073
card_actions["114073"] = (game) => {
    game.atk(16);
    if (game.if_injured()) {
        game.for_each_x_up_to_c_add_y("qi", 13, "sword_intent");
    } else {
        game.for_each_x_up_to_c_add_y("qi", 6, "sword_intent");
    }
}

// Flow Cloud Chaos Sword
card_actions["114081"] = (game) => {
    for (let i = 0; i < 4; i++) {
        game.atk(2);
    }
}

// 114082
card_actions["114082"] = (game) => {
    for (let i = 0; i < 5; i++) {
        game.atk(2);
    }
}

// 114083
card_actions["114083"] = (game) => {
    for (let i = 0; i < 6; i++) {
        game.atk(2);
    }
}

// Moon Water Sword Formation
card_actions["114091"] = (game) => {
    game.increase_idx_def(0, 10);
    game.add_c_of_x(3, "moon_water_sword_formation_stacks");
}

// 114092
card_actions["114092"] = (game) => {
    game.increase_idx_def(0, 14);
    game.add_c_of_x(4, "moon_water_sword_formation_stacks");
}

// 114093
card_actions["114093"] = (game) => {
    game.increase_idx_def(0, 18);
    game.add_c_of_x(5, "moon_water_sword_formation_stacks");
}

// Unrestrained Sword - Two
card_actions["114101"] = (game) => {
    game.for_each_x_add_y("unrestrained_sword_count", "bonus_rep_amt");
    for (let i = 0; i < 1 + game.players[0].bonus_rep_amt; i++) {
        game.atk(4);
    }
}

// 114102
card_actions["114102"] = (game) => {
    game.for_each_x_add_y("unrestrained_sword_count", "bonus_rep_amt");
    for (let i = 0; i < 1 + game.players[0].bonus_rep_amt; i++) {
        game.atk(6);
    }
}

// 114103
card_actions["114103"] = (game) => {
    game.for_each_x_add_y("unrestrained_sword_count", "bonus_rep_amt");
    for (let i = 0; i < 1 + game.players[0].bonus_rep_amt; i++) {
        game.atk(9);
    }
}

// Cloud Sword - Dragon Roam
card_actions["115011"] = (game) => {
    for (let i = 0; i < 2; i++) {
        game.atk(2);
        if (game.if_injured()) {
            game.chase();
        }
    }
    if (game.if_cloud_hit()) {
        game.increase_idx_def(0, 3);
    }
}

// 115012
card_actions["115012"] = (game) => {
    for (let i = 0; i < 3; i++) {
        game.atk(2);
        if (game.if_injured()) {
            game.chase();
        }
    }
    if (game.if_cloud_hit()) {
        game.increase_idx_def(0, 5);
    }
}

// 115013
card_actions["115013"] = (game) => {
    for (let i = 0; i < 4; i++) {
        game.atk(2);
        if (game.if_injured()) {
            game.chase();
        }
    }
    if (game.if_cloud_hit()) {
        game.increase_idx_def(0, 7);
    }
}

// Cloud Sword - Step Lightly
card_actions["115021"] = (game) => {
    for (let i = 0; i < 2; i++) {
        game.atk(3);
    }
    game.increase_idx_def(0, 3);
    if (game.if_cloud_hit()) {
        game.for_each_x_add_c_y("cloud_sword_chain_count", 3, "def");
    }
}

// 115022
card_actions["115022"] = (game) => {
    for (let i = 0; i < 3; i++) {
        game.atk(3);
    }
    game.increase_idx_def(0, 4);
    if (game.if_cloud_hit()) {
        game.for_each_x_add_c_y("cloud_sword_chain_count", 4, "def");
    }
}

// 115023
card_actions["115023"] = (game) => {
    for (let i = 0; i < 4; i++) {
        game.atk(3);
    }
    game.increase_idx_def(0, 5);
    if (game.if_cloud_hit()) {
        game.for_each_x_add_c_y("cloud_sword_chain_count", 5, "def");
    }
}

// Flying Spirit Shade Sword
card_actions["115031"] = (game) => {
    for (let i = 0; i < 4; i++) {
        game.atk(1);
        if (game.if_injured()) {
            game.increase_idx_qi(0, 1);
        }
    }
}

// 115032
card_actions["115032"] = (game) => {
    for (let i = 0; i < 5; i++) {
        game.atk(1);
        if (game.if_injured()) {
            game.increase_idx_qi(0, 1);
        }
    }
}

// 115033
card_actions["115033"] = (game) => {
    for (let i = 0; i < 6; i++) {
        game.atk(1);
        if (game.if_injured()) {
            game.increase_idx_qi(0, 1);
        }
    }
}

// Dharma Spirit Sword
card_actions["115041"] = (game) => {
    const qi_amt = game.players[0].qi;
    const atk_amt = 5 + qi_amt * 5;
    game.reduce_idx_x_by_c(0, "qi", qi_amt);
    game.atk(atk_amt);
}

// 115042
card_actions["115042"] = (game) => {
    const qi_amt = game.players[0].qi;
    const atk_amt = 5 + qi_amt * 6;
    game.reduce_idx_x_by_c(0, "qi", qi_amt);
    game.atk(atk_amt);
}

// 115043
card_actions["115043"] = (game) => {
    const qi_amt = game.players[0].qi;
    const atk_amt = 5 + qi_amt * 7;
    game.reduce_idx_x_by_c(0, "qi", qi_amt);
    game.atk(atk_amt);
}

// Sword Intent Surge
card_actions["115051"] = (game) => {
    game.for_each_x_add_c_pct_y("sword_intent", 80, "sword_intent");
}

// 115052
card_actions["115052"] = (game) => {
    game.for_each_x_add_c_pct_y("sword_intent", 110, "sword_intent");
}

// 115053
card_actions["115053"] = (game) => {
    game.for_each_x_add_c_pct_y("sword_intent", 140, "sword_intent");
}

// Rule Sky Sword Formation
card_actions["115061"] = (game) => {
    game.increase_idx_def(0, 8);
    game.chase();
}

// 115062
card_actions["115062"] = (game) => {
    game.increase_idx_def(0, 14);
    game.chase();
}

// 115063
card_actions["115063"] = (game) => {
    game.increase_idx_def(0, 20);
    game.chase();
}

// Chain Sword Formation
card_actions["115071"] = (game) => {
    game.increase_idx_def(0, 1);
    game.retrigger_previous_sword_formation();
}

// 115072
card_actions["115072"] = (game) => {
    game.increase_idx_def(0, 5);
    game.retrigger_previous_sword_formation();
}

// 115073
card_actions["115073"] = (game) => {
    game.increase_idx_def(0, 10);
    game.retrigger_previous_sword_formation();
}

// Unrestrained Sword - Zero
card_actions["115081"] = (game) => {
    game.continuous();
    game.add_c_of_x(30, "unrestrained_sword_zero_stacks");
}

// 115082
card_actions["115082"] = (game) => {
    game.continuous();
    game.add_c_of_x(50, "unrestrained_sword_zero_stacks");
}

// 115083
card_actions["115083"] = (game) => {
    game.continuous();
    game.add_c_of_x(70, "unrestrained_sword_zero_stacks");
}

// Shifting Stars
card_actions["121011"] = (game) => {
    game.atk(5);
    game.become_star_point(1);
}

// 121012
card_actions["121012"] = (game) => {
    game.atk(8);
    game.become_star_point(1);
}

// 121013
card_actions["121013"] = (game) => {
    game.atk(8);
    game.become_star_point(2);
}

// Dotted Around
card_actions["121021"] = (game) => {
    game.increase_idx_qi(0, 1);
    game.increase_idx_def(0, 2);
    game.add_c_of_x(1, "star_power");
}

// 121022
card_actions["121022"] = (game) => {
    game.increase_idx_qi(0, 2);
    game.increase_idx_def(0, 3);
    game.add_c_of_x(1, "star_power");
}

// 121023
card_actions["121023"] = (game) => {
    game.increase_idx_qi(0, 2);
    game.increase_idx_def(0, 4);
    game.add_c_of_x(2, "star_power");
}

// Astral Move - Block
card_actions["121031"] = (game) => {
    game.atk(6);
    if (game.if_star_point()) {
        game.increase_idx_def(0, 2);
    }
}

// 121032
card_actions["121032"] = (game) => {
    game.atk(8);
    if (game.if_star_point()) {
        game.increase_idx_def(0, 4);
    }
}

// 121033
card_actions["121033"] = (game) => {
    game.atk(10);
    if (game.if_star_point()) {
        game.increase_idx_def(0, 6);
    }
}

// Astral Move - Flank
card_actions["121041"] = (game) => {
    game.atk(6);
    if (game.if_star_point()) {
        game.atk(5);
    }
}

// 121042
card_actions["121042"] = (game) => {
    game.atk(7);
    if (game.if_star_point()) {
        game.atk(7);
    }
}

// 121043
card_actions["121043"] = (game) => {
    game.atk(8);
    if (game.if_star_point()) {
        game.atk(9);
    }
}

// Zhen Hexagram
card_actions["121051"] = (game) => {
    game.atk(4);
    game.add_c_of_x(1, "hexagram");
}

// 121052
card_actions["121052"] = (game) => {
    game.atk(7);
    game.add_c_of_x(1, "hexagram");
}

// 121053
card_actions["121053"] = (game) => {
    game.atk(10);
    game.add_c_of_x(1, "hexagram");
}

// Earth Hexagram
card_actions["121061"] = (game) => {
    game.increase_idx_def(0, 2);
    game.add_c_of_x(2, "hexagram");
}

// 121062
card_actions["121062"] = (game) => {
    game.increase_idx_def(0, 2);
    game.add_c_of_x(3, "hexagram");
}

// 121063
card_actions["121063"] = (game) => {
    game.increase_idx_def(0, 2);
    game.add_c_of_x(4, "hexagram");
}

// Wind Hexagram
card_actions["121071"] = (game) => {
    game.increase_idx_qi(0, 1);
    game.add_c_of_x(1, "hexagram");
}

// 121072
card_actions["121072"] = (game) => {
    game.increase_idx_qi(0, 2);
    game.add_c_of_x(1, "hexagram");
}

// 121073
card_actions["121073"] = (game) => {
    game.increase_idx_qi(0, 2);
    game.add_c_of_x(2, "hexagram");
}

// Palm Thunder
card_actions["121081"] = (game) => {
    game.atk_rand_range(2, 10);
}

// 121082
card_actions["121082"] = (game) => {
    game.atk_rand_range(5, 13);
}

// 121083
card_actions["121083"] = (game) => {
    game.atk_rand_range(8, 16);
}

// White Crane Bright Wings
card_actions["121091"] = (game) => {
    game.atk_rand_range(1, 8);
    game.increase_idx_qi(0, 1);
}

// 121092
card_actions["121092"] = (game) => {
    game.atk_rand_range(1, 8);
    game.increase_idx_qi(0, 2);
}

// 121093
card_actions["121093"] = (game) => {
    game.atk_rand_range(1, 8);
    game.increase_idx_qi(0, 3);
}

// Sparrow's Tail
card_actions["121101"] = (game) => {
    game.atk(9);
    if (game.if_c_pct(10)) {
        game.atk(5);
    }
}

// 121102
card_actions["121102"] = (game) => {
    game.atk(10);
    if (game.if_c_pct(10)) {
        game.atk(7);
    }
}

// 121103
card_actions["121103"] = (game) => {
    game.atk(11);
    if (game.if_c_pct(10)) {
        game.atk(9);
    }
}

// Striding Into the Wind
card_actions["121111"] = (game) => {
    for (let i = 0; i < 2; i++) {
        game.atk(3);
    }
    game.def_rand_range(1, 10);
}

// 121112
card_actions["121112"] = (game) => {
    for (let i = 0; i < 2; i++) {
        game.atk(4);
    }
    game.def_rand_range(1, 12);
}

// 121113
card_actions["121113"] = (game) => {
    for (let i = 0; i < 2; i++) {
        game.atk(5);
    }
    game.def_rand_range(1, 14);
}

// Incessant
card_actions["121121"] = (game) => {
    game.atk(6);
    if (game.if_post_action()) {
        game.increase_idx_hp(0, 2);
    }
}

// 121122
card_actions["121122"] = (game) => {
    game.atk(9);
    if (game.if_post_action()) {
        game.increase_idx_hp(0, 4);
    }
}

// 121123
card_actions["121123"] = (game) => {
    game.atk(12);
    if (game.if_post_action()) {
        game.increase_idx_hp(0, 6);
    }
}

// Astral Fleche
card_actions["122011"] = (game) => {
    game.atk(5);
    game.add_c_of_x(1, "star_power");
}

// 122012
card_actions["122012"] = (game) => {
    game.atk(5);
    game.add_c_of_x(2, "star_power");
}

// 122013
card_actions["122013"] = (game) => {
    game.atk(5);
    game.add_c_of_x(3, "star_power");
}

// Astral Move - Point
card_actions["122021"] = (game) => {
    game.atk(6);
    if (game.if_star_point()) {
        game.reduce_enemy_c_of_x(1, "qi");
    }
}

// 122022
card_actions["122022"] = (game) => {
    game.atk(10);
    if (game.if_star_point()) {
        game.reduce_enemy_c_of_x(1, "qi");
    }
}

// 122023
card_actions["122023"] = (game) => {
    game.atk(14);
    if (game.if_star_point()) {
        game.reduce_enemy_c_of_x(1, "qi");
    }
}

// Astral Move - Stand
card_actions["122031"] = (game) => {
    game.atk(7);
    if (game.if_star_point()) {
        game.increase_idx_qi(0, 1);
    }
}

// 122032
card_actions["122032"] = (game) => {
    game.atk(8);
    if (game.if_star_point()) {
        game.increase_idx_qi(0, 2);
    }
}

// 122033
card_actions["122033"] = (game) => {
    game.atk(9);
    if (game.if_star_point()) {
        game.increase_idx_qi(0, 3);
    }
}

// Mountain Hexagram
card_actions["122041"] = (game) => {
    game.add_c_of_x(2, "hexagram");
    game.add_c_of_x(2, "max_hp");
    game.increase_idx_hp(0, 2);
}

// 122042
card_actions["122042"] = (game) => {
    game.add_c_of_x(3, "hexagram");
    game.add_c_of_x(3, "max_hp");
    game.increase_idx_hp(0, 3);
}

// 122043
card_actions["122043"] = (game) => {
    game.add_c_of_x(4, "hexagram");
    game.add_c_of_x(4, "max_hp");
    game.increase_idx_hp(0, 4);
}

// Water Hexagram
card_actions["122051"] = (game) => {
    game.add_c_of_x(2, "hexagram");
    game.become_star_point(1);
}

// 122052
card_actions["122052"] = (game) => {
    game.add_c_of_x(3, "hexagram");
    game.become_star_point(1);
}

// 122053
card_actions["122053"] = (game) => {
    game.add_c_of_x(4, "hexagram");
    game.become_star_point(1);
}

// Falling Thunder
card_actions["122061"] = (game) => {
    game.atk_rand_range(6, 16);
}

// 122062
card_actions["122062"] = (game) => {
    game.atk_rand_range(9, 20);
}

// 122063
card_actions["122063"] = (game) => {
    game.atk_rand_range(12, 24);
}

// Cutting Weeds
card_actions["122071"] = (game) => {
    for (let i = 0; i < 2; i++) {
        game.atk(5);
    }
    game.reduce_enemy_max_hp_rand_range(3, 13);
}

// 122072
card_actions["122072"] = (game) => {
    for (let i = 0; i < 2; i++) {
        game.atk(7);
    }
    game.reduce_enemy_max_hp_rand_range(6, 17);
}

// 122073
card_actions["122073"] = (game) => {
    for (let i = 0; i < 2; i++) {
        game.atk(9);
    }
    game.reduce_enemy_max_hp_rand_range(9, 21);
}

// Golden Rooster Independence
card_actions["122081"] = (game) => {
    game.atk(11);
    if (game.if_c_pct(11)) {
        game.add_enemy_c_of_x(1, "weaken");
    }
}

// 122082
card_actions["122082"] = (game) => {
    game.atk(15);
    if (game.if_c_pct(11)) {
        game.add_enemy_c_of_x(1, "weaken");
    }
}

// 122083
card_actions["122083"] = (game) => {
    game.atk(15);
    if (game.if_c_pct(11)) {
        game.add_enemy_c_of_x(2, "weaken");
    }
}

// Stillness Citta-Dharma
card_actions["122091"] = (game) => {
    game.continuous();
    game.add_c_of_x(2, "stillness_citta_dharma_stacks");
}

// 122092
card_actions["122092"] = (game) => {
    game.continuous();
    game.add_c_of_x(3, "stillness_citta_dharma_stacks");
}

// 122093
card_actions["122093"] = (game) => {
    game.continuous();
    game.add_c_of_x(4, "stillness_citta_dharma_stacks");
}

// Flower Sentient
card_actions["122101"] = (game) => {
    game.increase_idx_qi(0, 1);
    game.increase_idx_def(0, 1);
    game.add_enemy_c_of_x(1, "internal_injury");
}

// 122102
card_actions["122102"] = (game) => {
    game.increase_idx_qi(0, 2);
    game.increase_idx_def(0, 2);
    game.add_enemy_c_of_x(1, "internal_injury");
}

// 122103
card_actions["122103"] = (game) => {
    game.increase_idx_qi(0, 3);
    game.increase_idx_def(0, 3);
    game.add_enemy_c_of_x(1, "internal_injury");
}

// Imposing
card_actions["122111"] = (game) => {
    game.increase_idx_qi(0, 2);
    if (game.if_post_action()) {
        game.increase_idx_hp(0, 6);
    }
}

// 122112
card_actions["122112"] = (game) => {
    game.increase_idx_qi(0, 3);
    if (game.if_post_action()) {
        game.increase_idx_hp(0, 9);
    }
}

// 122113
card_actions["122113"] = (game) => {
    game.increase_idx_qi(0, 4);
    if (game.if_post_action()) {
        game.increase_idx_hp(0, 12);
    }
}

// Starry Moon
card_actions["123011"] = (game) => {
    game.add_c_of_x(2, "star_power");
    game.become_star_point(2);
}

// 123012
card_actions["123012"] = (game) => {
    game.add_c_of_x(3, "star_power");
    game.become_star_point(2);
}

// 123013
card_actions["123013"] = (game) => {
    game.add_c_of_x(4, "star_power");
    game.become_star_point(2);
}

// Astral Move - Hit
card_actions["123021"] = (game) => {
    for (let i = 0; i < 2; i++) {
        game.atk(5);
    }
    if (game.if_star_point()) {
        game.atk(5);
    }
}

// 123022
card_actions["123022"] = (game) => {
    for (let i = 0; i < 2; i++) {
        game.atk(6);
    }
    if (game.if_star_point()) {
        game.atk(7);
    }
}

// 123023
card_actions["123023"] = (game) => {
    for (let i = 0; i < 2; i++) {
        game.atk(7);
    }
    if (game.if_star_point()) {
        game.atk(9);
    }
}

// Lake Hexagram
card_actions["123031"] = (game) => {
    game.add_c_of_x(2, "hexagram");
    game.increase_idx_qi(0, 2);
    game.add_enemy_c_of_x(2, "qi");
}

// 123032
card_actions["123032"] = (game) => {
    game.add_c_of_x(3, "hexagram");
    game.increase_idx_qi(0, 3);
    game.add_enemy_c_of_x(3, "qi");
}

// 123033
card_actions["123033"] = (game) => {
    game.add_c_of_x(4, "hexagram");
    game.increase_idx_qi(0, 4);
    game.add_enemy_c_of_x(4, "qi");
}

// White Snake
card_actions["123041"] = (game) => {
    if (game.if_c_pct(10)) {
        game.add_enemy_c_of_x(2, "flaw");
    }
    game.atk(6);
}

// 123042
card_actions["123042"] = (game) => {
    if (game.if_c_pct(10)) {
        game.add_enemy_c_of_x(3, "flaw");
    }
    game.atk(6);
}

// 123043
card_actions["123043"] = (game) => {
    if (game.if_c_pct(10)) {
        game.add_enemy_c_of_x(4, "flaw");
    }
    game.atk(6);
}

// Thunder Hexagram Rhythm
card_actions["123051"] = (game) => {
    game.atk_rand_range(1, 9);
    game.for_each_x_up_to_c_add_y("triggered_hexagram_count", 3, "hexagram");
}

// 123052
card_actions["123052"] = (game) => {
    game.atk_rand_range(1, 10);
    game.for_each_x_up_to_c_add_y("triggered_hexagram_count", 4, "hexagram");
}

// 123053
card_actions["123053"] = (game) => {
    game.atk_rand_range(1, 11);
    game.for_each_x_up_to_c_add_y("triggered_hexagram_count", 5, "hexagram");
}

// Yin Yang Formation
card_actions["123061"] = (game) => {
    game.increase_idx_qi(0, 2);
    game.for_each_x_add_c_y("hexagram", 1, "def");
    game.for_each_x_add_c_y("hexagram", 1, "hp");
}

// 123062
card_actions["123062"] = (game) => {
    game.increase_idx_qi(0, 3);
    game.for_each_x_add_c_y("hexagram", 2, "def");
    game.for_each_x_add_c_y("hexagram", 1, "hp");
}

// 123063
card_actions["123063"] = (game) => {
    game.increase_idx_qi(0, 4);
    game.for_each_x_add_c_y("hexagram", 2, "def");
    game.for_each_x_add_c_y("hexagram", 2, "hp");
}

// Ruthless Water
card_actions["123071"] = (game) => {
    game.atk(6);
    if (game.if_enemy_has_debuff()) {
        game.add_enemy_c_of_x(2, "internal_injury");
    }
}

// 123072
card_actions["123072"] = (game) => {
    game.atk(6);
    if (game.if_enemy_has_debuff()) {
        game.add_enemy_c_of_x(3, "internal_injury");
    }
}

// 123073
card_actions["123073"] = (game) => {
    game.atk(6);
    if (game.if_enemy_has_debuff()) {
        game.add_enemy_c_of_x(4, "internal_injury");
    }
}

// Qi Therapy
card_actions["123081"] = (game) => {
    game.add_c_of_x(8, "max_hp");
    game.heal_rand_range(8, 18);
}

// 123082
card_actions["123082"] = (game) => {
    game.add_c_of_x(12, "max_hp");
    game.heal_rand_range(12, 22);
}

// 123083
card_actions["123083"] = (game) => {
    game.add_c_of_x(16, "max_hp");
    game.heal_rand_range(16, 26);
}

// Revitalized
card_actions["123091"] = (game) => {
    const atk_amt = 10 + Math.floor(game.players[0].hp_gained * 20 / 100);
    game.atk(atk_amt);
}

// 123092
card_actions["123092"] = (game) => {
    const atk_amt = 10 + Math.floor(game.players[0].hp_gained * 25 / 100);
    game.atk(atk_amt);
}

// 123093
card_actions["123093"] = (game) => {
    const atk_amt = 10 + Math.floor(game.players[0].hp_gained * 33.333334 / 100);
    game.atk(atk_amt);
}

// Hunter Becomes Preyer
card_actions["123101"] = (game) => {
    for (let i = 0; i < 2; i++) {
        game.atk(2);
    }
    game.increase_idx_hp(0, 4);
    if (game.if_post_action()) {
        game.atk(7);
    }
}

// 123102
card_actions["123102"] = (game) => {
    for (let i = 0; i < 2; i++) {
        game.atk(3);
    }
    game.increase_idx_hp(0, 6);
    if (game.if_post_action()) {
        game.atk(10);
    }
}

// 123103
card_actions["123103"] = (game) => {
    for (let i = 0; i < 2; i++) {
        game.atk(4);
    }
    game.increase_idx_hp(0, 8);
    if (game.if_post_action()) {
        game.atk(13);
    }
}

// Drag Moon In Sea
card_actions["123111"] = (game) => {
    if (game.if_post_action()) {
        game.atk(12);
        game.chase();
    }
}

// 123112
card_actions["123112"] = (game) => {
    if (game.if_post_action()) {
        game.atk(18);
        game.chase();
    }
}

// 123113
card_actions["123113"] = (game) => {
    if (game.if_post_action()) {
        game.atk(24);
        game.chase();
    }
}

// Astral Move - Fly
card_actions["124011"] = (game) => {
    for (let i = 0; i < 2; i++) {
        game.atk(2);
    }
    if (game.if_star_point()) {
        game.chase();
    }
}

// 124012
card_actions["124012"] = (game) => {
    for (let i = 0; i < 2; i++) {
        game.atk(4);
    }
    if (game.if_star_point()) {
        game.chase();
    }
}

// 124013
card_actions["124013"] = (game) => {
    for (let i = 0; i < 2; i++) {
        game.atk(6);
    }
    if (game.if_star_point()) {
        game.chase();
    }
}

// Astral Move - Tiger
card_actions["124021"] = (game) => {
    for (let i = 0; i < 3; i++) {
        game.atk(1);
    }
    if (game.if_star_point()) {
        game.add_enemy_c_of_x(1, "weaken");
    }
}

// 124022
card_actions["124022"] = (game) => {
    for (let i = 0; i < 3; i++) {
        game.atk(1);
    }
    if (game.if_star_point()) {
        game.add_enemy_c_of_x(2, "weaken");
    }
}

// 124023
card_actions["124023"] = (game) => {
    for (let i = 0; i < 3; i++) {
        game.atk(1);
    }
    if (game.if_star_point()) {
        game.add_enemy_c_of_x(3, "weaken");
    }
}

// Hexagram Formacide
card_actions["124031"] = (game) => {
    game.continuous();
    game.add_c_of_x(3, "hexagram_formacide_stacks");
}

// 124032
card_actions["124032"] = (game) => {
    game.continuous();
    game.add_c_of_x(4, "hexagram_formacide_stacks");
}

// 124033
card_actions["124033"] = (game) => {
    game.continuous();
    game.add_c_of_x(5, "hexagram_formacide_stacks");
}

// Flame Hexagram
card_actions["124041"] = (game) => {
    game.add_c_of_x(3, "hexagram");
    game.reduce_enemy_c_of_x(2, "max_hp");
}

// 124042
card_actions["124042"] = (game) => {
    game.add_c_of_x(4, "hexagram");
    game.reduce_enemy_c_of_x(4, "max_hp");
}

// 124043
card_actions["124043"] = (game) => {
    game.add_c_of_x(5, "hexagram");
    game.reduce_enemy_c_of_x(6, "max_hp");
}

// Star Trail Divination
card_actions["124051"] = (game) => {
    game.do_star_trail_divination(6, 1, 1, 1);
}

// 124052
card_actions["124052"] = (game) => {
    game.do_star_trail_divination(12, 1, 1, 1);
}

// 124053
card_actions["124053"] = (game) => {
    game.do_star_trail_divination(18, 1, 1, 2);
}

// Dance Of The Dragonfly
card_actions["124061"] = (game) => {
    game.atk(5);
    if (game.if_c_pct(10)) {
        game.chase();
    }
}

// 124062
card_actions["124062"] = (game) => {
    game.atk(9);
    if (game.if_c_pct(10)) {
        game.chase();
    }
}

// 124063
card_actions["124063"] = (game) => {
    game.atk(13);
    if (game.if_c_pct(10)) {
        game.chase();
    }
}

// Thunder And Lightning
card_actions["124071"] = (game) => {
    game.do_thunder_and_lightning(10);
}

// 124072
card_actions["124072"] = (game) => {
    game.do_thunder_and_lightning(13);
}

// 124073
card_actions["124073"] = (game) => {
    game.do_thunder_and_lightning(16);
}

// Repel Citta-Dharma
card_actions["124081"] = (game) => {
    game.add_c_of_x(4, "max_hp");
    game.increase_idx_hp(0, 4);
    game.continuous();
    game.add_c_of_x(2, "repel_citta_dharma_stacks");
}

// 124082
card_actions["124082"] = (game) => {
    game.add_c_of_x(6, "max_hp");
    game.increase_idx_hp(0, 6);
    game.continuous();
    game.add_c_of_x(3, "repel_citta_dharma_stacks");
}

// 124083
card_actions["124083"] = (game) => {
    game.add_c_of_x(8, "max_hp");
    game.increase_idx_hp(0, 8);
    game.continuous();
    game.add_c_of_x(4, "repel_citta_dharma_stacks");
}

// Escape Plan
card_actions["124091"] = (game) => {
    game.increase_idx_def(0, 9);
    game.increase_idx_hp(0, 9);
    if (game.if_post_action()) {
        game.add_c_of_x(1, "guard_up");
    }
}

// 124092
card_actions["124092"] = (game) => {
    game.increase_idx_def(0, 12);
    game.increase_idx_hp(0, 12);
    if (game.if_post_action()) {
        game.add_c_of_x(1, "guard_up");
    }
}

// 124093
card_actions["124093"] = (game) => {
    game.increase_idx_def(0, 15);
    game.increase_idx_hp(0, 15);
    if (game.if_post_action()) {
        game.add_c_of_x(1, "guard_up");
    }
}

// Extremely Suspicious
card_actions["124101"] = (game) => {
    game.add_enemy_c_of_x(2, "internal_injury");
    game.do_internal_injury(1);
}

// 124102
card_actions["124102"] = (game) => {
    game.add_enemy_c_of_x(3, "internal_injury");
    game.do_internal_injury(1);
}

// 124103
card_actions["124103"] = (game) => {
    game.add_enemy_c_of_x(4, "internal_injury");
    game.do_internal_injury(1);
}

// Polaris Citta-Dharma
card_actions["125011"] = (game) => {
    game.continuous();
    game.do_polaris_citta_dharma(1);
}

// 125012
card_actions["125012"] = (game) => {
    game.continuous();
    game.do_polaris_citta_dharma(2);
}

// 125013
card_actions["125013"] = (game) => {
    game.continuous();
    game.do_polaris_citta_dharma(3);
}

// Astral Move - Cide
card_actions["125021"] = (game) => {
    game.atk(16);
    if (game.if_star_point()) {
        game.add_enemy_c_of_x(1, "skip_next_card_stacks");
    }
}

// 125022
card_actions["125022"] = (game) => {
    game.atk(22);
    if (game.if_star_point()) {
        game.add_enemy_c_of_x(1, "skip_next_card_stacks");
    }
}

// 125023
card_actions["125023"] = (game) => {
    game.atk(28);
    if (game.if_star_point()) {
        game.add_enemy_c_of_x(1, "skip_next_card_stacks");
    }
}

// Heaven Hexagram
card_actions["125031"] = (game) => {
    game.increase_idx_qi(0, 1);
    game.add_c_of_x(1, "hexagram");
    if (game.players[0].hexagram >= 3) {
        game.chase();
    }
}

// 125032
card_actions["125032"] = (game) => {
    game.increase_idx_qi(0, 2);
    game.add_c_of_x(2, "hexagram");
    if (game.players[0].hexagram >= 3) {
        game.chase();
    }
}

// 125033
card_actions["125033"] = (game) => {
    game.increase_idx_qi(0, 3);
    game.add_c_of_x(3, "hexagram");
    if (game.players[0].hexagram >= 3) {
        game.chase();
    }
}

// Five Thunders
card_actions["125041"] = (game) => {
    for (let i = 0; i < 5; i++) {
        if (game.if_c_pct(30)) {
            game.atk(8);
        }
    }
}

// 125042
card_actions["125042"] = (game) => {
    for (let i = 0; i < 5; i++) {
        if (game.if_c_pct(30)) {
            game.atk(10);
        }
    }
}

// 125043
card_actions["125043"] = (game) => {
    for (let i = 0; i < 5; i++) {
        if (game.if_c_pct(30)) {
            game.atk(12);
        }
    }
}

// Strike Twice
card_actions["125051"] = (game) => {
    game.increase_idx_hp(0, 2);
    game.add_c_of_x(1, "strike_twice_stacks");
}

// 125052
card_actions["125052"] = (game) => {
    game.increase_idx_hp(0, 8);
    game.add_c_of_x(1, "strike_twice_stacks");
}

// 125053
card_actions["125053"] = (game) => {
    game.increase_idx_hp(0, 14);
    game.add_c_of_x(1, "strike_twice_stacks");
}

// Great Spirit
card_actions["125061"] = (game) => {
    game.add_c_of_x(12, "max_hp");
    game.chase();
    if (game.if_post_action()) {
        game.increase_idx_hp(0, 24);
    }
}

// 125062
card_actions["125062"] = (game) => {
    game.add_c_of_x(16, "max_hp");
    game.chase();
    if (game.if_post_action()) {
        game.increase_idx_hp(0, 31);
    }
}

// 125063
card_actions["125063"] = (game) => {
    game.add_c_of_x(20, "max_hp");
    game.chase();
    if (game.if_post_action()) {
        game.increase_idx_hp(0, 38);
    }
}

// Hunter Hunting Hunter
card_actions["125071"] = (game) => {
    game.reverse_card_play_direction();
    game.continuous();
    game.add_c_of_x(7, "hunter_hunting_hunter_stacks");
}

// 125072
card_actions["125072"] = (game) => {
    game.reverse_card_play_direction();
    game.continuous();
    game.add_c_of_x(10, "hunter_hunting_hunter_stacks");
}

// 125073
card_actions["125073"] = (game) => {
    game.reverse_card_play_direction();
    game.continuous();
    game.add_c_of_x(13, "hunter_hunting_hunter_stacks");
}

// Propitious Omen
card_actions["125081"] = (game) => {
    game.increase_idx_qi(0, 2);
    game.do_propitious_omen(3);
}

// 125082
card_actions["125082"] = (game) => {
    game.increase_idx_qi(0, 2);
    game.do_propitious_omen(5);
}

// 125083
card_actions["125083"] = (game) => {
    game.increase_idx_qi(0, 2);
    game.do_propitious_omen(7);
}

// Wood Spirit Seal
card_actions["131011"] = (game) => {
    game.increase_idx_qi(0, 1);
    game.increase_idx_hp(0, 4);
    game.activate_wood_spirit();
}

// 131012
card_actions["131012"] = (game) => {
    game.increase_idx_qi(0, 2);
    game.increase_idx_hp(0, 4);
    game.activate_wood_spirit();
}

// 131013
card_actions["131013"] = (game) => {
    game.increase_idx_qi(0, 3);
    game.increase_idx_hp(0, 4);
    game.activate_wood_spirit();
}

// Wood Spirit - Bud
card_actions["131021"] = (game) => {
    for (let i = 0; i < 2; i++) {
        game.atk(3);
    }
    if (game.if_wood_spirit()) {
        game.increase_idx_hp(0, 5);
    }
}

// 131022
card_actions["131022"] = (game) => {
    for (let i = 0; i < 3; i++) {
        game.atk(3);
    }
    if (game.if_wood_spirit()) {
        game.increase_idx_hp(0, 5);
    }
}

// 131023
card_actions["131023"] = (game) => {
    for (let i = 0; i < 4; i++) {
        game.atk(3);
    }
    if (game.if_wood_spirit()) {
        game.increase_idx_hp(0, 5);
    }
}

// Fire Spirit Seal
card_actions["131031"] = (game) => {
    game.reduce_enemy_c_of_x(3, "hp");
    game.reduce_enemy_c_of_x(3, "max_hp");
    game.increase_idx_qi(0, 1);
    game.activate_fire_spirit();
}

// 131032
card_actions["131032"] = (game) => {
    game.reduce_enemy_c_of_x(3, "hp");
    game.reduce_enemy_c_of_x(3, "max_hp");
    game.increase_idx_qi(0, 2);
    game.activate_fire_spirit();
}

// 131033
card_actions["131033"] = (game) => {
    game.reduce_enemy_c_of_x(3, "hp");
    game.reduce_enemy_c_of_x(3, "max_hp");
    game.increase_idx_qi(0, 3);
    game.activate_fire_spirit();
}

// Fire Spirit - Rush
card_actions["131041"] = (game) => {
    game.atk(9);
    if (game.if_fire_spirit()) {
        game.atk(2);
    }
}

// 131042
card_actions["131042"] = (game) => {
    game.atk(11);
    if (game.if_fire_spirit()) {
        game.atk(3);
    }
}

// 131043
card_actions["131043"] = (game) => {
    game.atk(13);
    if (game.if_fire_spirit()) {
        game.atk(4);
    }
}

// Earth Spirit Seal
card_actions["131051"] = (game) => {
    game.atk(3);
    game.increase_idx_def(0, 4);
    game.activate_earth_spirit();
}

// 131052
card_actions["131052"] = (game) => {
    game.atk(5);
    game.increase_idx_def(0, 6);
    game.activate_earth_spirit();
}

// 131053
card_actions["131053"] = (game) => {
    game.atk(7);
    game.increase_idx_def(0, 8);
    game.activate_earth_spirit();
}

// Earth Spirit - Smash
card_actions["131061"] = (game) => {
    let atk_amt = 6;
    if (game.if_earth_spirit()) {
        if (game.if_either_has_def()) {
            atk_amt += 3;
        }
    }
    game.atk(atk_amt);
}

// 131062
card_actions["131062"] = (game) => {
    let atk_amt = 7;
    if (game.if_earth_spirit()) {
        if (game.if_either_has_def()) {
            atk_amt += 5;
        }
    }
    game.atk(atk_amt);
}

// 131063
card_actions["131063"] = (game) => {
    let atk_amt = 8;
    if (game.if_earth_spirit()) {
        if (game.if_either_has_def()) {
            atk_amt += 7;
        }
    }
    game.atk(atk_amt);
}

// Metal Spirit Seal
card_actions["131071"] = (game) => {
    game.atk(6);
    game.activate_metal_spirit();
}

// 131072
card_actions["131072"] = (game) => {
    game.atk(9);
    game.activate_metal_spirit();
}

// 131073
card_actions["131073"] = (game) => {
    game.atk(12);
    game.activate_metal_spirit();
}

// Metal Spirit - Needle
card_actions["131081"] = (game) => {
    game.atk(6);
    if (game.if_metal_spirit()) {
        game.add_c_of_x(2, "penetrate");
    }
}

// 131082
card_actions["131082"] = (game) => {
    game.atk(7);
    if (game.if_metal_spirit()) {
        game.add_c_of_x(4, "penetrate");
    }
}

// 131083
card_actions["131083"] = (game) => {
    game.atk(8);
    if (game.if_metal_spirit()) {
        game.add_c_of_x(6, "penetrate");
    }
}

// Water Spirit Seal
card_actions["131091"] = (game) => {
    game.increase_idx_qi(0, 2);
    game.activate_water_spirit();
}

// 131092
card_actions["131092"] = (game) => {
    game.increase_idx_qi(0, 3);
    game.activate_water_spirit();
}

// 131093
card_actions["131093"] = (game) => {
    game.increase_idx_qi(0, 4);
    game.activate_water_spirit();
}

// Water Spirit - Waves
card_actions["131101"] = (game) => {
    game.atk(10);
    if (game.if_water_spirit()) {
        game.add_c_of_x(1, "force_of_water");
    }
}

// 131102
card_actions["131102"] = (game) => {
    game.atk(13);
    if (game.if_water_spirit()) {
        game.add_c_of_x(1, "force_of_water");
    }
}

// 131103
card_actions["131103"] = (game) => {
    game.atk(16);
    if (game.if_water_spirit()) {
        game.add_c_of_x(1, "force_of_water");
    }
}

// Five Elements Fleche
card_actions["131111"] = (game) => {
    let atk_amt = 5;
    if (game.if_any_element_activated()) {
        atk_amt += 3;
    }
    game.atk(atk_amt);
}

// 131112
card_actions["131112"] = (game) => {
    let atk_amt = 5;
    if (game.if_any_element_activated()) {
        atk_amt += 6;
    }
    game.atk(atk_amt);
}

// 131113
card_actions["131113"] = (game) => {
    let atk_amt = 5;
    if (game.if_any_element_activated()) {
        atk_amt += 9;
    }
    game.atk(atk_amt);
}

// Wood Spirit - Recovery
card_actions["132011"] = (game) => {
    game.increase_idx_qi(0, 2);
    if (game.if_wood_spirit()) {
        const heal_amt = 3 + game.players[0].increase_atk;
        game.increase_idx_hp(0, heal_amt);
    }
}

// 132012
card_actions["132012"] = (game) => {
    game.increase_idx_qi(0, 3);
    if (game.if_wood_spirit()) {
        const heal_amt = 4 + game.players[0].increase_atk;
        game.increase_idx_hp(0, heal_amt);
    }
}

// 132013
card_actions["132013"] = (game) => {
    game.increase_idx_qi(0, 4);
    if (game.if_wood_spirit()) {
        const heal_amt = 6 + game.players[0].increase_atk;
        game.increase_idx_hp(0, heal_amt);
    }
}

// Wood Spirit - Sparse Shadow
card_actions["132021"] = (game) => {
    for (let i = 0; i < 2; i++) {
        game.atk(3);
    }
    if (game.if_wood_spirit()) {
        game.add_c_of_x(1, "increase_atk");
    }
}

// 132022
card_actions["132022"] = (game) => {
    for (let i = 0; i < 3; i++) {
        game.atk(3);
    }
    if (game.if_wood_spirit()) {
        game.add_c_of_x(1, "increase_atk");
    }
}

// 132023
card_actions["132023"] = (game) => {
    for (let i = 0; i < 4; i++) {
        game.atk(3);
    }
    if (game.if_wood_spirit()) {
        game.add_c_of_x(1, "increase_atk");
    }
}

// Fire Spirit - Flame Eater
card_actions["132031"] = (game) => {
    game.increase_idx_qi(0, 2);
    if (game.if_fire_spirit()) {
        game.reduce_enemy_c_of_x(3, "hp");
        game.reduce_enemy_c_of_x(3, "max_hp");
    }
}

// 132032
card_actions["132032"] = (game) => {
    game.increase_idx_qi(0, 3);
    if (game.if_fire_spirit()) {
        game.reduce_enemy_c_of_x(4, "hp");
        game.reduce_enemy_c_of_x(4, "max_hp");
    }
}

// 132033
card_actions["132033"] = (game) => {
    game.increase_idx_qi(0, 4);
    if (game.if_fire_spirit()) {
        game.reduce_enemy_c_of_x(6, "hp");
        game.reduce_enemy_c_of_x(6, "max_hp");
    }
}

// Fire Spirit - Scarlet Flame
card_actions["132041"] = (game) => {
    for (let i = 0; i < 2; i++) {
        game.atk(4);
    }
    if (game.if_fire_spirit()) {
        game.atk(4);
    }
}

// 132042
card_actions["132042"] = (game) => {
    for (let i = 0; i < 2; i++) {
        game.atk(5);
    }
    if (game.if_fire_spirit()) {
        game.atk(6);
    }
}

// 132043
card_actions["132043"] = (game) => {
    for (let i = 0; i < 2; i++) {
        game.atk(6);
    }
    if (game.if_fire_spirit()) {
        game.atk(8);
    }
}

// Earth Spirit Formation
card_actions["132051"] = (game) => {
    game.increase_idx_def(0, 4);
    game.continuous();
    game.add_c_of_x(2, "earth_spirit_formation_stacks");
}

// 132052
card_actions["132052"] = (game) => {
    game.increase_idx_def(0, 6);
    game.continuous();
    game.add_c_of_x(3, "earth_spirit_formation_stacks");
}

// 132053
card_actions["132053"] = (game) => {
    game.increase_idx_def(0, 8);
    game.continuous();
    game.add_c_of_x(4, "earth_spirit_formation_stacks");
}

// Earth Spirit - Mountains
card_actions["132061"] = (game) => {
    game.atk(5);
    game.increase_idx_def(0, 2);
    if (game.if_earth_spirit()) {
        game.add_c_of_x(3, "next_turn_def");
    }
}

// 132062
card_actions["132062"] = (game) => {
    game.atk(6);
    game.increase_idx_def(0, 3);
    if (game.if_earth_spirit()) {
        game.add_c_of_x(6, "next_turn_def");
    }
}

// 132063
card_actions["132063"] = (game) => {
    game.atk(7);
    game.increase_idx_def(0, 4);
    if (game.if_earth_spirit()) {
        game.add_c_of_x(9, "next_turn_def");
    }
}

// Metal Spirit Formation
card_actions["132071"] = (game) => {
    game.add_c_of_x(4, "penetrate");
    game.continuous();
    game.add_c_of_x(1, "metal_spirit_formation_stacks");
}

// 132072
card_actions["132072"] = (game) => {
    game.add_c_of_x(4, "penetrate");
    game.continuous();
    game.add_c_of_x(2, "metal_spirit_formation_stacks");
}

// 132073
card_actions["132073"] = (game) => {
    game.add_c_of_x(4, "penetrate");
    game.continuous();
    game.add_c_of_x(3, "metal_spirit_formation_stacks");
}

// Metal Spirit - Heart Pierce
card_actions["132081"] = (game) => {
    game.atk(7);
    if (game.if_metal_spirit()) {
        game.add_c_of_x(1, "ignore_def");
    }
}

// 132082
card_actions["132082"] = (game) => {
    game.atk(10);
    if (game.if_metal_spirit()) {
        game.add_c_of_x(2, "ignore_def");
    }
}

// 132083
card_actions["132083"] = (game) => {
    game.atk(13);
    if (game.if_metal_spirit()) {
        game.add_c_of_x(3, "ignore_def");
    }
}

// Water Spirit - Billows
card_actions["132091"] = (game) => {
    game.add_c_of_x(2, "force_of_water");
}

// 132092
card_actions["132092"] = (game) => {
    game.add_c_of_x(3, "force_of_water");
}

// 132093
card_actions["132093"] = (game) => {
    game.add_c_of_x(4, "force_of_water");
}

// Water Spirit - Turbulent
card_actions["132101"] = (game) => {
    let atk_amt = 10;
    if (game.if_water_spirit()) {
        atk_amt += game.players[0].force_of_water;
    }
    game.atk(atk_amt);
}

// 132102
card_actions["132102"] = (game) => {
    let atk_amt = 14;
    if (game.if_water_spirit()) {
        atk_amt += game.players[0].force_of_water;
    }
    game.atk(atk_amt);
}

// 132103
card_actions["132103"] = (game) => {
    let atk_amt = 18;
    if (game.if_water_spirit()) {
        atk_amt += game.players[0].force_of_water;
    }
    game.atk(atk_amt);
}

// Cosmos Seal
card_actions["132111"] = (game) => {
    game.atk(5);
    game.increase_idx_qi(0, 1);
    game.add_c_of_x(1, "cosmos_seal_stacks");
}

// 132112
card_actions["132112"] = (game) => {
    game.atk(9);
    game.increase_idx_qi(0, 1);
    game.add_c_of_x(1, "cosmos_seal_stacks");
}

// 132113
card_actions["132113"] = (game) => {
    game.atk(13);
    game.increase_idx_qi(0, 1);
    game.add_c_of_x(1, "cosmos_seal_stacks");
}

// Wood Spirit Formation
card_actions["133011"] = (game) => {
    game.add_c_of_x(10, "max_hp");
    game.continuous();
    game.add_c_of_x(2, "wood_spirit_formation_stacks");
}

// 133012
card_actions["133012"] = (game) => {
    game.add_c_of_x(15, "max_hp");
    game.continuous();
    game.add_c_of_x(3, "wood_spirit_formation_stacks");
}

// 133013
card_actions["133013"] = (game) => {
    game.add_c_of_x(20, "max_hp");
    game.continuous();
    game.add_c_of_x(4, "wood_spirit_formation_stacks");
}

// Wood Spirit - Forest Guard
card_actions["133021"] = (game) => {
    for (let i = 0; i < 2; i++) {
        game.add_c_of_x(1, "smash_def");
        game.atk(1);
    }
    if (game.if_wood_spirit()) {
        game.add_c_of_x(1, "chase_if_hp_gained");
    }
}

// 133022
card_actions["133022"] = (game) => {
    for (let i = 0; i < 2; i++) {
        game.add_c_of_x(1, "smash_def");
        game.atk(2);
    }
    if (game.if_wood_spirit()) {
        game.add_c_of_x(1, "chase_if_hp_gained");
    }
}

// 133023
card_actions["133023"] = (game) => {
    for (let i = 0; i < 2; i++) {
        game.add_c_of_x(1, "smash_def");
        game.atk(3);
    }
    if (game.if_wood_spirit()) {
        game.add_c_of_x(1, "chase_if_hp_gained");
    }
}

// Fire Spirit Formation
card_actions["133031"] = (game) => {
    game.reduce_enemy_c_of_x(2, "hp");
    game.reduce_enemy_c_of_x(2, "max_hp");
    game.continuous();
    game.add_c_of_x(2, "fire_spirit_formation_stacks");
}

// 133032
card_actions["133032"] = (game) => {
    game.reduce_enemy_c_of_x(3, "hp");
    game.reduce_enemy_c_of_x(3, "max_hp");
    game.continuous();
    game.add_c_of_x(3, "fire_spirit_formation_stacks");
}

// 133033
card_actions["133033"] = (game) => {
    game.reduce_enemy_c_of_x(4, "hp");
    game.reduce_enemy_c_of_x(4, "max_hp");
    game.continuous();
    game.add_c_of_x(4, "fire_spirit_formation_stacks");
}

// Fire Spirit - Blast
card_actions["133041"] = (game) => {
    game.add_c_of_x(1, "increase_atk");
    if (game.if_fire_spirit()) {
        let reduce_amt = 7 + game.players[0].increase_atk;
        game.reduce_enemy_c_of_x(reduce_amt, "hp");
        game.reduce_enemy_c_of_x(reduce_amt, "max_hp");
    }
}

// 133042
card_actions["133042"] = (game) => {
    game.add_c_of_x(2, "increase_atk");
    if (game.if_fire_spirit()) {
        let reduce_amt = 7 + game.players[0].increase_atk;
        game.reduce_enemy_c_of_x(reduce_amt, "hp");
        game.reduce_enemy_c_of_x(reduce_amt, "max_hp");
    }
}

// 133043
card_actions["133043"] = (game) => {
    game.add_c_of_x(3, "increase_atk");
    if (game.if_fire_spirit()) {
        let reduce_amt = 7 + game.players[0].increase_atk;
        game.reduce_enemy_c_of_x(reduce_amt, "hp");
        game.reduce_enemy_c_of_x(reduce_amt, "max_hp");
    }
}

// Earth Spirit - Dust
card_actions["133051"] = (game) => {
    game.atk(8);
    if (game.if_earth_spirit()) {
        game.do_earth_spirit_dust();
    }
}

// 133052
card_actions["133052"] = (game) => {
    game.atk(12);
    if (game.if_earth_spirit()) {
        game.do_earth_spirit_dust();
    }
}

// 133053
card_actions["133053"] = (game) => {
    game.atk(16);
    if (game.if_earth_spirit()) {
        game.do_earth_spirit_dust();
    }
}

// Earth Spirit - Cliff
card_actions["133061"] = (game) => {
    game.increase_idx_def(0, 10);
    if (game.if_earth_spirit()) {
        game.add_c_of_x(1, "earth_spirit_cliff_stacks");
    }
}

// 133062
card_actions["133062"] = (game) => {
    game.increase_idx_def(0, 15);
    if (game.if_earth_spirit()) {
        game.add_c_of_x(1, "earth_spirit_cliff_stacks");
    }
}

// 133063
card_actions["133063"] = (game) => {
    game.increase_idx_def(0, 20);
    if (game.if_earth_spirit()) {
        game.add_c_of_x(1, "earth_spirit_cliff_stacks");
    }
}

// Metal Spirit - Charge
card_actions["133071"] = (game) => {
    game.increase_idx_def(0, 4);
    game.do_metal_spirit_charge(4);
}

// 133072
card_actions["133072"] = (game) => {
    game.increase_idx_def(0, 6);
    game.do_metal_spirit_charge(6);
}

// 133073
card_actions["133073"] = (game) => {
    game.increase_idx_def(0, 8);
    game.do_metal_spirit_charge(8);
}

// Metal Spirit - Sharp
card_actions["133081"] = (game) => {
    game.atk(6);
    if (game.if_metal_spirit()) {
        game.for_each_x_add_c_pct_y("damage_dealt_to_hp_by_atk", 50, "penetrate");
    }
}

// 133082
card_actions["133082"] = (game) => {
    game.atk(9);
    if (game.if_metal_spirit()) {
        game.for_each_x_add_c_pct_y("damage_dealt_to_hp_by_atk", 50, "penetrate");
    }
}

// 133083
card_actions["133083"] = (game) => {
    game.atk(12);
    if (game.if_metal_spirit()) {
        game.for_each_x_add_c_pct_y("damage_dealt_to_hp_by_atk", 50, "penetrate");
    }
}

// Water Spirit Formation
card_actions["133091"] = (game) => {
    game.increase_idx_qi(0, 2);
    game.continuous();
    game.add_c_of_x(1, "water_spirit_formation_stacks");
}

// 133092
card_actions["133092"] = (game) => {
    game.increase_idx_qi(0, 3);
    game.continuous();
    game.add_c_of_x(1, "water_spirit_formation_stacks");
}

// 133093
card_actions["133093"] = (game) => {
    game.increase_idx_qi(0, 5);
    game.continuous();
    game.add_c_of_x(1, "water_spirit_formation_stacks");
}

// Water Spirit - Spring
card_actions["133101"] = (game) => {
    game.increase_idx_qi(0, 2);
    if (game.if_water_spirit()) {
        game.add_c_of_x(1, "water_spirit_spring_stacks");
    }
}

// 133102
card_actions["133102"] = (game) => {
    game.increase_idx_qi(0, 3);
    if (game.if_water_spirit()) {
        game.add_c_of_x(1, "water_spirit_spring_stacks");
    }
}

// 133103
card_actions["133103"] = (game) => {
    game.increase_idx_qi(0, 4);
    if (game.if_water_spirit()) {
        game.add_c_of_x(1, "water_spirit_spring_stacks");
    }
}

// Five Elements Circulation
card_actions["133111"] = (game) => {
    game.do_five_elements_circulation(1);
}

// 133112
card_actions["133112"] = (game) => {
    game.do_five_elements_circulation(2);
}

// 133113
card_actions["133113"] = (game) => {
    game.do_five_elements_circulation(3);
}

// Wood Spirit - Fragrant
card_actions["134011"] = (game) => {
    game.increase_idx_qi(0, 2);
    game.increase_idx_hp(0, 2);
    if (game.if_wood_spirit()) {
        game.for_each_x_add_c_pct_y("qi", 33.333334, "increase_atk");
    }
}

// 134012
card_actions["134012"] = (game) => {
    game.increase_idx_qi(0, 3);
    game.increase_idx_hp(0, 3);
    if (game.if_wood_spirit()) {
        game.for_each_x_add_c_pct_y("qi", 33.333334, "increase_atk");
    }
}

// 134013
card_actions["134013"] = (game) => {
    game.increase_idx_qi(0, 4);
    game.increase_idx_hp(0, 4);
    if (game.if_wood_spirit()) {
        game.for_each_x_add_c_pct_y("qi", 33.333334, "increase_atk");
    }
}

// Wood Spirit - Thorn
card_actions["134021"] = (game) => {
    for (let i = 0; i < 3; i++) {
        game.atk(4);
    }
    if (game.if_wood_spirit()) {
        const heal_amt = Math.floor(
            game.players[0].damage_dealt_to_hp_by_this_card_atk * 33.333334 / 100);
        game.increase_idx_hp(0, heal_amt);
    }
}

// 134022
card_actions["134022"] = (game) => {
    for (let i = 0; i < 4; i++) {
        game.atk(4);
    }
    if (game.if_wood_spirit()) {
        const heal_amt = Math.floor(
            game.players[0].damage_dealt_to_hp_by_this_card_atk * 33.333334 / 100);
        game.increase_idx_hp(0, heal_amt);
    }
}

// 134023
card_actions["134023"] = (game) => {
    for (let i = 0; i < 5; i++) {
        game.atk(4);
    }
    if (game.if_wood_spirit()) {
        const heal_amt = Math.floor(
            game.players[0].damage_dealt_to_hp_by_this_card_atk * 33.333334 / 100);
        game.increase_idx_hp(0, heal_amt);
    }
}

// Fire Spirit - Flash Fire
card_actions["134031"] = (game) => {
    game.reduce_enemy_c_of_x(4, "max_hp");
    if (game.if_fire_spirit()) {
        game.chase();
    }
}

// 134032
card_actions["134032"] = (game) => {
    game.reduce_enemy_c_of_x(8, "max_hp");
    if (game.if_fire_spirit()) {
        game.chase();
    }
}

// 134033
card_actions["134033"] = (game) => {
    game.reduce_enemy_c_of_x(12, "max_hp");
    if (game.if_fire_spirit()) {
        game.chase();
    }
}

// Fire Spirit - Heart Fire
card_actions["134041"] = (game) => {
    for (let i = 0; i < 2; i++) {
        game.atk(4);
    }
    if (game.if_fire_spirit()) {
        if (game.players[0].damage_dealt_to_hp_by_this_card_atk >= 1) {
            game.for_each_x_reduce_enemy_c_y("damage_dealt_to_hp_by_this_card_atk", 2, "max_hp");
        }
    }
}

// 134042
card_actions["134042"] = (game) => {
    for (let i = 0; i < 2; i++) {
        game.atk(5);
    }
    if (game.if_fire_spirit()) {
        if (game.players[0].damage_dealt_to_hp_by_this_card_atk >= 1) {
            game.for_each_x_reduce_enemy_c_y("damage_dealt_to_hp_by_this_card_atk", 2, "max_hp");
        }
    }
}

// 134043
card_actions["134043"] = (game) => {
    for (let i = 0; i < 2; i++) {
        game.atk(7);
    }
    if (game.if_fire_spirit()) {
        if (game.players[0].damage_dealt_to_hp_by_this_card_atk >= 1) {
            game.for_each_x_reduce_enemy_c_y("damage_dealt_to_hp_by_this_card_atk", 2, "max_hp");
        }
    }
}

// Earth Spirit - Steep
card_actions["134051"] = (game) => {
    let def_amt = 12;
    const me = game.players[0];
    if (game.if_earth_spirit()) {
        def_amt += Math.floor(me.def_lost * 16.666667 / 100);
    }
    game.increase_idx_def(0, def_amt);
}

// 134052
card_actions["134052"] = (game) => {
    let def_amt = 12;
    const me = game.players[0];
    if (game.if_earth_spirit()) {
        def_amt += Math.floor(me.def_lost * 20 / 100);
    }
    game.increase_idx_def(0, def_amt);
}

// 134053
card_actions["134053"] = (game) => {
    let def_amt = 12;
    const me = game.players[0];
    if (game.if_earth_spirit()) {
        def_amt += Math.floor(me.def_lost * 25 / 100);
    }
    game.increase_idx_def(0, def_amt);
}

// Earth Spirit - Quicksand
card_actions["134061"] = (game) => {
    let atk_amt = 9;
    if (game.if_earth_spirit()) {
        atk_amt += Math.floor(game.players[0].def_lost * 16.666667 / 100);
    }
    game.atk(atk_amt);
}

// 134062
card_actions["134062"] = (game) => {
    let atk_amt = 9;
    if (game.if_earth_spirit()) {
        atk_amt += Math.floor(game.players[0].def_lost * 20 / 100);
    }
    game.atk(atk_amt);
}

// 134063
card_actions["134063"] = (game) => {
    let atk_amt = 9;
    if (game.if_earth_spirit()) {
        atk_amt += Math.floor(game.players[0].def_lost * 25 / 100);
    }
    game.atk(atk_amt);
}

// Metal Spirit - Shuttle
card_actions["134071"] = (game) => {
    game.add_c_of_x(1, "disable_penetrate_stacks");
    game.atk(4);
    if (game.if_metal_spirit()) {
        game.chase();
    }
}

// 134072
card_actions["134072"] = (game) => {
    game.add_c_of_x(1, "disable_penetrate_stacks");
    game.atk(8);
    if (game.if_metal_spirit()) {
        game.chase();
    }
}

// 134073
card_actions["134073"] = (game) => {
    game.add_c_of_x(1, "disable_penetrate_stacks");
    game.atk(12);
    if (game.if_metal_spirit()) {
        game.chase();
    }
}

// Metal Spirit - Iron Bone
card_actions["134081"] = (game) => {
    if (game.if_metal_spirit()) {
        game.add_c_of_x(2, "metal_spirit_iron_bone_stacks");
    }
}

// 134082
card_actions["134082"] = (game) => {
    if (game.if_metal_spirit()) {
        game.add_c_of_x(3, "metal_spirit_iron_bone_stacks");
    }
}

// 134083
card_actions["134083"] = (game) => {
    if (game.if_metal_spirit()) {
        game.add_c_of_x(4, "metal_spirit_iron_bone_stacks");
    }
}

// Water Spirit - Great Waves
card_actions["134091"] = (game) => {
    game.increase_idx_qi(0, 2);
    game.add_c_of_x(2, "max_hp");
    game.add_c_of_x(2, "hp");
    if (game.if_water_spirit()) {
        game.for_each_x_add_c_pct_y("qi", 50, "force_of_water");
    }
}

// 134092
card_actions["134092"] = (game) => {
    game.increase_idx_qi(0, 3);
    game.add_c_of_x(3, "max_hp");
    game.add_c_of_x(3, "hp");
    if (game.if_water_spirit()) {
        game.for_each_x_add_c_pct_y("qi", 50, "force_of_water");
    }
}

// 134093
card_actions["134093"] = (game) => {
    game.increase_idx_qi(0, 4);
    game.add_c_of_x(4, "max_hp");
    game.add_c_of_x(4, "hp");
    if (game.if_water_spirit()) {
        game.for_each_x_add_c_pct_y("qi", 50, "force_of_water");
    }
}

// Water Spirit - Dive
card_actions["134101"] = (game) => {
    game.add_c_of_x(2, "max_hp");
    game.increase_idx_hp(0, 2);
    if (game.if_water_spirit()) {
        game.add_c_of_x(2, "water_spirit_dive_stacks");
    }
}

// 134102
card_actions["134102"] = (game) => {
    game.add_c_of_x(7, "max_hp");
    game.increase_idx_hp(0, 7);
    if (game.if_water_spirit()) {
        game.add_c_of_x(2, "water_spirit_dive_stacks");
    }
}

// 134103
card_actions["134103"] = (game) => {
    game.add_c_of_x(12, "max_hp");
    game.increase_idx_hp(0, 12);
    if (game.if_water_spirit()) {
        game.add_c_of_x(2, "water_spirit_dive_stacks");
    }
}

// World Smash
card_actions["134111"] = (game) => {
    let atk_amt = 4;
    atk_amt += game.get_n_different_five_elements(0) * 4;
    game.add_c_of_x(1, "smash_def");
    game.atk(atk_amt);
}

// 134112
card_actions["134112"] = (game) => {
    let atk_amt = 7;
    atk_amt += game.get_n_different_five_elements(0) * 5;
    game.add_c_of_x(1, "smash_def");
    game.atk(atk_amt);
}

// 134113
card_actions["134113"] = (game) => {
    let atk_amt = 10;
    atk_amt += game.get_n_different_five_elements(0) * 6;
    game.add_c_of_x(1, "smash_def");
    game.atk(atk_amt);
}

// Wood Spirit - Willow Leaf
card_actions["135011"] = (game) => {
    game.add_c_of_x(1, "increase_atk");
    game.increase_idx_hp(0, 3);
    if (game.if_wood_spirit()) {
        game.chase();
    }
}

// 135012
card_actions["135012"] = (game) => {
    game.add_c_of_x(2, "increase_atk");
    game.increase_idx_hp(0, 3);
    if (game.if_wood_spirit()) {
        game.chase();
    }
}

// 135013
card_actions["135013"] = (game) => {
    game.add_c_of_x(3, "increase_atk");
    game.increase_idx_hp(0, 3);
    if (game.if_wood_spirit()) {
        game.chase();
    }
}

// Fire Spirit - Blazing Prairie
card_actions["135021"] = (game) => {
    for (let i = 0; i < 3; i++) {
        game.atk(6);
    }
    if (game.if_fire_spirit()) {
        game.do_fire_spirit_blazing_praerie(2);
    }
}

// 135022
card_actions["135022"] = (game) => {
    for (let i = 0; i < 3; i++) {
        game.atk(8);
    }
    if (game.if_fire_spirit()) {
        game.do_fire_spirit_blazing_praerie(3);
    }
}

// 135023
card_actions["135023"] = (game) => {
    for (let i = 0; i < 3; i++) {
        game.atk(10);
    }
    if (game.if_fire_spirit()) {
        game.do_fire_spirit_blazing_praerie(4);
    }
}

// Earth Spirit - Combine World
card_actions["135031"] = (game) => {
    game.increase_idx_def(0, 12);
    if (game.if_earth_spirit()) {
        game.add_c_of_x(2, "earth_spirit_combine_world_stacks");
    }
}

// 135032
card_actions["135032"] = (game) => {
    game.increase_idx_def(0, 12);
    if (game.if_earth_spirit()) {
        game.add_c_of_x(3, "earth_spirit_combine_world_stacks");
    }
}

// 135033
card_actions["135033"] = (game) => {
    game.increase_idx_def(0, 12);
    if (game.if_earth_spirit()) {
        game.add_c_of_x(4, "earth_spirit_combine_world_stacks");
    }
}

// Metal Spirit - Giant Tripod
card_actions["135041"] = (game) => {
    if (game.if_metal_spirit()) {
        game.add_c_of_x(1, "metal_spirit_giant_tripod_stacks");
    }
    game.atk(7);
}

// 135042
card_actions["135042"] = (game) => {
    if (game.if_metal_spirit()) {
        game.add_c_of_x(1, "metal_spirit_giant_tripod_stacks");
    }
    game.atk(11);
}

// 135043
card_actions["135043"] = (game) => {
    if (game.if_metal_spirit()) {
        game.add_c_of_x(1, "metal_spirit_giant_tripod_stacks");
    }
    game.atk(15);
}

// Water Spirit - Combine Rivers
card_actions["135051"] = (game) => {
    game.add_c_of_x(3, "force_of_water");
    if (game.if_water_spirit()) {
        const amt = game.players[0].force_of_water + 6;
        game.add_c_of_x(amt, "max_hp");
        game.increase_idx_hp(0, amt);
    }
}

// 135052
card_actions["135052"] = (game) => {
    game.add_c_of_x(4, "force_of_water");
    if (game.if_water_spirit()) {
        const amt = game.players[0].force_of_water + 8;
        game.add_c_of_x(amt, "max_hp");
        game.increase_idx_hp(0, amt);
    }
}

// 135053
card_actions["135053"] = (game) => {
    game.add_c_of_x(5, "force_of_water");
    if (game.if_water_spirit()) {
        const amt = game.players[0].force_of_water + 10;
        game.add_c_of_x(amt, "max_hp");
        game.increase_idx_hp(0, amt);
    }
}

// Ultimate World Formation
card_actions["135061"] = (game) => {
    game.continuous();
    game.do_ultimate_world_formation(0);
}

// 135062
card_actions["135062"] = (game) => {
    game.continuous();
    game.do_ultimate_world_formation(2);
}

// 135063
card_actions["135063"] = (game) => {
    game.continuous();
    game.do_ultimate_world_formation(4);
}

// Five Elements Heavenly Marrow Rhythm
card_actions["135071"] = (game) => {
    game.continuous();
    if (game.get_n_different_five_elements(0) <= 1) {
        game.add_c_of_x(2, "five_elements_heavenly_marrow_rhythm_stacks");
    }
}

// 135072
card_actions["135072"] = (game) => {
    game.increase_idx_qi(0, 2);
    game.continuous();
    if (game.get_n_different_five_elements(0) <= 1) {
        game.add_c_of_x(2, "five_elements_heavenly_marrow_rhythm_stacks");
    }
}

// 135073
card_actions["135073"] = (game) => {
    game.increase_idx_qi(0, 2);
    game.continuous();
    if (game.get_n_different_five_elements(0) <= 1) {
        game.add_c_of_x(3, "five_elements_heavenly_marrow_rhythm_stacks");
    }
}

// Crash Fist - Poke
card_actions["141011"] = (game) => {
    game.atk(9);
    game.add_c_of_x(2, "later_crash_fist_poke_stacks");
}

// 141012
card_actions["141012"] = (game) => {
    game.atk(11);
    game.add_c_of_x(3, "later_crash_fist_poke_stacks");
}

// 141013
card_actions["141013"] = (game) => {
    game.atk(13);
    game.add_c_of_x(4, "later_crash_fist_poke_stacks");
}

// Crash Fist - Block
card_actions["141021"] = (game) => {
    game.atk(7);
    game.increase_idx_def(0, 2);
    game.add_c_of_x(2, "crash_fist_block_stacks");
}

// 141022
card_actions["141022"] = (game) => {
    game.atk(9);
    game.increase_idx_def(0, 3);
    game.add_c_of_x(3, "crash_fist_block_stacks");
}

// 141023
card_actions["141023"] = (game) => {
    game.atk(11);
    game.increase_idx_def(0, 4);
    game.add_c_of_x(4, "crash_fist_block_stacks");
}

// Crash Fist - Bounce
card_actions["141031"] = (game) => {
    game.atk(8);
    game.add_c_of_x(1, "crash_fist_bounce_stacks");
}

// 141032
card_actions["141032"] = (game) => {
    game.atk(11);
    game.add_c_of_x(1, "crash_fist_bounce_stacks");
}

// 141033
card_actions["141033"] = (game) => {
    game.atk(14);
    game.add_c_of_x(1, "crash_fist_bounce_stacks");
}

// Exercise Fist
card_actions["141041"] = (game) => {
    game.atk(6);
    game.physique(1);
}

// 141042
card_actions["141042"] = (game) => {
    game.atk(9);
    game.physique(1);
}

// 141043
card_actions["141043"] = (game) => {
    game.atk(12);
    game.physique(1);
}

// Mountain Cleaving Palms
card_actions["141051"] = (game) => {
    game.atk(10);
}

// 141052
card_actions["141052"] = (game) => {
    game.atk(13);
}

// 141053
card_actions["141053"] = (game) => {
    game.atk(16);
}

// Embracing Qi Technique
card_actions["141061"] = (game) => {
    game.increase_idx_qi(0, 1);
    game.physique(2);
    game.increase_idx_hp(0, 1);
}

// 141062
card_actions["141062"] = (game) => {
    game.increase_idx_qi(0, 1);
    game.physique(2);
    game.increase_idx_hp(0, 4);
}

// 141063
card_actions["141063"] = (game) => {
    game.increase_idx_qi(0, 1);
    game.physique(2);
    game.increase_idx_hp(0, 7);
}

// Rakshasa Pouncing
card_actions["141071"] = (game) => {
    game.atk(8);
    game.increase_idx_qi(0, 1);
    game.add_c_of_x(1, "wound");
}

// 141072
card_actions["141072"] = (game) => {
    game.atk(11);
    game.increase_idx_qi(0, 1);
    game.add_c_of_x(1, "wound");
}

// 141073
card_actions["141073"] = (game) => {
    game.atk(14);
    game.increase_idx_qi(0, 1);
    game.add_c_of_x(1, "wound");
}

// Sky-Piercing Claw
card_actions["141081"] = (game) => {
    game.atk(12);
    game.add_c_of_x(1, "internal_injury");
}

// 141082
card_actions["141082"] = (game) => {
    game.atk(15);
    game.add_c_of_x(1, "internal_injury");
}

// 141083
card_actions["141083"] = (game) => {
    game.atk(18);
    game.add_c_of_x(1, "internal_injury");
}

// Mountain Falling
card_actions["141091"] = (game) => {
    game.atk(6);
    game.reduce_random_debuff_by_c_n_times(1, 1);
}

// 141092
card_actions["141092"] = (game) => {
    game.atk(9);
    game.reduce_random_debuff_by_c_n_times(1, 1);
}

// 141093
card_actions["141093"] = (game) => {
    game.atk(12);
    game.reduce_random_debuff_by_c_n_times(1, 1);
}

// Gather Force
card_actions["141101"] = (game) => {
    game.atk(2);
    game.increase_idx_qi(0, 1);
    game.add_c_of_x(2, "force");
}

// 141102
card_actions["141102"] = (game) => {
    game.atk(5);
    game.increase_idx_qi(0, 1);
    game.add_c_of_x(2, "force");
}

// 141103
card_actions["141103"] = (game) => {
    game.atk(8);
    game.increase_idx_qi(0, 1);
    game.add_c_of_x(2, "force");
}

// Vigorous Force
card_actions["141111"] = (game) => {
    game.atk(6 + game.players[0].force);
    if (game.players[0].qi >= 1) {
        game.reduce_c_of_x(1, "qi");
        game.add_c_of_x(2, "force");
    }
}

// 141112
card_actions["141112"] = (game) => {
    game.atk(9 + game.players[0].force);
    if (game.players[0].qi >= 1) {
        game.reduce_c_of_x(1, "qi");
        game.add_c_of_x(2, "force");
    }
}

// 141113
card_actions["141113"] = (game) => {
    game.atk(12 + game.players[0].force);
    if (game.players[0].qi >= 1) {
        game.reduce_c_of_x(1, "qi");
        game.add_c_of_x(2, "force");
    }
}

// Youthful Vigor
card_actions["141121"] = (game) => {
    game.atk(8);
    if (game.players[0].qi >= 1) {
        game.reduce_c_of_x(1, "qi");
        game.atk(4);
    }
}

// 141122
card_actions["141122"] = (game) => {
    game.atk(10);
    if (game.players[0].qi >= 1) {
        game.reduce_c_of_x(1, "qi");
        game.atk(6);
    }
}

// 141123
card_actions["141123"] = (game) => {
    game.atk(12);
    if (game.players[0].qi >= 1) {
        game.reduce_c_of_x(1, "qi");
        game.atk(8);
    }
}

// Crash Fist - Shake
card_actions["142011"] = (game) => {
    game.atk(10);
    game.add_c_of_x(2, "crash_fist_shake_stacks");
}

// 142012
card_actions["142012"] = (game) => {
    game.atk(11);
    game.add_c_of_x(3, "crash_fist_shake_stacks");
}

// 142013
card_actions["142013"] = (game) => {
    game.atk(12);
    game.add_c_of_x(4, "crash_fist_shake_stacks");
}

// Crash Fist - Entangle
card_actions["142021"] = (game) => {
    game.atk(10);
    game.add_c_of_x(1, "crash_fist_entangle_stacks");
}

// 142022
card_actions["142022"] = (game) => {
    game.atk(11);
    game.add_c_of_x(2, "crash_fist_entangle_stacks");
}

// 142023
card_actions["142023"] = (game) => {
    game.atk(12);
    game.add_c_of_x(3, "crash_fist_entangle_stacks");
}

// Crash Fist - Blitz
card_actions["142031"] = (game) => {
    game.add_c_of_x(1, "smash_def");
    game.atk(10);
    game.add_c_of_x(1, "crash_fist_blitz_stacks");
}

// 142032
card_actions["142032"] = (game) => {
    game.add_c_of_x(1, "smash_def");
    game.atk(14);
    game.add_c_of_x(1, "crash_fist_blitz_stacks");
}

// 142033
card_actions["142033"] = (game) => {
    game.add_c_of_x(1, "smash_def");
    game.atk(18);
    game.add_c_of_x(1, "crash_fist_blitz_stacks");
}

// Exercise Tendons
card_actions["142041"] = (game) => {
    game.atk(5);
    game.physique(2);
    if (game.players[0].physique >= 15) {
        game.increase_idx_def(0, 4);
    }
}

// 142042
card_actions["142042"] = (game) => {
    game.atk(7);
    game.physique(2);
    if (game.players[0].physique >= 15) {
        game.increase_idx_def(0, 6);
    }
}

// 142043
card_actions["142043"] = (game) => {
    game.atk(9);
    game.physique(2);
    if (game.players[0].physique >= 15) {
        game.increase_idx_def(0, 8);
    }
}

// Detect-Horse Palms
card_actions["142051"] = (game) => {
    game.atk(7);
    game.for_each_x_add_c_pct_y_up_to_d("physique", 50, "def", 8);
}

// 142052
card_actions["142052"] = (game) => {
    game.atk(9);
    game.for_each_x_add_c_pct_y_up_to_d("physique", 50, "def", 11);
}

// 142053
card_actions["142053"] = (game) => {
    game.atk(11);
    game.for_each_x_add_c_pct_y_up_to_d("physique", 50, "def", 14);
}

// Gale Shadow Claw
card_actions["142061"] = (game) => {
    for (let i = 0; i < 2; i++) {
        game.atk(4);
    }
    game.increase_idx_qi(0, 2);
    game.add_c_of_x(3, "flaw");
}

// 142062
card_actions["142062"] = (game) => {
    for (let i = 0; i < 2; i++) {
        game.atk(6);
    }
    game.increase_idx_qi(0, 2);
    game.add_c_of_x(3, "flaw");
}

// 142063
card_actions["142063"] = (game) => {
    for (let i = 0; i < 2; i++) {
        game.atk(8);
    }
    game.increase_idx_qi(0, 2);
    game.add_c_of_x(3, "flaw");
}

// Ghost Howling
card_actions["142071"] = (game) => {
    game.increase_idx_x_by_c(0, "ignore_def", 1);
    game.atk(14);
    game.add_c_of_x(3, "weaken");
}

// 142072
card_actions["142072"] = (game) => {
    game.increase_idx_x_by_c(0, "ignore_def", 1);
    game.atk(18);
    game.add_c_of_x(3, "weaken");
}

// 142073
card_actions["142073"] = (game) => {
    game.increase_idx_x_by_c(0, "ignore_def", 1);
    game.atk(22);
    game.add_c_of_x(3, "weaken");
}

// Standing Firm
card_actions["142081"] = (game) => {
    game.increase_idx_def(0, 4);
    game.add_c_of_x(2, "force");
    if (game.players[0].qi >= 1) {
        game.reduce_c_of_x(1, "qi");
        game.increase_idx_hp(0, 5);
    }
}

// 142082
card_actions["142082"] = (game) => {
    game.increase_idx_def(0, 5);
    game.add_c_of_x(3, "force");
    if (game.players[0].qi >= 1) {
        game.reduce_c_of_x(1, "qi");
        game.increase_idx_hp(0, 5);
    }
}

// 142083
card_actions["142083"] = (game) => {
    game.increase_idx_def(0, 6);
    game.add_c_of_x(4, "force");
    if (game.players[0].qi >= 1) {
        game.reduce_c_of_x(1, "qi");
        game.increase_idx_hp(0, 5);
    }
}

// Strong Force
card_actions["142091"] = (game) => {
    let atk_amt = 9;
    if (game.players[0].qi >= 1) {
        game.reduce_c_of_x(1, "qi");
        game.add_c_of_x(1, "smash_def");
        atk_amt += 4;
    }
    game.atk(atk_amt);
}

// 142092
card_actions["142092"] = (game) => {
    let atk_amt = 12;
    if (game.players[0].qi >= 1) {
        game.reduce_c_of_x(1, "qi");
        game.add_c_of_x(1, "smash_def");
        atk_amt += 5;
    }
    game.atk(atk_amt);
}

// 142093
card_actions["142093"] = (game) => {
    let atk_amt = 15;
    if (game.players[0].qi >= 1) {
        game.reduce_c_of_x(1, "qi");
        game.add_c_of_x(1, "smash_def");
        atk_amt += 6;
    }
    game.atk(atk_amt);
}

// Sinking Qi
card_actions["142101"] = (game) => {
    game.increase_idx_qi(0, 2);
    game.increase_idx_hp(0, 2);
}

// 142102
card_actions["142102"] = (game) => {
    game.increase_idx_qi(0, 2);
    game.increase_idx_hp(0, 6);
}

// 142103
card_actions["142103"] = (game) => {
    game.increase_idx_qi(0, 2);
    game.increase_idx_hp(0, 10);
}

// Magnaminous Righteousness
card_actions["142111"] = (game) => {
    game.increase_idx_qi(0, 1);
    game.increase_idx_def(0, 4);
    game.add_c_of_x(2, "hexproof");
}

// 142112
card_actions["142112"] = (game) => {
    game.increase_idx_qi(0, 1);
    game.increase_idx_def(0, 8);
    game.add_c_of_x(3, "hexproof");
}

// 142113
card_actions["142113"] = (game) => {
    game.increase_idx_qi(0, 1);
    game.increase_idx_def(0, 12);
    game.add_c_of_x(4, "hexproof");
}

// Crash Footwork
card_actions["143011"] = (game) => {
    game.increase_idx_qi(0, 1);
    game.add_c_of_x(4, "agility");
    game.continuous();
    game.add_c_of_x(1, "crash_footwork_stacks");
}

// 143012
card_actions["143012"] = (game) => {
    game.increase_idx_qi(0, 2);
    game.add_c_of_x(4, "agility");
    game.continuous();
    game.add_c_of_x(1, "crash_footwork_stacks");
}

// 143013
card_actions["143013"] = (game) => {
    game.increase_idx_qi(0, 3);
    game.add_c_of_x(4, "agility");
    game.continuous();
    game.add_c_of_x(1, "crash_footwork_stacks");
}

// Crash Fist - Truncate
card_actions["143021"] = (game) => {
    game.transfer_random_debuff();
    game.atk(9);
    game.add_c_of_x(1, "crash_fist_truncate_stacks");
}

// 143022
card_actions["143022"] = (game) => {
    game.transfer_random_debuff();
    game.atk(13);
    game.add_c_of_x(1, "crash_fist_truncate_stacks");
}

// 143023
card_actions["143023"] = (game) => {
    game.transfer_random_debuff();
    game.atk(17);
    game.add_c_of_x(1, "crash_fist_truncate_stacks");
}

// Crash Fist - Subdue Dragon
card_actions["143031"] = (game) => {
    game.atk(10);
    game.add_c_of_x(5, "later_crash_fist_poke_stacks");
    game.add_c_of_x(5, "crash_fist_block_stacks");
}

// 143032
card_actions["143032"] = (game) => {
    game.atk(12);
    game.add_c_of_x(7, "later_crash_fist_poke_stacks");
    game.add_c_of_x(7, "crash_fist_block_stacks");
}

// 143033
card_actions["143033"] = (game) => {
    game.atk(14);
    game.add_c_of_x(9, "later_crash_fist_poke_stacks");
    game.add_c_of_x(9, "crash_fist_block_stacks");
}

// Exercise Bones
card_actions["143041"] = (game) => {
    game.physique(1);
    game.increase_idx_hp(0, 3);
    game.add_c_of_x(2, "exercise_bones_stacks");
}

// 143042
card_actions["143042"] = (game) => {
    game.physique(1);
    game.increase_idx_hp(0, 4);
    game.add_c_of_x(3, "exercise_bones_stacks");
}

// 143043
card_actions["143043"] = (game) => {
    game.physique(1);
    game.increase_idx_hp(0, 5);
    game.add_c_of_x(4, "exercise_bones_stacks");
}

// Bearing The Load
card_actions["143051"] = (game) => {
    game.physique(3);
    game.add_c_of_x(2, "entangle");
    const def_amt = 8 + game.get_debuff_count(0);
    game.increase_idx_def(0, def_amt);
}

// 143052
card_actions["143052"] = (game) => {
    game.physique(3);
    game.add_c_of_x(3, "entangle");
    const def_amt = 11 + game.get_debuff_count(0);
    game.increase_idx_def(0, def_amt);
}

// 143053
card_actions["143053"] = (game) => {
    game.physique(3);
    game.add_c_of_x(4, "entangle");
    const def_amt = 14 + game.get_debuff_count(0);
    game.increase_idx_def(0, def_amt);
}

// Windward Palms
card_actions["143061"] = (game) => {
    const atk_amt = 4 + Math.min(Math.floor(game.players[0].physique * 16.666667 / 100), 3);
    for (let i = 0; i < 2; i++) {
        game.atk(atk_amt);
    }
}

// 143062
card_actions["143062"] = (game) => {
    const atk_amt = 5 + Math.min(Math.floor(game.players[0].physique * 16.666667 / 100), 5);
    for (let i = 0; i < 2; i++) {
        game.atk(atk_amt);
    }
}

// 143063
card_actions["143063"] = (game) => {
    const atk_amt = 6 + Math.min(Math.floor(game.players[0].physique * 16.666667 / 100), 7);
    for (let i = 0; i < 2; i++) {
        game.atk(atk_amt);
    }
}

// Tiger Pouncing
card_actions["143071"] = (game) => {
    game.atk(18);
}

// 143072
card_actions["143072"] = (game) => {
    game.atk(22);
}

// 143073
card_actions["143073"] = (game) => {
    game.atk(26);
}

// Double Trouble
card_actions["143081"] = (game) => {
    game.add_enemy_c_of_x(1, "internal_injury");
    game.add_enemy_c_of_x(1, "wound");
    game.add_c_of_x(1, "internal_injury");
    game.add_c_of_x(1, "wound");
    for (let i = 0; i < 2; i++) {
        game.atk(6);
    }
}

// 143082
card_actions["143082"] = (game) => {
    game.add_enemy_c_of_x(2, "internal_injury");
    game.add_enemy_c_of_x(1, "wound");
    game.add_c_of_x(2, "internal_injury");
    game.add_c_of_x(1, "wound");
    for (let i = 0; i < 2; i++) {
        game.atk(7);
    }
}

// 143083
card_actions["143083"] = (game) => {
    game.add_enemy_c_of_x(2, "internal_injury");
    game.add_enemy_c_of_x(2, "wound");
    game.add_c_of_x(2, "internal_injury");
    game.add_c_of_x(2, "wound");
    for (let i = 0; i < 2; i++) {
        game.atk(8);
    }
}

// Majestic Qi
card_actions["143091"] = (game) => {
    game.increase_idx_qi(0, 2);
    game.add_c_of_x(1, "force");
    game.add_c_of_x(2, "majestic_qi_stacks");
}

// 143092
card_actions["143092"] = (game) => {
    game.increase_idx_qi(0, 3);
    game.add_c_of_x(1, "force");
    game.add_c_of_x(3, "majestic_qi_stacks");
}

// 143093
card_actions["143093"] = (game) => {
    game.increase_idx_qi(0, 4);
    game.add_c_of_x(1, "force");
    game.add_c_of_x(4, "majestic_qi_stacks");
}

// Sailing Through Sky
card_actions["143101"] = (game) => {
    game.add_c_of_x(3, "force");
    game.add_c_of_x(6, "agility");
}

// 143102
card_actions["143102"] = (game) => {
    game.add_c_of_x(4, "force");
    game.add_c_of_x(6, "agility");
}

// 143103
card_actions["143103"] = (game) => {
    game.add_c_of_x(5, "force");
    game.add_c_of_x(6, "agility");
}

// Mighty Force
card_actions["143111"] = (game) => {
    const me = game.players[0];
    const qi_amt = Math.min(me.qi, 2);
    game.reduce_idx_x_by_c(0, "qi", qi_amt);
    game.increase_idx_force(0, qi_amt);
    const atk_amt = 10 + qi_amt * 3;
    game.atk(atk_amt);
}

// 143112
card_actions["143112"] = (game) => {
    const me = game.players[0];
    const qi_amt = Math.min(me.qi, 3);
    game.reduce_idx_x_by_c(0, "qi", qi_amt);
    game.increase_idx_force(0, qi_amt);
    const atk_amt = 11 + qi_amt * 3;
    game.atk(atk_amt);
}

// 143113
card_actions["143113"] = (game) => {
    const me = game.players[0];
    const qi_amt = Math.min(me.qi, 4);
    game.reduce_idx_x_by_c(0, "qi", qi_amt);
    game.increase_idx_force(0, qi_amt);
    const atk_amt = 12 + qi_amt * 3;
    game.atk(atk_amt);
}

// Crash Citta-Dharma
card_actions["144011"] = (game) => {
    game.add_c_of_x(2, "force");
    game.continuous();
    game.add_c_of_x(1, "crash_citta_dharma_stacks");
}

// 144012
card_actions["144012"] = (game) => {
    game.add_c_of_x(3, "force");
    game.continuous();
    game.add_c_of_x(1, "crash_citta_dharma_stacks");
}

// 144013
card_actions["144013"] = (game) => {
    game.add_c_of_x(4, "force");
    game.continuous();
    game.add_c_of_x(1, "crash_citta_dharma_stacks");
}

// Crash Fist - Inch Force
card_actions["144021"] = (game) => {
    game.add_c_of_x(1, "this_card_crash_fist_inch_force_stacks");
    game.add_c_of_x(1, "crash_fist_inch_force_stacks");
    game.atk(10);
}

// 144022
card_actions["144022"] = (game) => {
    game.add_c_of_x(1, "this_card_crash_fist_inch_force_stacks");
    game.add_c_of_x(1, "crash_fist_inch_force_stacks");
    game.atk(14);
}

// 144023
card_actions["144023"] = (game) => {
    game.add_c_of_x(1, "this_card_crash_fist_inch_force_stacks");
    game.add_c_of_x(1, "crash_fist_inch_force_stacks");
    game.atk(18);
}

// Crash Fist - Continue
card_actions["144031"] = (game) => {
    game.atk(11);
}

// 144032
card_actions["144032"] = (game) => {
    game.atk(16);
}

// 144033
card_actions["144033"] = (game) => {
    game.atk(21);
}

// Exercise Marrow
card_actions["144041"] = (game) => {
    game.physique(3);
    game.for_each_x_add_c_pct_y("max_hp", 8, "hp");
}

// 144042
card_actions["144042"] = (game) => {
    game.physique(3);
    game.for_each_x_add_c_pct_y("max_hp", 12, "hp");
}

// 144043
card_actions["144043"] = (game) => {
    game.physique(3);
    game.for_each_x_add_c_pct_y("max_hp", 16, "hp");
}

// Crane Footwork
card_actions["144051"] = (game) => {
    game.increase_idx_hp(0, 4);
    game.for_each_x_add_c_pct_y_up_to_d("physique", 25, "agility", 10);
}

// 144052
card_actions["144052"] = (game) => {
    game.increase_idx_hp(0, 5);
    game.for_each_x_add_c_pct_y_up_to_d("physique", 25, "agility", 13);
}

// 144053
card_actions["144053"] = (game) => {
    game.increase_idx_hp(0, 6);
    game.for_each_x_add_c_pct_y_up_to_d("physique", 25, "agility", 16);
}

// Elusive Footwork
card_actions["144061"] = (game) => {
    game.increase_idx_qi(0, 1);
    game.add_c_of_x(2, "agility");
    game.continuous();
    game.add_c_of_x(1, "elusive_footwork_stacks");
}

// 144062
card_actions["144062"] = (game) => {
    game.increase_idx_qi(0, 2);
    game.add_c_of_x(3, "agility");
    game.continuous();
    game.add_c_of_x(1, "elusive_footwork_stacks");
}

// 144063
card_actions["144063"] = (game) => {
    game.increase_idx_qi(0, 3);
    game.add_c_of_x(4, "agility");
    game.continuous();
    game.add_c_of_x(1, "elusive_footwork_stacks");
}

// Styx Agility
card_actions["144071"] = (game) => {
    game.add_c_of_x(1, "decrease_atk");
    game.add_c_of_x(10, "agility");
}

// 144072
card_actions["144072"] = (game) => {
    game.add_c_of_x(1, "decrease_atk");
    game.add_c_of_x(14, "agility");
}

// 144073
card_actions["144073"] = (game) => {
    game.add_c_of_x(2, "decrease_atk");
    game.add_c_of_x(18, "agility");
}

// Soul Seizing
card_actions["144081"] = (game) => {
    const amt = Math.min(game.get_debuff_count(0) + 7, 14);
    game.reduce_enemy_c_of_x(amt, "hp");
    game.increase_idx_hp(0, amt);
}

// 144082
card_actions["144082"] = (game) => {
    const amt = Math.min(game.get_debuff_count(0) + 10, 20);
    game.reduce_enemy_c_of_x(amt, "hp");
    game.increase_idx_hp(0, amt);
}

// 144083
card_actions["144083"] = (game) => {
    const amt = Math.min(game.get_debuff_count(0) + 13, 26);
    game.reduce_enemy_c_of_x(amt, "hp");
    game.increase_idx_hp(0, amt);
}

// Surging Waves
card_actions["144091"] = (game) => {
    game.increase_idx_qi(0, 1);
    game.for_each_x_add_y("qi", "force");
    game.add_c_of_x(5, "agility");
}

// 144092
card_actions["144092"] = (game) => {
    game.increase_idx_qi(0, 2);
    game.for_each_x_add_y("qi", "force");
    game.add_c_of_x(5, "agility");
}

// 144093
card_actions["144093"] = (game) => {
    game.increase_idx_qi(0, 3);
    game.for_each_x_add_y("qi", "force");
    game.add_c_of_x(5, "agility");
}

// Overwhelming Force
card_actions["144101"] = (game) => {
    const me = game.players[0];
    let def_amt = me.force * 4;
    let dmg_amt = me.force * 3;
    game.reduce_c_of_x(me.force, "force");
    game.increase_idx_def(0, def_amt);
    game.deal_damage(dmg_amt);
    game.add_c_of_x(5, "agility");
}

// 144102
card_actions["144102"] = (game) => {
    const me = game.players[0];
    let def_amt = me.force * 4;
    let dmg_amt = me.force * 4;
    game.reduce_c_of_x(me.force, "force");
    game.increase_idx_def(0, def_amt);
    game.deal_damage(dmg_amt);
    game.add_c_of_x(6, "agility");
}

// 144103
card_actions["144103"] = (game) => {
    const me = game.players[0];
    let def_amt = me.force * 4;
    let dmg_amt = me.force * 5;
    game.reduce_c_of_x(me.force, "force");
    game.increase_idx_def(0, def_amt);
    game.deal_damage(dmg_amt);
    game.add_c_of_x(7, "agility");
}

// Crash Fist - Blink
card_actions["145011"] = (game) => {
    game.atk(5);
    game.add_c_of_x(7, "agility");
    game.add_c_of_x(7, "crash_fist_blink_stacks");
}

// 145012
card_actions["145012"] = (game) => {
    game.atk(7);
    game.add_c_of_x(8, "agility");
    game.add_c_of_x(8, "crash_fist_blink_stacks");
}

// 145013
card_actions["145013"] = (game) => {
    game.atk(9);
    game.add_c_of_x(9, "agility");
    game.add_c_of_x(9, "crash_fist_blink_stacks");
}

// Crash Fist - Shocked
card_actions["145021"] = (game) => {
    game.atk(10);
    game.add_c_of_x(1, "crash_fist_shocked_stacks");
}

// 145022
card_actions["145022"] = (game) => {
    game.atk(16);
    game.add_c_of_x(1, "crash_fist_shocked_stacks");
}

// 145023
card_actions["145023"] = (game) => {
    game.atk(22);
    game.add_c_of_x(1, "crash_fist_shocked_stacks");
}

// Exercise Soul
card_actions["145031"] = (game) => {
    game.atk(4);
    game.physique(3);
    if (game.players[0].physique >= 50) {
        game.add_c_of_x(1, "increase_atk");
    }
    if (game.players[0].physique >= 65) {
        game.add_c_of_x(5, "agility");
    }
}

// 145032
card_actions["145032"] = (game) => {
    game.atk(8);
    game.physique(4);
    if (game.players[0].physique >= 50) {
        game.add_c_of_x(1, "increase_atk");
    }
    if (game.players[0].physique >= 65) {
        game.add_c_of_x(6, "agility");
    }
}

// 145033
card_actions["145033"] = (game) => {
    game.atk(12);
    game.physique(5);
    if (game.players[0].physique >= 50) {
        game.add_c_of_x(1, "increase_atk");
    }
    if (game.players[0].physique >= 65) {
        game.add_c_of_x(7, "agility");
    }
}

// Realm-Killing Palms
card_actions["145041"] = (game) => {
    const rep_amt = 1 + Math.floor(game.players[0].physique * 4 / 100);
    const atk_amt = 3 + Math.floor(game.players[0].physique_gained * 25 / 100);
    for (let i = 0; i < rep_amt; i++) {
        game.atk(atk_amt);
    }
}

// 145042
card_actions["145042"] = (game) => {
    const rep_amt = 1 + Math.floor(game.players[0].physique * 4 / 100);
    const atk_amt = 4 + Math.floor(game.players[0].physique_gained * 33.333334 / 100);
    for (let i = 0; i < rep_amt; i++) {
        game.atk(atk_amt);
    }
}

// 145043
card_actions["145043"] = (game) => {
    const rep_amt = 1 + Math.floor(game.players[0].physique * 4 / 100);
    const atk_amt = 5 + Math.floor(game.players[0].physique_gained * 50 / 100);
    for (let i = 0; i < rep_amt; i++) {
        game.atk(atk_amt);
    }
}

// Shura Roar
card_actions["145051"] = (game) => {
    game.add_c_of_x(4, "internal_injury");
    game.add_enemy_c_of_x(4, "internal_injury");
    game.for_each_x_add_c_pct_y("debuff", 50, "qi");
    game.for_each_x_add_c_pct_y("debuff", 50, "hp");
}

// 145052
card_actions["145052"] = (game) => {
    game.add_c_of_x(6, "internal_injury");
    game.add_enemy_c_of_x(6, "internal_injury");
    game.for_each_x_add_c_pct_y("debuff", 50, "qi");
    game.for_each_x_add_c_pct_y("debuff", 50, "hp");
}

// 145053
card_actions["145053"] = (game) => {
    game.add_c_of_x(8, "internal_injury");
    game.add_enemy_c_of_x(8, "internal_injury");
    game.for_each_x_add_c_pct_y("debuff", 50, "qi");
    game.for_each_x_add_c_pct_y("debuff", 50, "hp");
}

// Soul Cleaving
card_actions["145061"] = (game) => {
    if (game.players[0].internal_injury >= 1) {
        game.add_enemy_c_of_x(2, "internal_injury");
    }
    if (game.players[0].weaken >= 1) {
        game.add_enemy_c_of_x(2, "weaken");
    }
    if (game.players[0].flaw >= 1) {
        game.add_enemy_c_of_x(2, "flaw");
    }
    if (game.players[0].decrease_atk >= 1) {
        game.add_enemy_c_of_x(2, "decrease_atk");
    }
    if (game.players[0].entangle >= 1) {
        game.add_enemy_c_of_x(2, "entangle");
    }
    if (game.players[0].wound >= 1) {
        game.add_enemy_c_of_x(2, "wound");
    }
    if (game.players[0].styx >= 1) {
        game.add_enemy_c_of_x(2, "styx");
    }
    game.for_each_x_add_y("debuff", "bonus_force_amt");
    game.ignore_weaken();
    game.ignore_decrease_atk();
    game.atk(8);
}

// 145062
card_actions["145062"] = (game) => {
    if (game.players[0].internal_injury >= 1) {
        game.add_enemy_c_of_x(2, "internal_injury");
    }
    if (game.players[0].weaken >= 1) {
        game.add_enemy_c_of_x(2, "weaken");
    }
    if (game.players[0].flaw >= 1) {
        game.add_enemy_c_of_x(2, "flaw");
    }
    if (game.players[0].decrease_atk >= 1) {
        game.add_enemy_c_of_x(2, "decrease_atk");
    }
    if (game.players[0].entangle >= 1) {
        game.add_enemy_c_of_x(2, "entangle");
    }
    if (game.players[0].wound >= 1) {
        game.add_enemy_c_of_x(2, "wound");
    }
    if (game.players[0].styx >= 1) {
        game.add_enemy_c_of_x(2, "styx");
    }
    game.for_each_x_add_y("debuff", "bonus_force_amt");
    game.ignore_weaken();
    game.ignore_decrease_atk();
    game.atk(14);
}

// 145063
card_actions["145063"] = (game) => {
    if (game.players[0].internal_injury >= 1) {
        game.add_enemy_c_of_x(2, "internal_injury");
    }
    if (game.players[0].weaken >= 1) {
        game.add_enemy_c_of_x(2, "weaken");
    }
    if (game.players[0].flaw >= 1) {
        game.add_enemy_c_of_x(2, "flaw");
    }
    if (game.players[0].decrease_atk >= 1) {
        game.add_enemy_c_of_x(2, "decrease_atk");
    }
    if (game.players[0].entangle >= 1) {
        game.add_enemy_c_of_x(2, "entangle");
    }
    if (game.players[0].wound >= 1) {
        game.add_enemy_c_of_x(2, "wound");
    }
    if (game.players[0].styx >= 1) {
        game.add_enemy_c_of_x(2, "styx");
    }
    game.for_each_x_add_y("debuff", "bonus_force_amt");
    game.ignore_weaken();
    game.ignore_decrease_atk();
    game.atk(20);
}

// Gather Intense Force
card_actions["145071"] = (game) => {
    game.increase_idx_def(0, 8);
    game.add_c_of_x(3, "max_force");
    game.add_c_of_x(3, "force");
}

// 145072
card_actions["145072"] = (game) => {
    game.increase_idx_def(0, 10);
    game.add_c_of_x(4, "max_force");
    game.add_c_of_x(4, "force");
}

// 145073
card_actions["145073"] = (game) => {
    game.increase_idx_def(0, 12);
    game.add_c_of_x(5, "max_force");
    game.add_c_of_x(5, "force");
}

// Vast Universe
card_actions["145081"] = (game) => {
    game.atk(10);
    game.increase_idx_hp(0, 4);
    game.add_c_of_x(4, "agility");
    game.for_each_x_add_c_y("force", 2, "agility");
}

// 145082
card_actions["145082"] = (game) => {
    game.atk(12);
    game.increase_idx_hp(0, 6);
    game.add_c_of_x(5, "agility");
    game.for_each_x_add_c_y("force", 2, "agility");
}

// 145083
card_actions["145083"] = (game) => {
    game.atk(14);
    game.increase_idx_hp(0, 8);
    game.add_c_of_x(6, "agility");
    game.for_each_x_add_c_y("force", 2, "agility");
}

// Rhyme Spirit Sword
card_actions["211011"] = (game) => {
    game.atk(4);
    if (game.if_injured()) {
        game.for_each_x_add_y("damage_dealt_to_hp_by_atk", "qi");
    }
}

// 211012
card_actions["211012"] = (game) => {
    game.atk(5);
    if (game.if_injured()) {
        game.for_each_x_add_y("damage_dealt_to_hp_by_atk", "qi");
    }
}

// 211013
card_actions["211013"] = (game) => {
    game.atk(6);
    if (game.if_injured()) {
        game.for_each_x_add_y("damage_dealt_to_hp_by_atk", "qi");
    }
}

// Diligent Sword
card_actions["211021"] = (game) => {
    game.atk(6 + Math.floor(game.players[0].cultivation * 20 / 100));
}

// 211022
card_actions["211022"] = (game) => {
    game.atk(6 + Math.floor(game.players[0].cultivation * 25 / 100));
}

// 211023
card_actions["211023"] = (game) => {
    game.atk(6 + Math.floor(game.players[0].cultivation * 33.333334 / 100));
}

// Cloud Sword - Dawn
card_actions["212011"] = (game) => {
    game.increase_idx_def(0, 4);
    if (game.if_cloud_hit()) {
        for (let i = 0; i < 3; i++) {
            game.atk(2);
        }
    }
}

// 212012
card_actions["212012"] = (game) => {
    game.increase_idx_def(0, 6);
    if (game.if_cloud_hit()) {
        for (let i = 0; i < 3; i++) {
            game.atk(3);
        }
    }
}

// 212013
card_actions["212013"] = (game) => {
    game.increase_idx_def(0, 8);
    if (game.if_cloud_hit()) {
        for (let i = 0; i < 3; i++) {
            game.atk(4);
        }
    }
}

// Giant Ape Spirit Sword
card_actions["212021"] = (game) => {
    game.atk(6);
    game.add_c_of_x(3, "increase_atk");
}

// 212022
card_actions["212022"] = (game) => {
    game.atk(6);
    game.add_c_of_x(4, "increase_atk");
}

// 212023
card_actions["212023"] = (game) => {
    game.atk(6);
    game.add_c_of_x(5, "increase_atk");
}

// Unrestrained Sword - Dragon Coiled
card_actions["213011"] = (game) => {
    const def_amt = 6 * (1 + game.players[0].unrestrained_sword_count);
    game.increase_idx_def(0, def_amt);
}

// 213012
card_actions["213012"] = (game) => {
    const def_amt = 8 * (1 + game.players[0].unrestrained_sword_count);
    game.increase_idx_def(0, def_amt);
}

// 213013
card_actions["213013"] = (game) => {
    const def_amt = 10 * (1 + game.players[0].unrestrained_sword_count);
    game.increase_idx_def(0, def_amt);
}

// One Heart One Sword
card_actions["213021"] = (game) => {
    game.add_c_of_x(3, "bonus_sword_intent_multiplier");
    game.ignore_weaken();
    game.atk(6);
}

// 213022
card_actions["213022"] = (game) => {
    game.add_c_of_x(4, "bonus_sword_intent_multiplier");
    game.ignore_weaken();
    game.atk(6);
}

// 213023
card_actions["213023"] = (game) => {
    game.add_c_of_x(5, "bonus_sword_intent_multiplier");
    game.ignore_weaken();
    game.atk(6);
}

// Synergy Sword Formation
card_actions["213031"] = (game) => {
    const sdfc = game.players[0].other_sword_formation_deck_count;
    game.atk(4 + 3 * sdfc);
    game.increase_idx_def(0, 4 + 3 * sdfc);
}

// 213032
card_actions["213032"] = (game) => {
    const sdfc = game.players[0].other_sword_formation_deck_count;
    game.atk(4 + 4 * sdfc);
    game.increase_idx_def(0, 4 + 4 * sdfc);
}

// 213033
card_actions["213033"] = (game) => {
    const sdfc = game.players[0].other_sword_formation_deck_count;
    game.atk(4 + 5 * sdfc);
    game.increase_idx_def(0, 4 + 5 * sdfc);
}

// Sword Intent Flow
card_actions["214011"] = (game) => {
    game.increase_idx_x_by_c(0, "sword_intent", 2);
    game.add_c_of_x(1, "sword_intent_flow_stacks");
}

// 214012
card_actions["214012"] = (game) => {
    game.increase_idx_x_by_c(0, "sword_intent", 3);
    game.add_c_of_x(1, "sword_intent_flow_stacks");
}

// 214013
card_actions["214013"] = (game) => {
    game.increase_idx_x_by_c(0, "sword_intent", 4);
    game.add_c_of_x(1, "sword_intent_flow_stacks");
}

// Emptiness Sword Formation
card_actions["214021"] = (game) => {
    game.continuous();
    game.add_c_of_x(7, "emptiness_sword_formation_stacks");
}

// 214022
card_actions["214022"] = (game) => {
    game.continuous();
    game.add_c_of_x(10, "emptiness_sword_formation_stacks");
}

// 214023
card_actions["214023"] = (game) => {
    game.continuous();
    game.add_c_of_x(13, "emptiness_sword_formation_stacks");
}

// Apex Sword Citta-Dharma
card_actions["215011"] = (game) => {
    game.continuous();
    game.add_c_of_x(2, "apex_sword_citta_dharma_stacks");
}

// 215012
card_actions["215012"] = (game) => {
    game.continuous();
    game.add_c_of_x(3, "apex_sword_citta_dharma_stacks");
}

// 215013
card_actions["215013"] = (game) => {
    game.continuous();
    game.add_c_of_x(4, "apex_sword_citta_dharma_stacks");
}

// Step Moon Into Cloud
card_actions["215021"] = (game) => {
    game.continuous();
    game.add_c_of_x(1, "step_moon_into_cloud_stacks");
}

// 215022
card_actions["215022"] = (game) => {
    game.continuous();
    game.add_c_of_x(1, "step_moon_into_cloud_stacks");
    game.chase();
}

// 215023
card_actions["215023"] = (game) => {
    game.continuous();
    game.add_c_of_x(2, "step_moon_into_cloud_stacks");
    game.chase();
}

// Unrestrained Sword - Twin Dragons
card_actions["215031"] = (game) => {
    game.atk(2);
    game.add_c_of_x(1, "unrestrained_sword_twin_dragons_stacks");
}

// 215032
card_actions["215032"] = (game) => {
    game.atk(8);
    game.add_c_of_x(1, "unrestrained_sword_twin_dragons_stacks");
}

// 215033
card_actions["215033"] = (game) => {
    game.atk(14);
    game.add_c_of_x(1, "unrestrained_sword_twin_dragons_stacks");
}

// Remnant Cloud Phocosky Sword
card_actions["216011"] = (game) => {
    game.atk(8 + 8 * game.players[0].cloud_sword_hand_count);
}

// 216012
card_actions["216012"] = (game) => {
    game.atk(10 + 10 * game.players[0].cloud_sword_hand_count);
}

// 216013
card_actions["216013"] = (game) => {
    game.atk(12 + 12 * game.players[0].cloud_sword_hand_count);
}

// Secret Sword - Spirit Cloud
card_actions["216021"] = (game) => {
    let atk_amt = 4;
    if (game.if_cloud_hit()) {
        atk_amt += 4;
    }
    const rep_amt = 1 + game.players[0].qi;
    for (let i = 0; i < rep_amt; i++) {
        game.atk(atk_amt);
    }
}

// 216022
card_actions["216022"] = (game) => {
    let atk_amt = 6;
    if (game.if_cloud_hit()) {
        atk_amt += 6;
    }
    const rep_amt = 1 + game.players[0].qi;
    for (let i = 0; i < rep_amt; i++) {
        game.atk(atk_amt);
    }
}

// 216023
card_actions["216023"] = (game) => {
    let atk_amt = 8;
    if (game.if_cloud_hit()) {
        atk_amt += 8;
    }
    const rep_amt = 1 + game.players[0].qi;
    for (let i = 0; i < rep_amt; i++) {
        game.atk(atk_amt);
    }
}

// Hexagrams Spirit Resurrection
card_actions["221011"] = (game) => {
    const hexagram_amt = game.exhaust_x("hexagram");
    const qi_amt = game.exhaust_x("qi");
    const heal_amt = (hexagram_amt + qi_amt) * 4;
    game.increase_idx_hp(0, heal_amt);
}

// 221012
card_actions["221012"] = (game) => {
    const hexagram_amt = game.exhaust_x("hexagram");
    const qi_amt = game.exhaust_x("qi");
    const heal_amt = (hexagram_amt + qi_amt) * 5;
    game.increase_idx_hp(0, heal_amt);
}

// 221013
card_actions["221013"] = (game) => {
    const hexagram_amt = game.exhaust_x("hexagram");
    const qi_amt = game.exhaust_x("qi");
    const heal_amt = (hexagram_amt + qi_amt) * 6;
    game.increase_idx_hp(0, heal_amt);
}

// Throwing Stones For Directions
card_actions["221021"] = (game) => {
    game.atk(6);
    game.add_enemy_rand_range_of_x(0, 2, "weaken");
    game.add_enemy_rand_range_of_x(0, 2, "flaw");
}

// 221022
card_actions["221022"] = (game) => {
    game.atk(6);
    game.add_enemy_rand_range_of_x(0, 2, "weaken");
    game.add_enemy_rand_range_of_x(0, 3, "flaw");
}

// 221023
card_actions["221023"] = (game) => {
    game.atk(6);
    game.add_enemy_rand_range_of_x(0, 3, "weaken");
    game.add_enemy_rand_range_of_x(0, 3, "flaw");
}

// Vitality Blossom
card_actions["222011"] = (game) => {
    game.add_c_of_x(7, "max_hp");
    game.increase_idx_hp(0, 7);
    game.continuous();
    game.add_c_of_x(1, "vitality_blossom_stacks");
}

// 222012
card_actions["222012"] = (game) => {
    game.add_c_of_x(11, "max_hp");
    game.increase_idx_hp(0, 11);
    game.continuous();
    game.add_c_of_x(1, "vitality_blossom_stacks");
}

// 222013
card_actions["222013"] = (game) => {
    game.add_c_of_x(15, "max_hp");
    game.increase_idx_hp(0, 15);
    game.continuous();
    game.add_c_of_x(1, "vitality_blossom_stacks");
}

// Star Born Rhythm
card_actions["222021"] = (game) => {
    game.add_c_of_x(2, "star_power");
    if (game.if_post_action()) {
        game.chase();
    }
}

// 222022
card_actions["222022"] = (game) => {
    game.add_c_of_x(3, "star_power");
    if (game.if_post_action()) {
        game.chase();
    }
}

// 222023
card_actions["222023"] = (game) => {
    game.add_c_of_x(4, "star_power");
    if (game.if_post_action()) {
        game.chase();
    }
}

// Sun And Moon For Glory
card_actions["223011"] = (game) => {
    game.do_sun_and_moon_for_glory(13, 0.5);
}

// 223012
card_actions["223012"] = (game) => {
    game.do_sun_and_moon_for_glory(17, 0.5);
}

// 223013
card_actions["223013"] = (game) => {
    game.do_sun_and_moon_for_glory(17, 1);
}

// All-Or-Nothing
card_actions["223021"] = (game) => {
    game.atk_rand_range(2, 20);
    game.def_rand_range(2, 20);
}

// 223022
card_actions["223022"] = (game) => {
    game.atk_rand_range(8, 23);
    game.def_rand_range(8, 23);
}

// 223023
card_actions["223023"] = (game) => {
    game.atk_rand_range(14, 26);
    game.def_rand_range(14, 26);
}

// Flowers And Water
card_actions["224011"] = (game) => {
    game.add_enemy_c_of_x(1, "internal_injury");
    game.for_each_enemy_x_add_y("internal_injury", "bonus_rep_amt");
    game.for_each_enemy_x_add_y("weaken", "bonus_rep_amt");
    game.for_each_enemy_x_add_y("flaw", "bonus_rep_amt");
    game.for_each_enemy_x_add_y("decrease_atk", "bonus_rep_amt");
    game.for_each_enemy_x_add_y("entangle", "bonus_rep_amt");
    game.for_each_enemy_x_add_y("wound", "bonus_rep_amt");
    game.for_each_enemy_x_add_y("styx", "bonus_rep_amt");
    for (let i = 0; i < 0 + game.players[0].bonus_rep_amt; i++) {
        game.atk(1);
    }
}

// 224012
card_actions["224012"] = (game) => {
    game.add_enemy_c_of_x(2, "internal_injury");
    game.for_each_enemy_x_add_y("internal_injury", "bonus_rep_amt");
    game.for_each_enemy_x_add_y("weaken", "bonus_rep_amt");
    game.for_each_enemy_x_add_y("flaw", "bonus_rep_amt");
    game.for_each_enemy_x_add_y("decrease_atk", "bonus_rep_amt");
    game.for_each_enemy_x_add_y("entangle", "bonus_rep_amt");
    game.for_each_enemy_x_add_y("wound", "bonus_rep_amt");
    game.for_each_enemy_x_add_y("styx", "bonus_rep_amt");
    for (let i = 0; i < 0 + game.players[0].bonus_rep_amt; i++) {
        game.atk(1);
    }
}

// 224013
card_actions["224013"] = (game) => {
    game.add_enemy_c_of_x(3, "internal_injury");
    game.for_each_enemy_x_add_y("internal_injury", "bonus_rep_amt");
    game.for_each_enemy_x_add_y("weaken", "bonus_rep_amt");
    game.for_each_enemy_x_add_y("flaw", "bonus_rep_amt");
    game.for_each_enemy_x_add_y("decrease_atk", "bonus_rep_amt");
    game.for_each_enemy_x_add_y("entangle", "bonus_rep_amt");
    game.for_each_enemy_x_add_y("wound", "bonus_rep_amt");
    game.for_each_enemy_x_add_y("styx", "bonus_rep_amt");
    for (let i = 0; i < 0 + game.players[0].bonus_rep_amt; i++) {
        game.atk(1);
    }
}

// Astral Move - Dragon Slay
card_actions["224021"] = (game) => {
    game.add_c_of_x(4, "bonus_star_power_multiplier");
    game.atk(10);
}

// 224022
card_actions["224022"] = (game) => {
    game.add_c_of_x(5, "bonus_star_power_multiplier");
    game.atk(12);
}

// 224023
card_actions["224023"] = (game) => {
    game.add_c_of_x(6, "bonus_star_power_multiplier");
    game.atk(14);
}

// Thunder Citta-Dharma
card_actions["224031"] = (game) => {
    game.add_c_of_x(1, "hexagram");
    game.continuous();
    game.add_c_of_x(40, "thunder_citta_dharma_stacks");
}

// 224032
card_actions["224032"] = (game) => {
    game.add_c_of_x(2, "hexagram");
    game.continuous();
    game.add_c_of_x(50, "thunder_citta_dharma_stacks");
}

// 224033
card_actions["224033"] = (game) => {
    game.add_c_of_x(3, "hexagram");
    game.continuous();
    game.add_c_of_x(60, "thunder_citta_dharma_stacks");
}

// Thin On The Ground
card_actions["225011"] = (game) => {
    if (game.if_c_pct(1)) {
        game.add_c_of_x(4, "max_hp");
        game.increase_idx_hp(0, 30);
    }
    game.consumption();
}

// 225012
card_actions["225012"] = (game) => {
    if (game.if_c_pct(1)) {
        game.add_c_of_x(6, "max_hp");
        game.increase_idx_hp(0, 40);
    }
    game.consumption();
}

// 225013
card_actions["225013"] = (game) => {
    if (game.if_c_pct(1)) {
        game.add_c_of_x(8, "max_hp");
        game.increase_idx_hp(0, 50);
    }
    game.consumption();
}

// Preemptive Strike
card_actions["225021"] = (game) => {
    game.atk(4);
    game.continuous();
    game.add_c_of_x(1, "preemptive_strike_stacks");
}

// 225022
card_actions["225022"] = (game) => {
    game.atk(10);
    game.continuous();
    game.add_c_of_x(1, "preemptive_strike_stacks");
}

// 225023
card_actions["225023"] = (game) => {
    game.atk(16);
    game.continuous();
    game.add_c_of_x(1, "preemptive_strike_stacks");
}

// Meteorite Meteor
card_actions["225031"] = (game) => {
    game.exhaust_x_to_add_y("star_power", "bonus_rep_amt");
    for (let i = 0; i < 0 + game.players[0].bonus_rep_amt; i++) {
        game.deal_damage(8);
    }
}

// 225032
card_actions["225032"] = (game) => {
    game.exhaust_x_to_add_y("star_power", "bonus_rep_amt");
    for (let i = 0; i < 0 + game.players[0].bonus_rep_amt; i++) {
        game.deal_damage(9);
    }
}

// 225033
card_actions["225033"] = (game) => {
    game.exhaust_x_to_add_y("star_power", "bonus_rep_amt");
    for (let i = 0; i < 0 + game.players[0].bonus_rep_amt; i++) {
        game.deal_damage(10);
    }
}

// Destiny Catastrophe
card_actions["226011"] = (game) => {
    if (game.players[0].hexagram >= 8) {
        if (game.players[0].hexagram <= 8) {
            game.set_enemy_c_of_x(8, "hp");
        }
    }
}

// 226012
card_actions["226012"] = (game) => {
    if (game.players[0].hexagram >= 8) {
        if (game.players[0].hexagram <= 8) {
            game.set_enemy_c_of_x(4, "hp");
        }
    }
}

// 226013
card_actions["226013"] = (game) => {
    if (game.players[0].hexagram >= 8) {
        if (game.players[0].hexagram <= 8) {
            game.set_enemy_c_of_x(1, "hp");
        }
    }
}

// Covert Shift
card_actions["226021"] = (game) => {
    game.add_c_of_x(2, "covert_shift_stacks");
}

// 226022
card_actions["226022"] = (game) => {
    game.add_c_of_x(3, "covert_shift_stacks");
}

// 226023
card_actions["226023"] = (game) => {
    game.add_c_of_x(4, "covert_shift_stacks");
}

// Wood Spirit Secret Seal
card_actions["231011"] = (game) => {
    game.add_c_of_x(2, "increase_atk");
    game.activate_wood_spirit();
}

// 231012
card_actions["231012"] = (game) => {
    game.add_c_of_x(3, "increase_atk");
    game.activate_wood_spirit();
}

// 231013
card_actions["231013"] = (game) => {
    game.add_c_of_x(4, "increase_atk");
    game.activate_wood_spirit();
}

// Fire Spirit Secret Seal
card_actions["231021"] = (game) => {
    game.reduce_enemy_c_of_x(8, "hp");
    game.reduce_enemy_c_of_x(8, "max_hp");
    game.activate_fire_spirit();
}

// 231022
card_actions["231022"] = (game) => {
    game.reduce_enemy_c_of_x(12, "hp");
    game.reduce_enemy_c_of_x(12, "max_hp");
    game.activate_fire_spirit();
}

// 231023
card_actions["231023"] = (game) => {
    game.reduce_enemy_c_of_x(16, "hp");
    game.reduce_enemy_c_of_x(16, "max_hp");
    game.activate_fire_spirit();
}

// Earth Spirit Secret Seal
card_actions["231031"] = (game) => {
    game.increase_idx_def(0, 6);
    game.next_turn_def(6);
    game.activate_earth_spirit();
}

// 231032
card_actions["231032"] = (game) => {
    game.increase_idx_def(0, 9);
    game.next_turn_def(9);
    game.activate_earth_spirit();
}

// 231033
card_actions["231033"] = (game) => {
    game.increase_idx_def(0, 12);
    game.next_turn_def(12);
    game.activate_earth_spirit();
}

// Metal Spirit Secret Seal
card_actions["231041"] = (game) => {
    game.add_c_of_x(8, "penetrate");
    game.activate_metal_spirit();
}

// 231042
card_actions["231042"] = (game) => {
    game.add_c_of_x(11, "penetrate");
    game.activate_metal_spirit();
}

// 231043
card_actions["231043"] = (game) => {
    game.add_c_of_x(14, "penetrate");
    game.activate_metal_spirit();
}

// Water Spirit Secret Seal
card_actions["231051"] = (game) => {
    game.add_c_of_x(2, "force_of_water");
    game.activate_water_spirit();
}

// 231052
card_actions["231052"] = (game) => {
    game.add_c_of_x(3, "force_of_water");
    game.activate_water_spirit();
}

// 231053
card_actions["231053"] = (game) => {
    game.add_c_of_x(4, "force_of_water");
    game.activate_water_spirit();
}

// Metal Spirit - Chokehold
card_actions["232011"] = (game) => {
    game.atk(8);
    if (game.if_metal_spirit()) {
        game.add_enemy_c_of_x(2, "metal_spirit_chokehold_stacks");
    }
}

// 232012
card_actions["232012"] = (game) => {
    game.atk(12);
    if (game.if_metal_spirit()) {
        game.add_enemy_c_of_x(3, "metal_spirit_chokehold_stacks");
    }
}

// 232013
card_actions["232013"] = (game) => {
    game.atk(16);
    if (game.if_metal_spirit()) {
        game.add_enemy_c_of_x(4, "metal_spirit_chokehold_stacks");
    }
}

// Water Spirit - Rhythm Wood
card_actions["232021"] = (game) => {
    if (game.if_water_spirit()) {
        game.increase_idx_qi(0, 2);
    }
    if (game.if_wood_spirit()) {
        game.for_each_x_add_c_y("qi", 2, "hp");
    }
}

// 232022
card_actions["232022"] = (game) => {
    if (game.if_water_spirit()) {
        game.increase_idx_qi(0, 3);
    }
    if (game.if_wood_spirit()) {
        game.for_each_x_add_c_y("qi", 2, "hp");
    }
}

// 232023
card_actions["232023"] = (game) => {
    if (game.if_water_spirit()) {
        game.increase_idx_qi(0, 4);
    }
    if (game.if_wood_spirit()) {
        game.for_each_x_add_c_y("qi", 2, "hp");
    }
}

// Fire Spirit - Rhythm Earth
card_actions["232031"] = (game) => {
    game.do_fire_spirit_rhythm_earth(8, 4);
}

// 232032
card_actions["232032"] = (game) => {
    game.do_fire_spirit_rhythm_earth(12, 6);
}

// 232033
card_actions["232033"] = (game) => {
    game.do_fire_spirit_rhythm_earth(16, 8);
}

// Wood Spirit - Vine
card_actions["233011"] = (game) => {
    if (game.if_wood_spirit()) {
        game.for_each_x_add_c_pct_y_up_to_d("hp_gained", 20, "bonus_rep_amt", 3);
    }
    for (let i = 0; i < 2 + game.players[0].bonus_rep_amt; i++) {
        game.atk(4);
    }
}

// 233012
card_actions["233012"] = (game) => {
    if (game.if_wood_spirit()) {
        game.for_each_x_add_c_pct_y_up_to_d("hp_gained", 20, "bonus_rep_amt", 4);
    }
    for (let i = 0; i < 2 + game.players[0].bonus_rep_amt; i++) {
        game.atk(4);
    }
}

// 233013
card_actions["233013"] = (game) => {
    if (game.if_wood_spirit()) {
        game.for_each_x_add_c_pct_y_up_to_d("hp_gained", 20, "bonus_rep_amt", 5);
    }
    for (let i = 0; i < 2 + game.players[0].bonus_rep_amt; i++) {
        game.atk(4);
    }
}

// Metal Spirit - Rhythm Water
card_actions["233021"] = (game) => {
    game.do_metal_spirit_rhythm_water(4);
}

// 233022
card_actions["233022"] = (game) => {
    game.do_metal_spirit_rhythm_water(6);
}

// 233023
card_actions["233023"] = (game) => {
    game.do_metal_spirit_rhythm_water(8);
}

// Five Elements Escape
card_actions["233031"] = (game) => {
    game.do_five_elements_escape(8);
}

// 233032
card_actions["233032"] = (game) => {
    game.do_five_elements_escape(13);
}

// 233033
card_actions["233033"] = (game) => {
    game.do_five_elements_escape(18);
}

// Earth Spirit - Earthquake
card_actions["234011"] = (game) => {
    game.atk(6);
    game.increase_idx_def(0, 6);
    if (game.if_earth_spirit()) {
        game.reduce_enemy_x_by_c_pct_enemy_y("qi", 50, "qi");
        game.reduce_enemy_x_by_c_pct_enemy_y("def", 50, "def");
    }
}

// 234012
card_actions["234012"] = (game) => {
    game.atk(9);
    game.increase_idx_def(0, 9);
    if (game.if_earth_spirit()) {
        game.reduce_enemy_x_by_c_pct_enemy_y("qi", 50, "qi");
        game.reduce_enemy_x_by_c_pct_enemy_y("def", 50, "def");
    }
}

// 234013
card_actions["234013"] = (game) => {
    game.atk(12);
    game.increase_idx_def(0, 12);
    if (game.if_earth_spirit()) {
        game.reduce_enemy_x_by_c_pct_enemy_y("qi", 50, "qi");
        game.reduce_enemy_x_by_c_pct_enemy_y("def", 50, "def");
    }
}

// Wood Spirit - Rhythm Fire
card_actions["234021"] = (game) => {
    game.do_wood_spirit_rhythm_fire(16);
}

// 234022
card_actions["234022"] = (game) => {
    game.do_wood_spirit_rhythm_fire(22);
}

// 234023
card_actions["234023"] = (game) => {
    game.do_wood_spirit_rhythm_fire(28);
}

// Earth Spirit - Rhythm Metal
card_actions["234031"] = (game) => {
    game.do_earth_spirit_rhythm_metal(10);
}

// 234032
card_actions["234032"] = (game) => {
    game.do_earth_spirit_rhythm_metal(15);
}

// 234033
card_actions["234033"] = (game) => {
    game.do_earth_spirit_rhythm_metal(20);
}

// Fire Spirit - Burning Sky
card_actions["235011"] = (game) => {
    game.do_fire_spirit_burning_sky(3);
}

// 235012
card_actions["235012"] = (game) => {
    game.do_fire_spirit_burning_sky(5);
}

// 235013
card_actions["235013"] = (game) => {
    game.do_fire_spirit_burning_sky(7);
}

// Water Spirit - Tsunami
card_actions["235021"] = (game) => {
    game.add_c_of_x(4, "force_of_water");
    if (game.if_water_spirit()) {
        game.add_enemy_c_of_x(1, "cannot_act_stacks");
    }
}

// 235022
card_actions["235022"] = (game) => {
    game.add_c_of_x(5, "force_of_water");
    if (game.if_water_spirit()) {
        game.add_enemy_c_of_x(1, "cannot_act_stacks");
    }
}

// 235023
card_actions["235023"] = (game) => {
    game.add_c_of_x(6, "force_of_water");
    if (game.if_water_spirit()) {
        game.add_enemy_c_of_x(1, "cannot_act_stacks");
    }
}

// Five Elements Spirit Blast
card_actions["236011"] = (game) => {
    if (game.if_wood_spirit()) {
        game.atk(25);
    }
    if (game.if_fire_spirit()) {
        game.atk(25);
    }
    if (game.if_earth_spirit()) {
        game.atk(25);
    }
    if (game.if_metal_spirit()) {
        game.atk(25);
    }
    if (game.if_water_spirit()) {
        game.atk(25);
    }
}

// 236012
card_actions["236012"] = (game) => {
    if (game.if_wood_spirit()) {
        game.atk(28);
    }
    if (game.if_fire_spirit()) {
        game.atk(28);
    }
    if (game.if_earth_spirit()) {
        game.atk(28);
    }
    if (game.if_metal_spirit()) {
        game.atk(28);
    }
    if (game.if_water_spirit()) {
        game.atk(28);
    }
}

// 236013
card_actions["236013"] = (game) => {
    if (game.if_wood_spirit()) {
        game.atk(31);
    }
    if (game.if_fire_spirit()) {
        game.atk(31);
    }
    if (game.if_earth_spirit()) {
        game.atk(31);
    }
    if (game.if_metal_spirit()) {
        game.atk(31);
    }
    if (game.if_water_spirit()) {
        game.atk(31);
    }
}

// Five Elements Blossom
card_actions["236021"] = (game) => {
    game.trigger_card_by_id(131011);
    game.trigger_card_by_id(131031);
    game.trigger_card_by_id(131051);
    game.trigger_card_by_id(131071);
    game.trigger_card_by_id(131091);
    game.chase();
    game.consumption();
}

// 236022
card_actions["236022"] = (game) => {
    game.trigger_card_by_id(131012);
    game.trigger_card_by_id(131032);
    game.trigger_card_by_id(131052);
    game.trigger_card_by_id(131072);
    game.trigger_card_by_id(131092);
    game.chase();
    game.consumption();
}

// 236023
card_actions["236023"] = (game) => {
    game.trigger_card_by_id(131013);
    game.trigger_card_by_id(131033);
    game.trigger_card_by_id(131053);
    game.trigger_card_by_id(131073);
    game.trigger_card_by_id(131093);
    game.chase();
    game.consumption();
}

// Endless Entanglement
card_actions["241011"] = (game) => {
    game.physique(2);
    game.reduce_c_of_x(14, "max_hp");
    game.reduce_enemy_c_of_x(14, "max_hp");
}

// 241012
card_actions["241012"] = (game) => {
    game.physique(2);
    game.reduce_c_of_x(20, "max_hp");
    game.reduce_enemy_c_of_x(20, "max_hp");
}

// 241013
card_actions["241013"] = (game) => {
    game.physique(2);
    game.reduce_c_of_x(26, "max_hp");
    game.reduce_enemy_c_of_x(26, "max_hp");
}

// Endless Force
card_actions["241021"] = (game) => {
    game.continuous();
    game.add_c_of_x(4, "endless_force_stacks");
    if (game.players[0].force <= 0) {
        game.for_each_x_add_y("endless_force_stacks", "force");
    }
}

// 241022
card_actions["241022"] = (game) => {
    game.continuous();
    game.add_c_of_x(5, "endless_force_stacks");
    if (game.players[0].force <= 0) {
        game.for_each_x_add_y("endless_force_stacks", "force");
    }
}

// 241023
card_actions["241023"] = (game) => {
    game.continuous();
    game.add_c_of_x(6, "endless_force_stacks");
    if (game.players[0].force <= 0) {
        game.for_each_x_add_y("endless_force_stacks", "force");
    }
}

// Toxin Immunity
card_actions["242011"] = (game) => {
    game.add_c_of_x(5, "max_hp");
    game.increase_idx_hp(0, 5);
    game.continuous();
    game.add_c_of_x(6, "toxin_immunity_stacks");
}

// 242012
card_actions["242012"] = (game) => {
    game.add_c_of_x(9, "max_hp");
    game.increase_idx_hp(0, 9);
    game.continuous();
    game.add_c_of_x(9, "toxin_immunity_stacks");
}

// 242013
card_actions["242013"] = (game) => {
    game.add_c_of_x(13, "max_hp");
    game.increase_idx_hp(0, 13);
    game.continuous();
    game.add_c_of_x(12, "toxin_immunity_stacks");
}

// Lying Drunk
card_actions["242021"] = (game) => {
    game.atk(3);
    game.add_c_of_x(8, "agility");
    game.add_c_of_x(3, "lying_drunk_stacks");
}

// 242022
card_actions["242022"] = (game) => {
    game.atk(3);
    game.add_c_of_x(10, "agility");
    game.add_c_of_x(4, "lying_drunk_stacks");
}

// 242023
card_actions["242023"] = (game) => {
    game.atk(3);
    game.add_c_of_x(12, "agility");
    game.add_c_of_x(5, "lying_drunk_stacks");
}

// Break Pots and Sink Boats
card_actions["243021"] = (game) => {
    game.for_each_x_reduce_c_pct_y("max_hp", 80, "max_hp");
    game.add_c_of_x(3, "force");
    game.add_c_of_x(3, "guard_up");
    game.add_c_of_x(3, "increase_atk");
}

// 243022
card_actions["243022"] = (game) => {
    game.for_each_x_reduce_c_pct_y("max_hp", 80, "max_hp");
    game.add_c_of_x(4, "force");
    game.add_c_of_x(4, "guard_up");
    game.add_c_of_x(4, "increase_atk");
}

// 243023
card_actions["243023"] = (game) => {
    game.for_each_x_reduce_c_pct_y("max_hp", 80, "max_hp");
    game.add_c_of_x(5, "force");
    game.add_c_of_x(5, "guard_up");
    game.add_c_of_x(5, "increase_atk");
}

// Strength Driven Mad
card_actions["244011"] = (game) => {
    game.for_each_x_add_c_pct_y("physique", 10, "increase_atk");
    game.for_each_x_add_c_pct_y("physique", 10, "internal_injury");
}

// 244012
card_actions["244012"] = (game) => {
    game.for_each_x_add_c_pct_y("physique", 11.111112, "increase_atk");
    game.for_each_x_add_c_pct_y("physique", 11.111112, "internal_injury");
}

// 244013
card_actions["244013"] = (game) => {
    game.for_each_x_add_c_pct_y("physique", 12.5, "increase_atk");
    game.for_each_x_add_c_pct_y("physique", 12.5, "internal_injury");
}

// Crash Fist - Double
card_actions["244021"] = (game) => {
    game.atk(10);
    game.add_c_of_x(1, "crash_fist_double_stacks");
}

// 244022
card_actions["244022"] = (game) => {
    game.atk(15);
    game.add_c_of_x(1, "crash_fist_double_stacks");
}

// 244023
card_actions["244023"] = (game) => {
    game.atk(20);
    game.add_c_of_x(1, "crash_fist_double_stacks");
}

// Styx Three Hit
card_actions["244031"] = (game) => {
    const atk_amt = 2 + Math.floor(game.players[0].max_hp * 3.333334 / 100);
    for (let i = 0; i < 3; i++) {
        game.atk(atk_amt);
    }
}

// 244032
card_actions["244032"] = (game) => {
    const atk_amt = 2 + Math.floor(game.players[0].max_hp * 4.545455 / 100);
    for (let i = 0; i < 3; i++) {
        game.atk(atk_amt);
    }
}

// 244033
card_actions["244033"] = (game) => {
    const atk_amt = 2 + Math.floor(game.players[0].max_hp * 6.25 / 100);
    for (let i = 0; i < 3; i++) {
        game.atk(atk_amt);
    }
}

// Break Cocoon
card_actions["245011"] = (game) => {
    game.add_c_of_x(5, "agility");
    const debuff_count = game.get_debuff_count(0);
    game.for_each_x_reduce_c_pct_y("internal_injury", 100, "internal_injury");
    game.for_each_x_reduce_c_pct_y("weaken", 100, "weaken");
    game.for_each_x_reduce_c_pct_y("flaw", 100, "flaw");
    game.for_each_x_reduce_c_pct_y("decrease_atk", 100, "decrease_atk");
    game.for_each_x_reduce_c_pct_y("entangle", 100, "entangle");
    game.for_each_x_reduce_c_pct_y("wound", 100, "wound");
    game.for_each_x_reduce_c_pct_y("styx", 100, "styx");
    game.increase_idx_physique(0, debuff_count * 2);
    game.increase_idx_hp(0, debuff_count * 2);
}

// 245012
card_actions["245012"] = (game) => {
    game.add_c_of_x(10, "agility");
    const debuff_count = game.get_debuff_count(0);
    game.for_each_x_reduce_c_pct_y("internal_injury", 100, "internal_injury");
    game.for_each_x_reduce_c_pct_y("weaken", 100, "weaken");
    game.for_each_x_reduce_c_pct_y("flaw", 100, "flaw");
    game.for_each_x_reduce_c_pct_y("decrease_atk", 100, "decrease_atk");
    game.for_each_x_reduce_c_pct_y("entangle", 100, "entangle");
    game.for_each_x_reduce_c_pct_y("wound", 100, "wound");
    game.for_each_x_reduce_c_pct_y("styx", 100, "styx");
    game.increase_idx_physique(0, debuff_count * 2);
    game.increase_idx_hp(0, debuff_count * 2);
}

// 245013
card_actions["245013"] = (game) => {
    game.add_c_of_x(15, "agility");
    const debuff_count = game.get_debuff_count(0);
    game.for_each_x_reduce_c_pct_y("internal_injury", 100, "internal_injury");
    game.for_each_x_reduce_c_pct_y("weaken", 100, "weaken");
    game.for_each_x_reduce_c_pct_y("flaw", 100, "flaw");
    game.for_each_x_reduce_c_pct_y("decrease_atk", 100, "decrease_atk");
    game.for_each_x_reduce_c_pct_y("entangle", 100, "entangle");
    game.for_each_x_reduce_c_pct_y("wound", 100, "wound");
    game.for_each_x_reduce_c_pct_y("styx", 100, "styx");
    game.increase_idx_physique(0, debuff_count * 2);
    game.increase_idx_hp(0, debuff_count * 2);
}

// Eerie Melody Buries Soul
card_actions["245021"] = (game) => {
    game.add_c_of_x(3, "internal_injury");
    game.add_enemy_c_of_x(3, "internal_injury");
    game.add_c_of_x(3, "flaw");
    game.add_enemy_c_of_x(3, "flaw");
    game.add_c_of_x(3, "weaken");
    game.add_enemy_c_of_x(3, "weaken");
    game.add_c_of_x(3, "entangle");
    game.add_enemy_c_of_x(3, "entangle");
    game.add_c_of_x(3, "wound");
    game.add_enemy_c_of_x(3, "wound");
}

// 245022
card_actions["245022"] = (game) => {
    game.add_c_of_x(4, "internal_injury");
    game.add_enemy_c_of_x(4, "internal_injury");
    game.add_c_of_x(4, "flaw");
    game.add_enemy_c_of_x(4, "flaw");
    game.add_c_of_x(4, "weaken");
    game.add_enemy_c_of_x(4, "weaken");
    game.add_c_of_x(4, "entangle");
    game.add_enemy_c_of_x(4, "entangle");
    game.add_c_of_x(4, "wound");
    game.add_enemy_c_of_x(4, "wound");
}

// 245023
card_actions["245023"] = (game) => {
    game.add_c_of_x(5, "internal_injury");
    game.add_enemy_c_of_x(5, "internal_injury");
    game.add_c_of_x(5, "flaw");
    game.add_enemy_c_of_x(5, "flaw");
    game.add_c_of_x(5, "weaken");
    game.add_enemy_c_of_x(5, "weaken");
    game.add_c_of_x(5, "entangle");
    game.add_enemy_c_of_x(5, "entangle");
    game.add_c_of_x(5, "wound");
    game.add_enemy_c_of_x(5, "wound");
}

// Endless Crash
card_actions["246011"] = (game) => {
    game.do_endless_crash(1);
    game.consumption();
}

// 246012
card_actions["246012"] = (game) => {
    game.do_endless_crash(2);
    game.consumption();
}

// 246013
card_actions["246013"] = (game) => {
    game.do_endless_crash(3);
    game.consumption();
}

// Return To Simplicity
card_actions["246021"] = (game) => {
    game.physique(5);
    game.continuous();
    game.for_each_x_add_c_pct_y("physique", 20, "return_to_simplicity_stacks");
}

// 246022
card_actions["246022"] = (game) => {
    game.physique(10);
    game.continuous();
    game.for_each_x_add_c_pct_y("physique", 20, "return_to_simplicity_stacks");
}

// 246023
card_actions["246023"] = (game) => {
    game.physique(15);
    game.continuous();
    game.for_each_x_add_c_pct_y("physique", 20, "return_to_simplicity_stacks");
}

// Earth Spirit Elixir
card_actions["311011"] = (game) => {
    game.increase_idx_def(0, 11);
    game.consumption();
}

// 311012
card_actions["311012"] = (game) => {
    game.increase_idx_def(0, 16);
    game.consumption();
}

// 311013
card_actions["311013"] = (game) => {
    game.increase_idx_def(0, 21);
    game.consumption();
}

// Fundamental Elixir
card_actions["311021"] = (game) => {
    game.increase_idx_qi(0, 2);
    game.increase_idx_def(0, 3);
    game.consumption();
}

// 311022
card_actions["311022"] = (game) => {
    game.increase_idx_qi(0, 3);
    game.increase_idx_def(0, 5);
    game.consumption();
}

// 311023
card_actions["311023"] = (game) => {
    game.increase_idx_qi(0, 4);
    game.increase_idx_def(0, 7);
    game.consumption();
}

// Small Recover Elixir
card_actions["311031"] = (game) => {
    game.increase_idx_hp(0, 8);
    game.consumption();
}

// 311032
card_actions["311032"] = (game) => {
    game.increase_idx_hp(0, 12);
    game.consumption();
}

// 311033
card_actions["311033"] = (game) => {
    game.increase_idx_hp(0, 16);
    game.consumption();
}

// Cloud Elixir
card_actions["312011"] = (game) => {
    game.increase_idx_qi(0, 2);
    game.increase_idx_x_by_c(0, "ignore_def", 2);
    game.consumption();
}

// 312012
card_actions["312012"] = (game) => {
    game.increase_idx_qi(0, 3);
    game.increase_idx_x_by_c(0, "ignore_def", 3);
    game.consumption();
}

// 312013
card_actions["312013"] = (game) => {
    game.increase_idx_qi(0, 4);
    game.increase_idx_x_by_c(0, "ignore_def", 4);
    game.consumption();
}

// Exorcism Elixir
card_actions["312021"] = (game) => {
    game.increase_idx_def(0, 8);
    game.reduce_random_debuff_by_c_n_times(3, 2);
    game.consumption();
}

// 312022
card_actions["312022"] = (game) => {
    game.increase_idx_def(0, 12);
    game.reduce_random_debuff_by_c_n_times(3, 3);
    game.consumption();
}

// 312023
card_actions["312023"] = (game) => {
    game.increase_idx_def(0, 16);
    game.reduce_random_debuff_by_c_n_times(3, 4);
    game.consumption();
}

// Healing Elixir
card_actions["313011"] = (game) => {
    game.increase_idx_hp(0, 7);
    game.for_each_x_add_c_y("qi", 2, "hp");
    game.consumption();
}

// 313012
card_actions["313012"] = (game) => {
    game.increase_idx_hp(0, 12);
    game.for_each_x_add_c_y("qi", 2, "hp");
    game.consumption();
}

// 313013
card_actions["313013"] = (game) => {
    game.increase_idx_hp(0, 17);
    game.for_each_x_add_c_y("qi", 2, "hp");
    game.consumption();
}

// Divine Power Elixir
card_actions["313021"] = (game) => {
    game.add_c_of_x(1, "increase_atk");
    game.consumption();
}

// 313022
card_actions["313022"] = (game) => {
    game.add_c_of_x(2, "increase_atk");
    game.consumption();
}

// 313023
card_actions["313023"] = (game) => {
    game.add_c_of_x(3, "increase_atk");
    game.consumption();
}

// Great Recover Elixir
card_actions["314011"] = (game) => {
    game.add_c_of_x(13, "max_hp");
    game.increase_idx_hp(0, 13);
    game.consumption();
}

// 314012
card_actions["314012"] = (game) => {
    game.add_c_of_x(19, "max_hp");
    game.increase_idx_hp(0, 19);
    game.consumption();
}

// 314013
card_actions["314013"] = (game) => {
    game.add_c_of_x(25, "max_hp");
    game.increase_idx_hp(0, 25);
    game.consumption();
}

// Spiritage Elixir
card_actions["314021"] = (game) => {
    game.increase_idx_qi(0, 4);
    game.consumption();
}

// 314022
card_actions["314022"] = (game) => {
    game.increase_idx_qi(0, 6);
    game.consumption();
}

// 314023
card_actions["314023"] = (game) => {
    game.increase_idx_qi(0, 8);
    game.consumption();
}

// Ice Spirit Guard Elixir
card_actions["315011"] = (game) => {
    game.add_c_of_x(2, "guard_up");
    game.consumption();
}

// 315012
card_actions["315012"] = (game) => {
    game.add_c_of_x(3, "guard_up");
    game.consumption();
}

// 315013
card_actions["315013"] = (game) => {
    game.add_c_of_x(4, "guard_up");
    game.consumption();
}

// Thunder Fulu
card_actions["321011"] = (game) => {
    game.deal_damage_rand_range(4, 12);
    game.consumption();
}

// 321012
card_actions["321012"] = (game) => {
    game.deal_damage_rand_range(7, 15);
    game.consumption();
}

// 321013
card_actions["321013"] = (game) => {
    game.deal_damage_rand_range(10, 18);
    game.consumption();
}

// Guard Spirit Fulu
card_actions["321021"] = (game) => {
    game.increase_idx_qi(0, 1);
    game.increase_idx_def(0, 7);
    game.consumption();
}

// 321022
card_actions["321022"] = (game) => {
    game.increase_idx_qi(0, 1);
    game.increase_idx_def(0, 11);
    game.consumption();
}

// 321023
card_actions["321023"] = (game) => {
    game.increase_idx_qi(0, 1);
    game.increase_idx_def(0, 15);
    game.consumption();
}

// Sharp Metal Fulu
card_actions["321031"] = (game) => {
    game.deal_damage(8);
    game.consumption();
}

// 321032
card_actions["321032"] = (game) => {
    game.deal_damage(11);
    game.consumption();
}

// 321033
card_actions["321033"] = (game) => {
    game.deal_damage(14);
    game.consumption();
}

// Fire Cloud Fulu
card_actions["322011"] = (game) => {
    game.reduce_enemy_c_of_x(12, "hp");
    game.reduce_enemy_c_of_x(12, "max_hp");
    game.consumption();
}

// 322012
card_actions["322012"] = (game) => {
    game.reduce_enemy_c_of_x(16, "hp");
    game.reduce_enemy_c_of_x(16, "max_hp");
    game.consumption();
}

// 322013
card_actions["322013"] = (game) => {
    game.reduce_enemy_c_of_x(20, "hp");
    game.reduce_enemy_c_of_x(20, "max_hp");
    game.consumption();
}

// Calm Incantation
card_actions["322021"] = (game) => {
    game.increase_idx_qi(0, 2);
    game.reduce_c_of_x(2, "internal_injury");
    game.reduce_c_of_x(2, "weaken");
    game.reduce_c_of_x(2, "flaw");
    game.reduce_c_of_x(2, "decrease_atk");
    game.reduce_c_of_x(2, "entangle");
    game.reduce_c_of_x(2, "wound");
    game.reduce_c_of_x(2, "styx");
}

// 322022
card_actions["322022"] = (game) => {
    game.increase_idx_qi(0, 3);
    game.reduce_c_of_x(3, "internal_injury");
    game.reduce_c_of_x(3, "weaken");
    game.reduce_c_of_x(3, "flaw");
    game.reduce_c_of_x(3, "decrease_atk");
    game.reduce_c_of_x(3, "entangle");
    game.reduce_c_of_x(3, "wound");
    game.reduce_c_of_x(3, "styx");
}

// 322023
card_actions["322023"] = (game) => {
    game.increase_idx_qi(0, 4);
    game.reduce_c_of_x(4, "internal_injury");
    game.reduce_c_of_x(4, "weaken");
    game.reduce_c_of_x(4, "flaw");
    game.reduce_c_of_x(4, "decrease_atk");
    game.reduce_c_of_x(4, "entangle");
    game.reduce_c_of_x(4, "wound");
    game.reduce_c_of_x(4, "styx");
}

// Mist Fulu
card_actions["322031"] = (game) => {
    game.increase_idx_qi(0, 1);
    game.deal_damage(7);
    game.consumption();
}

// 322032
card_actions["322032"] = (game) => {
    game.increase_idx_qi(0, 1);
    game.deal_damage(11);
    game.consumption();
}

// 322033
card_actions["322033"] = (game) => {
    game.increase_idx_qi(0, 1);
    game.deal_damage(15);
    game.consumption();
}

// Ice Incantation
card_actions["323011"] = (game) => {
    for (let i = 0; i < 2; i++) {
        game.reduce_enemy_c_of_x(4, "hp");
    }
}

// 323012
card_actions["323012"] = (game) => {
    for (let i = 0; i < 3; i++) {
        game.reduce_enemy_c_of_x(4, "hp");
    }
}

// 323013
card_actions["323013"] = (game) => {
    for (let i = 0; i < 4; i++) {
        game.reduce_enemy_c_of_x(4, "hp");
    }
}

// Spirit Absorb Fulu
card_actions["323021"] = (game) => {
    game.increase_idx_qi(0, 2);
    game.reduce_enemy_c_of_x(1, "qi");
    game.consumption();
}

// 323022
card_actions["323022"] = (game) => {
    game.increase_idx_qi(0, 3);
    game.reduce_enemy_c_of_x(2, "qi");
    game.consumption();
}

// 323023
card_actions["323023"] = (game) => {
    game.increase_idx_qi(0, 4);
    game.reduce_enemy_c_of_x(3, "qi");
    game.consumption();
}

// Miasma Fulu
card_actions["323031"] = (game) => {
    game.add_enemy_c_of_x(2, "internal_injury");
    game.consumption();
}

// 323032
card_actions["323032"] = (game) => {
    game.add_enemy_c_of_x(3, "internal_injury");
    game.consumption();
}

// 323033
card_actions["323033"] = (game) => {
    game.add_enemy_c_of_x(4, "internal_injury");
    game.consumption();
}

// Spiritage Incantation
card_actions["324011"] = (game) => {
    game.increase_idx_qi(0, 3);
    game.for_each_x_up_to_c_add_y("qi", 7, "def");
}

// 324012
card_actions["324012"] = (game) => {
    game.increase_idx_qi(0, 4);
    game.for_each_x_up_to_c_add_y("qi", 13, "def");
}

// 324013
card_actions["324013"] = (game) => {
    game.increase_idx_qi(0, 5);
    game.for_each_x_up_to_c_add_y("qi", 19, "def");
}

// Distubing Fulu
card_actions["324021"] = (game) => {
    game.add_enemy_c_of_x(3, "flaw");
    game.consumption();
}

// 324022
card_actions["324022"] = (game) => {
    game.add_enemy_c_of_x(4, "flaw");
    game.consumption();
}

// 324023
card_actions["324023"] = (game) => {
    game.add_enemy_c_of_x(5, "flaw");
    game.consumption();
}

// Weaken Fulu
card_actions["324031"] = (game) => {
    game.add_enemy_c_of_x(2, "weaken");
    game.consumption();
}

// 324032
card_actions["324032"] = (game) => {
    game.add_enemy_c_of_x(3, "weaken");
    game.consumption();
}

// 324033
card_actions["324033"] = (game) => {
    game.add_enemy_c_of_x(4, "weaken");
    game.consumption();
}

// Soul Requiem Fulu
card_actions["325011"] = (game) => {
    game.reduce_enemy_x_by_c_pct_enemy_y("hp", 15, "hp");
    game.reduce_enemy_x_by_c_pct_enemy_y("max_hp", 15, "max_hp");
    game.reduce_enemy_c_of_x(2, "qi");
    game.consumption();
}

// 325012
card_actions["325012"] = (game) => {
    game.reduce_enemy_x_by_c_pct_enemy_y("hp", 20, "hp");
    game.reduce_enemy_x_by_c_pct_enemy_y("max_hp", 20, "max_hp");
    game.reduce_enemy_c_of_x(3, "qi");
    game.consumption();
}

// 325013
card_actions["325013"] = (game) => {
    game.reduce_enemy_x_by_c_pct_enemy_y("hp", 25, "hp");
    game.reduce_enemy_x_by_c_pct_enemy_y("max_hp", 25, "max_hp");
    game.reduce_enemy_c_of_x(4, "qi");
    game.consumption();
}

// Divine Walk Fulu
card_actions["325021"] = (game) => {
    game.increase_idx_qi(0, 2);
    game.consumption();
    game.chase();
}

// 325022
card_actions["325022"] = (game) => {
    game.increase_idx_qi(0, 4);
    game.consumption();
    game.chase();
}

// 325023
card_actions["325023"] = (game) => {
    game.increase_idx_qi(0, 6);
    game.consumption();
    game.chase();
}

// Thousand Evil Incantation
card_actions["325031"] = (game) => {
    game.add_enemy_c_of_x(2, "internal_injury");
    game.add_enemy_c_of_x(2, "flaw");
    game.add_enemy_c_of_x(1, "weaken");
}

// 325032
card_actions["325032"] = (game) => {
    game.add_enemy_c_of_x(3, "internal_injury");
    game.add_enemy_c_of_x(2, "flaw");
    game.add_enemy_c_of_x(2, "weaken");
}

// 325033
card_actions["325033"] = (game) => {
    game.add_enemy_c_of_x(3, "internal_injury");
    game.add_enemy_c_of_x(3, "flaw");
    game.add_enemy_c_of_x(3, "weaken");
}

// Cracking Voice
card_actions["331011"] = (game) => {
    game.increase_idx_x_by_c(0, "ignore_def", 1);
    let atk_amt = 6;
    if (game.players[0].has_played_musician_card >= 1) {
        atk_amt += 1;
    }
    game.atk(atk_amt);
}

// 331012
card_actions["331012"] = (game) => {
    game.increase_idx_x_by_c(0, "ignore_def", 1);
    let atk_amt = 9;
    if (game.players[0].has_played_musician_card >= 1) {
        atk_amt += 1;
    }
    game.atk(atk_amt);
}

// 331013
card_actions["331013"] = (game) => {
    game.increase_idx_x_by_c(0, "ignore_def", 1);
    let atk_amt = 12;
    if (game.players[0].has_played_musician_card >= 1) {
        atk_amt += 1;
    }
    game.atk(atk_amt);
}

// Earth Tune
card_actions["331021"] = (game) => {
    game.add_c_of_x(14, "def");
    game.add_enemy_c_of_x(14, "def");
}

// 331022
card_actions["331022"] = (game) => {
    game.add_c_of_x(20, "def");
    game.add_enemy_c_of_x(20, "def");
}

// 331023
card_actions["331023"] = (game) => {
    game.add_c_of_x(26, "def");
    game.add_enemy_c_of_x(26, "def");
}

// Carefree Tune
card_actions["331031"] = (game) => {
    game.continuous();
    game.add_c_of_x(4, "carefree_tune_stacks");
    game.add_enemy_c_of_x(4, "carefree_tune_stacks");
}

// 331032
card_actions["331032"] = (game) => {
    game.continuous();
    game.add_c_of_x(6, "carefree_tune_stacks");
    game.add_enemy_c_of_x(6, "carefree_tune_stacks");
}

// 331033
card_actions["331033"] = (game) => {
    game.continuous();
    game.add_c_of_x(9, "carefree_tune_stacks");
    game.add_enemy_c_of_x(9, "carefree_tune_stacks");
}

// Kindness Tune
card_actions["332011"] = (game) => {
    game.continuous();
    game.set_c_up_to_x(4, "kindness_tune_stacks");
    game.set_enemy_c_up_to_x(4, "kindness_tune_stacks");
}

// 332012
card_actions["332012"] = (game) => {
    game.continuous();
    game.set_c_up_to_x(6, "kindness_tune_stacks");
    game.set_enemy_c_up_to_x(6, "kindness_tune_stacks");
}

// 332013
card_actions["332013"] = (game) => {
    game.continuous();
    game.set_c_up_to_x(8, "kindness_tune_stacks");
    game.set_enemy_c_up_to_x(8, "kindness_tune_stacks");
}

// Illusion Tune
card_actions["332021"] = (game) => {
    game.continuous();
    game.add_c_of_x(3, "illusion_tune_stacks");
    game.add_enemy_c_of_x(3, "illusion_tune_stacks");
}

// 332022
card_actions["332022"] = (game) => {
    game.continuous();
    game.add_c_of_x(5, "illusion_tune_stacks");
    game.add_enemy_c_of_x(5, "illusion_tune_stacks");
}

// 332023
card_actions["332023"] = (game) => {
    game.continuous();
    game.add_c_of_x(7, "illusion_tune_stacks");
    game.add_enemy_c_of_x(7, "illusion_tune_stacks");
}

// Sky Spirit Tune
card_actions["332031"] = (game) => {
    game.increase_idx_qi(0, 3);
    game.add_enemy_c_of_x(3, "qi");
}

// 332032
card_actions["332032"] = (game) => {
    game.increase_idx_qi(0, 5);
    game.add_enemy_c_of_x(5, "qi");
}

// 332033
card_actions["332033"] = (game) => {
    game.increase_idx_qi(0, 7);
    game.add_enemy_c_of_x(7, "qi");
}

// Heartbroken Tune
card_actions["333011"] = (game) => {
    game.continuous();
    game.add_c_of_x(1, "heartbroken_tune_stacks");
    game.add_enemy_c_of_x(1, "heartbroken_tune_stacks");
}

// 333012
card_actions["333012"] = (game) => {
    game.continuous();
    game.add_c_of_x(2, "heartbroken_tune_stacks");
    game.add_enemy_c_of_x(2, "heartbroken_tune_stacks");
}

// 333013
card_actions["333013"] = (game) => {
    game.continuous();
    game.add_c_of_x(3, "heartbroken_tune_stacks");
    game.add_enemy_c_of_x(3, "heartbroken_tune_stacks");
}

// Craze Dance Tune
card_actions["333021"] = (game) => {
    game.continuous();
    game.add_c_of_x(2, "craze_dance_tune_stacks");
    game.add_enemy_c_of_x(2, "craze_dance_tune_stacks");
}

// 333022
card_actions["333022"] = (game) => {
    game.continuous();
    game.add_c_of_x(4, "craze_dance_tune_stacks");
    game.add_enemy_c_of_x(4, "craze_dance_tune_stacks");
}

// 333023
card_actions["333023"] = (game) => {
    game.continuous();
    game.add_c_of_x(6, "craze_dance_tune_stacks");
    game.add_enemy_c_of_x(6, "craze_dance_tune_stacks");
}

// Tremolo
card_actions["333031"] = (game) => {
    let atk_amt = 2;
    if (game.players[0].has_played_musician_card >= 1) {
        atk_amt += 1;
    }
    for (let i = 0; i < 3; i++) {
        game.increase_idx_x_by_c(0, "ignore_def", 1);
        game.atk(atk_amt);
    }
}

// 333032
card_actions["333032"] = (game) => {
    let atk_amt = 3;
    if (game.players[0].has_played_musician_card >= 1) {
        atk_amt += 1;
    }
    for (let i = 0; i < 3; i++) {
        game.increase_idx_x_by_c(0, "ignore_def", 1);
        game.atk(atk_amt);
    }
}

// 333033
card_actions["333033"] = (game) => {
    let atk_amt = 4;
    if (game.players[0].has_played_musician_card >= 1) {
        atk_amt += 1;
    }
    for (let i = 0; i < 3; i++) {
        game.increase_idx_x_by_c(0, "ignore_def", 1);
        game.atk(atk_amt);
    }
}

// Regen Tune
card_actions["334011"] = (game) => {
    game.continuous();
    game.add_c_of_x(4, "regen_tune_stacks");
    game.add_enemy_c_of_x(4, "regen_tune_stacks");
}

// 334012
card_actions["334012"] = (game) => {
    game.continuous();
    game.add_c_of_x(6, "regen_tune_stacks");
    game.add_enemy_c_of_x(6, "regen_tune_stacks");
}

// 334013
card_actions["334013"] = (game) => {
    game.continuous();
    game.add_c_of_x(8, "regen_tune_stacks");
    game.add_enemy_c_of_x(8, "regen_tune_stacks");
}

// Nine Evil Ruptsprite
card_actions["334021"] = (game) => {
    game.reduce_c_of_x(3, "qi");
    game.reduce_enemy_c_of_x(3, "qi");
}

// 334022
card_actions["334022"] = (game) => {
    game.reduce_c_of_x(5, "qi");
    game.reduce_enemy_c_of_x(5, "qi");
}

// 334023
card_actions["334023"] = (game) => {
    game.reduce_c_of_x(7, "qi");
    game.reduce_enemy_c_of_x(7, "qi");
}

// Concentric Tune
card_actions["334031"] = (game) => {
    game.add_my_x_to_enemy_y("internal_injury", "internal_injury");
    game.add_my_x_to_enemy_y("weaken", "weaken");
    game.add_my_x_to_enemy_y("flaw", "flaw");
    game.add_my_x_to_enemy_y("decrease_atk", "decrease_atk");
    game.add_my_x_to_enemy_y("entangle", "entangle");
    game.add_my_x_to_enemy_y("wound", "wound");
    game.add_my_x_to_enemy_y("styx", "styx");
}

// 334032
card_actions["334032"] = (game) => {
    game.add_my_x_to_enemy_y("internal_injury", "internal_injury");
    game.add_my_x_to_enemy_y("weaken", "weaken");
    game.add_my_x_to_enemy_y("flaw", "flaw");
    game.add_my_x_to_enemy_y("decrease_atk", "decrease_atk");
    game.add_my_x_to_enemy_y("entangle", "entangle");
    game.add_my_x_to_enemy_y("wound", "wound");
    game.add_my_x_to_enemy_y("styx", "styx");
}

// 334033
card_actions["334033"] = (game) => {
    game.add_my_x_to_enemy_y("internal_injury", "internal_injury");
    game.add_my_x_to_enemy_y("weaken", "weaken");
    game.add_my_x_to_enemy_y("flaw", "flaw");
    game.add_my_x_to_enemy_y("decrease_atk", "decrease_atk");
    game.add_my_x_to_enemy_y("entangle", "entangle");
    game.add_my_x_to_enemy_y("wound", "wound");
    game.add_my_x_to_enemy_y("styx", "styx");
}

// Predicament for Immortals
card_actions["335011"] = (game) => {
    game.continuous();
    game.add_c_of_x(1, "predicament_for_immortals_stacks");
    game.add_enemy_c_of_x(1, "predicament_for_immortals_stacks");
}

// 335012
card_actions["335012"] = (game) => {
    game.continuous();
    game.add_c_of_x(1, "predicament_for_immortals_stacks");
    game.add_enemy_c_of_x(1, "predicament_for_immortals_stacks");
}

// 335013
card_actions["335013"] = (game) => {
    game.continuous();
    game.add_c_of_x(1, "predicament_for_immortals_stacks");
    game.add_enemy_c_of_x(1, "predicament_for_immortals_stacks");
}

// Apparition Confusion
card_actions["335021"] = (game) => {
    game.continuous();
    game.add_c_of_x(4, "apparition_confusion_stacks");
    game.add_enemy_c_of_x(4, "apparition_confusion_stacks");
}

// 335022
card_actions["335022"] = (game) => {
    game.continuous();
    game.add_c_of_x(5, "apparition_confusion_stacks");
    game.add_enemy_c_of_x(5, "apparition_confusion_stacks");
}

// 335023
card_actions["335023"] = (game) => {
    game.continuous();
    game.add_c_of_x(6, "apparition_confusion_stacks");
    game.add_enemy_c_of_x(6, "apparition_confusion_stacks");
}

// Chord In Tune
card_actions["335031"] = (game) => {
    game.increase_idx_qi(0, 2);
    game.do_chord_in_tune_thing();
}

// 335032
card_actions["335032"] = (game) => {
    game.increase_idx_qi(0, 4);
    game.do_chord_in_tune_thing();
}

// 335033
card_actions["335033"] = (game) => {
    game.increase_idx_qi(0, 6);
    game.do_chord_in_tune_thing();
}

// Toning
card_actions["341011"] = (game) => {
    game.atk(3);
    game.increase_idx_qi(0, 1);
    game.increase_idx_def(0, 3);
}

// 341012
card_actions["341012"] = (game) => {
    game.atk(3);
    game.increase_idx_qi(0, 2);
    game.increase_idx_def(0, 3);
}

// 341013
card_actions["341013"] = (game) => {
    game.atk(4);
    game.increase_idx_qi(0, 3);
    game.increase_idx_def(0, 3);
}

// Grinding Ink
card_actions["341021"] = (game) => {
    game.atk(8);
    game.increase_idx_qi(0, 1);
}

// 341022
card_actions["341022"] = (game) => {
    game.atk(11);
    game.increase_idx_qi(0, 1);
}

// 341023
card_actions["341023"] = (game) => {
    game.atk(14);
    game.increase_idx_qi(0, 1);
}

// Pen Walks Dragon Snake
card_actions["342011"] = (game) => {
    game.def_rand_range(5, 16);
}

// 342012
card_actions["342012"] = (game) => {
    game.def_rand_range(10, 21);
}

// 342013
card_actions["342013"] = (game) => {
    game.def_rand_range(15, 26);
}

// Feed on Illusions
card_actions["342021"] = (game) => {
    game.add_c_of_x(10, "max_hp");
    game.increase_idx_qi(0, 2);
}

// 342022
card_actions["342022"] = (game) => {
    game.add_c_of_x(15, "max_hp");
    game.increase_idx_qi(0, 3);
}

// 342023
card_actions["342023"] = (game) => {
    game.add_c_of_x(20, "max_hp");
    game.increase_idx_qi(0, 4);
}

// Gild The Lily
card_actions["342031"] = (game) => {
    for (let i = 0; i < 2; i++) {
        game.atk(5);
    }
    game.add_enemy_c_of_x(8, "def");
}

// 342032
card_actions["342032"] = (game) => {
    for (let i = 0; i < 2; i++) {
        game.atk(7);
    }
    game.add_enemy_c_of_x(8, "def");
}

// 342033
card_actions["342033"] = (game) => {
    for (let i = 0; i < 2; i++) {
        game.atk(9);
    }
    game.add_enemy_c_of_x(8, "def");
}

// Splash Ink
card_actions["343011"] = (game) => {
    switch (game.random_int(6)) {
        case 0:
            game.add_enemy_c_of_x(2, "internal_injury");
            break;
        case 1:
            game.add_enemy_c_of_x(2, "weaken");
            break;
        case 2:
            game.add_enemy_c_of_x(2, "flaw");
            break;
        case 3:
            game.add_enemy_c_of_x(2, "decrease_atk");
            break;
        case 4:
            game.add_enemy_c_of_x(2, "entangle");
            break;
        case 5:
            game.add_enemy_c_of_x(2, "wound");
            break;
    }
}

// 343012
card_actions["343012"] = (game) => {
    switch (game.random_int(6)) {
        case 0:
            game.add_enemy_c_of_x(3, "internal_injury");
            break;
        case 1:
            game.add_enemy_c_of_x(3, "weaken");
            break;
        case 2:
            game.add_enemy_c_of_x(3, "flaw");
            break;
        case 3:
            game.add_enemy_c_of_x(3, "decrease_atk");
            break;
        case 4:
            game.add_enemy_c_of_x(3, "entangle");
            break;
        case 5:
            game.add_enemy_c_of_x(3, "wound");
            break;
    }
}

// 343013
card_actions["343013"] = (game) => {
    switch (game.random_int(6)) {
        case 0:
            game.add_enemy_c_of_x(4, "internal_injury");
            break;
        case 1:
            game.add_enemy_c_of_x(4, "weaken");
            break;
        case 2:
            game.add_enemy_c_of_x(4, "flaw");
            break;
        case 3:
            game.add_enemy_c_of_x(4, "decrease_atk");
            break;
        case 4:
            game.add_enemy_c_of_x(4, "entangle");
            break;
        case 5:
            game.add_enemy_c_of_x(4, "wound");
            break;
    }
}

// Inspiration
card_actions["343021"] = (game) => {
    game.increase_idx_qi(0, 2);
    game.add_c_of_x(2, "inspiration_stacks");
}

// 343022
card_actions["343022"] = (game) => {
    game.increase_idx_qi(0, 3);
    game.add_c_of_x(3, "inspiration_stacks");
}

// 343023
card_actions["343023"] = (game) => {
    game.increase_idx_qi(0, 4);
    game.add_c_of_x(4, "inspiration_stacks");
}

// Divine Brush
card_actions["344011"] = (game) => {
    game.increase_idx_def(0, 4);
    game.trigger_random_sect_card(1);
}

// 344012
card_actions["344012"] = (game) => {
    game.increase_idx_def(0, 6);
    game.trigger_random_sect_card(2);
}

// 344013
card_actions["344013"] = (game) => {
    game.increase_idx_def(0, 8);
    game.trigger_random_sect_card(3);
}

// Falling Paper Clouds
card_actions["344021"] = (game) => {
    switch (game.random_int(3)) {
        case 0:
            game.increase_idx_def(0, 18);
            break;
        case 1:
            game.increase_idx_hp(0, 14);
            break;
        case 2:
            game.add_c_of_x(1, "guard_up");
            break;
    }
}

// 344022
card_actions["344022"] = (game) => {
    switch (game.random_int(3)) {
        case 0:
            game.increase_idx_def(0, 26);
            break;
        case 1:
            game.increase_idx_hp(0, 20);
            break;
        case 2:
            game.add_c_of_x(2, "guard_up");
            break;
    }
}

// 344023
card_actions["344023"] = (game) => {
    switch (game.random_int(3)) {
        case 0:
            game.increase_idx_def(0, 34);
            break;
        case 1:
            game.increase_idx_hp(0, 26);
            break;
        case 2:
            game.add_c_of_x(3, "guard_up");
            break;
    }
}

// Flying Brush
card_actions["345011"] = (game) => {
    game.increase_idx_def(0, 6);
    game.add_c_of_x(1, "flying_brush_stacks");
}

// 345012
card_actions["345012"] = (game) => {
    game.increase_idx_def(0, 12);
    game.add_c_of_x(1, "flying_brush_stacks");
}

// 345013
card_actions["345013"] = (game) => {
    game.increase_idx_def(0, 18);
    game.add_c_of_x(1, "flying_brush_stacks");
}

// Finishing Touch
card_actions["345021"] = (game) => {
    game.add_c_of_x(3, "finishing_touch_stacks");
    game.consumption();
}

// 345022
card_actions["345022"] = (game) => {
    game.add_c_of_x(4, "finishing_touch_stacks");
    game.consumption();
}

// 345023
card_actions["345023"] = (game) => {
    game.add_c_of_x(5, "finishing_touch_stacks");
    game.consumption();
}

// Thunderphilia Formation
card_actions["351011"] = (game) => {
    game.continuous();
    game.add_c_of_x(2, "thunderphilia_formation_stacks");
}

// 351012
card_actions["351012"] = (game) => {
    game.continuous();
    game.add_c_of_x(3, "thunderphilia_formation_stacks");
}

// 351013
card_actions["351013"] = (game) => {
    game.continuous();
    game.add_c_of_x(4, "thunderphilia_formation_stacks");
}

// Fraccide Formation
card_actions["351021"] = (game) => {
    game.continuous();
    game.add_c_of_x(2, "fraccide_formation_stacks");
}

// 351022
card_actions["351022"] = (game) => {
    game.continuous();
    game.add_c_of_x(3, "fraccide_formation_stacks");
}

// 351023
card_actions["351023"] = (game) => {
    game.continuous();
    game.add_c_of_x(4, "fraccide_formation_stacks");
}

// Impact Formation
card_actions["351031"] = (game) => {
    game.atk(6);
    if (game.if_played_continuous()) {
        game.atk(2);
    }
}

// 351032
card_actions["351032"] = (game) => {
    game.atk(8);
    if (game.if_played_continuous()) {
        game.atk(3);
    }
}

// 351033
card_actions["351033"] = (game) => {
    game.atk(10);
    if (game.if_played_continuous()) {
        game.atk(4);
    }
}

// Scutturtle Formation
card_actions["352011"] = (game) => {
    game.continuous();
    game.add_c_of_x(4, "scutturtle_formation_stacks");
}

// 352012
card_actions["352012"] = (game) => {
    game.continuous();
    game.add_c_of_x(6, "scutturtle_formation_stacks");
}

// 352013
card_actions["352013"] = (game) => {
    game.continuous();
    game.add_c_of_x(8, "scutturtle_formation_stacks");
}

// Cacopoisonous Formation
card_actions["352021"] = (game) => {
    game.continuous();
    game.add_c_of_x(2, "cacopoisonous_formation_stacks");
}

// 352022
card_actions["352022"] = (game) => {
    game.continuous();
    game.add_c_of_x(3, "cacopoisonous_formation_stacks");
}

// 352023
card_actions["352023"] = (game) => {
    game.continuous();
    game.add_c_of_x(4, "cacopoisonous_formation_stacks");
}

// Cure Formation
card_actions["352031"] = (game) => {
    if (game.if_played_continuous()) {
        game.add_c_of_x(6, "max_hp");
    }
    game.increase_idx_hp(0, 7);
}

// 352032
card_actions["352032"] = (game) => {
    if (game.if_played_continuous()) {
        game.add_c_of_x(9, "max_hp");
    }
    game.increase_idx_hp(0, 11);
}

// 352033
card_actions["352033"] = (game) => {
    if (game.if_played_continuous()) {
        game.add_c_of_x(12, "max_hp");
    }
    game.increase_idx_hp(0, 15);
}

// Spiritage Formation
card_actions["353011"] = (game) => {
    game.continuous();
    game.add_c_of_x(2, "spiritage_formation_stacks");
}

// 353012
card_actions["353012"] = (game) => {
    game.continuous();
    game.add_c_of_x(3, "spiritage_formation_stacks");
}

// 353013
card_actions["353013"] = (game) => {
    game.continuous();
    game.add_c_of_x(4, "spiritage_formation_stacks");
}

// Endless Sword Formation
card_actions["353021"] = (game) => {
    game.continuous();
    game.add_c_of_x(2, "endless_sword_formation_stacks");
}

// 353022
card_actions["353022"] = (game) => {
    game.continuous();
    game.add_c_of_x(3, "endless_sword_formation_stacks");
}

// 353023
card_actions["353023"] = (game) => {
    game.continuous();
    game.add_c_of_x(4, "endless_sword_formation_stacks");
}

// Hexproof Formation
card_actions["353031"] = (game) => {
    game.add_c_of_x(3, "hexproof");
    if (game.if_played_continuous()) {
        game.increase_idx_def(0, 10);
    }
}

// 353032
card_actions["353032"] = (game) => {
    game.add_c_of_x(4, "hexproof");
    if (game.if_played_continuous()) {
        game.increase_idx_def(0, 14);
    }
}

// 353033
card_actions["353033"] = (game) => {
    game.add_c_of_x(5, "hexproof");
    if (game.if_played_continuous()) {
        game.increase_idx_def(0, 18);
    }
}

// Heavenly Spirit Forceage Formation
card_actions["354011"] = (game) => {
    game.continuous();
    game.add_c_of_x(2, "heavenly_spirit_forceage_formation_stacks");
}

// 354012
card_actions["354012"] = (game) => {
    game.continuous();
    game.add_c_of_x(3, "heavenly_spirit_forceage_formation_stacks");
}

// 354013
card_actions["354013"] = (game) => {
    game.continuous();
    game.add_c_of_x(4, "heavenly_spirit_forceage_formation_stacks");
}

// Octgates Lock Formation
card_actions["354021"] = (game) => {
    game.deal_damage(8);
    game.continuous();
    game.add_enemy_c_of_x(2, "octgates_lock_formation_stacks");
}

// 354022
card_actions["354022"] = (game) => {
    game.deal_damage(12);
    game.continuous();
    game.add_enemy_c_of_x(3, "octgates_lock_formation_stacks");
}

// 354023
card_actions["354023"] = (game) => {
    game.deal_damage(16);
    game.continuous();
    game.add_enemy_c_of_x(4, "octgates_lock_formation_stacks");
}

// Motionless Tutelary Formation
card_actions["354031"] = (game) => {
    game.continuous();
    game.add_c_of_x(2, "motionless_tutelary_formation_stacks");
}

// 354032
card_actions["354032"] = (game) => {
    game.continuous();
    game.add_c_of_x(3, "motionless_tutelary_formation_stacks");
}

// 354033
card_actions["354033"] = (game) => {
    game.continuous();
    game.add_c_of_x(4, "motionless_tutelary_formation_stacks");
}

// Anthomania Formation
card_actions["355011"] = (game) => {
    game.continuous();
    game.add_c_of_x(2, "anthomania_formation_stacks");
}

// 355012
card_actions["355012"] = (game) => {
    game.continuous();
    game.add_c_of_x(3, "anthomania_formation_stacks");
}

// 355013
card_actions["355013"] = (game) => {
    game.continuous();
    game.add_c_of_x(4, "anthomania_formation_stacks");
}

// Echo Formation
card_actions["355021"] = (game) => {
    game.do_echo_formation_thing(0);
}

// 355022
card_actions["355022"] = (game) => {
    game.do_echo_formation_thing(1);
}

// 355023
card_actions["355023"] = (game) => {
    game.do_echo_formation_thing(2);
}

// Meru Formation
card_actions["355031"] = (game) => {
    game.add_c_of_x(1, "skip_next_card_stacks");
    if (game.if_played_continuous()) {
        game.chase();
    }
}

// 355032
card_actions["355032"] = (game) => {
    game.add_c_of_x(2, "skip_next_card_stacks");
    if (game.if_played_continuous()) {
        game.chase();
    }
}

// 355033
card_actions["355033"] = (game) => {
    game.add_c_of_x(3, "skip_next_card_stacks");
    if (game.if_played_continuous()) {
        game.chase();
    }
}

// Sword Bamboo
card_actions["361011"] = (game) => {
    game.atk(6);
}

// 361012
card_actions["361012"] = (game) => {
    for (let i = 0; i < 2; i++) {
        game.atk(4);
    }
}

// 361013
card_actions["361013"] = (game) => {
    for (let i = 0; i < 3; i++) {
        game.atk(3);
    }
}

// Hard Bamboo
card_actions["361021"] = (game) => {
    game.increase_idx_def(0, 4);
}

// 361022
card_actions["361022"] = (game) => {
    game.increase_idx_def(0, 6);
}

// 361023
card_actions["361023"] = (game) => {
    game.increase_idx_def(0, 8);
    game.continuous();
    game.add_c_of_x(1, "hard_bamboo_stacks");
}

// Mystery Seed
card_actions["362021"] = (game) => {

}

// 362022
card_actions["362022"] = (game) => {

}

// 362023
card_actions["362023"] = (game) => {

}

// Leaf Shield Flower
card_actions["362031"] = (game) => {
    game.increase_idx_def(0, 8);
}

// 362032
card_actions["362032"] = (game) => {
    game.increase_idx_def(0, 14);
}

// 362033
card_actions["362033"] = (game) => {
    game.increase_idx_def(0, 20);
    game.continuous();
    game.add_c_of_x(1, "leaf_shield_flower_stacks");
}

// Leaf Blade Flower
card_actions["362041"] = (game) => {
    game.atk(4);
}

// 362042
card_actions["362042"] = (game) => {
    for (let i = 0; i < 2; i++) {
        game.atk(4);
    }
}

// 362043
card_actions["362043"] = (game) => {
    for (let i = 0; i < 3; i++) {
        game.atk(4);
    }
    game.continuous();
    game.add_c_of_x(1, "leaf_blade_flower_stacks");
}

// Qi-seeking Sunflower
card_actions["363011"] = (game) => {
    game.increase_idx_qi(0, 2);
}

// 363012
card_actions["363012"] = (game) => {
    game.increase_idx_qi(0, 3);
}

// 363013
card_actions["363013"] = (game) => {
    game.do_qi_seeking_sunflower();
}

// Qi-corrupting Sunflower
card_actions["363021"] = (game) => {
    game.reduce_enemy_c_of_x(1, "qi");
}

// 363022
card_actions["363022"] = (game) => {
    game.reduce_enemy_c_of_x(2, "qi");
}

// 363023
card_actions["363023"] = (game) => {
    game.do_qi_corrupting_sunflower();
}

// Frozen Snow Lotus
card_actions["364011"] = (game) => {
    game.increase_idx_hp(0, 5);
}

// 364012
card_actions["364012"] = (game) => {
    game.increase_idx_hp(0, 10);
}

// 364013
card_actions["364013"] = (game) => {
    game.increase_idx_hp(0, 10);
    game.add_c_of_x(3, "frozen_snow_lotus_stacks");
}

// Detoxific Purple Fern
card_actions["364021"] = (game) => {
    game.reduce_random_debuff_by_c_n_times(1, 1);
}

// 364022
card_actions["364022"] = (game) => {
    game.reduce_random_debuff_by_c_n_times(2, 1);
}

// 364023
card_actions["364023"] = (game) => {
    game.reduce_random_debuff_by_c_n_times(3, 1);
    if (game.if_no_debuff()) {
        game.chase();
    }
}

// Frozen Blood Lotus
card_actions["364031"] = (game) => {
    game.do_frozen_blood_lotus(1);
}

// 364032
card_actions["364032"] = (game) => {
    game.do_frozen_blood_lotus(2);
}

// 364033
card_actions["364033"] = (game) => {
    game.do_frozen_blood_lotus(3);
}

// Space Spiritual Field
card_actions["365021"] = (game) => {
    game.increase_idx_qi(0, 4);
}

// 365022
card_actions["365022"] = (game) => {
    game.increase_idx_qi(0, 5);
}

// 365023
card_actions["365023"] = (game) => {
    game.increase_idx_qi(0, 6);
}

// Entangling Ancient Vine
card_actions["365031"] = (game) => {
    game.add_enemy_c_of_x(1, "entangle");
}

// 365032
card_actions["365032"] = (game) => {
    game.add_enemy_c_of_x(2, "entangle");
}

// 365033
card_actions["365033"] = (game) => {
    game.add_enemy_c_of_x(3, "entangle");
    game.continuous();
    game.add_enemy_c_of_x(2, "entangling_ancient_vine_stacks");
}

// Devouring Ancient Vine
card_actions["365041"] = (game) => {
    game.reduce_enemy_c_of_x(5, "hp");
    game.increase_idx_hp(0, 5);
}

// 365042
card_actions["365042"] = (game) => {
    game.reduce_enemy_c_of_x(10, "hp");
    game.increase_idx_hp(0, 10);
}

// 365043
card_actions["365043"] = (game) => {
    game.reduce_enemy_c_of_x(10, "hp");
    game.increase_idx_hp(0, 10);
    game.continuous();
    game.add_enemy_c_of_x(6, "devouring_ancient_vine_stacks");
}

// God Saying - Attack
card_actions["371011"] = (game) => {
    game.atk(6);
    game.increase_idx_def(0, 3);
    game.consumption();
}

// 371012
card_actions["371012"] = (game) => {
    game.atk(9);
    game.increase_idx_def(0, 4);
    game.consumption();
}

// 371013
card_actions["371013"] = (game) => {
    game.atk(12);
    game.increase_idx_def(0, 5);
    game.consumption();
}

// God Saying - Defend
card_actions["371021"] = (game) => {
    game.atk(2);
    game.increase_idx_def(0, 9);
    game.consumption();
}

// 371022
card_actions["371022"] = (game) => {
    game.atk(3);
    game.increase_idx_def(0, 12);
    game.consumption();
}

// 371023
card_actions["371023"] = (game) => {
    game.atk(4);
    game.increase_idx_def(0, 15);
    game.consumption();
}

// Learn Fortune
card_actions["371031"] = (game) => {
    game.reduce_enemy_c_of_x(6, "hp");
}

// 371032
card_actions["371032"] = (game) => {
    game.reduce_enemy_c_of_x(8, "hp");
}

// 371033
card_actions["371033"] = (game) => {
    game.reduce_enemy_c_of_x(10, "hp");
}

// Observe Body
card_actions["371041"] = (game) => {
    game.add_c_of_x(5, "observe_body_stacks");
}

// 371042
card_actions["371042"] = (game) => {
    game.add_c_of_x(8, "observe_body_stacks");
}

// 371043
card_actions["371043"] = (game) => {
    game.add_c_of_x(11, "observe_body_stacks");
}

// God Luck - Approach
card_actions["372011"] = (game) => {
    game.continuous();
    game.add_c_of_x(2, "god_luck_approach_stacks");
}

// 372012
card_actions["372012"] = (game) => {
    game.continuous();
    game.add_c_of_x(3, "god_luck_approach_stacks");
}

// 372013
card_actions["372013"] = (game) => {
    game.continuous();
    game.add_c_of_x(4, "god_luck_approach_stacks");
}

// God Luck - Avoid
card_actions["372021"] = (game) => {
    game.continuous();
    game.add_c_of_x(2, "god_luck_avoid_stacks");
}

// 372022
card_actions["372022"] = (game) => {
    game.continuous();
    game.add_c_of_x(3, "god_luck_avoid_stacks");
}

// 372023
card_actions["372023"] = (game) => {
    game.continuous();
    game.add_c_of_x(4, "god_luck_avoid_stacks");
}

// Detect Qi
card_actions["372031"] = (game) => {
    game.increase_idx_qi(0, 2);
}

// 372032
card_actions["372032"] = (game) => {
    game.increase_idx_qi(0, 3);
}

// 372033
card_actions["372033"] = (game) => {
    game.increase_idx_qi(0, 4);
}

// Bad Omen
card_actions["372041"] = (game) => {
    game.add_enemy_c_of_x(1, "bad_omen_stacks");
}

// 372042
card_actions["372042"] = (game) => {
    game.add_enemy_c_of_x(2, "bad_omen_stacks");
}

// 372043
card_actions["372043"] = (game) => {
    game.add_enemy_c_of_x(3, "bad_omen_stacks");
}

// God Fate - Flies
card_actions["373011"] = (game) => {
    game.increase_idx_def(0, 6);
    game.add_c_of_x(2, "skip_next_card_stacks");
    game.consumption();
}

// 373012
card_actions["373012"] = (game) => {
    game.increase_idx_def(0, 12);
    game.add_c_of_x(2, "skip_next_card_stacks");
    game.consumption();
}

// 373013
card_actions["373013"] = (game) => {
    game.increase_idx_def(0, 18);
    game.add_c_of_x(2, "skip_next_card_stacks");
    game.consumption();
}

// God Fate - Reborn
card_actions["373021"] = (game) => {
    game.increase_idx_hp(0, 4);
    game.add_c_of_x(1, "skip_to_previous_card_stacks");
    game.consumption();
}

// 373022
card_actions["373022"] = (game) => {
    game.increase_idx_hp(0, 8);
    game.add_c_of_x(1, "skip_to_previous_card_stacks");
    game.consumption();
}

// 373023
card_actions["373023"] = (game) => {
    game.increase_idx_hp(0, 12);
    game.add_c_of_x(1, "skip_to_previous_card_stacks");
    game.consumption();
}

// Disaster of Bloodshed
card_actions["373031"] = (game) => {
    game.add_enemy_c_of_x(1, "internal_injury");
}

// 373032
card_actions["373032"] = (game) => {
    game.add_enemy_c_of_x(2, "internal_injury");
}

// 373033
card_actions["373033"] = (game) => {
    game.add_enemy_c_of_x(3, "internal_injury");
}

// Good Omen
card_actions["373041"] = (game) => {
    game.increase_idx_hp(0, 7);
}

// 373042
card_actions["373042"] = (game) => {
    game.increase_idx_hp(0, 10);
}

// 373043
card_actions["373043"] = (game) => {
    game.increase_idx_hp(0, 13);
}

// Everything Goes Way
card_actions["374011"] = (game) => {
    game.add_c_of_x(3, "everything_goes_way_stacks");
}

// 374012
card_actions["374012"] = (game) => {
    game.add_c_of_x(4, "everything_goes_way_stacks");
}

// 374013
card_actions["374013"] = (game) => {
    game.add_c_of_x(5, "everything_goes_way_stacks");
}

// God Star - Promotion
card_actions["374021"] = (game) => {
    game.increase_idx_def(0, 4);
    game.increase_idx_hp(0, 4);
    game.retrigger_next_opening(-1, 1, 2);
}

// 374022
card_actions["374022"] = (game) => {
    game.increase_idx_def(0, 6);
    game.increase_idx_hp(0, 6);
    game.retrigger_next_opening(-1, 1, 2);
}

// 374023
card_actions["374023"] = (game) => {
    game.increase_idx_def(0, 8);
    game.increase_idx_hp(0, 8);
    game.retrigger_next_opening(-1, 1, 2);
}

// God Star - Traction
card_actions["374031"] = (game) => {
    game.increase_idx_qi(0, 2);
    game.retrigger_next_opening(1, 2, 1);
}

// 374032
card_actions["374032"] = (game) => {
    game.increase_idx_qi(0, 3);
    game.retrigger_next_opening(1, 2, 1);
}

// 374033
card_actions["374033"] = (game) => {
    game.increase_idx_qi(0, 4);
    game.retrigger_next_opening(1, 2, 1);
}

// Nothing Is Appropriate
card_actions["374041"] = (game) => {
    game.increase_idx_def(0, 4);
    game.add_enemy_c_of_x(2, "nothing_is_appropriate_stacks");
}

// 374042
card_actions["374042"] = (game) => {
    game.increase_idx_def(0, 5);
    game.add_enemy_c_of_x(3, "nothing_is_appropriate_stacks");
}

// 374043
card_actions["374043"] = (game) => {
    game.increase_idx_def(0, 6);
    game.add_enemy_c_of_x(4, "nothing_is_appropriate_stacks");
}

// Calamity Plaguin
card_actions["375011"] = (game) => {
    game.add_enemy_c_of_x(4, "internal_injury");
}

// 375012
card_actions["375012"] = (game) => {
    game.add_enemy_c_of_x(5, "internal_injury");
}

// 375013
card_actions["375013"] = (game) => {
    game.add_enemy_c_of_x(6, "internal_injury");
}

// Fate Reincarnates
card_actions["375021"] = (game) => {
    game.add_c_of_x(8, "max_hp");
    game.increase_idx_hp(0, 8);
    game.continuous();
    game.add_c_of_x(4, "fate_reincarnates_stacks");
}

// 375022
card_actions["375022"] = (game) => {
    game.add_c_of_x(12, "max_hp");
    game.increase_idx_hp(0, 12);
    game.continuous();
    game.add_c_of_x(6, "fate_reincarnates_stacks");
}

// 375023
card_actions["375023"] = (game) => {
    game.add_c_of_x(16, "max_hp");
    game.increase_idx_hp(0, 16);
    game.continuous();
    game.add_c_of_x(8, "fate_reincarnates_stacks");
}

// God's Opportunity - Conform
card_actions["375031"] = (game) => {
    game.increase_idx_qi(0, 2);
    game.add_c_of_x(3, "god_opportunity_conform_stacks");
}

// 375032
card_actions["375032"] = (game) => {
    game.increase_idx_qi(0, 4);
    game.add_c_of_x(3, "god_opportunity_conform_stacks");
}

// 375033
card_actions["375033"] = (game) => {
    game.increase_idx_qi(0, 6);
    game.add_c_of_x(3, "god_opportunity_conform_stacks");
}

// God's Opportunity - Reversal
card_actions["375041"] = (game) => {
    game.increase_idx_qi(0, 2);
    game.add_c_of_x(3, "god_opportunity_reversal_stacks");
}

// 375042
card_actions["375042"] = (game) => {
    game.increase_idx_qi(0, 4);
    game.add_c_of_x(3, "god_opportunity_reversal_stacks");
}

// 375043
card_actions["375043"] = (game) => {
    game.increase_idx_qi(0, 6);
    game.add_c_of_x(3, "god_opportunity_reversal_stacks");
}

// Black Silver Armor
card_actions["401011"] = (game) => {
    game.increase_idx_def(0, 5);
    game.for_each_x_add_y("def", "def");
}

// 401012
card_actions["401012"] = (game) => {
    game.increase_idx_def(0, 8);
    game.for_each_x_add_y("def", "def");
}

// 401013
card_actions["401013"] = (game) => {
    game.increase_idx_def(0, 11);
    game.for_each_x_add_y("def", "def");
}

// Thorns Spear
card_actions["401021"] = (game) => {
    game.atk(12 + Math.floor(game.players[1].def / 2));
}

// 401022
card_actions["401022"] = (game) => {
    game.atk(16 + Math.floor(game.players[1].def / 2));
}

// 401023
card_actions["401023"] = (game) => {
    game.atk(20 + Math.floor(game.players[1].def / 2));
}

// Dew Jade Vase
card_actions["402011"] = (game) => {
    game.increase_idx_hp(0, 11);
    game.add_c_of_x(2, "destiny");
}

// 402012
card_actions["402012"] = (game) => {
    game.increase_idx_hp(0, 14);
    game.add_c_of_x(3, "destiny");
}

// 402013
card_actions["402013"] = (game) => {
    game.increase_idx_hp(0, 17);
    game.add_c_of_x(4, "destiny");
}

// Nameless Ancient Sword
card_actions["402021"] = (game) => {
    let atk_amt = 11;
    if (game.players[0].hp <= 11) {
        atk_amt += 11;
    }
    game.atk(atk_amt);
}

// 402022
card_actions["402022"] = (game) => {
    let atk_amt = 15;
    if (game.players[0].hp <= 11) {
        atk_amt += 15;
    }
    game.atk(atk_amt);
}

// 402023
card_actions["402023"] = (game) => {
    let atk_amt = 19;
    if (game.players[0].hp <= 11) {
        atk_amt += 19;
    }
    game.atk(atk_amt);
}

// Fire Soul Refinement Flag
card_actions["403011"] = (game) => {
    game.reduce_enemy_c_of_x(15, "hp");
    game.reduce_enemy_c_of_x(15, "max_hp");
    game.add_enemy_c_of_x(1, "internal_injury");
}

// 403012
card_actions["403012"] = (game) => {
    game.reduce_enemy_c_of_x(15, "hp");
    game.reduce_enemy_c_of_x(15, "max_hp");
    game.add_enemy_c_of_x(2, "internal_injury");
}

// 403013
card_actions["403013"] = (game) => {
    game.reduce_enemy_c_of_x(15, "hp");
    game.reduce_enemy_c_of_x(15, "max_hp");
    game.add_enemy_c_of_x(3, "internal_injury");
}

// Requiem Jade Lotus
card_actions["403021"] = (game) => {
    game.add_c_of_x(15, "max_hp");
    game.increase_idx_hp(0, 15);
    game.add_c_of_x(1, "regen");
}

// 403022
card_actions["403022"] = (game) => {
    game.add_c_of_x(15, "max_hp");
    game.increase_idx_hp(0, 15);
    game.add_c_of_x(2, "regen");
}

// 403023
card_actions["403023"] = (game) => {
    game.add_c_of_x(15, "max_hp");
    game.increase_idx_hp(0, 15);
    game.add_c_of_x(3, "regen");
}

// Blood Crystal of Wolf King
card_actions["403031"] = (game) => {
    game.for_each_x_reduce_c_pct_y("hp", 15, "hp");
    game.add_c_of_x(4, "increase_atk");
}

// 403032
card_actions["403032"] = (game) => {
    game.for_each_x_reduce_c_pct_y("hp", 15, "hp");
    game.add_c_of_x(5, "increase_atk");
}

// 403033
card_actions["403033"] = (game) => {
    game.for_each_x_reduce_c_pct_y("hp", 15, "hp");
    game.add_c_of_x(6, "increase_atk");
}

// Cosmos Seal Divine Orb
card_actions["404011"] = (game) => {
    game.deal_damage(9);
    game.add_enemy_c_of_x(3, "weaken");
}

// 404012
card_actions["404012"] = (game) => {
    game.deal_damage(9);
    game.add_enemy_c_of_x(4, "weaken");
}

// 404013
card_actions["404013"] = (game) => {
    game.deal_damage(9);
    game.add_enemy_c_of_x(5, "weaken");
}

// Metal Tri-Thorn Spear
card_actions["404021"] = (game) => {
    for (let i = 0; i < 3; i++) {
        game.atk(3);
        game.add_enemy_c_of_x(1, "flaw");
    }
}

// 404022
card_actions["404022"] = (game) => {
    for (let i = 0; i < 3; i++) {
        game.atk(5);
        game.add_enemy_c_of_x(1, "flaw");
    }
}

// 404023
card_actions["404023"] = (game) => {
    for (let i = 0; i < 3; i++) {
        game.atk(7);
        game.add_enemy_c_of_x(1, "flaw");
    }
}

// Carefree Guqin
card_actions["404031"] = (game) => {
    game.continuous();
    game.add_c_of_x(2, "carefree_guqin_stacks");
    game.add_enemy_c_of_x(2, "carefree_guqin_stacks");
}

// 404032
card_actions["404032"] = (game) => {
    game.continuous();
    game.add_c_of_x(5, "carefree_guqin_stacks");
    game.add_enemy_c_of_x(5, "carefree_guqin_stacks");
}

// 404033
card_actions["404033"] = (game) => {
    game.continuous();
    game.add_c_of_x(8, "carefree_guqin_stacks");
    game.add_enemy_c_of_x(8, "carefree_guqin_stacks");
}

// Nether Seal Evil Signet
card_actions["405011"] = (game) => {
    game.reduce_enemy_x_by_enemy_y("def", "def");
    game.reduce_enemy_x_by_enemy_y("guard_up", "guard_up");
    game.deal_damage(30);
}

// 405012
card_actions["405012"] = (game) => {
    game.reduce_enemy_x_by_enemy_y("def", "def");
    game.reduce_enemy_x_by_enemy_y("guard_up", "guard_up");
    game.deal_damage(36);
}

// 405013
card_actions["405013"] = (game) => {
    game.reduce_enemy_x_by_enemy_y("def", "def");
    game.reduce_enemy_x_by_enemy_y("guard_up", "guard_up");
    game.deal_damage(42);
}

// Dark Crystal Heart Shield
card_actions["405021"] = (game) => {
    game.increase_idx_def(0, 20);
    game.add_c_of_x(2, "guard_up");
}

// 405022
card_actions["405022"] = (game) => {
    game.increase_idx_def(0, 20);
    game.add_c_of_x(3, "guard_up");
}

// 405023
card_actions["405023"] = (game) => {
    game.increase_idx_def(0, 20);
    game.add_c_of_x(4, "guard_up");
}

// Bow of Hunting Owl
card_actions["405031"] = (game) => {
    game.atk(12);
    if (game.if_injured()) {
        game.add_enemy_c_of_x(6, "entangle");
    }
}

// 405032
card_actions["405032"] = (game) => {
    game.atk(14);
    if (game.if_injured()) {
        game.add_enemy_c_of_x(7, "entangle");
    }
}

// 405033
card_actions["405033"] = (game) => {
    game.atk(16);
    if (game.if_injured()) {
        game.add_enemy_c_of_x(8, "entangle");
    }
}

// Void Split Spear
card_actions["406011"] = (game) => {
    game.atk(30);
    game.reduce_enemy_c_of_x(4, "destiny");
}

// 406012
card_actions["406012"] = (game) => {
    game.atk(35);
    game.reduce_enemy_c_of_x(7, "destiny");
}

// 406013
card_actions["406013"] = (game) => {
    game.atk(40);
    game.reduce_enemy_c_of_x(10, "destiny");
}

// Mysterious Gates Devil Seal Tower
card_actions["406021"] = (game) => {
    game.deal_damage(25);
    game.add_enemy_c_of_x(1, "cannot_act_stacks");
}

// 406022
card_actions["406022"] = (game) => {
    game.deal_damage(32);
    game.add_enemy_c_of_x(1, "cannot_act_stacks");
}

// 406023
card_actions["406023"] = (game) => {
    game.deal_damage(32);
    game.add_enemy_c_of_x(2, "cannot_act_stacks");
}

// Break Sky Eagle
card_actions["501011"] = (game) => {
    game.deal_damage(4);
    game.continuous();
    game.add_c_of_x(1, "break_sky_eagle_stacks");
}

// 501012
card_actions["501012"] = (game) => {
    game.deal_damage(4);
    game.continuous();
    game.add_c_of_x(2, "break_sky_eagle_stacks");
}

// 501013
card_actions["501013"] = (game) => {
    game.deal_damage(4);
    game.continuous();
    game.add_c_of_x(3, "break_sky_eagle_stacks");
}

// Fat Immortal Raccoon
card_actions["501021"] = (game) => {
    game.increase_idx_hp(0, 4);
    game.continuous();
    game.add_c_of_x(1, "fat_immortal_raccoon_stacks");
}

// 501022
card_actions["501022"] = (game) => {
    game.increase_idx_hp(0, 4);
    game.continuous();
    game.add_c_of_x(2, "fat_immortal_raccoon_stacks");
}

// 501023
card_actions["501023"] = (game) => {
    game.increase_idx_hp(0, 4);
    game.continuous();
    game.add_c_of_x(3, "fat_immortal_raccoon_stacks");
}

// Dark Star Bat
card_actions["502011"] = (game) => {
    game.continuous();
    game.set_c_up_to_x(5, "dark_star_bat_stacks");
}

// 502012
card_actions["502012"] = (game) => {
    game.continuous();
    game.set_c_up_to_x(7, "dark_star_bat_stacks");
}

// 502013
card_actions["502013"] = (game) => {
    game.continuous();
    game.set_c_up_to_x(9, "dark_star_bat_stacks");
}

// Lonely Night Wolf
card_actions["502021"] = (game) => {
    game.continuous();
    game.add_c_of_x(4, "lonely_night_wolf_stacks");
}

// 502022
card_actions["502022"] = (game) => {
    game.continuous();
    game.add_c_of_x(5, "lonely_night_wolf_stacks");
}

// 502023
card_actions["502023"] = (game) => {
    game.continuous();
    game.add_c_of_x(6, "lonely_night_wolf_stacks");
}

// Black Earth Turtle
card_actions["503011"] = (game) => {
    game.increase_idx_def(0, 4);
    game.continuous();
    game.add_c_of_x(2, "black_earth_turtle_stacks");
}

// 503012
card_actions["503012"] = (game) => {
    game.increase_idx_def(0, 8);
    game.continuous();
    game.add_c_of_x(3, "black_earth_turtle_stacks");
}

// 503013
card_actions["503013"] = (game) => {
    game.increase_idx_def(0, 12);
    game.continuous();
    game.add_c_of_x(4, "black_earth_turtle_stacks");
}

// Brocade Rat
card_actions["503021"] = (game) => {
    game.reduce_c_of_x(4, "hp");
    game.continuous();
    game.add_c_of_x(1, "brocade_rat_stacks");
}

// 503022
card_actions["503022"] = (game) => {
    game.reduce_c_of_x(8, "hp");
    game.continuous();
    game.add_c_of_x(2, "brocade_rat_stacks");
}

// 503023
card_actions["503023"] = (game) => {
    game.reduce_c_of_x(12, "hp");
    game.continuous();
    game.add_c_of_x(3, "brocade_rat_stacks");
}

// Scarlet-Eye The Sky Consumer
card_actions["504011"] = (game) => {
    game.continuous();
    game.add_c_of_x(2, "scarlet_eye_the_sky_consumer_stacks");
}

// 504012
card_actions["504012"] = (game) => {
    game.continuous();
    game.add_c_of_x(3, "scarlet_eye_the_sky_consumer_stacks");
}

// 504013
card_actions["504013"] = (game) => {
    game.continuous();
    game.add_c_of_x(4, "scarlet_eye_the_sky_consumer_stacks");
}

// Ashes Phoenix
card_actions["504021"] = (game) => {
    game.continuous();
    game.add_c_of_x(10, "ashes_phoenix_stacks");
}

// 504022
card_actions["504022"] = (game) => {
    game.continuous();
    game.add_c_of_x(15, "ashes_phoenix_stacks");
}

// 504023
card_actions["504023"] = (game) => {
    game.continuous();
    game.add_c_of_x(20, "ashes_phoenix_stacks");
}

// Three Tailed Cat
card_actions["504031"] = (game) => {
    game.add_c_of_x(1, "exchange_card_chance");
    game.continuous();
    game.add_c_of_x(1, "three_tailed_cat_stacks");
}

// 504032
card_actions["504032"] = (game) => {
    game.add_c_of_x(2, "exchange_card_chance");
    game.continuous();
    game.add_c_of_x(1, "three_tailed_cat_stacks");
}

// 504033
card_actions["504033"] = (game) => {
    game.add_c_of_x(3, "exchange_card_chance");
    game.continuous();
    game.add_c_of_x(1, "three_tailed_cat_stacks");
}

// Colorful Spirit Crane
card_actions["505011"] = (game) => {
    game.continuous();
    game.set_c_of_x(2, "colorful_spirit_crane_stacks");
}

// 505012
card_actions["505012"] = (game) => {
    game.increase_idx_qi(0, 2);
    game.continuous();
    game.set_c_of_x(2, "colorful_spirit_crane_stacks");
}

// 505013
card_actions["505013"] = (game) => {
    game.increase_idx_qi(0, 4);
    game.continuous();
    game.set_c_of_x(2, "colorful_spirit_crane_stacks");
}

// Shadow Owl Rabbit
card_actions["505021"] = (game) => {
    game.continuous();
    game.add_c_of_x(10, "shadow_owl_rabbit_stacks");
}

// 505022
card_actions["505022"] = (game) => {
    game.continuous();
    game.add_c_of_x(8, "shadow_owl_rabbit_stacks");
}

// 505023
card_actions["505023"] = (game) => {
    game.continuous();
    game.add_c_of_x(6, "shadow_owl_rabbit_stacks");
}

// Void The Spirit Consumer
card_actions["506011"] = (game) => {
    game.continuous();
    game.add_c_of_x(1, "void_the_spirit_consumer_stacks");
}

// 506012
card_actions["506012"] = (game) => {
    game.continuous();
    game.add_c_of_x(2, "void_the_spirit_consumer_stacks");
}

// 506013
card_actions["506013"] = (game) => {
    game.continuous();
    game.add_c_of_x(3, "void_the_spirit_consumer_stacks");
}

// Nether Void Canine
card_actions["506021"] = (game) => {
    game.deal_damage(1);
    game.continuous();
    game.add_enemy_c_of_x(1, "nether_void_canine_stacks");
}

// 506022
card_actions["506022"] = (game) => {
    game.deal_damage(5);
    game.continuous();
    game.add_enemy_c_of_x(1, "nether_void_canine_stacks");
}

// 506023
card_actions["506023"] = (game) => {
    game.deal_damage(9);
    game.continuous();
    game.add_enemy_c_of_x(1, "nether_void_canine_stacks");
}

// Normal Attack
card_actions["601011"] = (game) => {
    game.do_normal_attack(3);
}

// 601012
card_actions["601012"] = (game) => {
    game.do_normal_attack(6);
}

// 601013
card_actions["601013"] = (game) => {
    game.do_normal_attack(9);
}

// Demonic Qi Haunt
card_actions["603011"] = (game) => {
    game.atk(4);
    game.add_enemy_c_of_x(2, "internal_injury");
}

// 603012
card_actions["603012"] = (game) => {
    game.atk(4);
    game.add_enemy_c_of_x(3, "internal_injury");
}

// 603013
card_actions["603013"] = (game) => {
    game.atk(4);
    game.add_enemy_c_of_x(4, "internal_injury");
}

// Magic Dragon's Paw
card_actions["603021"] = (game) => {
    for (let i = 0; i < 2; i++) {
        game.atk(2);
        game.add_enemy_c_of_x(1, "wound");
    }
}

// 603022
card_actions["603022"] = (game) => {
    for (let i = 0; i < 3; i++) {
        game.atk(2);
        game.add_enemy_c_of_x(1, "wound");
    }
}

// 603023
card_actions["603023"] = (game) => {
    for (let i = 0; i < 4; i++) {
        game.atk(2);
        game.add_enemy_c_of_x(1, "wound");
    }
}

// Mirroring Merpeople Pearl
card_actions["605011"] = (game) => {
    game.add_c_of_x("hand_count", 1);
    game.reduce_c_of_x("cultivation", 1);
    game.consumption();
}

// 605012
card_actions["605012"] = (game) => {
    game.add_c_of_x("hand_count", 1);
    game.reduce_c_of_x("cultivation", 1);
    game.consumption();
}

// 605013
card_actions["605013"] = (game) => {
    game.add_c_of_x("hand_count", 1);
    game.reduce_c_of_x("cultivation", 1);
    game.consumption();
    game.chase();
}

// Qi-gathering Merpeople Pearl
card_actions["605021"] = (game) => {
    game.increase_idx_qi(0, 1);
    game.continuous();
    game.add_c_of_x(1, "qi_gathering_merpeople_pearl_stacks");
}

// 605022
card_actions["605022"] = (game) => {
    game.increase_idx_qi(0, 1);
    game.continuous();
    game.add_c_of_x(2, "qi_gathering_merpeople_pearl_stacks");
}

// 605023
card_actions["605023"] = (game) => {
    game.increase_idx_qi(0, 1);
    game.continuous();
    game.add_c_of_x(3, "qi_gathering_merpeople_pearl_stacks");
}

// Frenzied Merpeople Pearl
card_actions["605031"] = (game) => {
    game.add_c_of_x(2, "increase_atk");
    game.add_c_of_x(1, "wound");
    game.chase();
}

// 605032
card_actions["605032"] = (game) => {
    game.add_c_of_x(3, "increase_atk");
    game.add_c_of_x(2, "wound");
    game.chase();
}

// 605033
card_actions["605033"] = (game) => {
    game.reduce_c_of_x(1, "destiny");
    game.add_c_of_x(4, "increase_atk");
    game.add_c_of_x(3, "wound");
    game.chase();
}

// Bewildering Merpeople Pearl
card_actions["605041"] = (game) => {
    game.add_c_of_x(8, "max_hp");
    game.increase_idx_hp(0, 8);
    game.add_enemy_c_of_x(1, "weaken");
}

// 605042
card_actions["605042"] = (game) => {
    game.add_c_of_x(13, "max_hp");
    game.increase_idx_hp(0, 13);
    game.add_enemy_c_of_x(2, "weaken");
}

// 605043
card_actions["605043"] = (game) => {
    game.add_c_of_x(18, "max_hp");
    game.increase_idx_hp(0, 18);
    game.add_enemy_c_of_x(3, "weaken");
}

// Crystallized Merpeople Pearl
card_actions["605051"] = (game) => {
    game.increase_idx_def(0, 6);
    game.continuous();
    game.add_c_of_x(50, "crystallized_merpeople_pearl_stacks");
}

// 605052
card_actions["605052"] = (game) => {
    game.increase_idx_def(0, 18);
    game.continuous();
    game.add_c_of_x(50, "crystallized_merpeople_pearl_stacks");
}

// 605053
card_actions["605053"] = (game) => {
    game.increase_idx_def(0, 30);
    game.continuous();
    game.add_c_of_x(50, "crystallized_merpeople_pearl_stacks");
}

// Cursed Merpeople Pearl
card_actions["605061"] = (game) => {
    game.reduce_c_of_x(1, "destiny");
    game.trigger_previous_card();
}

// 605062
card_actions["605062"] = (game) => {
    game.reduce_c_of_x(5, "destiny");
    for (let i = 0; i < 2; i++) {
        game.trigger_previous_card();
    }
}

// 605063
card_actions["605063"] = (game) => {
    game.reduce_c_of_x(9, "destiny");
    for (let i = 0; i < 3; i++) {
        game.trigger_previous_card();
    }
}

// Abyssal Merpeople Pearl
card_actions["605071"] = (game) => {
    game.add_enemy_c_of_x(2, "internal_injury");
    game.add_enemy_c_of_x(1, "entangle");
}

// 605072
card_actions["605072"] = (game) => {
    game.reduce_c_of_x(1, "destiny");
    game.add_enemy_c_of_x(3, "internal_injury");
    game.add_enemy_c_of_x(2, "entangle");
}

// 605073
card_actions["605073"] = (game) => {
    game.reduce_c_of_x(3, "destiny");
    game.add_enemy_c_of_x(4, "internal_injury");
    game.add_enemy_c_of_x(3, "entangle");
}

// Multicolored Merpeople Pearl
card_actions["605081"] = (game) => {
    game.trigger_random_sect_card(1);
}

// 605082
card_actions["605082"] = (game) => {
    for (let i = 0; i < 2; i++) {
        game.trigger_random_sect_card(2);
    }
}

// 605083
card_actions["605083"] = (game) => {
    for (let i = 0; i < 3; i++) {
        game.trigger_random_sect_card(3);
    }
}

// Sneak Merpeople Pearl
card_actions["605091"] = (game) => {
    game.add_c_of_x(1, "guard_up");
    game.add_enemy_c_of_x(2, "flaw");
}

// 605092
card_actions["605092"] = (game) => {
    game.add_c_of_x(1, "guard_up");
    game.add_enemy_c_of_x(4, "flaw");
}

// 605093
card_actions["605093"] = (game) => {
    game.add_c_of_x(2, "guard_up");
    game.add_enemy_c_of_x(4, "flaw");
}

// Blood-cultivated Merpeople Pearl
card_actions["605101"] = (game) => {
    game.reduce_c_of_x(1, "destiny");
    game.add_c_of_x(1, "cultivation");
    game.consumption();
}

// 605102
card_actions["605102"] = (game) => {
    game.reduce_c_of_x(2, "destiny");
    game.add_c_of_x(1, "cultivation");
    game.consumption();
}

// 605103
card_actions["605103"] = (game) => {
    game.reduce_c_of_x(3, "destiny");
    game.add_c_of_x(2, "cultivation");
    game.consumption();
}

// Demonic Qi Burst
card_actions["606011"] = (game) => {
    game.atk(20 + game.players[0].internal_injury * 4);
}

// 606012
card_actions["606012"] = (game) => {
    game.atk(25 + game.players[0].internal_injury * 6);
}

// 606013
card_actions["606013"] = (game) => {
    game.atk(30 + game.players[0].internal_injury * 8);
}

// Demonic Dragon's Chaotic Dance
card_actions["606021"] = (game) => {
    game.for_each_enemy_x_add_y("wound", "bonus_rep_amt");
    for (let i = 0; i < 3 + game.players[0].bonus_rep_amt; i++) {
        game.atk(3);
    }
}

// 606022
card_actions["606022"] = (game) => {
    game.for_each_enemy_x_add_y("wound", "bonus_rep_amt");
    for (let i = 0; i < 4 + game.players[0].bonus_rep_amt; i++) {
        game.atk(4);
    }
}

// 606023
card_actions["606023"] = (game) => {
    game.for_each_enemy_x_add_y("wound", "bonus_rep_amt");
    for (let i = 0; i < 5 + game.players[0].bonus_rep_amt; i++) {
        game.atk(5);
    }
}

// Loong
card_actions["606031"] = (game) => {
    game.add_c_of_x(2, "increase_atk");
    game.add_c_of_x(2, "guard_up");
    game.continuous();
    game.add_c_of_x(1, "max_chases");
    game.set_x_down_to_c("max_chases", 8);
    game.add_c_of_x(1000, "prevent_anti_chase");
}

// 606032
card_actions["606032"] = (game) => {
    game.add_c_of_x(3, "increase_atk");
    game.add_c_of_x(3, "guard_up");
    game.continuous();
    game.add_c_of_x(2, "max_chases");
    game.set_x_down_to_c("max_chases", 8);
    game.add_c_of_x(1000, "prevent_anti_chase");
}

// 606033
card_actions["606033"] = (game) => {
    game.add_c_of_x(4, "increase_atk");
    game.add_c_of_x(4, "guard_up");
    game.continuous();
    game.add_c_of_x(3, "max_chases");
    game.set_x_down_to_c("max_chases", 8);
    game.add_c_of_x(1000, "prevent_anti_chase");
}

// Cloud Sword - Flying Sand
card_actions["611011"] = (game) => {
    game.atk(5);
    if (game.if_cloud_hit()) {
        game.add_enemy_c_of_x(2, "flaw");
    }
}

// 611012
card_actions["611012"] = (game) => {
    game.atk(8);
    if (game.if_cloud_hit()) {
        game.add_enemy_c_of_x(2, "flaw");
    }
}

// 611013
card_actions["611013"] = (game) => {
    game.atk(9);
    if (game.if_cloud_hit()) {
        game.add_enemy_c_of_x(3, "flaw");
    }
}

// Bronze Cat
card_actions["611021"] = (game) => {
    const def_amt = 5 + 2 * game.players[0].sword_intent;
    game.increase_idx_def(0, def_amt);
}

// 611022
card_actions["611022"] = (game) => {
    const def_amt = 5 + 3 * game.players[0].sword_intent;
    game.increase_idx_def(0, def_amt);
}

// 611023
card_actions["611023"] = (game) => {
    const def_amt = 5 + 4 * game.players[0].sword_intent;
    game.increase_idx_def(0, def_amt);
}

// Clear Heart Sword Embryo
card_actions["611031"] = (game) => {

}

// 611032
card_actions["611032"] = (game) => {

}

// 611033
card_actions["611033"] = (game) => {
    game.do_clear_heart();
}

// Cloud Sword - Cat Paw
card_actions["612011"] = (game) => {
    for (let i = 0; i < 2; i++) {
        game.increase_idx_x_by_c(0, "ignore_def", 1);
        game.atk(4);
    }
}

// 612012
card_actions["612012"] = (game) => {
    for (let i = 0; i < 2; i++) {
        game.increase_idx_x_by_c(0, "ignore_def", 1);
        game.atk(6);
    }
}

// 612013
card_actions["612013"] = (game) => {
    for (let i = 0; i < 2; i++) {
        game.increase_idx_x_by_c(0, "ignore_def", 1);
        game.atk(8);
    }
}

// Cloud Sword - Avalanche
card_actions["614011"] = (game) => {
    let atk_amt = 4;
    if (game.if_cloud_hit()) {
        atk_amt += 4 * game.players[0].cloud_sword_chain_count;
    }
    game.atk(atk_amt);
}

// 614012
card_actions["614012"] = (game) => {
    let atk_amt = 4;
    if (game.if_cloud_hit()) {
        atk_amt += 5 * game.players[0].cloud_sword_chain_count;
    }
    game.atk(atk_amt);
}

// 614013
card_actions["614013"] = (game) => {
    let atk_amt = 4;
    if (game.if_cloud_hit()) {
        atk_amt += 6 * game.players[0].cloud_sword_chain_count;
    }
    game.atk(atk_amt);
}

// Cloud Sword - Pray Rain
card_actions["614021"] = (game) => {
    for (let i = 0; i < 3; i++) {
        game.atk(3);
    }
    game.add_c_of_x(2, "regen");
    game.increase_idx_qi(0, 1);
}

// 614022
card_actions["614022"] = (game) => {
    for (let i = 0; i < 4; i++) {
        game.atk(3);
    }
    game.add_c_of_x(2, "regen");
    game.increase_idx_qi(0, 1);
}

// 614023
card_actions["614023"] = (game) => {
    for (let i = 0; i < 5; i++) {
        game.atk(3);
    }
    game.add_c_of_x(2, "regen");
    game.increase_idx_qi(0, 1);
}

// Spirit Cat Chaos Sword
card_actions["614031"] = (game) => {
    game.for_each_x_up_to_c_add_y("hand_count", 3, "bonus_rep_amt");
    for (let i = 0; i < 2 + game.players[0].bonus_rep_amt; i++) {
        game.atk(2);
    }
}

// 614032
card_actions["614032"] = (game) => {
    game.for_each_x_up_to_c_add_y("hand_count", 3, "bonus_rep_amt");
    for (let i = 0; i < 3 + game.players[0].bonus_rep_amt; i++) {
        game.atk(2);
    }
}

// 614033
card_actions["614033"] = (game) => {
    game.for_each_x_up_to_c_add_y("hand_count", 3, "bonus_rep_amt");
    for (let i = 0; i < 4 + game.players[0].bonus_rep_amt; i++) {
        game.atk(2);
    }
}

// Unrestrained Sword - Flame Dance
card_actions["615011"] = (game) => {
    game.atk(2);
    if (game.if_injured()) {
        game.add_enemy_c_of_x(1, "wound");
    }
    if (game.players[0].unrestrained_sword_count >= 1) {
        game.chase();
    }
}

// 615012
card_actions["615012"] = (game) => {
    game.atk(2);
    if (game.if_injured()) {
        game.add_enemy_c_of_x(2, "wound");
    }
    if (game.players[0].unrestrained_sword_count >= 1) {
        game.chase();
    }
}

// 615013
card_actions["615013"] = (game) => {
    game.atk(2);
    if (game.if_injured()) {
        game.add_enemy_c_of_x(3, "wound");
    }
    if (game.players[0].unrestrained_sword_count >= 1) {
        game.chase();
    }
}

// Sky Delicate Bracelet
card_actions["615021"] = (game) => {
    game.increase_idx_def(0, 9);
    game.add_c_of_x(1, "guard_up");
    game.chase();
}

// 615022
card_actions["615022"] = (game) => {
    game.increase_idx_def(0, 9);
    game.add_c_of_x(2, "guard_up");
    game.chase();
}

// 615023
card_actions["615023"] = (game) => {
    game.increase_idx_def(0, 9);
    game.add_c_of_x(3, "guard_up");
    game.chase();
}

// Perfectly Planned
card_actions["621011"] = (game) => {
    game.increase_idx_qi(0, 1);
    game.add_c_of_x(1, "hexagram");
    game.become_star_point(1);
}

// 621012
card_actions["621012"] = (game) => {
    game.increase_idx_qi(0, 1);
    game.add_c_of_x(1, "hexagram");
    game.become_star_point(1);
    game.add_c_of_x(1, "star_power");
}

// 621013
card_actions["621013"] = (game) => {
    game.increase_idx_qi(0, 1);
    game.add_c_of_x(1, "hexagram");
    game.become_star_point(1);
    game.add_c_of_x(1, "star_power");
    game.add_c_of_x(4, "max_hp");
    game.increase_idx_hp(0, 4);
}

// Only Traces
card_actions["622011"] = (game) => {
    game.increase_idx_qi(0, 3);
    if (game.if_post_action()) {
        game.chase();
    }
}

// 622012
card_actions["622012"] = (game) => {
    game.increase_idx_qi(0, 3);
    game.chase();
    if (game.if_post_action()) {
        game.increase_idx_hp(0, 1);
    }
}

// 622013
card_actions["622013"] = (game) => {
    game.increase_idx_qi(0, 4);
    game.chase();
    if (game.if_post_action()) {
        game.increase_idx_hp(0, 1);
    }
}

// Ultimate Hexagram Base
card_actions["623011"] = (game) => {
    game.continuous();
    game.add_c_of_x(1, "ultimate_hexagram_base_stacks");
}

// 623012
card_actions["623012"] = (game) => {
    game.add_c_of_x(2, "hexagram");
    game.continuous();
    game.add_c_of_x(1, "ultimate_hexagram_base_stacks");
}

// 623013
card_actions["623013"] = (game) => {
    game.add_c_of_x(4, "hexagram");
    game.continuous();
    game.add_c_of_x(1, "ultimate_hexagram_base_stacks");
}

// Starburst
card_actions["623021"] = (game) => {
    if (game.players[0].star_power >= 1) {
        game.reduce_c_of_x(1, "star_power");
        game.atk(16);
    }
}

// 623022
card_actions["623022"] = (game) => {
    if (game.players[0].star_power >= 1) {
        game.reduce_c_of_x(1, "star_power");
        game.atk(20);
    }
}

// 623023
card_actions["623023"] = (game) => {
    if (game.players[0].star_power >= 1) {
        game.reduce_c_of_x(1, "star_power");
        game.atk(25);
    }
}

// Flame Flutter
card_actions["623031"] = (game) => {
    game.atk(3);
    game.add_enemy_rand_range_of_x(1, 3, "internal_injury");
}

// 623032
card_actions["623032"] = (game) => {
    game.atk(4);
    game.add_enemy_rand_range_of_x(2, 4, "internal_injury");
}

// 623033
card_actions["623033"] = (game) => {
    game.atk(5);
    game.add_enemy_rand_range_of_x(3, 5, "internal_injury");
}

// Heptastar Soulstat
card_actions["624011"] = (game) => {
    game.reduce_enemy_c_of_x(4, "hp");
    game.add_enemy_c_of_x(1, "cannot_act_stacks");
}

// 624012
card_actions["624012"] = (game) => {
    game.reduce_enemy_c_of_x(9, "hp");
    game.add_enemy_c_of_x(1, "cannot_act_stacks");
}

// 624013
card_actions["624013"] = (game) => {
    game.reduce_enemy_c_of_x(14, "hp");
    game.add_enemy_c_of_x(1, "cannot_act_stacks");
}

// Within Reach
card_actions["624021"] = (game) => {
    const me = game.players[0];
    if (me.resonance_within_reach_stacks !== undefined && me.resonance_within_reach_stacks > 0) {
        game.increase_idx_debuff(1, "internal_injury", 1);
        game.increase_idx_debuff(1, "entangle", 1);
    }
    game.atk(9 + game.get_debuff_count(1) * 2);
}

// 624022
card_actions["624022"] = (game) => {
    const me = game.players[0];
    if (me.resonance_within_reach_stacks !== undefined && me.resonance_within_reach_stacks > 0) {
        game.increase_idx_debuff(1, "internal_injury", 1);
        game.increase_idx_debuff(1, "entangle", 1);
    }
    game.atk(9 + game.get_debuff_count(1) * 3);
}

// 624023
card_actions["624023"] = (game) => {
    const me = game.players[0];
    if (me.resonance_within_reach_stacks !== undefined && me.resonance_within_reach_stacks > 0) {
        game.increase_idx_debuff(1, "internal_injury", 1);
        game.increase_idx_debuff(1, "entangle", 1);
    }
    game.atk(9 + game.get_debuff_count(1) * 4);
}

// Rotary Divination Hexagram
card_actions["624031"] = (game) => {
    game.add_c_of_x(4, "hexagram");
    game.reduce_enemy_c_of_x(2, "hp");
    game.reduce_enemy_c_of_x(1, "qi");
}

// 624032
card_actions["624032"] = (game) => {
    game.add_c_of_x(5, "hexagram");
    game.reduce_enemy_c_of_x(3, "hp");
    game.reduce_enemy_c_of_x(2, "qi");
}

// 624033
card_actions["624033"] = (game) => {
    game.add_c_of_x(6, "hexagram");
    game.reduce_enemy_c_of_x(4, "hp");
    game.reduce_enemy_c_of_x(3, "qi");
}

// Star Moon Folding Fan
card_actions["625011"] = (game) => {
    if (game.players[0].qi >= 1) {
        game.add_c_of_x(1, "star_power");
    }
    if (game.players[0].star_power >= 3) {
        game.chase();
    }
    game.continuous();
    game.add_c_of_x(1, "reduce_qi_cost_on_star_point_stacks");
}

// 625012
card_actions["625012"] = (game) => {
    if (game.players[0].qi >= 1) {
        game.add_c_of_x(2, "star_power");
    }
    if (game.players[0].star_power >= 3) {
        game.chase();
    }
    game.continuous();
    game.add_c_of_x(1, "reduce_qi_cost_on_star_point_stacks");
}

// 625013
card_actions["625013"] = (game) => {
    if (game.players[0].qi >= 1) {
        game.add_c_of_x(3, "star_power");
    }
    if (game.players[0].star_power >= 3) {
        game.chase();
    }
    game.continuous();
    game.add_c_of_x(1, "reduce_qi_cost_on_star_point_stacks");
}

// Fury Thunder
card_actions["625021"] = (game) => {
    game.do_fury_thunder(1);
}

// 625022
card_actions["625022"] = (game) => {
    game.do_fury_thunder(2);
}

// 625023
card_actions["625023"] = (game) => {
    game.do_fury_thunder(3);
}

// Wood Spirit - Peach Blossom Seal
card_actions["632011"] = (game) => {
    for (let i = 0; i < 2; i++) {
        game.atk(2);
    }
    game.increase_idx_qi(0, 2);
    game.activate_wood_spirit();
}

// 632012
card_actions["632012"] = (game) => {
    for (let i = 0; i < 3; i++) {
        game.atk(2);
    }
    game.increase_idx_qi(0, 3);
    game.activate_wood_spirit();
}

// 632013
card_actions["632013"] = (game) => {
    for (let i = 0; i < 4; i++) {
        game.atk(2);
    }
    game.increase_idx_qi(0, 4);
    game.activate_wood_spirit();
}

// Kun Wu Metal Ring
card_actions["633011"] = (game) => {
    game.activate_earth_spirit();
    game.activate_metal_spirit();
    game.continuous();
    game.add_c_of_x(2, "kun_wu_metal_ring_stacks");
}

// 633012
card_actions["633012"] = (game) => {
    game.activate_earth_spirit();
    game.activate_metal_spirit();
    game.continuous();
    game.add_c_of_x(3, "kun_wu_metal_ring_stacks");
}

// 633013
card_actions["633013"] = (game) => {
    game.activate_earth_spirit();
    game.activate_metal_spirit();
    game.continuous();
    game.add_c_of_x(4, "kun_wu_metal_ring_stacks");
}

// Gourd Of Leisurely
card_actions["633021"] = (game) => {
    game.increase_idx_qi(0, 1);
    game.increase_idx_hp(0, 3);
    if (game.players[0].activate_wood_spirit_stacks >= 1) {
        game.chase();
    }
    if (game.players[0].activate_fire_spirit_stacks >= 1) {
        game.chase();
    }
    if (game.players[0].activate_earth_spirit_stacks >= 1) {
        game.chase();
    }
    if (game.players[0].activate_metal_spirit_stacks >= 1) {
        game.chase();
    }
    if (game.players[0].activate_water_spirit_stacks >= 1) {
        game.chase();
    }
}

// 633022
card_actions["633022"] = (game) => {
    game.increase_idx_qi(0, 2);
    game.increase_idx_hp(0, 5);
    if (game.players[0].activate_wood_spirit_stacks >= 1) {
        game.chase();
    }
    if (game.players[0].activate_fire_spirit_stacks >= 1) {
        game.chase();
    }
    if (game.players[0].activate_earth_spirit_stacks >= 1) {
        game.chase();
    }
    if (game.players[0].activate_metal_spirit_stacks >= 1) {
        game.chase();
    }
    if (game.players[0].activate_water_spirit_stacks >= 1) {
        game.chase();
    }
}

// 633023
card_actions["633023"] = (game) => {
    game.increase_idx_qi(0, 3);
    game.increase_idx_hp(0, 7);
    if (game.players[0].activate_wood_spirit_stacks >= 1) {
        game.chase();
    }
    if (game.players[0].activate_fire_spirit_stacks >= 1) {
        game.chase();
    }
    if (game.players[0].activate_earth_spirit_stacks >= 1) {
        game.chase();
    }
    if (game.players[0].activate_metal_spirit_stacks >= 1) {
        game.chase();
    }
    if (game.players[0].activate_water_spirit_stacks >= 1) {
        game.chase();
    }
}

// Water Spirit - Leisurely
card_actions["633031"] = (game) => {
    game.increase_idx_qi(0, 2);
    game.increase_idx_max_hp(0, 3);
    game.increase_idx_hp(0, 3);
    if (game.players[0].activate_wood_spirit_stacks >= 1) {
        game.chase();
    }
    if (game.players[0].activate_fire_spirit_stacks >= 1) {
        game.chase();
    }
    if (game.players[0].activate_earth_spirit_stacks >= 1) {
        game.chase();
    }
    if (game.players[0].activate_metal_spirit_stacks >= 1) {
        game.chase();
    }
    if (game.players[0].activate_water_spirit_stacks >= 1) {
        game.chase();
    }
}

// 633032
card_actions["633032"] = (game) => {
    game.increase_idx_qi(0, 3);
    game.increase_idx_max_hp(0, 6);
    game.increase_idx_hp(0, 6);
    if (game.players[0].activate_wood_spirit_stacks >= 1) {
        game.chase();
    }
    if (game.players[0].activate_fire_spirit_stacks >= 1) {
        game.chase();
    }
    if (game.players[0].activate_earth_spirit_stacks >= 1) {
        game.chase();
    }
    if (game.players[0].activate_metal_spirit_stacks >= 1) {
        game.chase();
    }
    if (game.players[0].activate_water_spirit_stacks >= 1) {
        game.chase();
    }
}

// 633033
card_actions["633033"] = (game) => {
    game.increase_idx_qi(0, 4);
    game.increase_idx_max_hp(0, 9);
    game.increase_idx_hp(0, 9);
    if (game.players[0].activate_wood_spirit_stacks >= 1) {
        game.chase();
    }
    if (game.players[0].activate_fire_spirit_stacks >= 1) {
        game.chase();
    }
    if (game.players[0].activate_earth_spirit_stacks >= 1) {
        game.chase();
    }
    if (game.players[0].activate_metal_spirit_stacks >= 1) {
        game.chase();
    }
    if (game.players[0].activate_water_spirit_stacks >= 1) {
        game.chase();
    }
}

// Metal Spirit - Vigorous
card_actions["634011"] = (game) => {
    game.add_c_of_x(1, "disable_penetrate_stacks");
    game.atk(5 + game.players[0].penetrate);
}

// 634012
card_actions["634012"] = (game) => {
    game.add_c_of_x(1, "disable_penetrate_stacks");
    game.atk(10 + game.players[0].penetrate);
}

// 634013
card_actions["634013"] = (game) => {
    game.add_c_of_x(1, "disable_penetrate_stacks");
    game.atk(15 + game.players[0].penetrate);
}

// Overcome With Each Other
card_actions["634021"] = (game) => {
    game.do_overcome_with_each_other(1, 3);
}

// 634022
card_actions["634022"] = (game) => {
    game.do_overcome_with_each_other(2, 5);
}

// 634023
card_actions["634023"] = (game) => {
    game.do_overcome_with_each_other(3, 7);
}

// Water Spirit - Spring Rain
card_actions["634031"] = (game) => {
    game.add_c_of_x(4, "max_hp");
    game.increase_idx_hp(0, 4);
    game.continuous();
    game.add_c_of_x(1, "water_spirit_spring_rain_stacks");
}

// 634032
card_actions["634032"] = (game) => {
    game.add_c_of_x(10, "max_hp");
    game.increase_idx_hp(0, 10);
    game.continuous();
    game.add_c_of_x(1, "water_spirit_spring_rain_stacks");
}

// 634033
card_actions["634033"] = (game) => {
    game.add_c_of_x(16, "max_hp");
    game.increase_idx_hp(0, 16);
    game.continuous();
    game.add_c_of_x(1, "water_spirit_spring_rain_stacks");
}

// Earth Spirit - Landslide
card_actions["635011"] = (game) => {
    game.do_earth_spirit_landslide(8, 3);
}

// 635012
card_actions["635012"] = (game) => {
    game.do_earth_spirit_landslide(15, 3);
}

// 635013
card_actions["635013"] = (game) => {
    game.do_earth_spirit_landslide(15, 4);
}

// Unceasing Exercising
card_actions["642011"] = (game) => {
    game.atk(4);
    game.add_c_of_x(3, "physique");
    game.increase_idx_hp(0, 3);
}

// 642012
card_actions["642012"] = (game) => {
    game.atk(6);
    game.add_c_of_x(4, "physique");
    game.increase_idx_hp(0, 4);
}

// 642013
card_actions["642013"] = (game) => {
    game.atk(8);
    game.add_c_of_x(5, "physique");
    game.increase_idx_hp(0, 5);
}

// Overwhelming Power
card_actions["642021"] = (game) => {
    game.add_c_of_x(2, "force");
    game.continuous();
    game.add_c_of_x(2, "overwhelming_power_stacks");
}

// 642022
card_actions["642022"] = (game) => {
    game.add_c_of_x(3, "force");
    game.continuous();
    game.add_c_of_x(2, "overwhelming_power_stacks");
}

// 642023
card_actions["642023"] = (game) => {
    game.add_c_of_x(4, "force");
    game.continuous();
    game.add_c_of_x(2, "overwhelming_power_stacks");
}

// Gone Crazy
card_actions["643011"] = (game) => {
    game.add_c_of_x(2, "styx");
    for (let i = 0; i < 2; i++) {
        switch (game.random_int(6)) {
            case 0:
                game.add_c_of_x(1, "internal_injury");
                break;
            case 1:
                game.add_c_of_x(1, "weaken");
                break;
            case 2:
                game.add_c_of_x(1, "flaw");
                break;
            case 3:
                game.add_c_of_x(1, "decrease_atk");
                break;
            case 4:
                game.add_c_of_x(1, "entangle");
                break;
            case 5:
                game.add_c_of_x(1, "wound");
                break;
        }
    }
    const physique_amt = Math.min(10, game.get_debuff_count(0) + 1);
    game.increase_idx_physique(0, physique_amt);
}

// 643012
card_actions["643012"] = (game) => {
    game.add_c_of_x(3, "styx");
    switch (game.random_int(6)) {
        case 0:
            game.add_c_of_x(1, "internal_injury");
            break;
        case 1:
            game.add_c_of_x(1, "weaken");
            break;
        case 2:
            game.add_c_of_x(1, "flaw");
            break;
        case 3:
            game.add_c_of_x(1, "decrease_atk");
            break;
        case 4:
            game.add_c_of_x(1, "entangle");
            break;
        case 5:
            game.add_c_of_x(1, "wound");
            break;
    }
    const physique_amt = Math.min(15, game.get_debuff_count(0) + 1);
    game.increase_idx_physique(0, physique_amt);
}

// 643013
card_actions["643013"] = (game) => {
    game.add_c_of_x(4, "styx");
    const physique_amt = Math.min(20, game.get_debuff_count(0) + 1);
    game.increase_idx_physique(0, physique_amt);
}

// Crash Fist - Stygian Night
card_actions["644011"] = (game) => {
    game.add_c_of_x(2, "styx");
    game.continuous();
    game.add_c_of_x(6, "crash_fist_stygian_night_stacks");
}

// 644012
card_actions["644012"] = (game) => {
    game.add_c_of_x(3, "styx");
    game.continuous();
    game.add_c_of_x(9, "crash_fist_stygian_night_stacks");
}

// 644013
card_actions["644013"] = (game) => {
    game.add_c_of_x(4, "styx");
    game.continuous();
    game.add_c_of_x(12, "crash_fist_stygian_night_stacks");
}

// Meditation of Xuan
card_actions["644021"] = (game) => {
    game.physique(2);
    game.continuous();
    game.add_c_of_x(2, "meditation_of_xuan_stacks");
}

// 644022
card_actions["644022"] = (game) => {
    game.physique(3);
    game.continuous();
    game.add_c_of_x(3, "meditation_of_xuan_stacks");
}

// 644023
card_actions["644023"] = (game) => {
    game.physique(4);
    game.continuous();
    game.add_c_of_x(4, "meditation_of_xuan_stacks");
}

// Shift Stance
card_actions["644031"] = (game) => {
    game.add_c_of_x(8, "agility");
    if (game.if_fist_stance()) {
        game.add_c_of_x(4, "agility");
    } else {
        game.atk(8);
    }
    game.switch_stance();
}

// 644032
card_actions["644032"] = (game) => {
    game.add_c_of_x(8, "agility");
    if (game.if_fist_stance()) {
        game.add_c_of_x(6, "agility");
    } else {
        game.atk(12);
    }
    game.switch_stance();
}

// 644033
card_actions["644033"] = (game) => {
    game.add_c_of_x(8, "agility");
    if (game.if_fist_stance()) {
        game.add_c_of_x(8, "agility");
    } else {
        game.atk(16);
    }
    game.switch_stance();
}

// Stygian Moon's Changuang
card_actions["645011"] = (game) => {
    game.physique(1);
    game.add_c_of_x(2, "styx");
    game.add_c_of_x(10, "agility");
}

// 645012
card_actions["645012"] = (game) => {
    game.physique(2);
    game.add_c_of_x(3, "styx");
    game.add_c_of_x(11, "agility");
}

// 645013
card_actions["645013"] = (game) => {
    game.physique(3);
    game.add_c_of_x(4, "styx");
    game.add_c_of_x(12, "agility");
}

// Wan Xuan Demon Breaking Palm
card_actions["645021"] = (game) => {
    game.physique(2);
    game.for_each_x_convert_c_pct_debuff_to_y("physique", 5, "increase_atk");
    for (let i = 0; i < 3; i++) {
        game.atk(3);
    }
}

// 645022
card_actions["645022"] = (game) => {
    game.physique(3);
    game.for_each_x_convert_c_pct_debuff_to_y("physique", 5, "increase_atk");
    for (let i = 0; i < 4; i++) {
        game.atk(3);
    }
}

// 645023
card_actions["645023"] = (game) => {
    game.physique(4);
    game.for_each_x_convert_c_pct_debuff_to_y("physique", 5, "increase_atk");
    for (let i = 0; i < 5; i++) {
        game.atk(3);
    }
}

// Red Gold Dragon Stick
card_actions["645031"] = (game) => {
    const me = game.players[0];
    if (game.if_fist_stance()) {
        game.add_c_of_x(4, "force");
        game.for_each_x_add_c_pct_y("physique", 20, "hp");
    } else {
        const atk_amt = 4 + Math.floor(me.physique * 11.111112 / 100);
        for (let i = 0; i < 2; i++) {
            game.atk(atk_amt);
        }
    }
    game.switch_stance();
}

// 645032
card_actions["645032"] = (game) => {
    const me = game.players[0];
    if (game.if_fist_stance()) {
        game.add_c_of_x(5, "force");
        game.for_each_x_add_c_pct_y("physique", 20, "hp");
    } else {
        const atk_amt = 7 + Math.floor(me.physique * 11.111112 / 100);
        for (let i = 0; i < 2; i++) {
            game.atk(atk_amt);
        }
    }
    game.switch_stance();
}

// 645033
card_actions["645033"] = (game) => {
    const me = game.players[0];
    if (game.if_fist_stance()) {
        game.add_c_of_x(6, "force");
        game.for_each_x_add_c_pct_y("physique", 20, "hp");
    } else {
        const atk_amt = 10 + Math.floor(me.physique * 11.111112 / 100);
        for (let i = 0; i < 2; i++) {
            game.atk(atk_amt);
        }
    }
    game.switch_stance();
}

// Azure Dragon Sword Formation
card_actions["714011"] = (game) => {
    game.increase_idx_def(0, 8);
    game.for_each_x_add_c_pct_y("def", 33.333334, "sword_intent");
}

// 714012
card_actions["714012"] = (game) => {
    game.increase_idx_def(0, 12);
    game.for_each_x_add_c_pct_y("def", 33.333334, "sword_intent");
}

// 714013
card_actions["714013"] = (game) => {
    game.increase_idx_def(0, 16);
    game.for_each_x_add_c_pct_y("def", 33.333334, "sword_intent");
}

// Cloud Sword - Sunset Glow
card_actions["714021"] = (game) => {
    game.add_c_of_x(2, "sword_intent");
    if (game.if_cloud_hit()) {
        game.for_each_x_add_c_y("cloud_sword_chain_count", 2, "sword_intent");
    }
}

// 714022
card_actions["714022"] = (game) => {
    game.add_c_of_x(4, "sword_intent");
    if (game.if_cloud_hit()) {
        game.for_each_x_add_c_y("cloud_sword_chain_count", 2, "sword_intent");
    }
}

// 714023
card_actions["714023"] = (game) => {
    game.add_c_of_x(6, "sword_intent");
    if (game.if_cloud_hit()) {
        game.for_each_x_add_c_y("cloud_sword_chain_count", 2, "sword_intent");
    }
}

// Dragon Devours Clouds
card_actions["715011"] = (game) => {
    game.continuous();
    game.add_c_of_x(1, "dragon_devours_clouds_stacks");
}

// 715012
card_actions["715012"] = (game) => {
    game.add_c_of_x(1, "unrestrained_sword_count");
    game.continuous();
    game.add_c_of_x(1, "dragon_devours_clouds_stacks");
}

// 715013
card_actions["715013"] = (game) => {
    game.add_c_of_x(2, "unrestrained_sword_count");
    game.continuous();
    game.add_c_of_x(1, "dragon_devours_clouds_stacks");
}

// Beast Spirit Sword Formation
card_actions["715021"] = (game) => {
    game.increase_idx_qi(0, 2);
    game.continuous();
    game.add_c_of_x(1, "beast_spirit_sword_formation_stacks");
}

// 715022
card_actions["715022"] = (game) => {
    game.increase_idx_qi(0, 3);
    game.continuous();
    game.add_c_of_x(1, "beast_spirit_sword_formation_stacks");
}

// 715023
card_actions["715023"] = (game) => {
    game.increase_idx_qi(0, 4);
    game.continuous();
    game.add_c_of_x(1, "beast_spirit_sword_formation_stacks");
}

// Spiritual Divination
card_actions["724011"] = (game) => {
    game.continuous();
    game.add_c_of_x(1, "spiritual_divination_stacks");
}

// 724012
card_actions["724012"] = (game) => {
    game.add_c_of_x(1, "hexagram");
    game.continuous();
    game.add_c_of_x(1, "spiritual_divination_stacks");
}

// 724013
card_actions["724013"] = (game) => {
    game.add_c_of_x(3, "hexagram");
    game.continuous();
    game.add_c_of_x(1, "spiritual_divination_stacks");
}

// Throw Petals
card_actions["724021"] = (game) => {
    game.continuous();
    game.add_c_of_x(1, "throw_petals_stacks");
}

// 724022
card_actions["724022"] = (game) => {
    game.increase_idx_qi(0, 1);
    game.continuous();
    game.add_c_of_x(1, "throw_petals_stacks");
}

// 724023
card_actions["724023"] = (game) => {
    game.increase_idx_qi(0, 3);
    game.continuous();
    game.add_c_of_x(1, "throw_petals_stacks");
}

// Astral Move - Twin Swallows
card_actions["725011"] = (game) => {
    let atk_amt = 4;
    if (game.if_star_point()) {
        atk_amt += 4;
    }
    game.atk(atk_amt);
    game.chase();
    if (game.if_post_action()) {
        game.atk(atk_amt);
    }
}

// 725012
card_actions["725012"] = (game) => {
    let atk_amt = 5;
    if (game.if_star_point()) {
        atk_amt += 6;
    }
    game.atk(atk_amt);
    game.chase();
    if (game.if_post_action()) {
        game.atk(atk_amt);
    }
}

// 725013
card_actions["725013"] = (game) => {
    let atk_amt = 6;
    if (game.if_star_point()) {
        atk_amt += 8;
    }
    game.atk(atk_amt);
    game.chase();
    if (game.if_post_action()) {
        game.atk(atk_amt);
    }
}

// Water Drop Erosion
card_actions["725021"] = (game) => {
    game.atk(1);
    if (game.if_enemy_has_debuff()) {
        game.chase();
    }
    if (game.if_post_action()) {
        game.add_enemy_c_of_x(6, "internal_injury");
    }
}

// 725022
card_actions["725022"] = (game) => {
    game.atk(1);
    if (game.if_enemy_has_debuff()) {
        game.chase();
    }
    if (game.if_post_action()) {
        game.add_enemy_c_of_x(8, "internal_injury");
    }
}

// 725023
card_actions["725023"] = (game) => {
    game.atk(1);
    if (game.if_enemy_has_debuff()) {
        game.chase();
    }
    if (game.if_post_action()) {
        game.add_enemy_c_of_x(10, "internal_injury");
    }
}

// Wild Crossing Seal
card_actions["734011"] = (game) => {
    game.increase_idx_qi(0, 2);
    game.add_c_of_x(1, "wild_crossing_seal_stacks");
}

// 734012
card_actions["734012"] = (game) => {
    game.increase_idx_qi(0, 4);
    game.add_c_of_x(1, "wild_crossing_seal_stacks");
}

// 734013
card_actions["734013"] = (game) => {
    game.increase_idx_qi(0, 6);
    game.add_c_of_x(1, "wild_crossing_seal_stacks");
}

// Lava Seal
card_actions["734021"] = (game) => {
    const reduce_amt = 10 + game.players[0].def;
    game.reduce_idx_hp(1, reduce_amt);
    game.reduce_idx_max_hp(1, reduce_amt);
}

// 734022
card_actions["734022"] = (game) => {
    const reduce_amt = 15 + game.players[0].def;
    game.reduce_idx_hp(1, reduce_amt);
    game.reduce_idx_max_hp(1, reduce_amt);
}

// 734023
card_actions["734023"] = (game) => {
    const reduce_amt = 20 + game.players[0].def;
    game.reduce_idx_hp(1, reduce_amt);
    game.reduce_idx_max_hp(1, reduce_amt);
}

// Boulder Seal
card_actions["735011"] = (game) => {
    const def_amt = 2 + 2 * game.players[0].played_card_count;
    game.increase_idx_def(0, def_amt);
    game.chase();
}

// 735012
card_actions["735012"] = (game) => {
    const def_amt = 3 + 3 * game.players[0].played_card_count;
    game.increase_idx_def(0, def_amt);
    game.chase();
}

// 735013
card_actions["735013"] = (game) => {
    const def_amt = 4 + 4 * game.players[0].played_card_count;
    game.increase_idx_def(0, def_amt);
    game.chase();
}

// Wave Cutter Seal
card_actions["735021"] = (game) => {
    game.increase_idx_qi(0, 2);
    game.for_each_x_add_c_y("qi", 3, "penetrate");
}

// 735022
card_actions["735022"] = (game) => {
    game.increase_idx_qi(0, 3);
    game.for_each_x_add_c_y("qi", 3, "penetrate");
}

// 735023
card_actions["735023"] = (game) => {
    game.increase_idx_qi(0, 4);
    game.for_each_x_add_c_y("qi", 3, "penetrate");
}

// Mushroom Zongzi
card_actions["801011"] = (game) => {
    game.increase_idx_hp(0, 6);
    if (game.players[0].qi >= 1) {
        game.reduce_c_of_x(1, "qi");
        game.increase_idx_hp(0, 3);
    }
}

// 801012
card_actions["801012"] = (game) => {
    game.increase_idx_hp(0, 9);
    if (game.players[0].qi >= 1) {
        game.reduce_c_of_x(1, "qi");
        game.increase_idx_hp(0, 3);
    }
}

// 801013
card_actions["801013"] = (game) => {
    game.increase_idx_hp(0, 12);
    if (game.players[0].qi >= 1) {
        game.reduce_c_of_x(1, "qi");
        game.increase_idx_hp(0, 3);
    }
}

// Honey Zongzi
card_actions["801021"] = (game) => {
    game.increase_idx_hp(0, 3);
    game.add_c_of_x(1, "regen");
}

// 801022
card_actions["801022"] = (game) => {
    game.increase_idx_hp(0, 6);
    game.add_c_of_x(1, "regen");
}

// 801023
card_actions["801023"] = (game) => {
    game.increase_idx_hp(0, 9);
    game.add_c_of_x(1, "regen");
}

// Salted Meat Zongzi
card_actions["801031"] = (game) => {
    game.increase_idx_qi(0, 1);
    game.increase_idx_hp(0, 6);
    game.add_c_of_x(1, "internal_injury");
}

// 801032
card_actions["801032"] = (game) => {
    game.increase_idx_qi(0, 1);
    game.increase_idx_hp(0, 9);
    game.add_c_of_x(1, "internal_injury");
}

// 801033
card_actions["801033"] = (game) => {
    game.increase_idx_qi(0, 1);
    game.increase_idx_hp(0, 12);
    game.add_c_of_x(1, "internal_injury");
}

// Red Bean Zongzi
card_actions["801041"] = (game) => {
    game.increase_idx_hp(0, 10);
}

// 801042
card_actions["801042"] = (game) => {
    game.increase_idx_hp(0, 13);
}

// 801043
card_actions["801043"] = (game) => {
    game.increase_idx_hp(0, 16);
}

// Jujube Zongzi
card_actions["801051"] = (game) => {
    game.increase_idx_qi(0, 1);
    game.increase_idx_hp(0, 4);
}

// 801052
card_actions["801052"] = (game) => {
    game.increase_idx_qi(0, 1);
    game.increase_idx_hp(0, 7);
}

// 801053
card_actions["801053"] = (game) => {
    game.increase_idx_qi(0, 1);
    game.increase_idx_hp(0, 10);
}

// Fresh Meat Zongzi
card_actions["801061"] = (game) => {
    game.increase_idx_hp(0, 6);
    game.reduce_random_debuff_by_c_n_times(1, 1);
}

// 801062
card_actions["801062"] = (game) => {
    game.increase_idx_hp(0, 9);
    game.reduce_random_debuff_by_c_n_times(1, 1);
}

// 801063
card_actions["801063"] = (game) => {
    game.increase_idx_hp(0, 12);
    game.reduce_random_debuff_by_c_n_times(1, 1);
}

// Candied Jujube Zongzi
card_actions["802011"] = (game) => {
    game.increase_idx_qi(0, 2);
    game.for_each_x_add_y("qi", "hp");
}

// 802012
card_actions["802012"] = (game) => {
    game.increase_idx_qi(0, 3);
    game.for_each_x_add_y("qi", "hp");
}

// 802013
card_actions["802013"] = (game) => {
    game.increase_idx_qi(0, 4);
    game.for_each_x_add_y("qi", "hp");
}

// Spicy Zongzi
card_actions["802021"] = (game) => {
    game.add_c_of_x(1, "internal_injury");
    for (let i = 0; i < 2; i++) {
        game.increase_idx_hp(0, 5);
    }
    if (game.players[0].qi >= 1) {
        game.reduce_c_of_x(1, "qi");
        game.increase_idx_hp(0, 4);
    }
}

// 802022
card_actions["802022"] = (game) => {
    game.add_c_of_x(1, "internal_injury");
    for (let i = 0; i < 2; i++) {
        game.increase_idx_hp(0, 7);
    }
    if (game.players[0].qi >= 1) {
        game.reduce_c_of_x(1, "qi");
        game.increase_idx_hp(0, 4);
    }
}

// 802023
card_actions["802023"] = (game) => {
    game.add_c_of_x(1, "internal_injury");
    for (let i = 0; i < 2; i++) {
        game.increase_idx_hp(0, 9);
    }
    if (game.players[0].qi >= 1) {
        game.reduce_c_of_x(1, "qi");
        game.increase_idx_hp(0, 4);
    }
}

// Roasted Meat Zongzi
card_actions["802031"] = (game) => {
    game.add_c_of_x(1, "appetite");
    game.increase_idx_hp(0, 2);
}

// 802032
card_actions["802032"] = (game) => {
    game.add_c_of_x(1, "appetite");
    game.increase_idx_hp(0, 6);
}

// 802033
card_actions["802033"] = (game) => {
    game.add_c_of_x(1, "appetite");
    game.increase_idx_hp(0, 10);
}

// Mung Bean Zongzi
card_actions["802041"] = (game) => {
    game.for_each_x_add_y("sweet_zongzi_count", "bonus_heal_amt");
    game.increase_idx_hp(0, 8);
}

// 802042
card_actions["802042"] = (game) => {
    game.for_each_x_add_y("sweet_zongzi_count", "bonus_heal_amt");
    game.increase_idx_hp(0, 12);
}

// 802043
card_actions["802043"] = (game) => {
    game.for_each_x_add_y("sweet_zongzi_count", "bonus_heal_amt");
    game.increase_idx_hp(0, 16);
}

// Preserved Meat Zongzi
card_actions["802051"] = (game) => {
    game.increase_idx_qi(0, 1);
    game.increase_idx_hp(0, 3);
    game.add_c_of_x(1, "hexproof");
}

// 802052
card_actions["802052"] = (game) => {
    game.increase_idx_qi(0, 1);
    game.increase_idx_hp(0, 6);
    game.add_c_of_x(2, "hexproof");
}

// 802053
card_actions["802053"] = (game) => {
    game.increase_idx_qi(0, 1);
    game.increase_idx_hp(0, 9);
    game.add_c_of_x(3, "hexproof");
}

// Jujube Paste Zongzi
card_actions["802061"] = (game) => {
    game.increase_idx_qi(0, 1);
    game.for_each_x_add_c_y("qi", 2, "bonus_heal_amt");
    game.increase_idx_hp(0, 6);
    game.add_c_of_x(2, "indigestion");
}

// 802062
card_actions["802062"] = (game) => {
    game.increase_idx_qi(0, 1);
    game.for_each_x_add_c_y("qi", 2, "bonus_heal_amt");
    game.increase_idx_hp(0, 10);
    game.add_c_of_x(2, "indigestion");
}

// 802063
card_actions["802063"] = (game) => {
    game.increase_idx_qi(0, 1);
    game.for_each_x_add_c_y("qi", 2, "bonus_heal_amt");
    game.increase_idx_hp(0, 14);
    game.add_c_of_x(2, "indigestion");
}

// Alkaline Water Zongzi
card_actions["803011"] = (game) => {
    game.increase_idx_hp(0, 2);
    game.continuous();
    game.add_c_of_x(1, "alkaline_water_zongzi_stacks");
}

// 803012
card_actions["803012"] = (game) => {
    game.increase_idx_hp(0, 6);
    game.continuous();
    game.add_c_of_x(1, "alkaline_water_zongzi_stacks");
}

// 803013
card_actions["803013"] = (game) => {
    game.increase_idx_hp(0, 10);
    game.continuous();
    game.add_c_of_x(1, "alkaline_water_zongzi_stacks");
}

// Lotus Seeds Zongzi
card_actions["803021"] = (game) => {
    game.for_each_x_add_y("qi", "bonus_heal_amt");
    game.for_each_x_add_y("internal_injury", "bonus_heal_amt");
    game.for_each_x_add_y("regen", "bonus_heal_amt");
    game.for_each_x_add_y("appetite", "bonus_heal_amt");
    game.for_each_x_add_y("indigestion", "bonus_heal_amt");
    game.for_each_x_add_c_y("bonus_heal_amt", 1, "bonus_heal_amt");
    game.increase_idx_hp(0, 4);
}

// 803022
card_actions["803022"] = (game) => {
    game.for_each_x_add_y("qi", "bonus_heal_amt");
    game.for_each_x_add_y("internal_injury", "bonus_heal_amt");
    game.for_each_x_add_y("regen", "bonus_heal_amt");
    game.for_each_x_add_y("appetite", "bonus_heal_amt");
    game.for_each_x_add_y("indigestion", "bonus_heal_amt");
    game.for_each_x_add_c_y("bonus_heal_amt", 1, "bonus_heal_amt");
    game.increase_idx_hp(0, 8);
}

// 803023
card_actions["803023"] = (game) => {
    game.for_each_x_add_y("qi", "bonus_heal_amt");
    game.for_each_x_add_y("internal_injury", "bonus_heal_amt");
    game.for_each_x_add_y("regen", "bonus_heal_amt");
    game.for_each_x_add_y("appetite", "bonus_heal_amt");
    game.for_each_x_add_y("indigestion", "bonus_heal_amt");
    game.for_each_x_add_c_y("bonus_heal_amt", 2, "bonus_heal_amt");
    game.increase_idx_hp(0, 8);
}

// Bean Paste Zongzi
card_actions["803031"] = (game) => {
    game.for_each_x_add_y("internal_injury", "bonus_heal_amt");
    game.for_each_x_add_y("indigestion", "bonus_heal_amt");
    game.for_each_x_reduce_c_pct_y("internal_injury", 100, "internal_injury");
    game.for_each_x_reduce_c_pct_y("indigestion", 100, "indigestion");
    game.for_each_x_add_c_y("bonus_heal_amt", 1, "bonus_heal_amt");
    game.increase_idx_hp(0, 7);
}

// 803032
card_actions["803032"] = (game) => {
    game.for_each_x_add_y("internal_injury", "bonus_heal_amt");
    game.for_each_x_add_y("indigestion", "bonus_heal_amt");
    game.for_each_x_reduce_c_pct_y("internal_injury", 100, "internal_injury");
    game.for_each_x_reduce_c_pct_y("indigestion", 100, "indigestion");
    game.for_each_x_add_c_y("bonus_heal_amt", 2, "bonus_heal_amt");
    game.increase_idx_hp(0, 7);
}

// 803033
card_actions["803033"] = (game) => {
    game.for_each_x_add_y("internal_injury", "bonus_heal_amt");
    game.for_each_x_add_y("indigestion", "bonus_heal_amt");
    game.for_each_x_reduce_c_pct_y("internal_injury", 100, "internal_injury");
    game.for_each_x_reduce_c_pct_y("indigestion", 100, "indigestion");
    game.for_each_x_add_c_y("bonus_heal_amt", 3, "bonus_heal_amt");
    game.increase_idx_hp(0, 7);
}

// Sour Bamboo Shoots Zongzi
card_actions["803041"] = (game) => {
    game.increase_idx_hp(0, 2);
    game.add_c_of_x(2, "internal_injury");
    game.chase();
}

// 803042
card_actions["803042"] = (game) => {
    game.increase_idx_hp(0, 6);
    game.add_c_of_x(2, "internal_injury");
    game.chase();
}

// 803043
card_actions["803043"] = (game) => {
    game.increase_idx_hp(0, 10);
    game.add_c_of_x(2, "internal_injury");
    game.chase();
}

// Chestnut Zongzi
card_actions["803051"] = (game) => {
    if (game.players[0].qi >= 1) {
        game.reduce_c_of_x(1, "qi");
    }
    for (let i = 0; i < 3; i++) {
        game.increase_idx_hp(0, 3);
    }
}

// 803052
card_actions["803052"] = (game) => {
    if (game.players[0].qi >= 1) {
        // TODO: what was this supposed to do?
        //game.for_each_x_add_y("internal_injury", "bonus_def_amt");
    }
    for (let i = 0; i < 3; i++) {
        game.increase_idx_hp(0, 4);
    }
}

// 803053
card_actions["803053"] = (game) => {
    if (game.players[0].qi >= 1) {
        // TODO: what was this supposed to do?
        //game.for_each_x_add_y("internal_injury", "bonus_def_amt");
    }
    for (let i = 0; i < 3; i++) {
        game.increase_idx_hp(0, 5);
    }
}

// Pungent Zongzi
card_actions["803061"] = (game) => {
    game.increase_idx_qi(0, 1);
    game.increase_idx_hp(0, 6);
    game.add_c_of_x(1, "appetite");
    game.add_c_of_x(1, "internal_injury");
}

// 803062
card_actions["803062"] = (game) => {
    game.increase_idx_qi(0, 1);
    game.increase_idx_hp(0, 9);
    game.add_c_of_x(2, "appetite");
    game.add_c_of_x(2, "internal_injury");
}

// 803063
card_actions["803063"] = (game) => {
    game.increase_idx_qi(0, 1);
    game.increase_idx_hp(0, 12);
    game.add_c_of_x(3, "appetite");
    game.add_c_of_x(3, "internal_injury");
}

// Preserved Fruit Zongzi
card_actions["804011"] = (game) => {
    game.for_each_x_add_c_y("sweet_zongzi_count", 2, "bonus_heal_amt");
    game.for_each_x_add_c_y("sweet_zongzi_count", 1, "qi");
    game.increase_idx_hp(0, 2);
}

// 804012
card_actions["804012"] = (game) => {
    game.for_each_x_add_c_y("sweet_zongzi_count", 3, "bonus_heal_amt");
    game.for_each_x_add_c_y("sweet_zongzi_count", 1, "qi");
    game.increase_idx_hp(0, 3);
}

// 804013
card_actions["804013"] = (game) => {
    game.for_each_x_add_c_y("sweet_zongzi_count", 3, "bonus_heal_amt");
    game.for_each_x_add_c_y("sweet_zongzi_count", 2, "qi");
    game.increase_idx_hp(0, 4);
}

// Crystal Ice Zongzi
card_actions["804021"] = (game) => {
    game.increase_idx_qi(0, 2);
    game.add_c_of_x(1, "indigestion");
    game.chase();
}

// 804022
card_actions["804022"] = (game) => {
    game.increase_idx_qi(0, 4);
    game.add_c_of_x(2, "indigestion");
    game.chase();
}

// 804023
card_actions["804023"] = (game) => {
    game.increase_idx_qi(0, 6);
    game.add_c_of_x(3, "indigestion");
    game.chase();
}

// Fresh Fruit Zongzi
card_actions["804031"] = (game) => {
    game.increase_idx_hp(0, 8);
    game.add_c_of_x(1, "fresh_fruit_zongzi_stacks");
}

// 804032
card_actions["804032"] = (game) => {
    game.increase_idx_hp(0, 11);
    game.add_c_of_x(2, "fresh_fruit_zongzi_stacks");
}

// 804033
card_actions["804033"] = (game) => {
    game.increase_idx_hp(0, 14);
    game.add_c_of_x(3, "fresh_fruit_zongzi_stacks");
}

// Salted Egg Yolk Zongzi
card_actions["804041"] = (game) => {
    game.increase_idx_hp(0, 6);
    game.add_c_of_x(2, "salted_egg_yolk_zongzi_stacks");
}

// 804042
card_actions["804042"] = (game) => {
    game.increase_idx_hp(0, 8);
    game.add_c_of_x(3, "salted_egg_yolk_zongzi_stacks");
}

// 804043
card_actions["804043"] = (game) => {
    game.increase_idx_hp(0, 10);
    game.add_c_of_x(4, "salted_egg_yolk_zongzi_stacks");
}

// Seafood Zongzi
card_actions["804051"] = (game) => {
    for (let i = 0; i < 4; i++) {
        game.increase_idx_hp(0, 5);
    }
}

// 804052
card_actions["804052"] = (game) => {
    for (let i = 0; i < 4; i++) {
        game.increase_idx_hp(0, 6);
    }
}

// 804053
card_actions["804053"] = (game) => {
    for (let i = 0; i < 5; i++) {
        game.increase_idx_hp(0, 6);
    }
}

// Pickled Mustard Zongzi
card_actions["804061"] = (game) => {
    game.increase_idx_hp(0, 2);
    game.add_c_of_x(2, "appetite");
    game.add_c_of_x(1, "skip_next_card_stacks");
}

// 804062
card_actions["804062"] = (game) => {
    game.increase_idx_hp(0, 3);
    game.add_c_of_x(3, "appetite");
    game.add_c_of_x(2, "skip_next_card_stacks");
}

// 804063
card_actions["804063"] = (game) => {
    game.increase_idx_hp(0, 4);
    game.add_c_of_x(4, "appetite");
    game.add_c_of_x(3, "skip_next_card_stacks");
}

// Mixed Grain Zongzi
card_actions["805011"] = (game) => {
    game.increase_idx_qi(0, 2);
    game.continuous();
    game.add_c_of_x(2, "mixed_grain_zongzi_stacks");
}

// 805012
card_actions["805012"] = (game) => {
    game.increase_idx_qi(0, 3);
    game.continuous();
    game.add_c_of_x(4, "mixed_grain_zongzi_stacks");
}

// 805013
card_actions["805013"] = (game) => {
    game.increase_idx_qi(0, 4);
    game.continuous();
    game.add_c_of_x(6, "mixed_grain_zongzi_stacks");
}

// Spirit Zongzi
card_actions["805021"] = (game) => {
    game.exhaust_x_to_add_c_y("qi", 5, "bonus_heal_amt");
    game.increase_idx_hp(0, 5);
}

// 805022
card_actions["805022"] = (game) => {
    game.exhaust_x_to_add_c_y("qi", 6, "bonus_heal_amt");
    game.increase_idx_hp(0, 6);
}

// 805023
card_actions["805023"] = (game) => {
    game.exhaust_x_to_add_c_y("qi", 7, "bonus_heal_amt");
    game.increase_idx_hp(0, 7);
}

// Water Combined Zongzi
card_actions["805031"] = (game) => {
    game.add_c_of_x(2, "regen");
    game.for_each_x_add_c_y("regen", 5, "bonus_heal_amt");
    game.for_each_x_add_c_y("appetite", 5, "bonus_heal_amt");
    game.increase_idx_hp(0, 5);
}

// 805032
card_actions["805032"] = (game) => {
    game.add_c_of_x(3, "regen");
    game.for_each_x_add_c_y("regen", 6, "bonus_heal_amt");
    game.for_each_x_add_c_y("appetite", 6, "bonus_heal_amt");
    game.increase_idx_hp(0, 6);
}

// 805033
card_actions["805033"] = (game) => {
    game.add_c_of_x(4, "regen");
    game.for_each_x_add_c_y("regen", 7, "bonus_heal_amt");
    game.for_each_x_add_c_y("appetite", 7, "bonus_heal_amt");
    game.increase_idx_hp(0, 7);
}

// Assorted Meat Zongzi
card_actions["805041"] = (game) => {
    game.for_each_x_add_y("internal_injury", "bonus_heal_amt");
    game.for_each_x_add_y("indigestion", "bonus_heal_amt");
    game.for_each_x_add_y("appetite", "bonus_heal_amt");
    for (let i = 0; i < 5; i++) {
        game.increase_idx_hp(0, 2);
    }
}

// 805042
card_actions["805042"] = (game) => {
    game.for_each_x_add_y("internal_injury", "bonus_heal_amt");
    game.for_each_x_add_y("indigestion", "bonus_heal_amt");
    game.for_each_x_add_y("appetite", "bonus_heal_amt");
    for (let i = 0; i < 6; i++) {
        game.increase_idx_hp(0, 2);
    }
}

// 805043
card_actions["805043"] = (game) => {
    game.for_each_x_add_y("internal_injury", "bonus_heal_amt");
    game.for_each_x_add_y("indigestion", "bonus_heal_amt");
    game.for_each_x_add_y("appetite", "bonus_heal_amt");
    for (let i = 0; i < 7; i++) {
        game.increase_idx_hp(0, 2);
    }
}

// Double Plum Zongzi
card_actions["805051"] = (game) => {
    game.increase_idx_hp(0, 2);
    game.add_c_of_x(1, "strike_twice_stacks");
}

// 805052
card_actions["805052"] = (game) => {
    game.increase_idx_hp(0, 8);
    game.add_c_of_x(1, "strike_twice_stacks");
}

// 805053
card_actions["805053"] = (game) => {
    game.increase_idx_hp(0, 14);
    game.add_c_of_x(1, "strike_twice_stacks");
}

// Shura Zongzi
card_actions["805061"] = (game) => {
    game.add_c_of_x(2, "internal_injury");
    const me = game.players[0];
    const tummy_hurt_amt = me.internal_injury + me.indigestion;
    game.increase_idx_qi(0, tummy_hurt_amt);
    game.increase_idx_hp(0, 3 * tummy_hurt_amt);
}

// 805062
card_actions["805062"] = (game) => {
    game.add_c_of_x(3, "internal_injury");
    const me = game.players[0];
    const tummy_hurt_amt = me.internal_injury + me.indigestion;
    game.increase_idx_qi(0, tummy_hurt_amt);
    game.increase_idx_hp(0, 4 * tummy_hurt_amt);
}

// 805063
card_actions["805063"] = (game) => {
    game.add_c_of_x(4, "internal_injury");
    const me = game.players[0];
    const tummy_hurt_amt = me.internal_injury + me.indigestion;
    game.increase_idx_qi(0, tummy_hurt_amt);
    game.increase_idx_hp(0, 5 * tummy_hurt_amt);
}

// Xuanming Recurring
card_actions["903011"] = (game) => {
    game.do_xuanming_recurring(0);
    game.add_c_of_x(1, "skip_to_previous_card_stacks");
    game.consumption();
}

// 903012
card_actions["903012"] = (game) => {
    game.do_xuanming_recurring(5);
    game.add_c_of_x(1, "skip_to_previous_card_stacks");
    game.consumption();
}

// 903013
card_actions["903013"] = (game) => {
    game.do_xuanming_recurring(10);
    game.add_c_of_x(1, "skip_to_previous_card_stacks");
    game.consumption();
}

// Xuanming Recover Elixir
card_actions["904011"] = (game) => {
    const amt =  Math.floor(game.players[0].hp_lost/4) + 20;
    game.add_c_of_x(amt, "max_hp");
    game.increase_idx_hp(0, amt, true);
    game.consumption();
}

// 904012
card_actions["904012"] = (game) => {
    const amt =  Math.floor(game.players[0].hp_lost/4) + 25;
    game.add_c_of_x(amt, "max_hp");
    game.increase_idx_hp(0, amt, true);
    game.consumption();
}

// 904013
card_actions["904013"] = (game) => {
    const amt =  Math.floor(game.players[0].hp_lost/4) + 30;
    game.add_c_of_x(amt, "max_hp");
    game.increase_idx_hp(0, amt, true);
    game.consumption();
}

// Xuanming Regen Tune
card_actions["904021"] = (game) => {
    game.continuous();
    game.add_c_of_x(11, "xuanming_regen_tune_heal_stacks");
    game.add_enemy_c_of_x(11, "xuanming_regen_tune_heal_stacks");
    game.add_c_of_x(6, "xuanming_regen_tune_hurt_stacks");
    game.add_enemy_c_of_x(6, "xuanming_regen_tune_hurt_stacks");
}

// 904022
card_actions["904022"] = (game) => {
    game.continuous();
    game.add_c_of_x(14, "xuanming_regen_tune_heal_stacks");
    game.add_enemy_c_of_x(14, "xuanming_regen_tune_heal_stacks");
    game.add_c_of_x(7, "xuanming_regen_tune_hurt_stacks");
    game.add_enemy_c_of_x(7, "xuanming_regen_tune_hurt_stacks");
}

// 904023
card_actions["904023"] = (game) => {
    game.continuous();
    game.add_c_of_x(17, "xuanming_regen_tune_heal_stacks");
    game.add_enemy_c_of_x(17, "xuanming_regen_tune_heal_stacks");
    game.add_c_of_x(8, "xuanming_regen_tune_hurt_stacks");
    game.add_enemy_c_of_x(8, "xuanming_regen_tune_hurt_stacks");
}

// Xuanming Clouds
card_actions["904031"] = (game) => {
    for (let i = 0; i < 2; i++) {
        switch (game.random_int(3)) {
            case 0:
                game.reduce_enemy_c_of_x(6, "hp");
                game.increase_idx_hp(0, 6);
                break;
            case 1:
                game.add_enemy_c_of_x(2, "weaken");
                break;
            case 2:
                game.add_c_of_x(1, "guard_up");
                break;
        }
    }
}

// 904032
card_actions["904032"] = (game) => {
    for (let i = 0; i < 3; i++) {
        switch (game.random_int(3)) {
            case 0:
                game.reduce_enemy_c_of_x(6, "hp");
                game.increase_idx_hp(0, 6);
                break;
            case 1:
                game.add_enemy_c_of_x(2, "weaken");
                break;
            case 2:
                game.add_c_of_x(1, "guard_up");
                break;
        }
    }
}

// 904033
card_actions["904033"] = (game) => {
    for (let i = 0; i < 4; i++) {
        switch (game.random_int(3)) {
            case 0:
                game.reduce_enemy_c_of_x(6, "hp");
                game.increase_idx_hp(0, 6);
                break;
            case 1:
                game.add_enemy_c_of_x(2, "weaken");
                break;
            case 2:
                game.add_c_of_x(1, "guard_up");
                break;
        }
    }
}

// Xuanming Forceage Formation
card_actions["904041"] = (game) => {
    game.add_c_of_x(3, "increase_atk");
    game.continuous();
    game.add_c_of_x(2, "xuanming_forceage_formation_stacks");
}

// 904042
card_actions["904042"] = (game) => {
    game.add_c_of_x(3, "increase_atk");
    game.continuous();
    game.add_c_of_x(3, "xuanming_forceage_formation_stacks");
}

// 904043
card_actions["904043"] = (game) => {
    game.add_c_of_x(3, "increase_atk");
    game.continuous();
    game.add_c_of_x(4, "xuanming_forceage_formation_stacks");
}

// Xuanming Snowdrop
card_actions["904051"] = (game) => {
    game.increase_idx_hp(0, 9, true);
    game.increase_idx_def(0, 12);
    game.for_each_x_add_c_pct_y("hp_lost", 33.333334, "next_turn_def");
}

// 904052
card_actions["904052"] = (game) => {
    game.increase_idx_hp(0, 9, true);
    game.increase_idx_def(0, 17);
    game.for_each_x_add_c_pct_y("hp_lost", 33.333334, "next_turn_def");
}

// 904053
card_actions["904053"] = (game) => {
    game.increase_idx_hp(0, 9, true);
    game.increase_idx_def(0, 22);
    game.for_each_x_add_c_pct_y("hp_lost", 33.333334, "next_turn_def");
}

// Xuanming Requiem Fulu
card_actions["905011"] = (game) => {
    game.do_xuanming_requiem_fulu(20, 15);
    game.consumption();
}

// 905012
card_actions["905012"] = (game) => {
    game.do_xuanming_requiem_fulu(25, 20);
    game.consumption();
}

// 905013
card_actions["905013"] = (game) => {
    game.do_xuanming_requiem_fulu(30, 25);
    game.consumption();
}

// Crimson Star
card_actions["906001"] = (game) => {

}

// 906002
card_actions["906002"] = (game) => {

}

// 906003
card_actions["906003"] = (game) => {

}

// Nüwa Stone
card_actions["906011"] = (game) => {
    game.add_c_of_x(64, "max_hp");
    game.add_c_of_x(64, "hp");
    game.add_c_of_x(1, "nuwa_stone_stacks");
}

// 906012
card_actions["906012"] = (game) => {

}

// 906013
card_actions["906013"] = (game) => {

}

// Haotian Pagoda
card_actions["906021"] = (game) => {
    game.reduce_enemy_x_by_c_pct_enemy_y("qi", 50, "qi");
    game.reduce_enemy_x_by_c_pct_enemy_y("hp", 50, "hp");
    game.reduce_enemy_x_by_c_pct_enemy_y("max_hp", 50, "max_hp");
    game.add_enemy_c_of_x(4, "entangle");
}

// 906022
card_actions["906022"] = (game) => {

}

// 906023
card_actions["906023"] = (game) => {

}

// Fuxi Guqin
card_actions["906031"] = (game) => {
    game.trigger_next_enemy_card();
    game.add_enemy_c_of_x(1, "skip_next_card_stacks");
}

// 906032
card_actions["906032"] = (game) => {

}

// 906033
card_actions["906033"] = (game) => {

}

// Kongtong Seal
card_actions["906041"] = (game) => {
    game.add_c_of_x(5, "max_hp");
    game.add_c_of_x(5, "hp");
    game.add_c_of_x(2, "kongtong_seal_stacks");
    game.chase();
    game.consumption();
}

// 906042
card_actions["906042"] = (game) => {

}

// 906043
card_actions["906043"] = (game) => {

}

// Donghuang Zhong
card_actions["906051"] = (game) => {
    game.do_donghuang_zhong();
}

// 906052
card_actions["906052"] = (game) => {

}

// 906053
card_actions["906053"] = (game) => {

}

// Shennong Ding
card_actions["906061"] = (game) => {
    game.increase_idx_qi(0, 4);
    game.add_c_of_x("max_hp", 16);
    game.add_c_of_x("hp", 16);
}

// 906062
card_actions["906062"] = (game) => {

}

// 906063
card_actions["906063"] = (game) => {

}

// Spirit Fusion Pot
card_actions["906071"] = (game) => {
    game.add_enemy_c_of_x(4, "spirit_fusion_pot_stacks");
}

// 906072
card_actions["906072"] = (game) => {

}

// 906073
card_actions["906073"] = (game) => {

}

// Unrestrained Sword - Nebula Cloud
card_actions["913011"] = (game) => {
    game.atk(6);
    game.for_each_x_add_y("unrestrained_sword_count", "qi");
    game.for_each_x_add_c_y("unrestrained_sword_count", 1, "def");
    game.for_each_x_add_y("unrestrained_sword_count", "sword_intent");
}

// 913012
card_actions["913012"] = (game) => {
    game.atk(7);
    game.for_each_x_add_y("unrestrained_sword_count", "qi");
    game.for_each_x_add_c_y("unrestrained_sword_count", 2, "def");
    game.for_each_x_add_y("unrestrained_sword_count", "sword_intent");
}

// 913013
card_actions["913013"] = (game) => {
    game.atk(8);
    game.for_each_x_add_y("unrestrained_sword_count", "qi");
    game.for_each_x_add_c_y("unrestrained_sword_count", 3, "def");
    game.for_each_x_add_y("unrestrained_sword_count", "sword_intent");
}

// Spiritstat Tune
card_actions["913021"] = (game) => {
    game.continuous();
    game.add_c_of_x(3, "spiritstat_tune_stacks");
}

// 913022
card_actions["913022"] = (game) => {
    game.continuous();
    game.add_c_of_x(4, "spiritstat_tune_stacks");
}

// 913023
card_actions["913023"] = (game) => {
    game.continuous();
    game.add_c_of_x(5, "spiritstat_tune_stacks");
}

// Unrestrained Sword - Cat Claw
card_actions["914011"] = (game) => {
    game.for_each_x_add_y("unrestrained_sword_count", "bonus_rep_amt");
    game.add_c_of_x(1, "unrestrained_sword_count");
    for (let i = 0; i < 2 + game.players[0].bonus_rep_amt; i++) {
        game.increase_idx_x_by_c(0, "ignore_def", 1);
        game.atk(5);
    }
}

// 914012
card_actions["914012"] = (game) => {
    game.for_each_x_add_y("unrestrained_sword_count", "bonus_rep_amt");
    game.add_c_of_x(1, "unrestrained_sword_count");
    for (let i = 0; i < 2 + game.players[0].bonus_rep_amt; i++) {
        game.increase_idx_x_by_c(0, "ignore_def", 1);
        game.atk(7);
    }
}

// 914013
card_actions["914013"] = (game) => {
    game.for_each_x_add_y("unrestrained_sword_count", "bonus_rep_amt");
    game.add_c_of_x(1, "unrestrained_sword_count");
    for (let i = 0; i < 2 + game.players[0].bonus_rep_amt; i++) {
        game.increase_idx_x_by_c(0, "ignore_def", 1);
        game.atk(9);
    }
}

// Contemplate Spirits Vitality Rhythm
card_actions["914021"] = (game) => {
    game.increase_idx_x_by_c(0, "sword_intent", 3);
    game.add_c_of_x(18, "max_hp");
    game.for_each_x_add_c_y("sword_intent", 2, "hp");
}

// 914022
card_actions["914022"] = (game) => {
    game.increase_idx_x_by_c(0, "sword_intent", 4);
    game.add_c_of_x(24, "max_hp");
    game.for_each_x_add_c_y("sword_intent", 2, "hp");
}

// 914023
card_actions["914023"] = (game) => {
    game.increase_idx_x_by_c(0, "sword_intent", 5);
    game.add_c_of_x(30, "max_hp");
    game.for_each_x_add_c_y("sword_intent", 2, "hp");
}

// Cloud Sword - Clarity
card_actions["914031"] = (game) => {
    for (let i = 0; i < 2; i++) {
        game.atk(4);
    }
    if (game.if_cloud_hit()) {
        game.add_enemy_c_of_x(2, "weaken");
    }
}

// 914032
card_actions["914032"] = (game) => {
    for (let i = 0; i < 3; i++) {
        game.atk(4);
    }
    if (game.if_cloud_hit()) {
        game.add_enemy_c_of_x(2, "weaken");
    }
}

// 914033
card_actions["914033"] = (game) => {
    for (let i = 0; i < 4; i++) {
        game.atk(4);
    }
    if (game.if_cloud_hit()) {
        game.add_enemy_c_of_x(2, "weaken");
    }
}

// Cloud Sword - Endless
card_actions["914041"] = (game) => {
    game.continuous();
    game.add_c_of_x(2, "cloud_sword_endless_stacks");
}

// 914042
card_actions["914042"] = (game) => {
    game.continuous();
    game.add_c_of_x(3, "cloud_sword_endless_stacks");
}

// 914043
card_actions["914043"] = (game) => {
    game.continuous();
    game.add_c_of_x(4, "cloud_sword_endless_stacks");
}

// Sword Spirit Sunflower
card_actions["914051"] = (game) => {
    game.qi(2 + game.spirit_sword_deck_cound(3));
}

// 914052
card_actions["914052"] = (game) => {
    game.qi(3 + game.spirit_sword_deck_cound(3));
}

// 914053
card_actions["914053"] = (game) => {
    game.qi(4 + game.spirit_sword_deck_cound(3));
}

// Cloud Sword - Dragon Spring
card_actions["915011"] = (game) => {
    game.do_cloud_sword_dragon_spring(2);
}

// 915012
card_actions["915012"] = (game) => {
    game.do_cloud_sword_dragon_spring(3);
}

// 915013
card_actions["915013"] = (game) => {
    game.do_cloud_sword_dragon_spring(4);
}

// Cloud Sword - Flying Snow Shade
card_actions["915021"] = (game) => {
    if (game.if_cloud_hit()) {
        game.for_each_x_add_c_y("cloud_sword_chain_count", 1, "bonus_rep_amt");
    }
    for (let i = 0; i < 1 + game.players[0].bonus_rep_amt; i++) {
        game.atk(2);
    }
    if (game.if_cloud_hit()) {
        game.for_each_x_add_y("cloud_sword_chain_count", "qi");
    }
}

// 915022
card_actions["915022"] = (game) => {
    if (game.if_cloud_hit()) {
        game.for_each_x_add_c_y("cloud_sword_chain_count", 1, "bonus_rep_amt");
    }
    for (let i = 0; i < 1 + game.players[0].bonus_rep_amt; i++) {
        game.atk(3);
    }
    if (game.if_cloud_hit()) {
        game.for_each_x_add_y("cloud_sword_chain_count", "qi");
    }
}

// 915023
card_actions["915023"] = (game) => {
    if (game.if_cloud_hit()) {
        game.for_each_x_add_c_y("cloud_sword_chain_count", 1, "bonus_rep_amt");
    }
    for (let i = 0; i < 1 + game.players[0].bonus_rep_amt; i++) {
        game.atk(4);
    }
    if (game.if_cloud_hit()) {
        game.for_each_x_add_y("cloud_sword_chain_count", "qi");
    }
}

// CentiBird Delicate Bracelet
card_actions["915031"] = (game) => {
    game.add_c_of_x(1, "guard_up");
    game.add_c_of_x(1, "centibird_spirit_sword_rhythm_stacks");
    game.chase();
}

// 915032
card_actions["915032"] = (game) => {
    game.increase_idx_qi(0, 2);
    game.add_c_of_x(1, "guard_up");
    game.add_c_of_x(1, "centibird_spirit_sword_rhythm_stacks");
    game.chase();
}

// 915033
card_actions["915033"] = (game) => {
    game.increase_idx_qi(0, 4);
    game.add_c_of_x(1, "guard_up");
    game.add_c_of_x(1, "centibird_spirit_sword_rhythm_stacks");
    game.chase();
}

// Clear Heart Sword Formation
card_actions["915041"] = (game) => {
    game.do_clear_heart_sword_formation(8);
}

// 915042
card_actions["915042"] = (game) => {
    game.do_clear_heart_sword_formation(11);
}

// 915043
card_actions["915043"] = (game) => {
    game.do_clear_heart_sword_formation(14);
}

// Cloud Sword - Starry Sky
card_actions["915051"] = (game) => {
    game.increase_idx_def(0, 4);
    game.chase();
    if (game.if_cloud_hit()) {
        game.for_each_x_add_c_y("qi", 1, "def");
    }
}

// 915052
card_actions["915052"] = (game) => {
    game.increase_idx_def(0, 10);
    game.chase();
    if (game.if_cloud_hit()) {
        game.for_each_x_add_c_y("qi", 1, "def");
    }
}

// 915053
card_actions["915053"] = (game) => {
    game.increase_idx_def(0, 16);
    game.chase();
    if (game.if_cloud_hit()) {
        game.for_each_x_add_c_y("qi", 1, "def");
    }
}

// Xuanming Sword Intent Mantra
card_actions["915061"] = (game) => {
    game.increase_idx_x_by_c(0, "sword_intent", 6);
    game.for_each_x_add_c_pct_y("hp_lost", 16.666667, "sword_intent");
}

// 915062
card_actions["915062"] = (game) => {
    game.increase_idx_x_by_c(0, "sword_intent", 8);
    game.for_each_x_add_c_pct_y("hp_lost", 16.666667, "sword_intent");
}

// 915063
card_actions["915063"] = (game) => {
    game.increase_idx_x_by_c(0, "sword_intent", 10);
    game.for_each_x_add_c_pct_y("hp_lost", 16.666667, "sword_intent");
}

// Shen Jian Ao Zhou
card_actions["915071"] = (game) => {
    game.add_c_of_x(5, "bonus_sword_intent_multiplier");
    let atk_amt = 12;
    atk_amt += 3 * game.players[0].increase_atk;
    game.smash_def();
    game.atk(atk_amt);
}

// 915072
card_actions["915072"] = (game) => {

}

// 915073
card_actions["915073"] = (game) => {

}

// Unrestrained Sword - Divine
card_actions["915081"] = (game) => {
    game.increase_idx_def(0, 4);
    game.increase_idx_hp(0, 4);
    game.trigger_random_unrestrained_card(1);
}

// 915082
card_actions["915082"] = (game) => {
    game.increase_idx_def(0, 6);
    game.increase_idx_hp(0, 6);
    game.trigger_random_unrestrained_card(2);
}

// 915083
card_actions["915083"] = (game) => {
    game.increase_idx_def(0, 8);
    game.increase_idx_hp(0, 8);
    game.trigger_random_unrestrained_card(3);
}

// Heavenly Will - Earth Evil
card_actions["915091"] = (game) => {
    game.increase_idx_qi(0, 2);
    game.add_c_of_x(1, "heavenly_will_earth_evil_stacks");
}

// 915092
card_actions["915092"] = (game) => {
    game.increase_idx_qi(0, 4);
    game.add_c_of_x(1, "heavenly_will_earth_evil_stacks");
}

// 915093
card_actions["915093"] = (game) => {
    game.increase_idx_qi(0, 6);
    game.add_c_of_x(1, "heavenly_will_earth_evil_stacks");
}

// Xuan-Yuan Sword
card_actions["916011"] = (game) => {
    game.increase_idx_x_by_c(0, "ignore_def", 1);
    game.add_c_of_x(1, "ignore_guard_up");
    game.atk(120);
}

// 916012
card_actions["916012"] = (game) => {

}

// 916013
card_actions["916013"] = (game) => {

}

// Astral Move - Extend
card_actions["922011"] = (game) => {
    game.atk(4);
    game.increase_idx_qi(0, 1);
    game.become_star_point(3);
}

// 922012
card_actions["922012"] = (game) => {
    game.atk(6);
    game.increase_idx_qi(0, 1);
    game.become_star_point(4);
}

// 922013
card_actions["922013"] = (game) => {
    game.atk(8);
    game.increase_idx_qi(0, 1);
    game.become_star_point(5);
}

// Traces Revitalized
card_actions["923011"] = (game) => {
    game.atk(4 + Math.floor(game.players[0].hp_gained * 25 / 100));
    game.increase_idx_qi(0, 1);
    if (game.if_post_action()) {
        game.chase();
    }
}

// 923012
card_actions["923012"] = (game) => {
    game.atk(4 + Math.floor(game.players[0].hp_gained * 25 / 100));
    game.increase_idx_qi(0, 1);
    game.chase();
    if (game.if_post_action()) {
        game.increase_idx_hp(0, 1);
    }
}

// 923013
card_actions["923013"] = (game) => {
    game.atk(4 + Math.floor(game.players[0].hp_gained * 33.333334 / 100));
    game.increase_idx_qi(0, 1);
    game.chase();
    if (game.if_post_action()) {
        game.increase_idx_hp(0, 3);
    }
}

// Suspicious Flame Flutter
card_actions["924011"] = (game) => {
    game.add_enemy_c_of_x(4, "internal_injury");
    for (let i = 0; i < 3; i++) {
        if (game.if_c_pct(30)) {
            game.do_internal_injury(1);
        }
    }
}

// 924012
card_actions["924012"] = (game) => {
    game.add_enemy_c_of_x(5, "internal_injury");
    for (let i = 0; i < 3; i++) {
        if (game.if_c_pct(30)) {
            game.do_internal_injury(1);
        }
    }
}

// 924013
card_actions["924013"] = (game) => {
    game.add_enemy_c_of_x(6, "internal_injury");
    for (let i = 0; i < 3; i++) {
        if (game.if_c_pct(30)) {
            game.do_internal_injury(1);
        }
    }
}

// Thousand Star Explosion
card_actions["924021"] = (game) => {
    game.do_thousand_star_explosion(4);
}

// 924022
card_actions["924022"] = (game) => {
    game.do_thousand_star_explosion(5);
}

// 924023
card_actions["924023"] = (game) => {
    game.do_thousand_star_explosion(6);
}

// Thunderbolt Tune
card_actions["924031"] = (game) => {
    game.add_c_of_x(10, "max_hp");
    game.increase_idx_hp(0, 10);
    game.continuous();
    game.add_c_of_x(10, "thunderbolt_tune_stacks");
    game.add_enemy_c_of_x(10, "thunderbolt_tune_stacks");
}

// 924032
card_actions["924032"] = (game) => {
    game.add_c_of_x(15, "max_hp");
    game.increase_idx_hp(0, 15);
    game.continuous();
    game.add_c_of_x(12, "thunderbolt_tune_stacks");
    game.add_enemy_c_of_x(12, "thunderbolt_tune_stacks");
}

// 924033
card_actions["924033"] = (game) => {
    game.add_c_of_x(20, "max_hp");
    game.increase_idx_hp(0, 20);
    game.continuous();
    game.add_c_of_x(14, "thunderbolt_tune_stacks");
    game.add_enemy_c_of_x(14, "thunderbolt_tune_stacks");
}

// Ultimate Polaris Hexagram Base
card_actions["925011"] = (game) => {
    game.become_star_point(0);
    game.continuous();
    game.add_c_of_x(1, "ultimate_polaris_hexagram_base_stacks");
}

// 925012
card_actions["925012"] = (game) => {
    game.become_star_point(2);
    game.continuous();
    game.add_c_of_x(1, "ultimate_polaris_hexagram_base_stacks");
}

// 925013
card_actions["925013"] = (game) => {
    game.become_star_point(4);
    game.continuous();
    game.add_c_of_x(1, "ultimate_polaris_hexagram_base_stacks");
}

// Star Moon Hexagram Fan
card_actions["925021"] = (game) => {
    game.continuous();
    game.add_c_of_x(3, "star_moon_hexagram_fan_stacks");
}

// 925022
card_actions["925022"] = (game) => {
    game.add_c_of_x(1, "star_power");
    game.continuous();
    game.add_c_of_x(3, "star_moon_hexagram_fan_stacks");
}

// 925023
card_actions["925023"] = (game) => {
    game.add_c_of_x(2, "star_power");
    game.continuous();
    game.add_c_of_x(3, "star_moon_hexagram_fan_stacks");
}

// Great Galaxy
card_actions["925031"] = (game) => {
    game.exhaust_x_to_add_c_y("qi", 2, "bonus_rep_amt");
    game.exhaust_x_to_add_c_y("star_power", 4, "bonus_rep_amt");
    game.for_each_x_add_y("bonus_rep_amt", "max_hp");
    game.for_each_x_add_y("bonus_rep_amt", "hp");
    game.add_c_of_x(1, "chase_if_hp_gained");
    if (game.if_post_action()) {
        game.increase_idx_qi(0, 2);
    }
}

// 925032
card_actions["925032"] = (game) => {
    game.exhaust_x_to_add_c_y("qi", 2, "bonus_rep_amt");
    game.exhaust_x_to_add_c_y("star_power", 4, "bonus_rep_amt");
    game.for_each_x_add_y("bonus_rep_amt", "max_hp");
    game.for_each_x_add_y("bonus_rep_amt", "hp");
    game.add_c_of_x(1, "chase_if_hp_gained");
    if (game.if_post_action()) {
        game.increase_idx_qi(0, 4);
    }
}

// 925033
card_actions["925033"] = (game) => {
    game.exhaust_x_to_add_c_y("qi", 2, "bonus_rep_amt");
    game.exhaust_x_to_add_c_y("star_power", 4, "bonus_rep_amt");
    game.for_each_x_add_y("bonus_rep_amt", "max_hp");
    game.for_each_x_add_y("bonus_rep_amt", "hp");
    game.add_c_of_x(1, "chase_if_hp_gained");
    if (game.if_post_action()) {
        game.increase_idx_qi(0, 6);
    }
}

// Xuanming Thundercloud Tribulation
card_actions["925041"] = (game) => {
    game.do_xuanming_thundercloud_tribulation(9);
}

// 925042
card_actions["925042"] = (game) => {
    game.do_xuanming_thundercloud_tribulation(10);
}

// 925043
card_actions["925043"] = (game) => {
    game.do_xuanming_thundercloud_tribulation(11);
}

// Die Ling Shen Ying
card_actions["925051"] = (game) => {
    for (let i = 0; i < 2; i++) {
        game.atk(5);
    }
    game.reverse_card_play_direction();
    if (game.if_c_pct(10)) {
        game.chase();
    }
}

// 925052
card_actions["925052"] = (game) => {

}

// 925053
card_actions["925053"] = (game) => {

}

// Spiritual Hunter
card_actions["925061"] = (game) => {

}

// 925062
card_actions["925062"] = (game) => {

}

// 925063
card_actions["925063"] = (game) => {

}

// Hexagrams Generating Evils
card_actions["925071"] = (game) => {

}

// 925072
card_actions["925072"] = (game) => {

}

// 925073
card_actions["925073"] = (game) => {

}

// Entangling Thornbush
card_actions["925081"] = (game) => {

}

// 925082
card_actions["925082"] = (game) => {

}

// 925083
card_actions["925083"] = (game) => {

}

// Astral Move - Jump
card_actions["925091"] = (game) => {
    for (let i = 0; i < 2; i++) {
        game.atk(2);
    }
    game.chase();
    if (game.if_star_point()) {
        game.add_c_of_x(2, "astral_move_jump_stacks");
    }
}

// 925092
card_actions["925092"] = (game) => {
    for (let i = 0; i < 2; i++) {
        game.atk(2);
    }
    game.chase();
    if (game.if_star_point()) {
        game.add_c_of_x(3, "astral_move_jump_stacks");
    }
}

// 925093
card_actions["925093"] = (game) => {
    for (let i = 0; i < 2; i++) {
        game.atk(3);
    }
    game.chase();
    if (game.if_star_point()) {
        game.add_c_of_x(4, "astral_move_jump_stacks");
    }
}

// Heavenly Maiden White Jade Ring
card_actions["926011"] = (game) => {
    game.add_c_of_x(1, "heavenly_maiden_white_jade_ring_stacks");
}

// 926012
card_actions["926012"] = (game) => {

}

// 926013
card_actions["926013"] = (game) => {

}

// Cosmos Fleche
card_actions["932011"] = (game) => {
    game.atk(7);
    game.activate_next_slots(2);
}

// 932012
card_actions["932012"] = (game) => {
    game.atk(11);
    game.activate_next_slots(2);
}

// 932013
card_actions["932013"] = (game) => {
    game.atk(15);
    game.activate_next_slots(2);
}

// Kun Wu Molten Ring
card_actions["933011"] = (game) => {
    game.activate_fire_spirit();
    game.activate_earth_spirit();
    game.continuous();
    game.add_c_of_x(2, "kun_wu_molten_ring_stacks");
}

// 933012
card_actions["933012"] = (game) => {
    game.activate_fire_spirit();
    game.activate_earth_spirit();
    game.continuous();
    game.add_c_of_x(3, "kun_wu_molten_ring_stacks");
}

// 933013
card_actions["933013"] = (game) => {
    game.activate_fire_spirit();
    game.activate_earth_spirit();
    game.continuous();
    game.add_c_of_x(4, "kun_wu_molten_ring_stacks");
}

// Harmony of Water and Fire
card_actions["934011"] = (game) => {
    game.add_c_of_x(1, "force_of_water");
    game.activate_water_spirit();
    game.activate_fire_spirit();
    game.chase();
}

// 934012
card_actions["934012"] = (game) => {
    game.add_c_of_x(2, "force_of_water");
    game.activate_water_spirit();
    game.activate_fire_spirit();
    game.chase();
}

// 934013
card_actions["934013"] = (game) => {
    game.add_c_of_x(3, "force_of_water");
    game.activate_water_spirit();
    game.activate_fire_spirit();
    game.chase();
}

// Metal Spirit - Meteor
card_actions["934021"] = (game) => {
    game.atk(4 + Math.floor(game.players[0].def_lost * 12.5 / 100));
    if (game.if_metal_spirit()) {
        game.chase();
    }
}

// 934022
card_actions["934022"] = (game) => {
    game.atk(6 + Math.floor(game.players[0].def_lost * 14.285715 / 100));
    if (game.if_metal_spirit()) {
        game.chase();
    }
}

// 934023
card_actions["934023"] = (game) => {
    game.atk(8 + Math.floor(game.players[0].def_lost * 16.666667 / 100));
    if (game.if_metal_spirit()) {
        game.chase();
    }
}

// Heavenly Marrow Gourd
card_actions["935011"] = (game) => {
    game.increase_idx_qi(0, 1);
    game.increase_idx_hp(0, 3);
    game.add_c_of_x(2, "heavenly_marrow_gourd_stacks");
}

// 935012
card_actions["935012"] = (game) => {
    game.increase_idx_qi(0, 2);
    game.increase_idx_hp(0, 5);
    game.add_c_of_x(2, "heavenly_marrow_gourd_stacks");
}

// 935013
card_actions["935013"] = (game) => {
    game.increase_idx_qi(0, 3);
    game.increase_idx_hp(0, 7);
    game.add_c_of_x(2, "heavenly_marrow_gourd_stacks");
}

// Ultimate Overcome Formation
card_actions["935021"] = (game) => {
    game.continuous();
    game.add_c_of_x(2, "ultimate_overcome_formation_stacks");
}

// 935022
card_actions["935022"] = (game) => {
    game.continuous();
    game.add_c_of_x(3, "ultimate_overcome_formation_stacks");
}

// 935023
card_actions["935023"] = (game) => {
    game.continuous();
    game.add_c_of_x(4, "ultimate_overcome_formation_stacks");
}

// Wood Spirit - All Things Grow
card_actions["935031"] = (game) => {
    game.add_c_of_x(3, "max_hp");
    game.increase_idx_hp(0, 3);
    if (game.if_wood_spirit()) {
        game.chase();
    }
    game.continuous();
    game.add_c_of_x(1, "wood_spirit_all_things_grow_stacks");
}

// 935032
card_actions["935032"] = (game) => {
    game.add_c_of_x(9, "max_hp");
    game.increase_idx_hp(0, 9);
    if (game.if_wood_spirit()) {
        game.chase();
    }
    game.continuous();
    game.add_c_of_x(1, "wood_spirit_all_things_grow_stacks");
}

// 935033
card_actions["935033"] = (game) => {
    game.add_c_of_x(15, "max_hp");
    game.increase_idx_hp(0, 15);
    if (game.if_wood_spirit()) {
        game.chase();
    }
    game.continuous();
    game.add_c_of_x(1, "wood_spirit_all_things_grow_stacks");
}

// Xuanming Heavenly Essence Destruction
card_actions["935041"] = (game) => {
    game.atk(10 + Math.floor(game.players[0].hp_lost * 20 / 100));
    if (game.get_n_different_five_elements(0) === 1) {
        game.chase();
    }
}

// 935042
card_actions["935042"] = (game) => {
    game.atk(15 + Math.floor(game.players[0].hp_lost * 20 / 100));
    if (game.get_n_different_five_elements(0) === 1) {
        game.chase();
    }
}

// 935043
card_actions["935043"] = (game) => {
    game.atk(20 + Math.floor(game.players[0].hp_lost * 20 / 100));
    if (game.get_n_different_five_elements(0) === 1) {
        game.chase();
    }
}

// Pi Yun Zhui Yue
card_actions["935051"] = (game) => {
    let atk_amt = 2;
    atk_amt += game.get_n_different_five_elements(0) * 2;
    for (let i = 0; i < 3; i++) {
        game.atk(atk_amt);
    }
}

// 935052
card_actions["935052"] = (game) => {

}

// 935053
card_actions["935053"] = (game) => {

}

// Heavenly Marrow Dance Tune
card_actions["935061"] = (game) => {
    game.continuous();
    game.add_c_of_x(2, "increase_atk");
    game.add_enemy_c_of_x(2, "increase_atk");
    game.add_c_of_x(1, "heavenly_marrow_dance_tune_stacks");
    game.add_enemy_c_of_x(1, "heavenly_marrow_dance_tune_stacks");
}

// 935052
card_actions["935062"] = (game) => {
    game.continuous();
    game.add_c_of_x(3, "increase_atk");
    game.add_enemy_c_of_x(3, "increase_atk");
    game.add_c_of_x(1, "heavenly_marrow_dance_tune_stacks");
    game.add_enemy_c_of_x(1, "heavenly_marrow_dance_tune_stacks");
}

// 935053
card_actions["935063"] = (game) => {
    game.continuous();
    game.add_c_of_x(4, "increase_atk");
    game.add_enemy_c_of_x(4, "increase_atk");
    game.add_c_of_x(1, "heavenly_marrow_dance_tune_stacks");
    game.add_enemy_c_of_x(1, "heavenly_marrow_dance_tune_stacks");
}

// Cosmos Brush
card_actions["935071"] = (game) => {
    game.increase_idx_qi(0, 2);
    game.increase_idx_def(0, 2);
    game.activate_next_slots(1);
    game.chase();
}

// 935062
card_actions["935072"] = (game) => {
    game.increase_idx_qi(0, 3);
    game.increase_idx_def(0, 4);
    game.activate_next_slots(1);
    game.chase();
}

// 935063
card_actions["935073"] = (game) => {
    game.increase_idx_qi(0, 4);
    game.increase_idx_def(0, 6);
    game.activate_next_slots(1);
    game.chase();
}

// Kunlun Mirror
card_actions["936011"] = (game) => {
    if (game.players[0].is_triggering_kunlun_mirror <= 0) {
        game.add_c_of_x(1, "is_triggering_kunlun_mirror");
        game.activate_wood_spirit();
        game.activate_fire_spirit();
        game.activate_earth_spirit();
        game.activate_metal_spirit();
        game.activate_water_spirit();
        game.trigger_next_card();
        game.prevent_anti_chase();
        game.chase();
        game.reduce_c_of_x(1, "is_triggering_kunlun_mirror");
    }
}

// 936012
card_actions["936012"] = (game) => {

}

// 936013
card_actions["936013"] = (game) => {

}

// Star Sky Forge Bone
card_actions["943011"] = (game) => {
    game.physique(3);
    game.add_c_of_x(2, "force");
    game.for_each_x_add_c_pct_y_up_to_d("physique", 16.666667, "star_sky_forge_bone_stacks", 5);
}

// 943012
card_actions["943012"] = (game) => {
    game.physique(4);
    game.add_c_of_x(2, "force");
    game.for_each_x_add_c_pct_y_up_to_d("physique", 16.666667, "star_sky_forge_bone_stacks", 8);
}

// 943013
card_actions["943013"] = (game) => {
    game.physique(5);
    game.add_c_of_x(2, "force");
    game.for_each_x_add_c_pct_y_up_to_d("physique", 16.666667, "star_sky_forge_bone_stacks", 11);
}

// Styx Night Footwork
card_actions["944011"] = (game) => {
    game.add_c_of_x(3, "styx");
    game.add_c_of_x(3, "agility");
    game.continuous();
    game.add_c_of_x(1, "styx_night_footwork_stacks");
}

// 944012
card_actions["944012"] = (game) => {
    game.add_c_of_x(4, "styx");
    game.add_c_of_x(4, "agility");
    game.continuous();
    game.add_c_of_x(1, "styx_night_footwork_stacks");
}

// 944013
card_actions["944013"] = (game) => {
    game.add_c_of_x(5, "styx");
    game.add_c_of_x(5, "agility");
    game.continuous();
    game.add_c_of_x(1, "styx_night_footwork_stacks");
}

// Crash Fist - Return to Xuan
card_actions["944021"] = (game) => {
    game.increase_idx_hp(0, 15);
    game.add_c_of_x(4, "internal_injury");
    game.add_c_of_x(4, "regen");
    game.continuous();
    game.add_c_of_x(1, "crash_fist_return_to_xuan_stacks");
}

// 944022
card_actions["944022"] = (game) => {
    game.increase_idx_hp(0, 20);
    game.add_c_of_x(6, "internal_injury");
    game.add_c_of_x(6, "regen");
    game.continuous();
    game.add_c_of_x(1, "crash_fist_return_to_xuan_stacks");
}

// 944023
card_actions["944023"] = (game) => {
    game.increase_idx_hp(0, 25);
    game.add_c_of_x(8, "internal_injury");
    game.add_c_of_x(8, "regen");
    game.continuous();
    game.add_c_of_x(1, "crash_fist_return_to_xuan_stacks");
}

// Crash Fist - Star Seizing
card_actions["944031"] = (game) => {
    game.add_c_of_x(1, "this_card_crash_fist_star_seizing_stacks");
    game.add_c_of_x(1, "crash_fist_star_seizing_stacks");
    game.atk(12);
}

// 944032
card_actions["944032"] = (game) => {
    game.add_c_of_x(1, "this_card_crash_fist_star_seizing_stacks");
    game.add_c_of_x(1, "crash_fist_star_seizing_stacks");
    game.atk(16);
}

// 944033
card_actions["944033"] = (game) => {
    game.add_c_of_x(1, "this_card_crash_fist_star_seizing_stacks");
    game.add_c_of_x(1, "crash_fist_star_seizing_stacks");
    game.atk(20);
}

// Cloud Footwork
card_actions["944041"] = (game) => {
    game.increase_idx_qi(0, 1);
    game.increase_idx_x_by_c(0, "agility", 10);
    game.increase_idx_x_by_c(0, "ignore_def", 1);
}

// 944042
card_actions["944042"] = (game) => {
    game.increase_idx_qi(0, 2);
    game.increase_idx_x_by_c(0, "agility", 10);
    game.increase_idx_x_by_c(0, "ignore_def", 2);
}

// 944043
card_actions["944043"] = (game) => {
    game.increase_idx_qi(0, 3);
    game.increase_idx_x_by_c(0, "agility", 10);
    game.increase_idx_x_by_c(0, "ignore_def", 3);
}

// Spiritage And Exercise
card_actions["944051"] = (game) => {
    game.increase_idx_qi(0, 3);
    game.increase_idx_hp(0, 3);
    game.for_each_x_up_to_c_add_y("qi", 10, "physique");
}

// 944052
card_actions["944052"] = (game) => {
    game.increase_idx_qi(0, 4);
    game.increase_idx_hp(0, 4);
    game.for_each_x_up_to_c_add_y("qi", 15, "physique");
}

// 944053
card_actions["944053"] = (game) => {
    game.increase_idx_qi(0, 5);
    game.increase_idx_hp(0, 5);
    game.for_each_x_up_to_c_add_y("qi", 20, "physique");
}

// Unceasing Universe
card_actions["945011"] = (game) => {
    game.atk(9);
    game.physique(3);
    game.increase_idx_hp(0, 3);
    game.add_c_of_x(3, "force");
    game.add_c_of_x(10, "agility");
}

// 945012
card_actions["945012"] = (game) => {
    game.atk(9);
    game.physique(4);
    game.increase_idx_hp(0, 4);
    game.add_c_of_x(4, "force");
    game.add_c_of_x(10, "agility");
}

// 945013
card_actions["945013"] = (game) => {
    game.atk(9);
    game.physique(5);
    game.increase_idx_hp(0, 5);
    game.add_c_of_x(5, "force");
    game.add_c_of_x(10, "agility");
}

// Soul Overwhelming Palm
card_actions["945021"] = (game) => {
    game.do_soul_overwhelming_palm(2, 8, 2);
}

// 945022
card_actions["945022"] = (game) => {
    game.do_soul_overwhelming_palm(3, 10, 2);
}

// 945023
card_actions["945023"] = (game) => {
    game.do_soul_overwhelming_palm(4, 12, 2);
}

// Xuanming Boundary-Breaking Palms
card_actions["945031"] = (game) => {
    game.for_each_x_add_c_pct_y("hp_lost", 3.333334, "bonus_rep_amt");
    for (let i = 0; i < 2 + game.players[0].bonus_rep_amt; i++) {
        game.atk(4);
    }
}

// 945032
card_actions["945032"] = (game) => {
    game.for_each_x_add_c_pct_y("hp_lost", 3.703704, "bonus_rep_amt");
    for (let i = 0; i < 2 + game.players[0].bonus_rep_amt; i++) {
        game.atk(5);
    }
}

// 945033
card_actions["945033"] = (game) => {
    game.for_each_x_add_c_pct_y("hp_lost", 4, "bonus_rep_amt");
    for (let i = 0; i < 2 + game.players[0].bonus_rep_amt; i++) {
        game.atk(6);
    }
}

// Jiu Qi Po Xiao
card_actions["945041"] = (game) => {
    const force_amt = game.exhaust_x("force");
    const qi_amt = game.exhaust_x("qi");
    const agility_amt = game.exhaust_x("agility");
    game.atk(10 + 4 * force_amt + 3 * qi_amt + 2 * agility_amt);
}

// 945042
card_actions["945042"] = (game) => {

}

// 945043
card_actions["945043"] = (game) => {

}

// Pangu Axe
card_actions["946011"] = (game) => {
    game.atk(30);
    game.add_enemy_c_of_x(20, "pangu_axe_stacks");
}

// 946012
card_actions["946012"] = (game) => {

}

// 946013
card_actions["946013"] = (game) => {

}


