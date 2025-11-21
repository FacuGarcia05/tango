"use client";

import { MemoryChallenge } from "@/components/daily-tango/MemoryChallenge";
import { ReactionChallenge } from "@/components/daily-tango/ReactionChallenge";
import { DailyLeaderboard } from "@/components/daily-tango/DailyLeaderboard";
import { WordChallenge } from "@/components/daily-tango/WordChallenge";
import type {
  DailyTangoChallenge,
  DailyTangoLeaderboard,
  DailyTangoMemoryConfig,
  DailyTangoReactionConfig,
  DailyTangoSummary,
  DailyTangoWordConfig,
} from "@/types";

interface DailyTangoPageProps {
  summary: DailyTangoSummary;
  leaderboards: {
    word: DailyTangoLeaderboard;
    memory: DailyTangoLeaderboard;
    reaction: DailyTangoLeaderboard;
  };
}

function isWordChallenge(
  challenge?: DailyTangoChallenge,
): challenge is DailyTangoChallenge & { config: DailyTangoWordConfig } {
  return challenge?.mode === "word";
}

function isMemoryChallenge(
  challenge?: DailyTangoChallenge,
): challenge is DailyTangoChallenge & { config: DailyTangoMemoryConfig } {
  return challenge?.mode === "memory";
}

function isReactionChallenge(
  challenge?: DailyTangoChallenge,
): challenge is DailyTangoChallenge & { config: DailyTangoReactionConfig } {
  return challenge?.mode === "reaction";
}

export function DailyTangoPage({ summary, leaderboards }: DailyTangoPageProps) {
  const wordChallenge = summary.challenges.find((challenge) => challenge.mode === "word");
  const memoryChallenge = summary.challenges.find((challenge) => challenge.mode === "memory");
  const reactionChallenge = summary.challenges.find((challenge) => challenge.mode === "reaction");

  return (
    <div className="space-y-8">
      <section className="rounded-3xl border border-border bg-surface/70 p-6 shadow-lg">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-text">Daily TANGO</h1>
          <p className="text-sm text-text-muted">
            Tres minijuegos diarios para poner a prueba tu conocimiento, memoria y reflejos. Obtén tu racha y revisa el marcador semanal.
          </p>
        </div>
        <div className="mt-6 grid gap-4 lg:grid-cols-3">
          {isWordChallenge(wordChallenge) ? <WordChallenge challenge={wordChallenge} /> : null}
          {isMemoryChallenge(memoryChallenge) ? <MemoryChallenge challenge={memoryChallenge} /> : null}
          {isReactionChallenge(reactionChallenge) ? <ReactionChallenge challenge={reactionChallenge} /> : null}
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <DailyLeaderboard title="Palabra del día" leaderboard={leaderboards.word} />
        <DailyLeaderboard title="Memory" leaderboard={leaderboards.memory} />
        <DailyLeaderboard title="Reaccion" leaderboard={leaderboards.reaction} />
      </section>
    </div>
  );
}
