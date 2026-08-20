import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GameType } from "../../src/core/game/Game";
import { Client } from "../../src/server/Client";
import {
  GameServer,
  PRIVATE_LOBBY_CONFIG_REVIEW_MS,
} from "../../src/server/GameServer";

const CREATOR = "creator-persistent-id";
const GUEST = "guest-persistent-id";

function makeMockWs() {
  const handlers: Record<string, (...args: any[]) => any> = {};
  return {
    on: (event: string, handler: (...args: any[]) => any) => {
      handlers[event] = handler;
    },
    removeAllListeners: vi.fn(),
    send: vi.fn(),
    close: vi.fn(),
    readyState: 1,
  };
}

function makeClient(clientID: string, persistentID: string) {
  const ws = makeMockWs();
  return new Client(
    clientID,
    persistentID,
    null,
    null,
    undefined,
    "127.0.0.1",
    clientID,
    null,
    ws as any,
    undefined,
    undefined,
    [],
  );
}

describe("private lobby rule-change review", () => {
  const logger: any = {
    child: vi.fn().mockReturnThis(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  };
  const host = {
    clientID: "host-client",
    isLobbyCreator: true,
    isAdmin: false,
    isAdminBot: false,
  };

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00.000Z"));
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  function makeGame(config: Record<string, unknown> = {}) {
    return new GameServer(
      "test-game",
      logger,
      Date.now(),
      {
        gameType: GameType.Private,
        bots: 1,
        startDelay: 0,
        ...config,
      } as any,
      CREATOR,
    );
  }

  function joinHostAndGuest(game: GameServer) {
    game.joinClient(makeClient("host-client", CREATOR));
    game.joinClient(makeClient("guest-client", GUEST));
  }

  function updateRules(game: GameServer, config: Record<string, unknown>) {
    return game.handleIntent(
      { type: "update_game_config", config } as any,
      host,
    );
  }

  it("enforces the review window even when the host uses an immediate start", () => {
    const game = makeGame();
    joinHostAndGuest(game);
    const now = Date.now();

    expect(updateRules(game, { bots: 2 }).status).toBe(200);
    expect(game.gameInfo().configReviewUntil).toBe(
      now + PRIVATE_LOBBY_CONFIG_REVIEW_MS,
    );
    expect(game.gameInfo().configReviewChanges).toEqual(["bots"]);

    expect(
      game.handleIntent({ type: "toggle_game_start_timer" } as any, host)
        .status,
    ).toBe(200);
    expect(game.gameInfo().startsAt).toBe(
      now + PRIVATE_LOBBY_CONFIG_REVIEW_MS,
    );
  });

  it("extends an existing countdown and restarts the window for each change", () => {
    const game = makeGame({ startDelay: 1 });
    joinHostAndGuest(game);

    expect(
      game.handleIntent({ type: "toggle_game_start_timer" } as any, host)
        .status,
    ).toBe(200);
    expect(game.gameInfo().startsAt).toBe(Date.now() + 1_000);

    expect(updateRules(game, { bots: 2 }).status).toBe(200);
    expect(game.gameInfo().startsAt).toBe(
      Date.now() + PRIVATE_LOBBY_CONFIG_REVIEW_MS,
    );

    vi.setSystemTime(Date.now() + 10_000);
    expect(updateRules(game, { instantBuild: true }).status).toBe(200);
    expect(game.gameInfo().configReviewUntil).toBe(
      Date.now() + PRIVATE_LOBBY_CONFIG_REVIEW_MS,
    );
    expect(game.gameInfo().configReviewChanges).toEqual([
      "bots",
      "instantBuild",
    ]);
  });

  it("does not add a review window for a solo lobby or a cosmetic update", () => {
    const solo = makeGame();
    solo.joinClient(makeClient("host-client", CREATOR));
    expect(updateRules(solo, { bots: 2 }).status).toBe(200);
    expect(solo.gameInfo().configReviewUntil).toBeUndefined();

    const multiplayer = makeGame();
    joinHostAndGuest(multiplayer);
    expect(updateRules(multiplayer, { anonymizeNames: true }).status).toBe(200);
    expect(multiplayer.gameInfo().configReviewUntil).toBeUndefined();
  });
});
