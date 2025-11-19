import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, daily_tango_mode } from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';
import { GuessWordDto, MemoryResultDto, ReactionResultDto } from './dto';

const WORD_BANK: Array<{ word: string; hint: string; theme: string }> = [
  { word: 'PIXEL', hint: 'Estilo visual retro muy presente en indies', theme: 'Estetica' },
  { word: 'MAGIA', hint: 'Habilidad clave en aventuras de fantasia', theme: 'Habilidades' },
  { word: 'NIVEL', hint: 'Superas uno para desbloquear el siguiente', theme: 'Progresion' },
  { word: 'RUNAS', hint: 'Simbologia mistica recurrente en RPGs', theme: 'Lore' },
  { word: 'FORJA', hint: 'Lugar ideal para mejorar tu equipo', theme: 'Crafting' },
  { word: 'BANDA', hint: 'Tus companeros de aventura tambien lo son', theme: 'Companeros' },
];

const MEMORY_DECKS = [
  {
    id: 'aventura',
    title: 'Heroes y Aventureros',
    cards: [
      {
        slug: 'the-witcher-3',
        title: 'The Witcher 3',
        image: '/daily-tango/witcher.svg',
      },
      {
        slug: 'hollow-knight',
        title: 'Hollow Knight',
        image: '/daily-tango/hollow-knight.svg',
      },
      {
        slug: 'celeste',
        title: 'Celeste',
        image: '/daily-tango/celeste.svg',
      },
      {
        slug: 'hades',
        title: 'Hades',
        image: '/daily-tango/hades.svg',
      },
      {
        slug: 'sea-of-stars',
        title: 'Sea of Stars',
        image: '/daily-tango/sea-of-stars.svg',
      },
      {
        slug: 'starfield',
        title: 'Starfield',
        image: '/daily-tango/starfield.svg',
      },
    ],
  },
  {
    id: 'indie-gems',
    title: 'Joyas Indie',
    cards: [
      {
        slug: 'tunic',
        title: 'Tunic',
        image: '/daily-tango/tunic.svg',
      },
      {
        slug: 'deaths-door',
        title: "Death's Door",
        image: '/daily-tango/deaths-door.svg',
      },
      {
        slug: 'citizen-sleeper',
        title: 'Citizen Sleeper',
        image: '/daily-tango/citizen-sleeper.svg',
      },
      {
        slug: 'norco',
        title: 'Norco',
        image: '/daily-tango/norco.svg',
      },
      {
        slug: 'sable',
        title: 'Sable',
        image: '/daily-tango/sable.svg',
      },
      {
        slug: 'gris',
        title: 'GRIS',
        image: '/daily-tango/gris.svg',
      },
    ],
  },
];

const REACTION_CONFIGS = [
  { minDelayMs: 1500, maxDelayMs: 3500 },
  { minDelayMs: 1800, maxDelayMs: 4200 },
  { minDelayMs: 2000, maxDelayMs: 4500 },
];

const MODE_LIMITS: Record<daily_tango_mode, { maxAttempts: number }> = {
  word: { maxAttempts: 5 },
  memory: { maxAttempts: 1 },
  reaction: { maxAttempts: 1 },
};

type ChallengeWithAttempts = Prisma.daily_tango_challengesGetPayload<{
  include: { daily_tango_attempts: true };
}>;

type AttemptPayload = Prisma.daily_tango_attemptsGetPayload<{
  include: {
    daily_tango_challenges: { select: { challenge_date: true; mode: true } };
  };
}>;

type AttemptEntity = Prisma.daily_tango_attemptsGetPayload<{}>;

@Injectable()
export class DailyTangoService {
  constructor(private readonly prisma: PrismaService) {}

  async getTodaySummary(userId?: string | null) {
    const today = this.startOfDay();
    await this.ensureChallenges(today);

    let challenges: ChallengeWithAttempts[];
    if (userId) {
      const withAttempts = await this.prisma.daily_tango_challenges.findMany({
        where: { challenge_date: today },
        include: {
          daily_tango_attempts: {
            where: { user_id: userId },
            orderBy: { attempt_number: 'asc' },
          },
        },
      });
      challenges = withAttempts;
    } else {
      const baseList = await this.prisma.daily_tango_challenges.findMany({
        where: { challenge_date: today },
      });
      challenges = baseList.map((challenge) => ({
        ...challenge,
        daily_tango_attempts: [],
      }));
    }

    const sortedChallenges = challenges.sort(
      (a, b) => this.modePriority(a.mode) - this.modePriority(b.mode),
    );

    const streaks = userId ? await this.buildStreakMap(userId, today) : new Map<daily_tango_mode, number>();

    return {
      date: today.toISOString(),
      challenges: sortedChallenges.map((challenge) =>
        this.presentChallenge(challenge, userId ?? null, streaks.get(challenge.mode) ?? 0),
      ),
    };
  }

  async submitWordGuess(userId: string, dto: GuessWordDto) {
    const challenge = await this.getChallengeForMode('word');
    const limits = MODE_LIMITS.word;
    const solution = this.getWordSolution(challenge);
    if (!solution) {
      throw new NotFoundException('Desafio no disponible aun');
    }

    const normalizedGuess = dto.guess.trim().toUpperCase();
    if (normalizedGuess.length !== solution.length) {
      throw new BadRequestException(`La palabra tiene ${solution.length} letras`);
    }
    if (!/^[A-Z]+$/.test(normalizedGuess)) {
      throw new BadRequestException('Solo se permiten letras');
    }

    const attemptCount = await this.prisma.daily_tango_attempts.count({
      where: { challenge_id: challenge.id, user_id: userId },
    });

    if (attemptCount >= limits.maxAttempts) {
      throw new BadRequestException('Ya usaste tus intentos para hoy');
    }

    const alreadyWon = await this.prisma.daily_tango_attempts.findFirst({
      where: { challenge_id: challenge.id, user_id: userId, won: true },
    });
    if (alreadyWon) {
      throw new BadRequestException('Ya completaste el desafio de hoy');
    }

    const feedback = this.evaluateGuess(solution, normalizedGuess);
    const won = normalizedGuess === solution;
    const attemptNumber = attemptCount + 1;
    const score = won ? this.computeWordScore(attemptNumber) : 0;

    const attempt = await this.prisma.daily_tango_attempts.create({
      data: {
        challenge_id: challenge.id,
        user_id: userId,
        attempt_number: attemptNumber,
        won,
        score,
        payload: { guess: normalizedGuess, feedback },
      },
    });

    const remaining = Math.max(0, limits.maxAttempts - attemptNumber);

    return {
      attempt: this.mapAttempt(attempt),
      feedback,
      won,
      remaining_attempts: remaining,
      solution: won || remaining === 0 ? solution : null,
      completed: won || remaining === 0,
    };
  }

  async submitMemoryResult(userId: string, dto: MemoryResultDto) {
    if (dto.moves <= 0 || dto.durationMs <= 0) {
      throw new BadRequestException('Datos invalidos para el minijuego de memoria');
    }

    const challenge = await this.getChallengeForMode('memory');
    const existing = await this.prisma.daily_tango_attempts.count({
      where: { challenge_id: challenge.id, user_id: userId },
    });
    if (existing >= 1) {
      throw new BadRequestException('Ya registraste tu resultado hoy');
    }

    const score = Math.max(100, 1500 - dto.moves * 8 - dto.mistakes * 12 - Math.floor(dto.durationMs / 40));

    const attempt = await this.prisma.daily_tango_attempts.create({
      data: {
        challenge_id: challenge.id,
        user_id: userId,
        attempt_number: 1,
        won: true,
        score,
        duration_ms: dto.durationMs,
        payload: {
          moves: dto.moves,
          mistakes: dto.mistakes,
          durationMs: dto.durationMs,
        },
      },
    });

    return {
      attempt: this.mapAttempt(attempt),
      score,
      duration_ms: dto.durationMs,
    };
  }

  async submitReactionResult(userId: string, dto: ReactionResultDto) {
    if (dto.durationMs <= 0) {
      throw new BadRequestException('Tiempo invalido');
    }

    const challenge = await this.getChallengeForMode('reaction');
    const existing = await this.prisma.daily_tango_attempts.count({
      where: { challenge_id: challenge.id, user_id: userId },
    });
    if (existing >= 1) {
      throw new BadRequestException('Solo podes registrar un intento por dia');
    }

    const score = Math.max(0, 5000 - dto.durationMs);

    const attempt = await this.prisma.daily_tango_attempts.create({
      data: {
        challenge_id: challenge.id,
        user_id: userId,
        attempt_number: 1,
        won: true,
        score,
        duration_ms: dto.durationMs,
        payload: { durationMs: dto.durationMs },
      },
    });

    return {
      attempt: this.mapAttempt(attempt),
      duration_ms: dto.durationMs,
    };
  }

  async getLeaderboard(mode: daily_tango_mode, days: number) {
    const today = this.startOfDay();
    const since = new Date(today);
    since.setUTCDate(since.getUTCDate() - (days - 1));

    const attempts = await this.prisma.daily_tango_attempts.findMany({
      where: {
        daily_tango_challenges: {
          mode,
          challenge_date: { gte: since },
        },
      },
      include: {
        users: { select: { id: true, display_name: true, avatar_url: true } },
        daily_tango_challenges: { select: { challenge_date: true, mode: true } },
      },
    });

    const buckets = new Map<
      string,
      {
        user: { id: string; display_name: string; avatar_url: string | null } | null;
        totalScore: number;
        wins: number;
        bestScore: number | null;
        bestDuration: number | null;
        attempts: number;
      }
    >();

    for (const attempt of attempts) {
      const bucket = buckets.get(attempt.user_id) ?? {
        user: attempt.users
          ? {
              id: attempt.users.id,
              display_name: attempt.users.display_name,
              avatar_url: attempt.users.avatar_url ?? null,
            }
          : null,
        totalScore: 0,
        wins: 0,
        bestScore: null,
        bestDuration: null,
        attempts: 0,
      };

      bucket.attempts += 1;

      if (mode === 'word') {
        if (attempt.won && typeof attempt.score === 'number') {
          bucket.totalScore += attempt.score;
          bucket.wins += 1;
        }
      } else if (mode === 'memory') {
        if (typeof attempt.score === 'number') {
          bucket.bestScore = bucket.bestScore === null ? attempt.score : Math.max(bucket.bestScore, attempt.score);
        }
        if (typeof attempt.duration_ms === 'number') {
          bucket.bestDuration =
            bucket.bestDuration === null
              ? attempt.duration_ms
              : Math.min(bucket.bestDuration, attempt.duration_ms);
        }
      } else if (mode === 'reaction' && typeof attempt.duration_ms === 'number') {
        bucket.bestDuration =
          bucket.bestDuration === null
            ? attempt.duration_ms
            : Math.min(bucket.bestDuration, attempt.duration_ms);
      }

      buckets.set(attempt.user_id, bucket);
    }

    const entries = Array.from(buckets.values())
      .map((bucket) => {
        if (mode === 'word') {
          return {
            user: bucket.user,
            value: bucket.totalScore,
            formatted: `${bucket.totalScore} pts`,
            detail: `${bucket.wins} aciertos`,
            include: bucket.wins > 0,
          };
        }
        if (mode === 'memory') {
          const score = bucket.bestScore ?? 0;
          return {
            user: bucket.user,
            value: score,
            formatted: `${score} pts`,
            detail: bucket.bestDuration ? `${bucket.bestDuration} ms` : 'sin tiempo',
            include: bucket.bestScore !== null,
          };
        }
        const duration = bucket.bestDuration;
        return {
          user: bucket.user,
          value: duration ?? Number.POSITIVE_INFINITY,
          formatted: duration !== null ? `${duration} ms` : 'N/D',
          detail: 'Reflejos',
          include: duration !== null,
        };
      })
      .filter((entry) => entry.include && entry.user)
      .sort((a, b) => {
        if (mode === 'reaction') {
          return a.value - b.value;
        }
        return b.value - a.value;
      })
      .slice(0, 10)
      .map(({ user, value, formatted, detail }) => ({
        user,
        value,
        formatted,
        detail,
      }));

    return {
      mode,
      period_days: days,
      metric: mode === 'reaction' ? 'ms' : 'pts',
      direction: mode === 'reaction' ? 'asc' : 'desc',
      entries,
    };
  }

  private async ensureChallenges(date: Date) {
    const existing = await this.prisma.daily_tango_challenges.findMany({
      where: { challenge_date: date },
      select: { mode: true },
    });

    const existingModes = new Set(existing.map((entry) => entry.mode));

    const missing = (Object.keys(MODE_LIMITS) as daily_tango_mode[]).filter(
      (mode) => !existingModes.has(mode),
    );

    await Promise.all(
      missing.map((mode) =>
        this.prisma.daily_tango_challenges.create({
          data: {
            challenge_date: date,
            mode,
            clue_data: this.buildChallengeConfig(date, mode),
          },
        }),
      ),
    );
  }

  private buildChallengeConfig(date: Date, mode: daily_tango_mode): Prisma.JsonObject {
    const dayIndex = Math.floor(date.getTime() / 86_400_000);

    if (mode === 'word') {
      const entry = WORD_BANK[dayIndex % WORD_BANK.length];
      return {
        solution: entry.word.toUpperCase(),
        hint: entry.hint,
        theme: entry.theme,
        length: entry.word.length,
      };
    }

    if (mode === 'memory') {
      const deck = MEMORY_DECKS[dayIndex % MEMORY_DECKS.length];
      return deck as Prisma.JsonObject;
    }

    const reaction = REACTION_CONFIGS[dayIndex % REACTION_CONFIGS.length];
    return reaction as Prisma.JsonObject;
  }

  private async getChallengeForMode(mode: daily_tango_mode) {
    const today = this.startOfDay();
    await this.ensureChallenges(today);

    const challenge = await this.prisma.daily_tango_challenges.findFirst({
      where: { challenge_date: today, mode },
    });

    if (!challenge) {
      throw new NotFoundException('Desafio no disponible');
    }

    return challenge;
  }

  private presentChallenge(
    challenge: ChallengeWithAttempts,
    userId: string | null,
    streak: number,
  ) {
    const limits = MODE_LIMITS[challenge.mode];
    const attempts = userId ? challenge.daily_tango_attempts ?? [] : [];
    const responseAttempts = attempts.map((attempt) => this.mapAttempt(attempt));
    const remaining = Math.max(0, limits.maxAttempts - attempts.length);
    const completed = attempts.some((attempt) => attempt.won) || remaining === 0;

    return {
      id: challenge.id,
      mode: challenge.mode,
      available_on: challenge.challenge_date,
      config: this.getPublicConfig(challenge),
      attempts: responseAttempts,
      remaining_attempts: remaining,
      max_attempts: limits.maxAttempts,
      completed,
      streak,
      solution:
        completed && challenge.mode === 'word' ? this.getWordSolution(challenge) : null,
    };
  }

  private getPublicConfig(challenge: ChallengeWithAttempts) {
    const data = this.asJsonObject(challenge.clue_data);

    if (challenge.mode === 'word') {
      const length = typeof data.length === 'number' ? data.length : undefined;
      return {
        hint: typeof data.hint === 'string' ? data.hint : 'Adivina la palabra secreta',
        theme: typeof data.theme === 'string' ? data.theme : 'General',
        length: length ?? (typeof data.solution === 'string' ? data.solution.length : 5),
      };
    }

    if (challenge.mode === 'memory') {
      return {
        deckId: typeof data.id === 'string' ? data.id : 'memoria',
        title: typeof data.title === 'string' ? data.title : 'Galeria sorpresa',
        cards: Array.isArray(data.cards) ? data.cards : [],
      };
    }

    return {
      minDelayMs: typeof data.minDelayMs === 'number' ? data.minDelayMs : 1500,
      maxDelayMs: typeof data.maxDelayMs === 'number' ? data.maxDelayMs : 3500,
    };
  }

  private mapAttempt(attempt: AttemptEntity) {
    return {
      id: attempt.id,
      attempt_number: attempt.attempt_number,
      won: attempt.won,
      score: attempt.score ?? null,
      duration_ms: attempt.duration_ms ?? null,
      payload: attempt.payload ?? null,
      played_at: attempt.played_at,
    };
  }

  private getWordSolution(challenge: { clue_data: Prisma.JsonValue | null }): string | null {
    const data = this.asJsonObject(challenge.clue_data);
    const solution = data.solution;
    return typeof solution === 'string' ? solution.toUpperCase() : null;
  }

  private evaluateGuess(solution: string, guess: string) {
    const result: ('correct' | 'present' | 'miss')[] = [];
    const solutionChars = solution.split('');
    const guessChars = guess.split('');
    const remaining: Record<string, number> = {};

    solutionChars.forEach((char, index) => {
      if (guessChars[index] === char) {
        result[index] = 'correct';
      } else {
        remaining[char] = (remaining[char] ?? 0) + 1;
      }
    });

    guessChars.forEach((char, index) => {
      if (result[index]) {
        return;
      }
      if (remaining[char]) {
        result[index] = 'present';
        remaining[char] -= 1;
      } else {
        result[index] = 'miss';
      }
    });

    return result;
  }

  private computeWordScore(attemptNumber: number) {
    return Math.max(10, 70 - (attemptNumber - 1) * 10);
  }

  private async buildStreakMap(userId: string, today: Date) {
    const since = new Date(today);
    since.setUTCDate(since.getUTCDate() - 30);

    const attempts = (await this.prisma.daily_tango_attempts.findMany({
      where: {
        user_id: userId,
        won: true,
        daily_tango_challenges: {
          challenge_date: { gte: since },
        },
      },
      include: {
        daily_tango_challenges: { select: { challenge_date: true, mode: true } },
      },
    })) as AttemptPayload[];

    const byMode = new Map<daily_tango_mode, Set<string>>();
    for (const attempt of attempts) {
      const mode = attempt.daily_tango_challenges.mode;
      const dateKey = this.formatDateKey(attempt.daily_tango_challenges.challenge_date);
      if (!byMode.has(mode)) {
        byMode.set(mode, new Set());
      }
      byMode.get(mode)?.add(dateKey);
    }

    const streaks = new Map<daily_tango_mode, number>();
    (Object.keys(MODE_LIMITS) as daily_tango_mode[]).forEach((mode) => {
      const wins = byMode.get(mode) ?? new Set<string>();
      streaks.set(mode, this.computeStreak(wins, today));
    });

    return streaks;
  }

  private computeStreak(wins: Set<string>, reference: Date) {
    const cursor = new Date(reference);
    let streak = 0;

    while (true) {
      const key = this.formatDateKey(cursor);
      if (wins.has(key)) {
        streak += 1;
        cursor.setUTCDate(cursor.getUTCDate() - 1);
      } else {
        break;
      }
    }

    return streak;
  }

  private asJsonObject(value: Prisma.JsonValue | null): Prisma.JsonObject {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return {};
    }
    return value as Prisma.JsonObject;
  }

  private modePriority(mode: daily_tango_mode) {
    if (mode === 'word') return 0;
    if (mode === 'memory') return 1;
    return 2;
  }

  private startOfDay(date = new Date()) {
    return new Date(
      Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
    );
  }

  private formatDateKey(date: Date) {
    return date.toISOString().slice(0, 10);
  }
}
