import { translateText } from "../Utils";

const RULE_CHANGE_LABEL_KEYS: Record<string, string> = {
  bots: "game_settings.bots",
  customAllianceDuration: "game_settings.custom_alliances",
  difficulty: "difficulty.difficulty",
  disabledUnits: "private_lobby.disabled_units",
  disableAlliances: "public_game_modifier.disable_alliances_label",
  donateGold: "host_modal.donate_gold",
  donateTroops: "host_modal.donate_troops",
  doomsdayClock: "game_settings.doomsday_clock",
  gameMap: "map.map",
  gameMapSize: "private_lobby.map_size",
  gameMode: "host_modal.mode",
  goldMultiplier: "game_settings.gold_multiplier",
  hostCheats: "private_lobby.host_cheats",
  infiniteGold: "game_settings.infinite_gold",
  infiniteTroops: "game_settings.infinite_troops",
  instantBuild: "game_settings.instant_build",
  maxTimerValue: "game_settings.max_timer",
  nations: "game_settings.nations",
  playerTeams: "host_modal.team_count",
  randomSpawn: "game_settings.random_spawn",
  spawnImmunityDuration: "private_lobby.pvp_immunity",
  startDelay: "host_modal.start_delay",
  startingGold: "private_lobby.starting_gold",
  waterNukes: "game_settings.water_nukes",
};

export function formatLobbyConfigReviewChanges(
  changes: readonly string[],
): string[] {
  return changes.map((change) => {
    const label = translateText(
      RULE_CHANGE_LABEL_KEYS[change] ?? "private_lobby.game_rule",
    );
    return label.replace(/[:\s]+$/, "");
  });
}
