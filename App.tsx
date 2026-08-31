import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  AppState,
  Modal,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  Vibration,
  View,
} from 'react-native';
import {
  SafeAreaProvider,
  SafeAreaView,
} from 'react-native-safe-area-context';
import * as SQLite from 'expo-sqlite';
import PagerView from 'react-native-pager-view';
import * as Notifications from 'expo-notifications';
import * as Haptics from 'expo-haptics';
import { File, Paths } from 'expo-file-system';
import * as DocumentPicker from 'expo-document-picker';
import * as Sharing from 'expo-sharing';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

type Screen = 'summary' | 'workout' | 'plans' | 'calendar' | 'exercises' | 'profile' | 'history';

type ExerciseLoadType = 'external' | 'bodyweight';

const SCREEN_ORDER: Screen[] = [
  'summary',
  'workout',
  'plans',
  'calendar',
  'exercises',
  'profile',
  'history',
];

type SetData = {
  weight: string;
  reps: string;
  bodyWeight?: string;
};

type WorkoutExercise = {
  id: number;
  databaseExerciseId?: number | null;
  name: string;
  muscleGroup: string;
  factor: 1 | 2;
  loadType: ExerciseLoadType;
  sets: SetData[];
};

type ExerciseFolder = {
  id: number;
  externalKey: string;
  name: string;
  sortOrder: number;
};

type CatalogExercise = {
  id: number;
  externalKey: string;
  name: string;
  muscleGroup: string;
  factor: 1 | 2;
  loadType: ExerciseLoadType;
  folderId: number | null;
  folderKey: string | null;
  folderName: string | null;
};

type PlanExercise = CatalogExercise & {
  setCount: number;
};

type WorkoutPlan = {
  id: number;
  externalKey: string;
  name: string;
  items: PlanExercise[];
};

type ScheduledPlan = {
  dateKey: string;
  planId: number;
  planName: string;
};

type CalendarMode = 'month' | 'week';

type HistoryItem = {
  id: number;
  finishedAt: string;
  totalVolume: number;
  exerciseCount: number;
};

type PersonalRecord = {
  exerciseId: number;
  exerciseName: string;
  muscleGroup: string;
  factor: 1 | 2;
  loadType: ExerciseLoadType;
  maxWeight: number;
  repsAtMaxWeight: number;
  bestWorkoutVolume: number;
};

type ArchiveSet = {
  setNumber: number;
  weight: number;
  reps: number;
  factor: 1 | 2;
  loadType: ExerciseLoadType;
  bodyWeight: number | null;
  additionalWeight: number | null;
};

type ArchiveExercise = {
  exerciseId: number | null;
  exerciseName: string;
  factor: 1 | 2;
  loadType: ExerciseLoadType;
  volume: number;
  sets: ArchiveSet[];
};

type HistoricalSetRow = {
  workoutId: number;
  exerciseId: number | null;
  exerciseName: string;
  weight: number;
  reps: number;
  factor: number;
  loadType: ExerciseLoadType;
  bodyWeight: number | null;
  additionalWeight: number | null;
};

type PreviousExerciseResult = {
  workoutId: number;
  finishedAt: string;
  volume: number;
  maxWeight: number;
  sets: ArchiveSet[];
};

type ProgressPoint = {
  workoutId: number;
  finishedAt: string;
  maxWeight: number;
  volume: number;
};

type ExerciseProgress = {
  exerciseId: number;
  exerciseName: string;
  muscleGroup: string;
  factor: 1 | 2;
  loadType: ExerciseLoadType;
  points: ProgressPoint[];
};

type Achievement = {
  id: string;
  title: string;
  description: string;
  current: number;
  target: number;
  kind: 'kg' | 'count';
  unlocked: boolean;
};

type Stats = {
  totalVolume: number;
  todayVolume: number;
  weekVolume: number;
  previousWeekVolume: number;
  monthVolume: number;
  workoutCount: number;
  weekWorkoutCount: number;
  monthWorkoutCount: number;
  bestWorkoutVolume: number;
  totalSets: number;
  totalReps: number;
  lastWorkout: HistoryItem | null;
};

type AppSettings = {
  bodyWeight: number;
  restSeconds: number;
  randomMessages: boolean;
  vibration: boolean;
  animations: boolean;
  notificationsEnabled: boolean;
  workoutHour: number;
  reminderMinutes: number;
  missedReminder: boolean;
  weeklySummary: boolean;
};

type UiBanner = {
  id: number;
  title: string;
  body: string;
  tone: 'normal' | 'success' | 'record' | 'warning';
};

type EventOverlay = {
  kind: 'level' | 'record';
  eyebrow: string;
  title: string;
  subtitle: string;
  body: string;
};

type DialogAction = {
  text: string;
  style?: 'default' | 'cancel' | 'destructive';
  onPress?: () => void | Promise<void>;
};

type AppDialog = {
  id: number;
  title: string;
  message?: string;
  actions: DialogAction[];
};

type TonnagePackageFolder = {
  key: string;
  name: string;
  sortOrder: number;
};

type TonnagePackageExercise = {
  key: string;
  name: string;
  muscleGroup: string;
  factor: 1 | 2;
  loadType?: ExerciseLoadType;
  folderKey?: string | null;
};

type TonnagePackagePlanItem = {
  exerciseKey: string;
  setCount: number;
  sortOrder: number;
};

type TonnagePackagePlan = {
  key: string;
  name: string;
  items: TonnagePackagePlanItem[];
};

type PcDatabaseExercise = {
  id: number;
  externalKey: string;
  name: string;
  muscleGroup: string;
  factor: 1 | 2;
  loadType: ExerciseLoadType;
  folderKey: string | null;
  folderName: string | null;
};

type PcDatabaseWorkout = {
  id: number;
  startedAt: string;
  finishedAt: string;
  totalVolume: number;
};

type PcDatabaseSet = {
  id: number;
  workoutId: number;
  exerciseId: number | null;
  exerciseName: string;
  setNumber: number;
  weight: number;
  reps: number;
  factor: 1 | 2;
  loadType?: ExerciseLoadType;
  bodyWeight?: number | null;
  additionalWeight?: number | null;
};

type ResumedWorkout = {
  id: number;
  startedAt: string;
  originalVolume: number;
};

type TonnagePcDatabase = {
  format: 'tonnage-database';
  formatVersion: 1;
  createdAt: string;
  source: {
    platform: 'android';
    appVersion: '0.11.0';
  };
  planning: TonnagePlanningPackage['data'];
  database: {
    folders: TonnagePackageFolder[];
    exercises: PcDatabaseExercise[];
    workouts: PcDatabaseWorkout[];
    sets: PcDatabaseSet[];
  };
};

type TonnagePlanningPackage = {
  format: 'tonnage-planning';
  formatVersion: 1 | 2;
  createdAt: string;
  source: {
    platform: string;
    appVersion: string;
  };
  data: {
    folders?: TonnagePackageFolder[];
    exercises: TonnagePackageExercise[];
    plans: TonnagePackagePlan[];
    schedule: Array<{
      dateKey: string;
      planKey: string;
    }>;
    removeScheduleDates?: string[];
    removeExerciseKeys?: string[];
    removePlanKeys?: string[];
    removeFolderKeys?: string[];
  };
};

const LEVEL_TITLES = [
  'Салага',
  'Рядовой железа',
  'Ефрейтор гантелей',
  'Младший сержант подходов',
  'Сержант тоннажа',
  'Старшина железа',
  'Прапорщик перегруза',
  'Лейтенант гипертрофии',
  'Капитан мясокомбината',
  'Майор тяжёлых предметов',
  'Подполковник прогресса',
  'Полковник качалки',
  'Генерал тоннажа',
];

const EMPTY_STATS: Stats = {
  totalVolume: 0,
  todayVolume: 0,
  weekVolume: 0,
  previousWeekVolume: 0,
  monthVolume: 0,
  workoutCount: 0,
  weekWorkoutCount: 0,
  monthWorkoutCount: 0,
  bestWorkoutVolume: 0,
  totalSets: 0,
  totalReps: 0,
  lastWorkout: null,
};

const DEFAULT_SETTINGS: AppSettings = {
  bodyWeight: 0,
  restSeconds: 90,
  randomMessages: true,
  vibration: true,
  animations: true,
  notificationsEnabled: false,
  workoutHour: 19,
  reminderMinutes: 30,
  missedReminder: true,
  weeklySummary: true,
};

const COMPLETION_MESSAGES = [
  'Задача выполнена. Потерь среди гантелей не выявлено.',
  'Имущество перемещено. Жалоб от имущества не поступало.',
  'Норматив закрыт. Причины добровольного продолжения службы с железом устанавливаются.',
  'Работы завершены. Личный состав может временно изображать человека.',
  'Задача принята. Спина пока числится в комплекте.',
  'Доклад принят. Средства механизации по-прежнему не предусмотрены.',
  'Перемещение завершено. Начальство делает вид, что так и планировалось.',
];

const RECORD_FOOTERS = [
  'Начальство вынуждено заметить.',
  'Предыдущий норматив признан недостаточно амбициозным.',
  'Комиссия подозревает применение запрещённой мотивации.',
  'Результат принят. Старые цифры отправлены в архив позора.',
];

const pickRandom = (items: string[]) =>
  items[Math.floor(Math.random() * items.length)];

const formatTimer = (seconds: number) => {
  const safe = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(safe / 60);
  const rest = safe % 60;
  return `${String(minutes).padStart(2, '0')}:${String(rest).padStart(2, '0')}`;
};

const parseNumber = (value: string) => {
  const parsed = Number(value.replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : 0;
};

const normalizeLoadType = (
  value: unknown
): ExerciseLoadType =>
  value === 'bodyweight'
    ? 'bodyweight'
    : 'external';

const getSetBodyWeight = (
  set: SetData,
  fallbackBodyWeight: number
) => {
  const stored = parseNumber(
    set.bodyWeight ?? ''
  );

  return stored > 0
    ? stored
    : Math.max(0, fallbackBodyWeight);
};

const getSetEffectiveWeight = (
  exercise: Pick<WorkoutExercise, 'loadType'>,
  set: SetData,
  fallbackBodyWeight: number
) => {
  if (exercise.loadType === 'bodyweight') {
    return Math.max(
      0,
      getSetBodyWeight(
        set,
        fallbackBodyWeight
      ) + Math.max(
        0,
        parseNumber(set.weight)
      )
    );
  }

  return Math.max(0, parseNumber(set.weight));
};

const getSetRecordWeight = (
  exercise: Pick<WorkoutExercise, 'loadType'>,
  set: SetData,
  fallbackBodyWeight: number
) =>
  exercise.loadType === 'bodyweight'
    ? Math.max(0, parseNumber(set.weight))
    : getSetEffectiveWeight(
        exercise,
        set,
        fallbackBodyWeight
      );

const getArchiveSetRecordWeight = (
  set: ArchiveSet
) =>
  set.loadType === 'bodyweight'
    ? Math.max(
        0,
        set.additionalWeight ?? 0
      )
    : set.weight;

const isValidWorkoutSet = (
  exercise: Pick<WorkoutExercise, 'loadType'>,
  set: SetData,
  fallbackBodyWeight: number
) =>
  getSetEffectiveWeight(
    exercise,
    set,
    fallbackBodyWeight
  ) > 0 &&
  Math.floor(parseNumber(set.reps)) > 0;

const calculateVolume = (
  exercises: WorkoutExercise[],
  fallbackBodyWeight = 0
) => {
  return exercises.reduce((total, exercise) => {
    const exerciseVolume = exercise.sets.reduce((setTotal, set) => {
      const weight = getSetEffectiveWeight(
        exercise,
        set,
        fallbackBodyWeight
      );
      const reps = parseNumber(set.reps);
      return setTotal + weight * reps * exercise.factor;
    }, 0);

    return total + exerciseVolume;
  }, 0);
};

const levelThresholdKg = (level: number) => {
  let total = 0;

  for (let i = 0; i < level; i++) {
    total += 20000 + 5000 * i;
  }

  return total;
};

const getLevelInfo = (totalKg: number) => {
  let level = 0;

  while (
    totalKg >= levelThresholdKg(level + 1) &&
    level < 1000
  ) {
    level += 1;
  }

  const currentThreshold = levelThresholdKg(level);
  const nextThreshold = levelThresholdKg(level + 1);

  const progressKg = totalKg - currentThreshold;
  const requiredKg = nextThreshold - currentThreshold;
  const remainingKg = Math.max(0, nextThreshold - totalKg);

  const progressPercent =
    requiredKg > 0
      ? Math.min(100, Math.max(0, (progressKg / requiredKg) * 100))
      : 100;

  const title =
    LEVEL_TITLES[level] ??
    `Ветеран железа ${level}`;

  return {
    level,
    title,
    currentThreshold,
    nextThreshold,
    progressKg,
    requiredKg,
    remainingKg,
    progressPercent,
  };
};

const formatWeight = (kg: number) => {
  if (kg >= 1000) {
    const tons = kg / 1000;
    return `${tons.toFixed(tons >= 100 ? 0 : 1)} т`;
  }

  return `${Math.round(kg)} кг`;
};

const formatVolumeExact = (kg: number) => {
  return Number.isInteger(kg)
    ? `${kg} кг`
    : `${kg.toFixed(1)} кг`;
};

const formatShortDate = (iso: string) => {
  const date = new Date(iso);

  const day = String(date.getDate()).padStart(2, '0');
  const month = String(
    date.getMonth() + 1
  ).padStart(2, '0');

  return `${day}.${month}`;
};

const formatPreviousSets = (
  result?: PreviousExerciseResult
) => {
  if (!result || result.sets.length === 0) {
    return 'данных нет';
  }

  return result.sets
    .map(
      set => {
        if (set.loadType === 'bodyweight') {
          const own = set.bodyWeight ?? set.weight;
          const extra = set.additionalWeight ?? 0;
          const extraLabel =
            extra > 0 ? `+${extra}` : '';

          return `СВ ${own}${extraLabel}×${set.reps}`;
        }

        return `${set.weight}×${set.reps}`;
      }
    )
    .join(' / ');
};

const getLiveStatus = (
  exercise: WorkoutExercise,
  previous: PreviousExerciseResult | undefined,
  fallbackBodyWeight: number
) => {
  if (!previous) {
    return {
      tone: 'muted' as const,
      text:
        'ИСХОДНЫЙ НОРМАТИВ ЕЩЁ НЕ УСТАНОВЛЕН',
    };
  }

  const validSets = exercise.sets
    .map(set => ({
      weight: getSetRecordWeight(
        exercise,
        set,
        fallbackBodyWeight
      ),
      effectiveWeight: getSetEffectiveWeight(
        exercise,
        set,
        fallbackBodyWeight
      ),
      reps: Math.floor(
        parseNumber(set.reps)
      ),
    }))
    .filter(
      set =>
        set.effectiveWeight > 0 &&
        set.reps > 0
    );

  if (validSets.length === 0) {
    return {
      tone: 'muted' as const,
      text:
        'ПРЕДЫДУЩИЙ НОРМАТИВ ОЖИДАЕТ ВЫПОЛНЕНИЯ',
    };
  }

  const currentVolume = validSets.reduce(
    (sum, set) =>
      sum +
      set.effectiveWeight *
        set.reps *
        exercise.factor,
    0
  );

  const currentMaxWeight = Math.max(
    ...validSets.map(set => set.weight)
  );

  const previousRepsByWeight =
    new Map<string, number>();

  for (const set of previous.sets) {
    const key =
      Number(
        getArchiveSetRecordWeight(set)
      ).toFixed(3);

    previousRepsByWeight.set(
      key,
      Math.max(
        previousRepsByWeight.get(key) ?? 0,
        set.reps
      )
    );
  }

  const repsRecord = validSets.some(
    set => {
      const oldReps =
        previousRepsByWeight.get(
          set.weight.toFixed(3)
        );

      return (
        oldReps !== undefined &&
        set.reps > oldReps
      );
    }
  );

  const record =
    currentMaxWeight >
      previous.maxWeight ||
    currentVolume >
      previous.volume ||
    repsRecord;

  if (record) {
    return {
      tone: 'record' as const,
      text:
        'ИДЁШЬ НА РЕКОРД. НАЧАЛЬСТВО НАЧИНАЕТ НЕРВНИЧАТЬ.',
    };
  }

  if (
    currentVolume >= previous.volume
  ) {
    return {
      tone: 'done' as const,
      text:
        'ПРЕДЫДУЩИЙ НОРМАТИВ ВЫПОЛНЕН',
    };
  }

  return {
    tone: 'progress' as const,
    text: `ДО ПРОШЛОГО ТОННАЖА: ${formatWeight(
      previous.volume -
        currentVolume
    )}`,
  };
};

const buildAchievements = (
  stats: Stats,
  records: PersonalRecord[]
): Achievement[] => {
  const items: Achievement[] = [
    {
      id: 'workout_1',
      title: 'Первый приказ',
      description:
        'Завершить первую тренировку.',
      current: stats.workoutCount,
      target: 1,
      kind: 'count',
      unlocked:
        stats.workoutCount >= 1,
    },
    {
      id: 'workout_3',
      title: 'Прибыл в расположение',
      description:
        'Выполнить 3 тренировки.',
      current: stats.workoutCount,
      target: 3,
      kind: 'count',
      unlocked:
        stats.workoutCount >= 3,
    },
    {
      id: 'workout_5',
      title: 'Втянулся',
      description:
        'Выполнить 5 тренировок.',
      current: stats.workoutCount,
      target: 5,
      kind: 'count',
      unlocked:
        stats.workoutCount >= 5,
    },
    {
      id: 'workout_10',
      title: 'Вошёл в график',
      description:
        'Выполнить 10 тренировок.',
      current: stats.workoutCount,
      target: 10,
      kind: 'count',
      unlocked:
        stats.workoutCount >= 10,
    },
    {
      id: 'workout_25',
      title: 'Уставной фанатик',
      description:
        'Выполнить 25 тренировок.',
      current: stats.workoutCount,
      target: 25,
      kind: 'count',
      unlocked:
        stats.workoutCount >= 25,
    },
    {
      id: 'workout_50',
      title: 'Полтинник задач',
      description:
        'Выполнить 50 тренировок.',
      current: stats.workoutCount,
      target: 50,
      kind: 'count',
      unlocked:
        stats.workoutCount >= 50,
    },
    {
      id: 'workout_100',
      title: 'Согласно накладной',
      description:
        'Выполнить 100 тренировок.',
      current: stats.workoutCount,
      target: 100,
      kind: 'count',
      unlocked:
        stats.workoutCount >= 100,
    },
    {
      id: 'week_3',
      title: 'Неделя в строю',
      description:
        'Три тренировки за последние 7 дней.',
      current:
        stats.weekWorkoutCount,
      target: 3,
      kind: 'count',
      unlocked:
        stats.weekWorkoutCount >= 3,
    },

    {
      id: 'volume_1t',
      title: 'Первая тонна',
      description:
        'Переместить 1 тонну железа.',
      current: stats.totalVolume,
      target: 1000,
      kind: 'kg',
      unlocked:
        stats.totalVolume >= 1000,
    },
    {
      id: 'volume_2_5t',
      title: 'Уже не разминка',
      description:
        'Переместить 2,5 тонны железа.',
      current: stats.totalVolume,
      target: 2500,
      kind: 'kg',
      unlocked:
        stats.totalVolume >= 2500,
    },
    {
      id: 'volume_5t',
      title: 'Грузчик III разряда',
      description:
        'Переместить 5 тонн железа.',
      current: stats.totalVolume,
      target: 5000,
      kind: 'kg',
      unlocked:
        stats.totalVolume >= 5000,
    },
    {
      id: 'volume_10t',
      title: 'Десятка',
      description:
        'Переместить 10 тонн железа.',
      current: stats.totalVolume,
      target: 10000,
      kind: 'kg',
      unlocked:
        stats.totalVolume >= 10000,
    },
    {
      id: 'volume_20t',
      title: 'Первые двадцать',
      description:
        'Переместить 20 тонн железа.',
      current: stats.totalVolume,
      target: 20000,
      kind: 'kg',
      unlocked:
        stats.totalVolume >= 20000,
    },
    {
      id: 'volume_50t',
      title: 'Средства механизации не предусмотрены',
      description:
        'Переместить 50 тонн железа.',
      current: stats.totalVolume,
      target: 50000,
      kind: 'kg',
      unlocked:
        stats.totalVolume >= 50000,
    },
    {
      id: 'volume_100t',
      title: 'Сотня тонн',
      description:
        'Переместить 100 тонн железа.',
      current: stats.totalVolume,
      target: 100000,
      kind: 'kg',
      unlocked:
        stats.totalVolume >= 100000,
    },
    {
      id: 'volume_250t',
      title: 'Четверть миллиона',
      description:
        'Переместить 250 000 кг.',
      current: stats.totalVolume,
      target: 250000,
      kind: 'kg',
      unlocked:
        stats.totalVolume >= 250000,
    },
    {
      id: 'volume_500t',
      title: 'Полмиллиона',
      description:
        'Переместить 500 000 кг.',
      current: stats.totalVolume,
      target: 500000,
      kind: 'kg',
      unlocked:
        stats.totalVolume >= 500000,
    },
    {
      id: 'volume_750t',
      title: 'Три четверти пути',
      description:
        'Переместить 750 000 кг.',
      current: stats.totalVolume,
      target: 750000,
      kind: 'kg',
      unlocked:
        stats.totalVolume >= 750000,
    },
    {
      id: 'million',
      title: 'Миллионник',
      description:
        'Переместить 1 000 000 кг. Цель жизни.',
      current: stats.totalVolume,
      target: 1000000,
      kind: 'kg',
      unlocked:
        stats.totalVolume >= 1000000,
    },

    {
      id: 'single_2500',
      title: 'Наряд усилен',
      description:
        'Набрать 2,5 тонны за одну тренировку.',
      current:
        stats.bestWorkoutVolume,
      target: 2500,
      kind: 'kg',
      unlocked:
        stats.bestWorkoutVolume >= 2500,
    },
    {
      id: 'single_5000',
      title: 'Пять за выход',
      description:
        'Набрать 5 тонн за одну тренировку.',
      current:
        stats.bestWorkoutVolume,
      target: 5000,
      kind: 'kg',
      unlocked:
        stats.bestWorkoutVolume >= 5000,
    },
    {
      id: 'single_10000',
      title: 'Тяжёлый день',
      description:
        'Набрать 10 тонн за одну тренировку.',
      current:
        stats.bestWorkoutVolume,
      target: 10000,
      kind: 'kg',
      unlocked:
        stats.bestWorkoutVolume >= 10000,
    },

    {
      id: 'records_3',
      title: 'Освоение имущества',
      description:
        'Установить нормативы в 3 упражнениях.',
      current: records.length,
      target: 3,
      kind: 'count',
      unlocked:
        records.length >= 3,
    },
    {
      id: 'records_5',
      title: 'Штатное вооружение',
      description:
        'Установить нормативы в 5 упражнениях.',
      current: records.length,
      target: 5,
      kind: 'count',
      unlocked:
        records.length >= 5,
    },
  ];

  return items;
};

const formatAchievementProgress = (
  item: Achievement
) => {
  const current = Math.min(
    item.current,
    item.target
  );

  if (item.kind === 'kg') {
    return `${formatWeight(
      current
    )} / ${formatWeight(
      item.target
    )}`;
  }

  return `${Math.floor(
    current
  )} / ${item.target}`;
};

const MONTH_NAMES = [
  'ЯНВАРЬ',
  'ФЕВРАЛЬ',
  'МАРТ',
  'АПРЕЛЬ',
  'МАЙ',
  'ИЮНЬ',
  'ИЮЛЬ',
  'АВГУСТ',
  'СЕНТЯБРЬ',
  'ОКТЯБРЬ',
  'НОЯБРЬ',
  'ДЕКАБРЬ',
];

const WEEKDAY_SHORT = [
  'ПН',
  'ВТ',
  'СР',
  'ЧТ',
  'ПТ',
  'СБ',
  'ВС',
];

const toDateKey = (date: Date) => {
  const year = date.getFullYear();
  const month = String(
    date.getMonth() + 1
  ).padStart(2, '0');
  const day = String(
    date.getDate()
  ).padStart(2, '0');

  return `${year}-${month}-${day}`;
};

const fromDateKey = (
  key: string
) => {
  const [year, month, day] = key
    .split('-')
    .map(Number);

  return new Date(
    year,
    month - 1,
    day,
    12,
    0,
    0,
    0
  );
};

const addCalendarDays = (
  date: Date,
  days: number
) => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
};

const startOfCalendarWeek = (
  date: Date
) => {
  const next = new Date(date);
  const day = next.getDay();
  const mondayOffset =
    day === 0 ? -6 : 1 - day;

  next.setDate(
    next.getDate() + mondayOffset
  );
  next.setHours(12, 0, 0, 0);
  return next;
};

const getMonthGrid = (
  cursor: Date
) => {
  const first = new Date(
    cursor.getFullYear(),
    cursor.getMonth(),
    1,
    12
  );

  const start =
    startOfCalendarWeek(first);

  return Array.from(
    { length: 42 },
    (_, index) =>
      addCalendarDays(start, index)
  );
};

const getWeekGrid = (
  selectedKey: string
) => {
  const start = startOfCalendarWeek(
    fromDateKey(selectedKey)
  );

  return Array.from(
    { length: 7 },
    (_, index) =>
      addCalendarDays(start, index)
  );
};

const formatCalendarDate = (
  key: string
) => {
  const date = fromDateKey(key);
  const weekday = WEEKDAY_SHORT[
    (date.getDay() + 6) % 7
  ];

  return `${weekday}, ${String(
    date.getDate()
  ).padStart(2, '0')}.${String(
    date.getMonth() + 1
  ).padStart(2, '0')}.${date.getFullYear()}`;
};

const formatWeekRange = (
  selectedKey: string
) => {
  const week = getWeekGrid(
    selectedKey
  );
  const first = week[0];
  const last = week[6];

  const firstText = `${String(
    first.getDate()
  ).padStart(2, '0')}.${String(
    first.getMonth() + 1
  ).padStart(2, '0')}`;

  const lastText = `${String(
    last.getDate()
  ).padStart(2, '0')}.${String(
    last.getMonth() + 1
  ).padStart(2, '0')}`;

  return `${firstText} — ${lastText}`;
};

const formatDate = (iso: string) => {
  const date = new Date(iso);

  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();

  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');

  return `${day}.${month}.${year}  ${hours}:${minutes}`;
};

function WorkoutApp() {
  const [db, setDb] = useState<SQLite.SQLiteDatabase | null>(null);
  const [ready, setReady] = useState(false);

  const [screen, setScreen] = useState<Screen>('summary');
  const pagerRef = useRef<any>(null);

  const [workout, setWorkout] = useState<WorkoutExercise[]>([]);
  const [completedExercises, setCompletedExercises] =
    useState<WorkoutExercise[]>([]);
  const workoutScrollRef = useRef<ScrollView>(null);

  const [catalog, setCatalog] = useState<CatalogExercise[]>([]);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [stats, setStats] = useState<Stats>(EMPTY_STATS);
  const [records, setRecords] = useState<PersonalRecord[]>([]);
  const [exerciseProgress, setExerciseProgress] =
    useState<ExerciseProgress[]>([]);
  const [previousResults, setPreviousResults] =
    useState<Record<number, PreviousExerciseResult>>({});
  const [plans, setPlans] = useState<WorkoutPlan[]>([]);
  const [schedule, setSchedule] =
    useState<Record<string, ScheduledPlan>>({});
  const [calendarMode, setCalendarMode] =
    useState<CalendarMode>('month');
  const [selectedCalendarDate, setSelectedCalendarDate] =
    useState(() => toDateKey(new Date()));
  const [calendarCursor, setCalendarCursor] =
    useState(() => new Date());

  const [expandedHistoryId, setExpandedHistoryId] =
    useState<number | null>(null);
  const [archiveDetails, setArchiveDetails] =
    useState<Record<number, ArchiveExercise[]>>({});
  const [loadingHistoryId, setLoadingHistoryId] =
    useState<number | null>(null);
  const [editingHistoryId, setEditingHistoryId] =
    useState<number | null>(null);
  const [historyEditDraft, setHistoryEditDraft] =
    useState<ArchiveExercise[] | null>(null);

  const [settings, setSettings] =
    useState<AppSettings>(DEFAULT_SETTINGS);
  const [bodyWeightInput, setBodyWeightInput] =
    useState('');
  const [resumedWorkout, setResumedWorkout] =
    useState<ResumedWorkout | null>(null);
  const [restRemaining, setRestRemaining] =
    useState(DEFAULT_SETTINGS.restSeconds);
  const [restRunning, setRestRunning] =
    useState(false);

  const [notificationStatus, setNotificationStatus] =
    useState<'unknown' | 'granted' | 'denied'>('unknown');

  const [banner, setBanner] =
    useState<UiBanner | null>(null);
  const [eventOverlay, setEventOverlay] =
    useState<EventOverlay | null>(null);
  const [dialog, setDialog] =
    useState<AppDialog | null>(null);

  const bannerAnim = useRef(new Animated.Value(0)).current;
  const overlayAnim = useRef(new Animated.Value(0)).current;
  const dialogAnim = useRef(new Animated.Value(0)).current;
  const levelProgressAnim =
    useRef(new Animated.Value(0)).current;

  const bannerTimerRef = useRef<any>(null);
  const restDeadlineRef = useRef<number | null>(null);
  const restNotificationIdRef = useRef<string | null>(null);
  const appStateRef = useRef(AppState.currentState);
  const unlockedAchievementIdsRef =
    useRef<Set<string> | null>(null);

  const [folders, setFolders] =
    useState<ExerciseFolder[]>([]);
  const [newFolderName, setNewFolderName] =
    useState('');
  const [newExerciseFolderId, setNewExerciseFolderId] =
    useState<number | null>(null);
  const [settingsOpen, setSettingsOpen] =
    useState(false);

  const [planName, setPlanName] = useState('');
  const [planDraft, setPlanDraft] = useState<Record<number, number>>({});

  const [newName, setNewName] = useState('');
  const [newGroup, setNewGroup] = useState('');
  const [newFactor, setNewFactor] = useState<1 | 2>(1);
  const [newLoadType, setNewLoadType] =
    useState<ExerciseLoadType>('external');

  const [saving, setSaving] = useState(false);

  const allWorkoutExercises = useMemo(
    () => [
      ...completedExercises,
      ...workout,
    ],
    [completedExercises, workout]
  );

  const currentVolume = useMemo(
    () =>
      calculateVolume(
        allWorkoutExercises,
        settings.bodyWeight
      ),
    [allWorkoutExercises, settings.bodyWeight]
  );

  const levelInfo = useMemo(
    () => getLevelInfo(stats.totalVolume),
    [stats.totalVolume]
  );

  const achievements = useMemo(
    () =>
      buildAchievements(
        stats,
        records
      ),
    [stats, records]
  );

  const unlockedAchievements =
    achievements.filter(
      item => item.unlocked
    ).length;


  const calendarDays = useMemo(
    () =>
      calendarMode === 'month'
        ? getMonthGrid(calendarCursor)
        : getWeekGrid(selectedCalendarDate),
    [
      calendarMode,
      calendarCursor,
      selectedCalendarDate,
    ]
  );

  const completedDateKeys = useMemo(
    () =>
      new Set(
        history.map(item =>
          toDateKey(
            new Date(item.finishedAt)
          )
        )
      ),
    [history]
  );

  useEffect(() => {
    initializeDatabase();
  }, []);

  useEffect(() => {
    if (!db || !ready) return;

    const timer = setTimeout(() => {
      saveDraft(workout);
    }, 250);

    return () => clearTimeout(timer);
  }, [workout, db, ready]);

  useEffect(() => {
    if (!db || !ready) return;

    const timer = setTimeout(() => {
      saveCompletedDraft(
        completedExercises
      );
    }, 250);

    return () => clearTimeout(timer);
  }, [
    completedExercises,
    db,
    ready,
  ]);

  useEffect(() => {
    Animated.timing(levelProgressAnim, {
      toValue:
        levelInfo.progressPercent / 100,
      duration: settings.animations ? 550 : 0,
      useNativeDriver: false,
    }).start();
  }, [
    levelInfo.progressPercent,
    settings.animations,
    levelProgressAnim,
  ]);

  useEffect(() => {
    if (!ready) return;

    const current = new Set(
      achievements
        .filter(item => item.unlocked)
        .map(item => item.id)
    );

    if (
      unlockedAchievementIdsRef.current === null
    ) {
      unlockedAchievementIdsRef.current =
        current;
      return;
    }

    const newlyUnlocked =
      achievements.filter(
        item =>
          item.unlocked &&
          !unlockedAchievementIdsRef.current!.has(
            item.id
          )
      );

    unlockedAchievementIdsRef.current =
      current;

    if (newlyUnlocked.length > 0) {
      const first = newlyUnlocked[0];
      const suffix =
        newlyUnlocked.length > 1
          ? `\nИ ещё: ${newlyUnlocked.length - 1}`
          : '';

      showBanner(
        'ПОЛУЧЕН ЗНАК ОТЛИЧИЯ',
        `${first.title}${suffix}`,
        'record',
        4200
      );

      runHaptic('success');
    }
  }, [achievements, ready]);

  useEffect(() => {
    if (!restRunning) return;

    const tick = () => {
      const deadline =
        restDeadlineRef.current;

      if (!deadline) return;

      const seconds = Math.max(
        0,
        Math.ceil(
          (deadline - Date.now()) / 1000
        )
      );

      setRestRemaining(seconds);

      if (seconds <= 0) {
        restDeadlineRef.current = null;
        setRestRunning(false);

        if (
          appStateRef.current === 'active'
        ) {
          showBanner(
            'ПЕРЕРЫВ ОКОНЧЕН',
            'Продолжить погрузочно-разгрузочные работы.',
            'warning',
            3500
          );

          runHaptic('warning');
        }
      }
    };

    tick();
    const timer = setInterval(tick, 500);

    return () => clearInterval(timer);
  }, [restRunning]);

  useEffect(() => {
    const subscription =
      AppState.addEventListener(
        'change',
        nextState => {
          const previous =
            appStateRef.current;

          appStateRef.current =
            nextState;

          if (
            previous === 'active' &&
            nextState !== 'active' &&
            restRunning
          ) {
            const deadline =
              restDeadlineRef.current;

            if (deadline) {
              const seconds = Math.max(
                1,
                Math.ceil(
                  (deadline - Date.now()) /
                    1000
                )
              );

              scheduleRestNotification(
                seconds
              );
            }
          }

          if (
            nextState === 'active'
          ) {
            cancelRestNotification();

            if (
              restRunning &&
              restDeadlineRef.current
            ) {
              const seconds = Math.max(
                0,
                Math.ceil(
                  (
                    restDeadlineRef.current -
                    Date.now()
                  ) / 1000
                )
              );

              setRestRemaining(seconds);

              if (seconds <= 0) {
                restDeadlineRef.current =
                  null;
                setRestRunning(false);

                showBanner(
                  'ПЕРЕРЫВ ОКОНЧЕН',
                  'Личный состав вернулся как раз вовремя.',
                  'warning',
                  3200
                );

                runHaptic('warning');
              }
            }
          }
        }
      );

    return () => subscription.remove();
  }, [
    restRunning,
    settings.notificationsEnabled,
  ]);

  useEffect(() => {
    if (!ready) return;

    const timer = setTimeout(() => {
      syncPlannedNotifications();
    }, 650);

    return () => clearTimeout(timer);
  }, [
    ready,
    schedule,
    history,
    stats.weekVolume,
    stats.weekWorkoutCount,
    settings.notificationsEnabled,
    settings.workoutHour,
    settings.reminderMinutes,
    settings.missedReminder,
    settings.weeklySummary,
  ]);

  useEffect(() => {
    const subscription =
      Notifications.addNotificationResponseReceivedListener(
        response => {
          const data =
            response.notification.request
              .content.data as any;

          if (
            data?.dateKey &&
            typeof data.dateKey === 'string'
          ) {
            const date =
              fromDateKey(data.dateKey);

            selectCalendarDay(date);
          }

          const target =
            data?.screen as Screen | undefined;

          if (
            target &&
            SCREEN_ORDER.includes(target)
          ) {
            goToScreen(target);
          }
        }
      );

    return () => subscription.remove();
  }, [ready]);

  const runHaptic = async (
    kind:
      | 'light'
      | 'medium'
      | 'success'
      | 'warning'
  ) => {
    if (!settings.vibration) return;

    try {
      if (kind === 'success') {
        await Haptics.notificationAsync(
          Haptics.NotificationFeedbackType.Success
        );
        return;
      }

      if (kind === 'warning') {
        await Haptics.notificationAsync(
          Haptics.NotificationFeedbackType.Warning
        );
        return;
      }

      await Haptics.impactAsync(
        kind === 'medium'
          ? Haptics.ImpactFeedbackStyle.Medium
          : Haptics.ImpactFeedbackStyle.Light
      );
    } catch {
      Vibration.vibrate(
        kind === 'warning'
          ? [0, 160, 90, 160]
          : 80
      );
    }
  };

  const showBanner = (
    title: string,
    body: string,
    tone: UiBanner['tone'] = 'normal',
    duration = 3200
  ) => {
    if (bannerTimerRef.current) {
      clearTimeout(
        bannerTimerRef.current
      );
    }

    const next: UiBanner = {
      id: Date.now(),
      title,
      body,
      tone,
    };

    setBanner(next);
    bannerAnim.stopAnimation();
    bannerAnim.setValue(0);

    if (settings.animations) {
      Animated.spring(bannerAnim, {
        toValue: 1,
        damping: 18,
        stiffness: 220,
        mass: 0.8,
        useNativeDriver: true,
      }).start();
    } else {
      bannerAnim.setValue(1);
    }

    bannerTimerRef.current =
      setTimeout(() => {
        Animated.timing(bannerAnim, {
          toValue: 0,
          duration:
            settings.animations
              ? 220
              : 0,
          useNativeDriver: true,
        }).start(() => {
          setBanner(current =>
            current?.id === next.id
              ? null
              : current
          );
        });
      }, duration);
  };

  const showEvent = (
    event: EventOverlay
  ) => {
    setEventOverlay(event);
    overlayAnim.stopAnimation();
    overlayAnim.setValue(0);

    if (settings.animations) {
      Animated.spring(overlayAnim, {
        toValue: 1,
        damping: 15,
        stiffness: 180,
        mass: 0.9,
        useNativeDriver: true,
      }).start();
    } else {
      overlayAnim.setValue(1);
    }

    runHaptic(
      event.kind === 'level'
        ? 'success'
        : 'medium'
    );
  };

  const closeEvent = () => {
    Animated.timing(overlayAnim, {
      toValue: 0,
      duration:
        settings.animations
          ? 180
          : 0,
      useNativeDriver: true,
    }).start(() => {
      setEventOverlay(null);
    });
  };

  const showDialog = (
    title: string,
    message?: string,
    actions?: DialogAction[]
  ) => {
    const normalizedActions =
      actions && actions.length > 0
        ? actions
        : [
            {
              text: 'ПОНЯЛ',
              style: 'default' as const,
            },
          ];

    const next: AppDialog = {
      id: Date.now(),
      title,
      message,
      actions: normalizedActions,
    };

    setDialog(next);
    dialogAnim.stopAnimation();
    dialogAnim.setValue(0);

    if (settings.animations) {
      Animated.spring(dialogAnim, {
        toValue: 1,
        damping: 18,
        stiffness: 210,
        mass: 0.85,
        useNativeDriver: true,
      }).start();
    } else {
      dialogAnim.setValue(1);
    }

    const hasDestructive = normalizedActions.some(
      action => action.style === 'destructive'
    );

    if (hasDestructive) {
      runHaptic('warning');
    }
  };

  const dismissDialog = (
    afterClose?: () => void
  ) => {
    if (!dialog) {
      afterClose?.();
      return;
    }

    const finish = () => {
      setDialog(null);
      afterClose?.();
    };

    if (!settings.animations) {
      dialogAnim.setValue(0);
      finish();
      return;
    }

    Animated.timing(dialogAnim, {
      toValue: 0,
      duration: 160,
      useNativeDriver: true,
    }).start(finish);
  };

  const pressDialogAction = (
    action: DialogAction
  ) => {
    dismissDialog(() => {
      try {
        const result = action.onPress?.();

        if (
          result &&
          typeof (result as Promise<void>).catch ===
            'function'
        ) {
          (result as Promise<void>).catch(error => {
            console.error(
              'Dialog action:',
              error
            );
          });
        }
      } catch (error) {
        console.error(
          'Dialog action:',
          error
        );
      }
    });
  };

  const ensureNotificationChannel =
    async () => {
      if (Platform.OS !== 'android') {
        return;
      }

      await Notifications.setNotificationChannelAsync(
        'workout-log',
        {
          name: 'Тренировки',
          importance:
            Notifications.AndroidImportance.HIGH,
          vibrationPattern: [
            0,
            180,
            90,
            180,
          ],
        }
      );
    };

  const refreshNotificationPermission =
    async () => {
      try {
        await ensureNotificationChannel();

        const permission =
          await Notifications.getPermissionsAsync();

        const status =
          permission.granted
            ? 'granted'
            : permission.canAskAgain
              ? 'unknown'
              : 'denied';

        setNotificationStatus(status);
        return status;
      } catch (error) {
        console.error(error);
        setNotificationStatus(
          'denied'
        );
        return 'denied' as const;
      }
    };

  const toggleSystemNotifications =
    async () => {
      if (
        settings.notificationsEnabled
      ) {
        await persistSettings({
          ...settings,
          notificationsEnabled:
            false,
        });

        showBanner(
          'УВЕДОМЛЕНИЯ ОТКЛЮЧЕНЫ',
          'График больше не будет орать из шторки.',
          'normal'
        );

        return;
      }

      try {
        await ensureNotificationChannel();

        let permission =
          await Notifications.getPermissionsAsync();

        if (!permission.granted) {
          permission =
            await Notifications.requestPermissionsAsync();
        }

        if (!permission.granted) {
          setNotificationStatus(
            'denied'
          );

          showDialog(
            'Уведомления запрещены',
            'Android не дал разрешение. Его можно включить в системных настройках приложения.'
          );

          return;
        }

        setNotificationStatus(
          'granted'
        );

        await persistSettings({
          ...settings,
          notificationsEnabled:
            true,
        });

        showBanner(
          'УВЕДОМЛЕНИЯ ВКЛЮЧЕНЫ',
          'Канцелярия получила право беспокоить личный состав.',
          'success'
        );

        runHaptic('light');
      } catch (error) {
        console.error(error);

        showDialog(
          'Ошибка уведомлений',
          'Не удалось получить разрешение Android.'
        );
      }
    };

  const cancelManagedNotifications =
    async (
      kinds: string[]
    ) => {
      try {
        const requests =
          await Notifications.getAllScheduledNotificationsAsync();

        for (const request of requests) {
          const data =
            request.content
              .data as any;

          if (
            data?.app ===
              'workout-log' &&
            kinds.includes(
              String(data?.kind ?? '')
            )
          ) {
            await Notifications.cancelScheduledNotificationAsync(
              request.identifier
            );
          }
        }
      } catch (error) {
        console.error(
          'Notification cleanup:',
          error
        );
      }
    };

  const scheduleRestNotification =
    async (
      seconds: number
    ) => {
      if (
        !settings.notificationsEnabled ||
        seconds <= 0
      ) {
        return;
      }

      const permission =
        await Notifications.getPermissionsAsync();

      if (!permission.granted) {
        return;
      }

      await cancelRestNotification();

      try {
        const id =
          await Notifications.scheduleNotificationAsync(
            {
              content: {
                title:
                  'ПЕРЕРЫВ ОКОНЧЕН',
                body:
                  'Вернуться к выполнению задачи.',
                data: {
                  app: 'workout-log',
                  kind: 'rest',
                  screen: 'workout',
                },
              },
              trigger: {
                type:
                  Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
                seconds: Math.max(
                  1,
                  Math.floor(seconds)
                ),
                channelId:
                  Platform.OS ===
                  'android'
                    ? 'workout-log'
                    : undefined,
              } as any,
            }
          );

        restNotificationIdRef.current =
          id;
      } catch (error) {
        console.error(
          'Rest notification:',
          error
        );
      }
    };

  const cancelRestNotification =
    async () => {
      const id =
        restNotificationIdRef.current;

      restNotificationIdRef.current =
        null;

      if (!id) return;

      try {
        await Notifications.cancelScheduledNotificationAsync(
          id
        );
      } catch {
        // Уже сработало или было удалено системой.
      }
    };

  const getNextSundaySummaryDate =
    () => {
      const now = new Date();
      const result = new Date(now);
      const daysUntilSunday =
        (7 - now.getDay()) % 7;

      result.setDate(
        now.getDate() +
          daysUntilSunday
      );
      result.setHours(
        20,
        0,
        0,
        0
      );

      if (
        result.getTime() <=
        now.getTime()
      ) {
        result.setDate(
          result.getDate() + 7
        );
      }

      return result;
    };

  const syncPlannedNotifications =
    async () => {
      const managedKinds = [
        'calendarReminder',
        'missedWorkout',
        'weeklySummary',
      ];

      if (
        !settings.notificationsEnabled
      ) {
        await cancelManagedNotifications(
          managedKinds
        );
        return;
      }

      const permission =
        await Notifications.getPermissionsAsync();

      if (!permission.granted) {
        setNotificationStatus(
          'denied'
        );
        return;
      }

      setNotificationStatus(
        'granted'
      );

      await ensureNotificationChannel();
      await cancelManagedNotifications(
        managedKinds
      );

      const now = Date.now();
      const horizon =
        now +
        28 *
          24 *
          60 *
          60 *
          1000;

      const completed = new Set(
        history.map(item =>
          toDateKey(
            new Date(item.finishedAt)
          )
        )
      );

      for (
        const scheduled
        of Object.values(schedule)
      ) {
        const day =
          fromDateKey(
            scheduled.dateKey
          );

        const workoutDate =
          new Date(
            day.getFullYear(),
            day.getMonth(),
            day.getDate(),
            settings.workoutHour,
            0,
            0,
            0
          );

        if (
          workoutDate.getTime() >
            horizon ||
          workoutDate.getTime() <
            now -
              24 *
                60 *
                60 *
                1000
        ) {
          continue;
        }

        const reminderDate =
          new Date(
            workoutDate.getTime() -
              settings.reminderMinutes *
                60 *
                1000
          );

        if (
          reminderDate.getTime() >
          now
        ) {
          await Notifications.scheduleNotificationAsync(
            {
              content: {
                title:
                  settings.reminderMinutes >
                  0
                    ? 'ПОДГОТОВИТЬСЯ К ВЫПОЛНЕНИЮ'
                    : 'ПО ГРАФИКУ НАЗНАЧЕНО ЗАНЯТИЕ',
                body:
                  settings.reminderMinutes >
                  0
                    ? `${scheduled.planName} · через ${settings.reminderMinutes} мин.`
                    : scheduled.planName,
                data: {
                  app: 'workout-log',
                  kind:
                    'calendarReminder',
                  screen: 'calendar',
                  dateKey:
                    scheduled.dateKey,
                },
              },
              trigger: {
                type:
                  Notifications.SchedulableTriggerInputTypes.DATE,
                date:
                  reminderDate,
                channelId:
                  Platform.OS ===
                  'android'
                    ? 'workout-log'
                    : undefined,
              } as any,
            }
          );
        }

        if (
          settings.missedReminder &&
          !completed.has(
            scheduled.dateKey
          )
        ) {
          const missedDate =
            new Date(
              day.getFullYear(),
              day.getMonth(),
              day.getDate(),
              22,
              0,
              0,
              0
            );

          if (
            missedDate.getTime() >
            now
          ) {
            await Notifications.scheduleNotificationAsync(
              {
                content: {
                  title:
                    'ЗАДАЧА ЧИСЛИТСЯ НЕВЫПОЛНЕННОЙ',
                  body:
                    `${scheduled.planName}. Если занятия сегодня не будет — замечаний нет. Если будет — пора шевелиться.`,
                  data: {
                    app:
                      'workout-log',
                    kind:
                      'missedWorkout',
                    screen:
                      'calendar',
                    dateKey:
                      scheduled.dateKey,
                  },
                },
                trigger: {
                  type:
                    Notifications.SchedulableTriggerInputTypes.DATE,
                  date:
                    missedDate,
                  channelId:
                    Platform.OS ===
                    'android'
                      ? 'workout-log'
                      : undefined,
                } as any,
              }
            );
          }
        }
      }

      if (settings.weeklySummary) {
        const summaryDate =
          getNextSundaySummaryDate();

        await Notifications.scheduleNotificationAsync(
          {
            content: {
              title:
                'НЕДЕЛЬНАЯ СВОДКА',
              body:
                `За последние 7 дней: ${stats.weekWorkoutCount} тренировок · ${formatWeight(stats.weekVolume)}. Подробности в личном деле.`,
              data: {
                app: 'workout-log',
                kind: 'weeklySummary',
                screen: 'profile',
              },
            },
            trigger: {
              type:
                Notifications.SchedulableTriggerInputTypes.DATE,
              date:
                summaryDate,
              channelId:
                Platform.OS ===
                'android'
                  ? 'workout-log'
                  : undefined,
            } as any,
          }
        );
      }
    };

  const initializeDatabase = async () => {
    try {
      const database = await SQLite.openDatabaseAsync('workout-log.db');

      await database.execAsync(`
        PRAGMA journal_mode = WAL;
        PRAGMA foreign_keys = ON;

        CREATE TABLE IF NOT EXISTS exercises (
          id INTEGER PRIMARY KEY NOT NULL,
          name TEXT NOT NULL,
          factor INTEGER NOT NULL DEFAULT 1,
          load_type TEXT NOT NULL DEFAULT 'external'
        );

        CREATE TABLE IF NOT EXISTS workouts (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          started_at TEXT NOT NULL,
          finished_at TEXT NOT NULL,
          total_volume REAL NOT NULL DEFAULT 0
        );

        CREATE TABLE IF NOT EXISTS workout_sets (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          workout_id INTEGER NOT NULL,
          exercise_id INTEGER,
          exercise_name TEXT NOT NULL,
          set_number INTEGER NOT NULL,
          weight REAL NOT NULL,
          reps INTEGER NOT NULL,
          factor INTEGER NOT NULL DEFAULT 1,
          load_type TEXT NOT NULL DEFAULT 'external',
          body_weight REAL,
          additional_weight REAL,
          FOREIGN KEY(workout_id)
            REFERENCES workouts(id)
            ON DELETE CASCADE,
          FOREIGN KEY(exercise_id)
            REFERENCES exercises(id)
            ON DELETE SET NULL
        );

        CREATE TABLE IF NOT EXISTS app_state (
          key TEXT PRIMARY KEY NOT NULL,
          value TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS workout_plans (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          created_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS workout_plan_items (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          plan_id INTEGER NOT NULL,
          exercise_id INTEGER NOT NULL,
          set_count INTEGER NOT NULL DEFAULT 3,
          sort_order INTEGER NOT NULL DEFAULT 0,
          FOREIGN KEY(plan_id)
            REFERENCES workout_plans(id)
            ON DELETE CASCADE,
          FOREIGN KEY(exercise_id)
            REFERENCES exercises(id)
            ON DELETE CASCADE
        );


        CREATE TABLE IF NOT EXISTS exercise_folders (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          external_key TEXT UNIQUE,
          name TEXT NOT NULL,
          sort_order INTEGER NOT NULL DEFAULT 0
        );

        CREATE TABLE IF NOT EXISTS training_schedule (
          date_key TEXT PRIMARY KEY NOT NULL,
          plan_id INTEGER NOT NULL,
          FOREIGN KEY(plan_id)
            REFERENCES workout_plans(id)
            ON DELETE CASCADE
        );
      `);

      const columns = await database.getAllAsync<{ name: string }>(
        'PRAGMA table_info(exercises)'
      );

      const hasMuscleGroup = columns.some(
        column => column.name === 'muscle_group'
      );

      if (!hasMuscleGroup) {
        await database.execAsync(`
          ALTER TABLE exercises
          ADD COLUMN muscle_group TEXT NOT NULL DEFAULT 'Другое';
        `);
      }

      const exerciseColumns =
        await database.getAllAsync<{ name: string }>(
          'PRAGMA table_info(exercises)'
        );

      const hasExerciseExternalKey =
        exerciseColumns.some(
          column =>
            column.name === 'external_key'
        );

      if (!hasExerciseExternalKey) {
        await database.execAsync(`
          ALTER TABLE exercises
          ADD COLUMN external_key TEXT;
        `);
      }

      const hasExerciseFolderId =
        exerciseColumns.some(
          column =>
            column.name === 'folder_id'
        );

      if (!hasExerciseFolderId) {
        await database.execAsync(`
          ALTER TABLE exercises
          ADD COLUMN folder_id INTEGER;
        `);
      }

      const hasExerciseLoadType =
        exerciseColumns.some(
          column =>
            column.name === 'load_type'
        );

      if (!hasExerciseLoadType) {
        await database.execAsync(`
          ALTER TABLE exercises
          ADD COLUMN load_type TEXT NOT NULL DEFAULT 'external';
        `);
      }

      const workoutSetColumns =
        await database.getAllAsync<{ name: string }>(
          'PRAGMA table_info(workout_sets)'
        );

      if (
        !workoutSetColumns.some(
          column => column.name === 'load_type'
        )
      ) {
        await database.execAsync(`
          ALTER TABLE workout_sets
          ADD COLUMN load_type TEXT NOT NULL DEFAULT 'external';
        `);
      }

      if (
        !workoutSetColumns.some(
          column => column.name === 'body_weight'
        )
      ) {
        await database.execAsync(`
          ALTER TABLE workout_sets
          ADD COLUMN body_weight REAL;
        `);
      }

      if (
        !workoutSetColumns.some(
          column => column.name === 'additional_weight'
        )
      ) {
        await database.execAsync(`
          ALTER TABLE workout_sets
          ADD COLUMN additional_weight REAL;
        `);
      }

      const planColumns =
        await database.getAllAsync<{ name: string }>(
          'PRAGMA table_info(workout_plans)'
        );

      const hasPlanExternalKey =
        planColumns.some(
          column =>
            column.name === 'external_key'
        );

      if (!hasPlanExternalKey) {
        await database.execAsync(`
          ALTER TABLE workout_plans
          ADD COLUMN external_key TEXT;
        `);
      }

      await database.execAsync(`
        UPDATE exercises
        SET external_key =
          'android-exercise-' || id
        WHERE
          external_key IS NULL
          OR TRIM(external_key) = '';

        UPDATE workout_plans
        SET external_key =
          'android-plan-' || id
        WHERE
          external_key IS NULL
          OR TRIM(external_key) = '';

        CREATE UNIQUE INDEX IF NOT EXISTS
          idx_exercises_external_key
        ON exercises(external_key);

        CREATE UNIQUE INDEX IF NOT EXISTS
          idx_workout_plans_external_key
        ON workout_plans(external_key);

        CREATE UNIQUE INDEX IF NOT EXISTS
          idx_exercise_folders_external_key
        ON exercise_folders(external_key);
      `);

      const countRow = await database.getFirstAsync<{ count: number }>(
        'SELECT COUNT(*) AS count FROM exercises'
      );

      if (!countRow || countRow.count === 0) {
        await database.runAsync(
          `
            INSERT INTO exercises
            (id, name, factor, muscle_group)
            VALUES (?, ?, ?, ?)
          `,
          1,
          'Жим гантелей лёжа',
          2,
          'Грудь'
        );

        await database.runAsync(
          `
            INSERT INTO exercises
            (id, name, factor, muscle_group)
            VALUES (?, ?, ?, ?)
          `,
          2,
          'Подъём на бицепс',
          2,
          'Бицепс'
        );
      }

      setDb(database);

      await loadFolders(database);

      const catalogRows =
        await database.getAllAsync<{
          id: number;
          externalKey: string;
          name: string;
          factor: number;
          loadType: string | null;
          muscleGroup: string;
          folderId: number | null;
          folderKey: string | null;
          folderName: string | null;
        }>(`
          SELECT
            e.id,
            e.external_key AS externalKey,
            e.name,
            e.factor,
            e.load_type AS loadType,
            e.muscle_group AS muscleGroup,
            e.folder_id AS folderId,
            f.external_key AS folderKey,
            f.name AS folderName
          FROM exercises e
          LEFT JOIN exercise_folders f
            ON f.id = e.folder_id
          ORDER BY
            CASE
              WHEN f.id IS NULL THEN 1
              ELSE 0
            END,
            f.sort_order ASC,
            f.name COLLATE NOCASE ASC,
            e.name COLLATE NOCASE ASC
        `);

      const normalizedCatalog: CatalogExercise[] =
        catalogRows.map(row => ({
          id: row.id,
          externalKey:
            row.externalKey ||
            `android-exercise-${row.id}`,
          name: row.name,
          factor: row.factor === 2 ? 2 : 1,
          loadType:
            normalizeLoadType(row.loadType),
          muscleGroup: row.muscleGroup || 'Другое',
          folderId:
            row.folderId ?? null,
          folderKey:
            row.folderKey ?? null,
          folderName:
            row.folderName ?? null,
        }));

      setCatalog(normalizedCatalog);

      const catalogMap = new Map(
        normalizedCatalog.map(item => [item.id, item])
      );

      const draftRows =
        await database.getAllAsync<{
          key: string;
          value: string;
        }>(`
          SELECT key, value
          FROM app_state
          WHERE key IN (
            'draft',
            'completed_draft',
            'resumed_workout'
          )
        `);

      const draftState =
        new Map(
          draftRows.map(row => [
            row.key,
            row.value,
          ])
        );

      const normalizeDraft = (
        raw: string | undefined
      ): WorkoutExercise[] => {
        if (!raw) {
          return [];
        }

        try {
          const parsed =
            JSON.parse(
              raw
            ) as WorkoutExercise[];

          if (!Array.isArray(parsed)) {
            return [];
          }

          return parsed.map(item => {
            const catalogItem =
              catalogMap.get(item.id);

            return {
              id: item.id,
              databaseExerciseId:
                item.databaseExerciseId ===
                null
                  ? null
                  : item.databaseExerciseId ??
                    item.id,
              name:
                catalogItem?.name ??
                item.name ??
                'Без названия',
              muscleGroup:
                catalogItem?.muscleGroup ??
                item.muscleGroup ??
                'Другое',
              factor:
                catalogItem?.factor ??
                (item.factor === 2
                  ? 2
                  : 1),
              loadType:
                item.loadType ===
                  'bodyweight' ||
                item.loadType ===
                  'external'
                  ? item.loadType
                  : catalogItem?.loadType ??
                    'external',
              sets:
                Array.isArray(item.sets) &&
                item.sets.length > 0
                  ? item.sets.map(set => ({
                      weight:
                        String(
                          set.weight ?? ''
                        ),
                      reps:
                        String(
                          set.reps ?? ''
                        ),
                      bodyWeight:
                        set.bodyWeight ===
                        undefined
                          ? undefined
                          : String(
                              set.bodyWeight
                            ),
                    }))
                  : [
                      {
                        weight: '',
                        reps: '',
                        bodyWeight: undefined,
                      },
                    ],
            };
          });
        } catch {
          return [];
        }
      };

      const completedDraft =
        normalizeDraft(
          draftState.get(
            'completed_draft'
          )
        );

      const completedIds =
        new Set(
          completedDraft.map(
            item => item.id
          )
        );

      const hasSavedActiveDraft =
        draftState.has('draft');

      const activeDraft =
        hasSavedActiveDraft
          ? normalizeDraft(
              draftState.get('draft')
            ).filter(
              item =>
                !completedIds.has(
                  item.id
                )
            )
          : normalizedCatalog
              .slice(0, 2)
              .filter(
                item =>
                  !completedIds.has(
                    item.id
                  )
              )
              .map(item => ({
                id: item.id,
                name: item.name,
                muscleGroup:
                  item.muscleGroup,
                factor: item.factor,
                loadType: item.loadType,
                sets: [
                  {
                    weight: '',
                    reps: '',
                    bodyWeight: undefined,
                  },
                ],
              }));

      const resumedState =
        draftState.get('resumed_workout');

      if (resumedState) {
        try {
          const parsed = JSON.parse(
            resumedState
          ) as ResumedWorkout;

          if (
            Number.isInteger(parsed.id) &&
            parsed.id > 0 &&
            typeof parsed.startedAt === 'string' &&
            Number.isFinite(parsed.originalVolume)
          ) {
            setResumedWorkout(parsed);
          }
        } catch {
          setResumedWorkout(null);
        }
      }

      setCompletedExercises(
        completedDraft
      );
      setWorkout(activeDraft);

      await loadSettings(database);
      await refreshNotificationPermission();
      await loadHistory(database);
      await loadStats(database);
      await loadPersonalRecords(database);
      await loadExerciseProgress(database);
      await loadPreviousResults(database);
      await loadPlans(database);
      await loadSchedule(database);

      setReady(true);
    } catch (error) {
      console.error(error);

      showDialog(
        'Ошибка базы',
        'SQLite решил уйти в самоволку. Смотри лог в Termux.'
      );
    }
  };

  const loadFolders = async (
    database: SQLite.SQLiteDatabase = db!
  ) => {
    if (!database) return;

    const rows =
      await database.getAllAsync<{
        id: number;
        externalKey: string | null;
        name: string;
        sortOrder: number;
      }>(`
        SELECT
          id,
          external_key AS externalKey,
          name,
          sort_order AS sortOrder
        FROM exercise_folders
        ORDER BY
          sort_order ASC,
          name COLLATE NOCASE ASC
      `);

    for (const row of rows) {
      if (!row.externalKey) {
        const key =
          `android-folder-${row.id}`;

        await database.runAsync(
          `
            UPDATE exercise_folders
            SET external_key = ?
            WHERE id = ?
          `,
          key,
          row.id
        );

        row.externalKey = key;
      }
    }

    setFolders(
      rows.map(row => ({
        id: row.id,
        externalKey:
          row.externalKey ||
          `android-folder-${row.id}`,
        name: row.name,
        sortOrder:
          Number(row.sortOrder) || 0,
      }))
    );
  };

  const loadCatalog = async (
    database: SQLite.SQLiteDatabase = db!
  ) => {
    if (!database) return;

    const rows = await database.getAllAsync<{
      id: number;
      externalKey: string;
      name: string;
      factor: number;
      loadType: string | null;
      muscleGroup: string;
      folderId: number | null;
      folderKey: string | null;
      folderName: string | null;
    }>(`
      SELECT
        e.id,
        e.external_key AS externalKey,
        e.name,
        e.factor,
        e.load_type AS loadType,
        e.muscle_group AS muscleGroup,
        e.folder_id AS folderId,
        f.external_key AS folderKey,
        f.name AS folderName
      FROM exercises e
      LEFT JOIN exercise_folders f
        ON f.id = e.folder_id
      ORDER BY
        CASE
          WHEN f.id IS NULL THEN 1
          ELSE 0
        END,
        f.sort_order ASC,
        f.name COLLATE NOCASE ASC,
        e.name COLLATE NOCASE ASC
    `);

    setCatalog(
      rows.map(row => ({
        id: row.id,
        externalKey:
          row.externalKey ||
          `android-exercise-${row.id}`,
        name: row.name,
        factor: row.factor === 2 ? 2 : 1,
        loadType:
          normalizeLoadType(row.loadType),
        muscleGroup: row.muscleGroup || 'Другое',
        folderId:
          row.folderId ?? null,
        folderKey:
          row.folderKey ?? null,
        folderName:
          row.folderName ?? null,
      }))
    );
  };

  const loadSettings = async (
    database: SQLite.SQLiteDatabase = db!
  ) => {
    if (!database) return;

    const row = await database.getFirstAsync<{
      value: string;
    }>(
      `SELECT value FROM app_state WHERE key = ?`,
      'settings'
    );

    let next = DEFAULT_SETTINGS;

    if (row?.value) {
      try {
        const parsed = JSON.parse(row.value);
        next = {
          bodyWeight:
            typeof parsed.bodyWeight === 'number'
              ? Math.min(
                  500,
                  Math.max(0, parsed.bodyWeight)
                )
              : DEFAULT_SETTINGS.bodyWeight,
          restSeconds:
            typeof parsed.restSeconds === 'number'
              ? Math.min(600, Math.max(15, parsed.restSeconds))
              : DEFAULT_SETTINGS.restSeconds,
          randomMessages:
            typeof parsed.randomMessages === 'boolean'
              ? parsed.randomMessages
              : DEFAULT_SETTINGS.randomMessages,
          vibration:
            typeof parsed.vibration === 'boolean'
              ? parsed.vibration
              : DEFAULT_SETTINGS.vibration,
          animations:
            typeof parsed.animations === 'boolean'
              ? parsed.animations
              : DEFAULT_SETTINGS.animations,
          notificationsEnabled:
            typeof parsed.notificationsEnabled === 'boolean'
              ? parsed.notificationsEnabled
              : DEFAULT_SETTINGS.notificationsEnabled,
          workoutHour:
            typeof parsed.workoutHour === 'number'
              ? Math.min(
                  23,
                  Math.max(
                    0,
                    Math.round(
                      parsed.workoutHour
                    )
                  )
                )
              : DEFAULT_SETTINGS.workoutHour,
          reminderMinutes:
            typeof parsed.reminderMinutes === 'number'
              ? Math.min(
                  120,
                  Math.max(
                    0,
                    Math.round(
                      parsed.reminderMinutes /
                        15
                    ) * 15
                  )
                )
              : DEFAULT_SETTINGS.reminderMinutes,
          missedReminder:
            typeof parsed.missedReminder === 'boolean'
              ? parsed.missedReminder
              : DEFAULT_SETTINGS.missedReminder,
          weeklySummary:
            typeof parsed.weeklySummary === 'boolean'
              ? parsed.weeklySummary
              : DEFAULT_SETTINGS.weeklySummary,
        };
      } catch {
        next = DEFAULT_SETTINGS;
      }
    }

    setSettings(next);
    setBodyWeightInput(
      next.bodyWeight > 0
        ? String(next.bodyWeight)
        : ''
    );
    setRestRemaining(next.restSeconds);
  };

  const persistSettings = async (
    next: AppSettings
  ) => {
    setSettings(next);

    if (!restRunning) {
      setRestRemaining(next.restSeconds);
    }

    if (!db) return;

    await db.runAsync(
      `
        INSERT INTO app_state (key, value)
        VALUES (?, ?)
        ON CONFLICT(key)
        DO UPDATE SET value = excluded.value
      `,
      'settings',
      JSON.stringify(next)
    );
  };

  const changeRestSeconds = (
    delta: number
  ) => {
    const nextSeconds = Math.min(
      600,
      Math.max(15, settings.restSeconds + delta)
    );

    persistSettings({
      ...settings,
      restSeconds: nextSeconds,
    });
  };

  const commitBodyWeight = (
    rawValue = bodyWeightInput
  ) => {
    const value = Math.min(
      500,
      Math.max(
        0,
        parseNumber(rawValue)
      )
    );

    setBodyWeightInput(
      value > 0 ? String(value) : ''
    );
    persistSettings({
      ...settings,
      bodyWeight: value,
    });
  };

  const resetRestTimer = () => {
    restDeadlineRef.current = null;
    setRestRunning(false);
    setRestRemaining(
      settings.restSeconds
    );
    cancelRestNotification();
    runHaptic('light');
  };

  const addRestSeconds = (
    seconds: number
  ) => {
    const next = Math.min(
      3600,
      Math.max(
        0,
        restRemaining + seconds
      )
    );

    setRestRemaining(next);

    if (restRunning) {
      restDeadlineRef.current =
        Date.now() +
        next * 1000;
    }

    runHaptic('light');
  };

  const toggleRestTimer = () => {
    if (restRunning) {
      const deadline =
        restDeadlineRef.current;

      const next =
        deadline
          ? Math.max(
              0,
              Math.ceil(
                (
                  deadline -
                  Date.now()
                ) / 1000
              )
            )
          : restRemaining;

      restDeadlineRef.current =
        null;
      setRestRemaining(next);
      setRestRunning(false);
      cancelRestNotification();
      runHaptic('light');
      return;
    }

    const seconds =
      restRemaining <= 0
        ? settings.restSeconds
        : restRemaining;

    setRestRemaining(seconds);
    restDeadlineRef.current =
      Date.now() +
      seconds * 1000;
    setRestRunning(true);
    runHaptic('light');
  };

  const loadHistory = async (
    database: SQLite.SQLiteDatabase = db!
  ) => {
    if (!database) return;

    const rows = await database.getAllAsync<{
      id: number;
      finishedAt: string;
      totalVolume: number;
      exerciseCount: number;
    }>(`
      SELECT
        w.id AS id,
        w.finished_at AS finishedAt,
        w.total_volume AS totalVolume,
        COUNT(DISTINCT ws.exercise_name) AS exerciseCount
      FROM workouts w
      LEFT JOIN workout_sets ws
        ON ws.workout_id = w.id
      GROUP BY w.id
      ORDER BY w.id DESC
      LIMIT 100
    `);

    setHistory(rows);
  };

  const loadStats = async (
    database: SQLite.SQLiteDatabase = db!
  ) => {
    if (!database) return;

    const totalRow = await database.getFirstAsync<{
      totalVolume: number;
      workoutCount: number;
      bestWorkoutVolume: number;
    }>(`
      SELECT
        COALESCE(SUM(total_volume), 0) AS totalVolume,
        COUNT(*) AS workoutCount,
        COALESCE(MAX(total_volume), 0) AS bestWorkoutVolume
      FROM workouts
    `);

    const todayRow = await database.getFirstAsync<{
      volume: number;
    }>(`
      SELECT
        COALESCE(SUM(total_volume), 0) AS volume
      FROM workouts
      WHERE
        date(finished_at, 'localtime')
        =
        date('now', 'localtime')
    `);

    const weekRow = await database.getFirstAsync<{
      volume: number;
      workoutCount: number;
    }>(`
      SELECT
        COALESCE(SUM(total_volume), 0) AS volume,
        COUNT(*) AS workoutCount
      FROM workouts
      WHERE
        datetime(finished_at)
        >=
        datetime('now', '-7 days')
    `);

    const previousWeekRow =
      await database.getFirstAsync<{
        volume: number;
      }>(`
        SELECT
          COALESCE(SUM(total_volume), 0) AS volume
        FROM workouts
        WHERE
          datetime(finished_at) >= datetime('now', '-14 days')
          AND datetime(finished_at) < datetime('now', '-7 days')
      `);

    const monthRow =
      await database.getFirstAsync<{
        volume: number;
        workoutCount: number;
      }>(`
        SELECT
          COALESCE(SUM(total_volume), 0) AS volume,
          COUNT(*) AS workoutCount
        FROM workouts
        WHERE
          datetime(finished_at) >= datetime('now', '-30 days')
      `);

    const setRow =
      await database.getFirstAsync<{
        totalSets: number;
        totalReps: number;
      }>(`
        SELECT
          COUNT(*) AS totalSets,
          COALESCE(SUM(reps), 0) AS totalReps
        FROM workout_sets
      `);

    const lastRow = await database.getFirstAsync<{
      id: number;
      finishedAt: string;
      totalVolume: number;
      exerciseCount: number;
    }>(`
      SELECT
        w.id AS id,
        w.finished_at AS finishedAt,
        w.total_volume AS totalVolume,
        COUNT(DISTINCT ws.exercise_name) AS exerciseCount
      FROM workouts w
      LEFT JOIN workout_sets ws
        ON ws.workout_id = w.id
      GROUP BY w.id
      ORDER BY w.id DESC
      LIMIT 1
    `);

    setStats({
      totalVolume: totalRow?.totalVolume ?? 0,
      workoutCount: totalRow?.workoutCount ?? 0,
      todayVolume: todayRow?.volume ?? 0,
      weekVolume: weekRow?.volume ?? 0,
      previousWeekVolume:
        previousWeekRow?.volume ?? 0,
      monthVolume: monthRow?.volume ?? 0,
      weekWorkoutCount:
        weekRow?.workoutCount ?? 0,
      monthWorkoutCount:
        monthRow?.workoutCount ?? 0,
      bestWorkoutVolume:
        totalRow?.bestWorkoutVolume ?? 0,
      totalSets: setRow?.totalSets ?? 0,
      totalReps: setRow?.totalReps ?? 0,
      lastWorkout: lastRow ?? null,
    });
  };

  const saveDraft = async (
    draft: WorkoutExercise[]
  ) => {
    if (!db) return;

    try {
      await db.runAsync(
        `
          INSERT INTO app_state (key, value)
          VALUES (?, ?)
          ON CONFLICT(key)
          DO UPDATE SET value = excluded.value
        `,
        'draft',
        JSON.stringify(draft)
      );
    } catch (error) {
      console.error('Ошибка сохранения черновика:', error);
    }
  };

  const saveCompletedDraft = async (
    draft: WorkoutExercise[]
  ) => {
    if (!db) return;

    try {
      await db.runAsync(
        `
          INSERT INTO app_state (key, value)
          VALUES (?, ?)
          ON CONFLICT(key)
          DO UPDATE SET value = excluded.value
        `,
        'completed_draft',
        JSON.stringify(draft)
      );
    } catch (error) {
      console.error(
        'Ошибка сохранения закрытых упражнений:',
        error
      );
    }
  };

  const updateSet = (
    exerciseId: number,
    setIndex: number,
    field: keyof SetData,
    value: string
  ) => {
    setWorkout(current =>
      current.map(exercise => {
        if (exercise.id !== exerciseId) {
          return exercise;
        }

        const sets = [...exercise.sets];

        sets[setIndex] = {
          ...sets[setIndex],
          [field]: value,
        };

        return {
          ...exercise,
          sets,
        };
      })
    );
  };

  const addSet = (exerciseId: number) => {
    setWorkout(current =>
      current.map(exercise => {
        if (exercise.id !== exerciseId) {
          return exercise;
        }

        const last =
          exercise.sets[
            exercise.sets.length - 1
          ];

        return {
          ...exercise,
          sets: [
            ...exercise.sets,
            {
              weight: last?.weight ?? '',
              reps: last?.reps ?? '',
              bodyWeight:
                last?.bodyWeight,
            },
          ],
        };
      })
    );
  };

  const deleteSet = (
    exerciseId: number,
    setIndex: number
  ) => {
    setWorkout(current =>
      current.map(exercise => {
        if (exercise.id !== exerciseId) {
          return exercise;
        }

        if (exercise.sets.length <= 1) {
          return {
            ...exercise,
            sets: [
              {
                weight: '',
                reps: '',
                bodyWeight:
                  undefined,
              },
            ],
          };
        }

        return {
          ...exercise,
          sets: exercise.sets.filter(
            (_, index) => index !== setIndex
          ),
        };
      })
    );
  };

  const commitFinishedExercise =
    async (
      exercise: WorkoutExercise
    ) => {
      if (!db) return;

      if (
        exercise.loadType ===
          'bodyweight' &&
        exercise.sets.some(
          set =>
            Math.floor(
              parseNumber(set.reps)
            ) > 0 &&
            getSetBodyWeight(
              set,
              settings.bodyWeight
            ) <= 0
        )
      ) {
        showDialog(
          'Не указан вес тела',
          'Открой настройки и укажи массу тела. После этого упражнение можно закрыть без заполнения дополнительного веса.'
        );
        return;
      }

      const validSets =
        exercise.sets
          .map(set => ({
            additionalWeight:
              exercise.loadType ===
              'bodyweight'
                ? Math.max(
                    0,
                    parseNumber(set.weight)
                  )
                : null,
            bodyWeight:
              exercise.loadType ===
              'bodyweight'
                ? getSetBodyWeight(
                    set,
                    settings.bodyWeight
                  )
                : null,
            weight:
              getSetEffectiveWeight(
                exercise,
                set,
                settings.bodyWeight
              ),
            reps:
              Math.floor(
                parseNumber(
                  set.reps
                )
              ),
          }))
          .filter(
            set =>
              set.weight > 0 &&
              set.reps > 0
          );

      if (validSets.length === 0) {
        showDialog(
          'Нечего закрывать',
          'Ни одного полностью заполненного подхода нет.'
        );
        return;
      }

      const closedExercise:
        WorkoutExercise = {
        ...exercise,
        sets:
          validSets.map(set => ({
            weight:
              exercise.loadType ===
              'bodyweight'
                ? String(
                    set.additionalWeight ?? 0
                  )
                : String(set.weight),
            reps:
              String(set.reps),
            bodyWeight:
              exercise.loadType ===
              'bodyweight'
                ? String(
                    set.bodyWeight ?? ''
                  )
                : undefined,
          })),
      };

      const nextCompleted = [
        ...completedExercises.filter(
          item =>
            item.id !==
            exercise.id
        ),
        closedExercise,
      ];

      const nextWorkout =
        workout.filter(
          item =>
            item.id !==
            exercise.id
        );

      try {
        await db.withTransactionAsync(
          async () => {
            await db.runAsync(
              `
                INSERT INTO app_state
                (key, value)
                VALUES (?, ?)
                ON CONFLICT(key)
                DO UPDATE SET
                  value = excluded.value
              `,
              'completed_draft',
              JSON.stringify(
                nextCompleted
              )
            );

            await db.runAsync(
              `
                INSERT INTO app_state
                (key, value)
                VALUES (?, ?)
                ON CONFLICT(key)
                DO UPDATE SET
                  value = excluded.value
              `,
              'draft',
              JSON.stringify(
                nextWorkout
              )
            );
          }
        );

        setCompletedExercises(
          nextCompleted
        );
        setWorkout(nextWorkout);

        const volume =
          calculateVolume([
            closedExercise,
          ], settings.bodyWeight);

        showBanner(
          'УПРАЖНЕНИЕ ЗАКРЫТО',
          `${exercise.name} · ${validSets.length} подх. · ${formatVolumeExact(volume)}`,
          'success',
          2600
        );

        runHaptic('success');

        setTimeout(() => {
          workoutScrollRef.current?.scrollTo(
            {
              y: 0,
              animated:
                settings.animations,
            }
          );
        }, 80);
      } catch (error) {
        console.error(
          'Finish exercise:',
          error
        );

        showDialog(
          'Не записалось',
          'Не удалось закрыть упражнение. Данные оставлены на месте.'
        );
      }
    };

  const finishExercise = (
    exercise: WorkoutExercise
  ) => {
    const hasPartialSet =
      exercise.sets.some(set => {
        const hasWeight =
          set.weight.trim() !== '';
        const hasReps =
          set.reps.trim() !== '';

        const valid = isValidWorkoutSet(
          exercise,
          set,
          settings.bodyWeight
        );

        return (
          (hasWeight || hasReps) &&
          !valid
        );
      });

    if (hasPartialSet) {
      showDialog(
        'Есть незакрытый подход',
        'Неполностью заполненные строки не попадут в тренировку. Закрыть упражнение всё равно?',
        [
          {
            text: 'ОТМЕНА',
            style: 'cancel',
          },
          {
            text: 'ЗАКРЫТЬ',
            onPress: () =>
              commitFinishedExercise(
                exercise
              ),
          },
        ]
      );
      return;
    }

    commitFinishedExercise(
      exercise
    );
  };

  const removeFromWorkout = (
    exerciseId: number
  ) => {
    setWorkout(current =>
      current.filter(
        exercise => exercise.id !== exerciseId
      )
    );
  };

  const addToWorkout = (
    item: CatalogExercise
  ) => {
    const alreadyAdded =
      workout.some(
        exercise =>
          exercise.id === item.id
      ) ||
      completedExercises.some(
        exercise =>
          exercise.id === item.id
      );

    if (alreadyAdded) {
      showDialog(
        'Уже в наряде',
        'Это упражнение уже включено в текущую тренировку или уже закрыто.'
      );

      return;
    }

    setWorkout(current => [
      ...current,
      {
        ...item,
        sets: [
          {
            weight: '',
            reps: '',
            bodyWeight:
              undefined,
          },
        ],
      },
    ]);

    showDialog(
      'Принято',
      `${item.name} добавлено в текущую задачу.`
    );
  };

  const createFolder = async () => {
    if (!db) return;

    const name =
      newFolderName.trim();

    if (!name) {
      showDialog(
        'Нет названия',
        'Папка без названия быстро превращается в склад без инвентаризации.'
      );
      return;
    }

    const duplicate =
      folders.some(
        folder =>
          folder.name
            .trim()
            .toLowerCase() ===
          name.toLowerCase()
      );

    if (duplicate) {
      showDialog(
        'Такая папка уже есть',
        'Дублировать подразделение нет необходимости.'
      );
      return;
    }

    const externalKey =
      `android-folder-${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 7)}`;

    const nextSort =
      folders.length > 0
        ? Math.max(
            ...folders.map(
              item =>
                item.sortOrder
            )
          ) + 1
        : 0;

    await db.runAsync(
      `
        INSERT INTO exercise_folders
        (
          external_key,
          name,
          sort_order
        )
        VALUES (?, ?, ?)
      `,
      externalKey,
      name,
      nextSort
    );

    setNewFolderName('');
    await loadFolders(db);
  };

  const renameFolder = async (
    folder: ExerciseFolder,
    value: string
  ) => {
    if (!db) return;

    const name =
      value.trim() ||
      'Без названия';

    await db.runAsync(
      `
        UPDATE exercise_folders
        SET name = ?
        WHERE id = ?
      `,
      name,
      folder.id
    );

    await loadFolders(db);
    await loadCatalog(db);
  };

  const deleteFolder = (
    folder: ExerciseFolder
  ) => {
    if (!db) return;

    showDialog(
      'УДАЛИТЬ ПАПКУ?',
      `${folder.name}\n\nУпражнения не исчезнут. Они будут перенесены в «Без папки».`,
      [
        {
          text: 'ОТМЕНА',
          style: 'cancel',
        },
        {
          text: 'УДАЛИТЬ',
          style: 'destructive',
          onPress: async () => {
            await db.withTransactionAsync(
              async () => {
                await db.runAsync(
                  `
                    UPDATE exercises
                    SET folder_id = NULL
                    WHERE folder_id = ?
                  `,
                  folder.id
                );

                await db.runAsync(
                  `
                    DELETE FROM exercise_folders
                    WHERE id = ?
                  `,
                  folder.id
                );
              }
            );

            if (
              newExerciseFolderId ===
              folder.id
            ) {
              setNewExerciseFolderId(
                null
              );
            }

            await loadFolders(db);
            await loadCatalog(db);
          },
        },
      ]
    );
  };

  const setExerciseFolder = async (
    item: CatalogExercise,
    folderId: number | null
  ) => {
    if (!db) return;

    await db.runAsync(
      `
        UPDATE exercises
        SET folder_id = ?
        WHERE id = ?
      `,
      folderId,
      item.id
    );

    await loadCatalog(db);
  };

  const chooseExerciseFolder = (
    item: CatalogExercise
  ) => {
    const actions: DialogAction[] = [
      {
        text:
          item.folderId === null
            ? '✓ БЕЗ ПАПКИ'
            : 'БЕЗ ПАПКИ',
        onPress: () =>
          setExerciseFolder(
            item,
            null
          ),
      },
      ...folders.map(folder => ({
        text:
          folder.id === item.folderId
            ? `✓ ${folder.name}`
            : folder.name,
        onPress: () =>
          setExerciseFolder(
            item,
            folder.id
          ),
      })),
      {
        text: 'ОТМЕНА',
        style: 'cancel' as const,
      },
    ];

    showDialog(
      'В КАКУЮ ПАПКУ?',
      item.name,
      actions
    );
  };

  const createExercise = async () => {
    if (!db) return;

    const name = newName.trim();
    const group = newGroup.trim() || 'Другое';

    if (!name) {
      showDialog(
        'Нет названия',
        'Разведка не смогла установить, что именно мы собираемся поднимать.'
      );

      return;
    }

    const id = Date.now();
    const externalKey =
      `android-exercise-${id}`;

    await db.runAsync(
      `
        INSERT INTO exercises
        (
          id,
          external_key,
          name,
          factor,
          load_type,
          muscle_group,
          folder_id
        )
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `,
      id,
      externalKey,
      name,
      newLoadType ===
        'bodyweight'
        ? 1
        : newFactor,
      newLoadType,
      group,
      newExerciseFolderId
    );

    setNewName('');
    setNewGroup('');
    setNewFactor(1);
    setNewLoadType('external');

    await loadCatalog(db);
  };

  const persistCatalogExercise = async (
    item: CatalogExercise
  ) => {
    if (!db) return;

    const name = item.name.trim() || 'Без названия';
    const group = item.muscleGroup.trim() || 'Другое';

    await db.runAsync(
      `
        UPDATE exercises
        SET
          name = ?,
          factor = ?,
          load_type = ?,
          muscle_group = ?
        WHERE id = ?
      `,
      name,
      item.factor,
      item.loadType,
      group,
      item.id
    );

    setCatalog(current =>
      current.map(exercise =>
        exercise.id === item.id
          ? {
              ...exercise,
              name,
              muscleGroup: group,
              loadType: item.loadType,
            }
          : exercise
      )
    );

    setWorkout(current =>
      current.map(exercise =>
        exercise.id === item.id
          ? {
              ...exercise,
              name,
              muscleGroup: group,
              factor: item.factor,
              loadType: item.loadType,
              sets:
                exercise.sets.map(set => ({
                  ...set,
                  bodyWeight:
                    item.loadType ===
                    'bodyweight'
                      ? set.bodyWeight
                      : undefined,
                })),
            }
          : exercise
      )
    );

    setRecords(current =>
      current.map(record =>
        record.exerciseId === item.id
          ? {
              ...record,
              exerciseName: name,
              muscleGroup: group,
              factor: item.factor,
              loadType: item.loadType,
            }
          : record
      )
    );

    setExerciseProgress(current =>
      current.map(progress =>
        progress.exerciseId === item.id
          ? {
              ...progress,
              exerciseName: name,
              muscleGroup: group,
              factor: item.factor,
              loadType: item.loadType,
            }
          : progress
      )
    );
  };

  const updateCatalogLocal = (
    id: number,
    field: 'name' | 'muscleGroup',
    value: string
  ) => {
    setCatalog(current =>
      current.map(item =>
        item.id === id
          ? {
              ...item,
              [field]: value,
            }
          : item
      )
    );
  };

  const toggleCatalogFactor = async (
    item: CatalogExercise
  ) => {
    if (item.loadType === 'bodyweight') {
      showDialog(
        'Множитель уже учтён',
        'Для собственного веса используется ×1: масса тела считается целиком, а дополнительный груз прибавляется сверху.'
      );
      return;
    }

    const next: CatalogExercise = {
      ...item,
      factor: item.factor === 1 ? 2 : 1,
    };

    setCatalog(current =>
      current.map(exercise =>
        exercise.id === item.id
          ? next
          : exercise
      )
    );

    await persistCatalogExercise(next);
  };

  const toggleCatalogLoadType = async (
    item: CatalogExercise
  ) => {
    const next: CatalogExercise = {
      ...item,
      loadType:
        item.loadType === 'bodyweight'
          ? 'external'
          : 'bodyweight',
      factor:
        item.loadType === 'bodyweight'
          ? item.factor
          : 1,
    };

    setCatalog(current =>
      current.map(exercise =>
        exercise.id === item.id
          ? next
          : exercise
      )
    );

    await persistCatalogExercise(next);
  };

  const deleteCatalogExercise = (
    item: CatalogExercise
  ) => {
    showDialog(
      'Списать имущество?',
      `Удалить «${item.name}» из справочника?\n\nСтарые тренировки останутся в архиве.`,
      [
        {
          text: 'ОТМЕНА',
          style: 'cancel',
        },
        {
          text: 'СПИСАТЬ',
          style: 'destructive',
          onPress: async () => {
            if (!db) return;

            try {
              await db.runAsync(
                'DELETE FROM exercises WHERE id = ?',
                item.id
              );

              setWorkout(current =>
                current.filter(
                  exercise =>
                    exercise.id !== item.id
                )
              );

              setCompletedExercises(current =>
                current.map(exercise =>
                  exercise.id === item.id
                    ? {
                        ...exercise,
                        databaseExerciseId: null,
                      }
                    : exercise
                )
              );

              await loadCatalog(db);
              await loadPersonalRecords(db);
              await loadExerciseProgress(db);
              await loadPreviousResults(db);
            } catch (error) {
              console.error(error);

              showDialog(
                'Не вышло',
                'Имущество отказалось списываться.'
              );
            }
          },
        },
      ]
    );
  };

  const loadPreviousResults = async (
    database: SQLite.SQLiteDatabase = db!
  ) => {
    if (!database) return;

    const rows = await database.getAllAsync<{
      exerciseId: number;
      workoutId: number;
      finishedAt: string;
      setNumber: number;
      weight: number;
      reps: number;
      factor: number;
      loadType: string | null;
      bodyWeight: number | null;
      additionalWeight: number | null;
    }>(`
      WITH latest AS (
        SELECT
          exercise_id AS exerciseId,
          MAX(workout_id) AS workoutId
        FROM workout_sets
        WHERE exercise_id IS NOT NULL
        GROUP BY exercise_id
      )
      SELECT
        ws.exercise_id AS exerciseId,
        ws.workout_id AS workoutId,
        w.finished_at AS finishedAt,
        ws.set_number AS setNumber,
        ws.weight AS weight,
        ws.reps AS reps,
        ws.factor AS factor,
        ws.load_type AS loadType,
        ws.body_weight AS bodyWeight,
        ws.additional_weight AS additionalWeight
      FROM workout_sets ws
      JOIN latest l
        ON l.exerciseId = ws.exercise_id
        AND l.workoutId = ws.workout_id
      JOIN workouts w
        ON w.id = ws.workout_id
      ORDER BY
        ws.exercise_id ASC,
        ws.set_number ASC,
        ws.id ASC
    `);

    const next: Record<
      number,
      PreviousExerciseResult
    > = {};

    for (const row of rows) {
      if (!next[row.exerciseId]) {
        next[row.exerciseId] = {
          workoutId: row.workoutId,
          finishedAt: row.finishedAt,
          volume: 0,
          maxWeight: 0,
          sets: [],
        };
      }

      const item =
        next[row.exerciseId];

      const factor:
        | 1
        | 2 =
        row.factor === 2 ? 2 : 1;
      const loadType =
        normalizeLoadType(row.loadType);

      item.sets.push({
        setNumber: row.setNumber,
        weight: row.weight,
        reps: row.reps,
        factor,
        loadType,
        bodyWeight:
          row.bodyWeight ?? null,
        additionalWeight:
          row.additionalWeight ?? null,
      });

      item.volume +=
        row.weight *
        row.reps *
        factor;

      item.maxWeight = Math.max(
        item.maxWeight,
        loadType === 'bodyweight'
          ? row.additionalWeight ?? 0
          : row.weight
      );
    }

    setPreviousResults(next);
  };

  const loadExerciseProgress = async (
    database: SQLite.SQLiteDatabase = db!
  ) => {
    if (!database) return;

    const rows = await database.getAllAsync<{
      workoutId: number;
      finishedAt: string;
      exerciseId: number;
      exerciseName: string;
      muscleGroup: string;
      currentFactor: number;
      currentLoadType: string | null;
      weight: number;
      reps: number;
      factor: number;
      additionalWeight: number | null;
    }>(`
      SELECT
        ws.workout_id AS workoutId,
        w.finished_at AS finishedAt,
        e.id AS exerciseId,
        e.name AS exerciseName,
        e.muscle_group AS muscleGroup,
        e.factor AS currentFactor,
        e.load_type AS currentLoadType,
        ws.weight AS weight,
        ws.reps AS reps,
        ws.factor AS factor,
        ws.additional_weight AS additionalWeight
      FROM workout_sets ws
      JOIN workouts w
        ON w.id = ws.workout_id
      JOIN exercises e
        ON e.id = ws.exercise_id
      ORDER BY
        e.name COLLATE NOCASE ASC,
        ws.workout_id ASC,
        ws.id ASC
    `);

    const grouped = new Map<
      number,
      {
        exerciseId: number;
        exerciseName: string;
        muscleGroup: string;
        factor: 1 | 2;
        loadType: ExerciseLoadType;
        sessions: Map<number, ProgressPoint>;
      }
    >();

    for (const row of rows) {
      if (!grouped.has(row.exerciseId)) {
        grouped.set(row.exerciseId, {
          exerciseId: row.exerciseId,
          exerciseName:
            row.exerciseName,
          muscleGroup:
            row.muscleGroup ||
            'Другое',
          factor:
            row.currentFactor === 2
              ? 2
              : 1,
          loadType:
            normalizeLoadType(
              row.currentLoadType
            ),
          sessions: new Map(),
        });
      }

      const exercise =
        grouped.get(
          row.exerciseId
        )!;

      if (
        !exercise.sessions.has(
          row.workoutId
        )
      ) {
        exercise.sessions.set(
          row.workoutId,
          {
            workoutId: row.workoutId,
            finishedAt:
              row.finishedAt,
            maxWeight: 0,
            volume: 0,
          }
        );
      }

      const session =
        exercise.sessions.get(
          row.workoutId
        )!;

      const factor =
        row.factor === 2 ? 2 : 1;

      session.maxWeight = Math.max(
        session.maxWeight,
        exercise.loadType === 'bodyweight'
          ? row.additionalWeight ?? 0
          : row.weight
      );

      session.volume +=
        row.weight *
        row.reps *
        factor;
    }

    setExerciseProgress(
      Array.from(grouped.values())
        .map(item => ({
          exerciseId:
            item.exerciseId,
          exerciseName:
            item.exerciseName,
          muscleGroup:
            item.muscleGroup,
          factor: item.factor,
          loadType: item.loadType,
          points: Array.from(
            item.sessions.values()
          ).sort(
            (a, b) =>
              a.workoutId -
              b.workoutId
          ),
        }))
        .sort((a, b) =>
          a.exerciseName.localeCompare(
            b.exerciseName,
            'ru'
          )
        )
    );
  };

  const loadPersonalRecords = async (
    database: SQLite.SQLiteDatabase = db!
  ) => {
    if (!database) return;

    const rows = await database.getAllAsync<{
      workoutId: number;
      exerciseId: number;
      exerciseName: string;
      muscleGroup: string;
      currentFactor: number;
      currentLoadType: string | null;
      weight: number;
      reps: number;
      factor: number;
      additionalWeight: number | null;
    }>(`
      SELECT
        ws.workout_id AS workoutId,
        e.id AS exerciseId,
        e.name AS exerciseName,
        e.muscle_group AS muscleGroup,
        e.factor AS currentFactor,
        e.load_type AS currentLoadType,
        ws.weight AS weight,
        ws.reps AS reps,
        ws.factor AS factor,
        ws.additional_weight AS additionalWeight
      FROM workout_sets ws
      JOIN exercises e
        ON e.id = ws.exercise_id
      ORDER BY
        e.name COLLATE NOCASE ASC,
        ws.workout_id ASC,
        ws.id ASC
    `);

    const byExercise = new Map<
      number,
      {
        exerciseId: number;
        exerciseName: string;
        muscleGroup: string;
        factor: 1 | 2;
        loadType: ExerciseLoadType;
        maxWeight: number;
        repsAtMaxWeight: number;
        workoutVolumes: Map<number, number>;
      }
    >();

    for (const row of rows) {
      if (!byExercise.has(row.exerciseId)) {
        byExercise.set(row.exerciseId, {
          exerciseId: row.exerciseId,
          exerciseName: row.exerciseName,
          muscleGroup:
            row.muscleGroup || 'Другое',
          factor:
            row.currentFactor === 2 ? 2 : 1,
          loadType:
            normalizeLoadType(
              row.currentLoadType
            ),
          maxWeight: 0,
          repsAtMaxWeight: 0,
          workoutVolumes: new Map(),
        });
      }

      const item = byExercise.get(
        row.exerciseId
      )!;

      if (
        (
          item.loadType === 'bodyweight'
            ? row.additionalWeight ?? 0
            : row.weight
        ) > item.maxWeight ||
        (
          (
            item.loadType === 'bodyweight'
              ? row.additionalWeight ?? 0
              : row.weight
          ) === item.maxWeight &&
          row.reps > item.repsAtMaxWeight
        )
      ) {
        item.maxWeight =
          item.loadType === 'bodyweight'
            ? row.additionalWeight ?? 0
            : row.weight;
        item.repsAtMaxWeight = row.reps;
      }

      const oldVolume =
        item.workoutVolumes.get(
          row.workoutId
        ) ?? 0;

      item.workoutVolumes.set(
        row.workoutId,
        oldVolume +
          row.weight *
            row.reps *
            (row.factor === 2 ? 2 : 1)
      );
    }

    const nextRecords: PersonalRecord[] =
      Array.from(byExercise.values())
        .map(item => ({
          exerciseId: item.exerciseId,
          exerciseName: item.exerciseName,
          muscleGroup: item.muscleGroup,
          factor: item.factor,
          loadType: item.loadType,
          maxWeight: item.maxWeight,
          repsAtMaxWeight:
            item.repsAtMaxWeight,
          bestWorkoutVolume: Math.max(
            0,
            ...Array.from(
              item.workoutVolumes.values()
            )
          ),
        }))
        .sort(
          (a, b) =>
            b.bestWorkoutVolume -
            a.bestWorkoutVolume
        );

    setRecords(nextRecords);
  };

  const getPreviousPerformance = async (
    database: SQLite.SQLiteDatabase,
    excludedWorkoutId: number | null = null
  ) => {
    const rows =
      await database.getAllAsync<HistoricalSetRow>(`
        SELECT
          ws.workout_id AS workoutId,
          ws.exercise_id AS exerciseId,
          ws.exercise_name AS exerciseName,
          ws.weight AS weight,
          ws.reps AS reps,
          ws.factor AS factor,
          ws.load_type AS loadType,
          ws.body_weight AS bodyWeight,
          ws.additional_weight AS additionalWeight
        FROM workout_sets ws
        WHERE
          ? IS NULL
          OR ws.workout_id != ?
        ORDER BY
          ws.workout_id ASC,
          ws.id ASC
      `, excludedWorkoutId, excludedWorkoutId);

    const historyMap = new Map<
      number,
      {
        hasHistory: boolean;
        maxWeight: number;
        repsByWeight: Map<string, number>;
        volumeByWorkout: Map<number, number>;
        bestWorkoutVolume: number;
      }
    >();

    for (const row of rows) {
      if (row.exerciseId === null) {
        continue;
      }

      if (!historyMap.has(row.exerciseId)) {
        historyMap.set(row.exerciseId, {
          hasHistory: true,
          maxWeight: 0,
          repsByWeight: new Map(),
          volumeByWorkout: new Map(),
          bestWorkoutVolume: 0,
        });
      }

      const item = historyMap.get(
        row.exerciseId
      )!;

      const loadType =
        normalizeLoadType(row.loadType);
      const recordWeight =
        loadType === 'bodyweight'
          ? row.additionalWeight ?? 0
          : row.weight;

      item.maxWeight = Math.max(
        item.maxWeight,
        recordWeight
      );

      const weightKey =
        Number(recordWeight).toFixed(3);

      item.repsByWeight.set(
        weightKey,
        Math.max(
          item.repsByWeight.get(
            weightKey
          ) ?? 0,
          row.reps
        )
      );

      const oldWorkoutVolume =
        item.volumeByWorkout.get(
          row.workoutId
        ) ?? 0;

      item.volumeByWorkout.set(
        row.workoutId,
        oldWorkoutVolume +
          row.weight *
            row.reps *
            (row.factor === 2 ? 2 : 1)
      );
    }

    for (const item of historyMap.values()) {
      item.bestWorkoutVolume = Math.max(
        0,
        ...Array.from(
          item.volumeByWorkout.values()
        )
      );
    }

    return historyMap;
  };

  const detectNewRecords = (
    previous: Awaited<
      ReturnType<typeof getPreviousPerformance>
    >,
    exercises:
      WorkoutExercise[] =
        allWorkoutExercises
  ) => {
    const messages: string[] = [];

    for (const exercise of exercises) {
      const prior = previous.get(exercise.id);

      if (!prior?.hasHistory) {
        continue;
      }

      const validSets = exercise.sets
        .map(set => ({
          weight: getSetRecordWeight(
            exercise,
            set,
            settings.bodyWeight
          ),
          effectiveWeight:
            getSetEffectiveWeight(
              exercise,
              set,
              settings.bodyWeight
            ),
          reps: Math.floor(
            parseNumber(set.reps)
          ),
        }))
        .filter(
          set =>
            set.effectiveWeight > 0 &&
            set.reps > 0
        );

      if (validSets.length === 0) {
        continue;
      }

      const exerciseMessages: string[] = [];

      const currentMaxWeight = Math.max(
        ...validSets.map(
          set => set.weight
        )
      );

      if (
        currentMaxWeight >
        prior.maxWeight
      ) {
        exerciseMessages.push(
          `${exercise.loadType === 'bodyweight' ? 'доп. вес' : 'вес'} ${currentMaxWeight} кг (было ${prior.maxWeight} кг)`
        );
      }

      const bestRepsByWeight =
        new Map<string, {
          weight: number;
          reps: number;
        }>();

      for (const set of validSets) {
        const key =
          set.weight.toFixed(3);

        const current =
          bestRepsByWeight.get(key);

        if (
          !current ||
          set.reps > current.reps
        ) {
          bestRepsByWeight.set(
            key,
            set
          );
        }
      }

      for (const current of
        bestRepsByWeight.values()) {
        const previousReps =
          prior.repsByWeight.get(
            current.weight.toFixed(3)
          );

        if (
          previousReps !== undefined &&
          current.reps > previousReps
        ) {
          exerciseMessages.push(
            `${exercise.loadType === 'bodyweight' && current.weight === 0 ? 'без доп. веса' : `${current.weight} кг`} × ${current.reps} (было × ${previousReps})`
          );
        }
      }

      const currentExerciseVolume =
        validSets.reduce(
          (sum, set) =>
            sum +
            set.effectiveWeight *
              set.reps *
              exercise.factor,
          0
        );

      if (
        currentExerciseVolume >
        prior.bestWorkoutVolume
      ) {
        exerciseMessages.push(
          `тоннаж ${formatWeight(currentExerciseVolume)} (было ${formatWeight(prior.bestWorkoutVolume)})`
        );
      }

      if (exerciseMessages.length > 0) {
        messages.push(
          `${exercise.name}: ${exerciseMessages.join(
            '; '
          )}`
        );
      }
    }

    return messages;
  };

  const toggleHistoryDetails = async (
    item: HistoryItem
  ) => {
    if (expandedHistoryId === item.id) {
      setExpandedHistoryId(null);
      return;
    }

    setExpandedHistoryId(item.id);

    if (archiveDetails[item.id] || !db) {
      return;
    }

    setLoadingHistoryId(item.id);

    try {
      const rows = await db.getAllAsync<{
        exerciseId: number | null;
        exerciseName: string;
        setNumber: number;
        weight: number;
        reps: number;
        factor: number;
        loadType: string | null;
        bodyWeight: number | null;
        additionalWeight: number | null;
      }>(
        `
          SELECT
            exercise_id AS exerciseId,
            exercise_name AS exerciseName,
            set_number AS setNumber,
            weight,
            reps,
            factor,
            load_type AS loadType,
            body_weight AS bodyWeight,
            additional_weight AS additionalWeight
          FROM workout_sets
          WHERE workout_id = ?
          ORDER BY id ASC
        `,
        item.id
      );

      const grouped = new Map<
        string,
        ArchiveExercise
      >();

      for (const row of rows) {
        const key =
          row.exerciseId !== null
            ? `id:${row.exerciseId}`
            : `name:${row.exerciseName}`;

        if (!grouped.has(key)) {
          grouped.set(key, {
            exerciseId:
              row.exerciseId,
            exerciseName:
              row.exerciseName,
            factor:
              row.factor === 2 ? 2 : 1,
            loadType:
              normalizeLoadType(
                row.loadType
              ),
            volume: 0,
            sets: [],
          });
        }

        const exercise =
          grouped.get(key)!;

        const factor =
          row.factor === 2 ? 2 : 1;

        exercise.sets.push({
          setNumber: row.setNumber,
          weight: row.weight,
          reps: row.reps,
          factor,
          loadType:
            normalizeLoadType(
              row.loadType
            ),
          bodyWeight:
            row.bodyWeight ?? null,
          additionalWeight:
            row.additionalWeight ?? null,
        });

        exercise.volume +=
          row.weight *
          row.reps *
          factor;
      }

      setArchiveDetails(current => ({
        ...current,
        [item.id]:
          Array.from(grouped.values()),
      }));
    } catch (error) {
      console.error(error);

      showDialog(
        'Ошибка архива',
        'Не удалось поднять подробности из делопроизводства.'
      );
    } finally {
      setLoadingHistoryId(null);
    }
  };

  const loadSchedule = async (
    database: SQLite.SQLiteDatabase = db!
  ) => {
    if (!database) return;

    const rows = await database.getAllAsync<{
      dateKey: string;
      planId: number;
      planName: string;
    }>(`
      SELECT
        s.date_key AS dateKey,
        s.plan_id AS planId,
        p.name AS planName
      FROM training_schedule s
      JOIN workout_plans p
        ON p.id = s.plan_id
      ORDER BY s.date_key ASC
    `);

    const next: Record<
      string,
      ScheduledPlan
    > = {};

    for (const row of rows) {
      next[row.dateKey] = {
        dateKey: row.dateKey,
        planId: row.planId,
        planName: row.planName,
      };
    }

    setSchedule(next);
  };

  const selectCalendarDay = (
    date: Date
  ) => {
    const key = toDateKey(date);

    setSelectedCalendarDate(key);
    setCalendarCursor(
      new Date(
        date.getFullYear(),
        date.getMonth(),
        1,
        12
      )
    );
  };

  const moveCalendarPeriod = (
    delta: number
  ) => {
    if (calendarMode === 'week') {
      const current = fromDateKey(
        selectedCalendarDate
      );
      const next = addCalendarDays(
        current,
        delta * 7
      );

      selectCalendarDay(next);
      return;
    }

    const next = new Date(
      calendarCursor.getFullYear(),
      calendarCursor.getMonth() + delta,
      1,
      12
    );

    setCalendarCursor(next);
    setSelectedCalendarDate(
      toDateKey(next)
    );
  };

  const jumpCalendarToday = () => {
    const today = new Date();
    selectCalendarDay(today);
  };

  const assignPlanToDate = async (
    dateKey: string,
    plan: WorkoutPlan
  ) => {
    if (!db) return;

    try {
      await db.runAsync(
        `
          INSERT INTO training_schedule
          (date_key, plan_id)
          VALUES (?, ?)
          ON CONFLICT(date_key)
          DO UPDATE SET
            plan_id = excluded.plan_id
        `,
        dateKey,
        plan.id
      );

      await loadSchedule(db);

      showBanner(
        'ПЛАН ЗАКРЕПЛЁН',
        `${plan.name} · ${formatCalendarDate(dateKey)}`,
        'success'
      );
      runHaptic('light');
    } catch (error) {
      console.error(error);

      showDialog(
        'Ошибка графика',
        'Канцелярия не смогла закрепить план за датой.'
      );
    }
  };

  const clearScheduledDate = async (
    dateKey: string
  ) => {
    if (!db) return;

    try {
      await db.runAsync(
        `
          DELETE FROM training_schedule
          WHERE date_key = ?
        `,
        dateKey
      );

      await loadSchedule(db);
    } catch (error) {
      console.error(error);

      showDialog(
        'Ошибка графика',
        'Не удалось снять занятие с даты.'
      );
    }
  };

  const copySelectedWeekForward = () => {
    if (!db) return;

    const sourceWeek =
      getWeekGrid(
        selectedCalendarDate
      );

    const sourceAssignments =
      sourceWeek
        .map((date, index) => {
          const dateKey =
            toDateKey(date);

          const scheduled =
            schedule[dateKey];

          return scheduled
            ? {
                index,
                scheduled,
              }
            : null;
        })
        .filter(
          (
            item
          ): item is {
            index: number;
            scheduled: ScheduledPlan;
          } => item !== null
        );

    if (
      sourceAssignments.length === 0
    ) {
      showDialog(
        'КОПИРОВАТЬ НЕЧЕГО',
        'На выбранной неделе нет ни одного назначенного занятия.'
      );
      return;
    }

    const targetWeek =
      sourceWeek.map(date =>
        addCalendarDays(date, 7)
      );

    const targetHasAssignments =
      targetWeek.some(
        date =>
          Boolean(
            schedule[
              toDateKey(date)
            ]
          )
      );

    const sourceRange =
      formatWeekRange(
        toDateKey(sourceWeek[0])
      );

    const targetRange =
      formatWeekRange(
        toDateKey(targetWeek[0])
      );

    showDialog(
      'РАЗМНОЖИТЬ ГРАФИК?',
      `${sourceRange}\n→ ${targetRange}\n\nБудет скопировано занятий: ${sourceAssignments.length}.${targetHasAssignments
        ? '\n\nВНИМАНИЕ: назначения следующей недели будут заменены.'
        : ''}`,
      [
        {
          text: 'ОТМЕНА',
          style: 'cancel',
        },
        {
          text: 'КОПИРОВАТЬ',
          onPress: async () => {
            if (!db) return;

            try {
              for (
                const targetDate
                of targetWeek
              ) {
                await db.runAsync(
                  `
                    DELETE FROM training_schedule
                    WHERE date_key = ?
                  `,
                  toDateKey(
                    targetDate
                  )
                );
              }

              for (
                const assignment
                of sourceAssignments
              ) {
                const targetDate =
                  targetWeek[
                    assignment.index
                  ];

                await db.runAsync(
                  `
                    INSERT INTO training_schedule
                    (date_key, plan_id)
                    VALUES (?, ?)
                  `,
                  toDateKey(
                    targetDate
                  ),
                  assignment.scheduled
                    .planId
                );
              }

              await loadSchedule(db);

              selectCalendarDay(
                addCalendarDays(
                  fromDateKey(
                    selectedCalendarDate
                  ),
                  7
                )
              );

              showBanner(
                'НЕДЕЛЯ РАЗМНОЖЕНА',
                'График перенесён на следующую неделю. Отдых в документах не обнаружен.',
                'success',
                3800
              );
              runHaptic('success');
            } catch (error) {
              console.error(error);

              showDialog(
                'Ошибка графика',
                'Не удалось скопировать неделю.'
              );
            }
          },
        },
      ]
    );
  };

  const startScheduledPlan = () => {
    const scheduled =
      schedule[selectedCalendarDate];

    if (!scheduled) {
      return;
    }

    const plan = plans.find(
      item =>
        item.id === scheduled.planId
    );

    if (!plan) {
      showDialog(
        'План не найден',
        'Документ числится в графике, но отсутствует в списке планов.'
      );
      return;
    }

    startPlan(plan);
  };

  const loadPlans = async (
    database: SQLite.SQLiteDatabase = db!
  ) => {
    if (!database) return;

    const rows = await database.getAllAsync<{
      planId: number;
      planExternalKey: string;
      planName: string;
      exerciseId: number | null;
      exerciseExternalKey: string | null;
      exerciseName: string | null;
      muscleGroup: string | null;
      factor: number | null;
      loadType: string | null;
      folderId: number | null;
      folderKey: string | null;
      folderName: string | null;
      setCount: number | null;
      sortOrder: number | null;
    }>(`
      SELECT
        p.id AS planId,
        p.external_key AS planExternalKey,
        p.name AS planName,
        e.id AS exerciseId,
        e.external_key AS exerciseExternalKey,
        e.name AS exerciseName,
        e.muscle_group AS muscleGroup,
        e.factor AS factor,
        e.load_type AS loadType,
        e.folder_id AS folderId,
        f.external_key AS folderKey,
        f.name AS folderName,
        pi.set_count AS setCount,
        pi.sort_order AS sortOrder
      FROM workout_plans p
      LEFT JOIN workout_plan_items pi
        ON pi.plan_id = p.id
      LEFT JOIN exercises e
        ON e.id = pi.exercise_id
      LEFT JOIN exercise_folders f
        ON f.id = e.folder_id
      ORDER BY
        p.id DESC,
        pi.sort_order ASC,
        pi.id ASC
    `);

    const grouped = new Map<number, WorkoutPlan>();

    for (const row of rows) {
      if (!grouped.has(row.planId)) {
        grouped.set(row.planId, {
          id: row.planId,
          externalKey:
            row.planExternalKey ||
            `android-plan-${row.planId}`,
          name: row.planName,
          items: [],
        });
      }

      if (
        row.exerciseId !== null &&
        row.exerciseName !== null
      ) {
        grouped.get(row.planId)!.items.push({
          id: row.exerciseId,
          externalKey:
            row.exerciseExternalKey ||
            `android-exercise-${row.exerciseId}`,
          name: row.exerciseName,
          muscleGroup:
            row.muscleGroup || 'Другое',
          factor: row.factor === 2 ? 2 : 1,
          loadType:
            normalizeLoadType(row.loadType),
          folderId:
            row.folderId ?? null,
          folderKey:
            row.folderKey ?? null,
          folderName:
            row.folderName ?? null,
          setCount: Math.max(
            1,
            row.setCount ?? 3
          ),
        });
      }
    }

    setPlans(Array.from(grouped.values()));
  };

  const togglePlanDraftExercise = (
    exerciseId: number
  ) => {
    setPlanDraft(current => {
      const next = { ...current };

      if (next[exerciseId]) {
        delete next[exerciseId];
      } else {
        next[exerciseId] = 3;
      }

      return next;
    });
  };

  const changePlanDraftSets = (
    exerciseId: number,
    delta: number
  ) => {
    setPlanDraft(current => {
      const currentCount =
        current[exerciseId] ?? 3;

      return {
        ...current,
        [exerciseId]: Math.min(
          10,
          Math.max(1, currentCount + delta)
        ),
      };
    });
  };

  const createPlan = async () => {
    if (!db) return;

    const name = planName.trim();
    const selected = catalog.filter(
      item => planDraft[item.id]
    );

    if (!name) {
      showDialog(
        'План без названия',
        'Даже у бардака должно быть наименование.'
      );
      return;
    }

    if (selected.length === 0) {
      showDialog(
        'Пустой план',
        'В план занятий надо включить хотя бы одно упражнение.'
      );
      return;
    }

    try {
      const createdAt =
        new Date().toISOString();
      const externalKey =
        `android-plan-${Date.now()}-${Math.random()
          .toString(36)
          .slice(2, 8)}`;

      const result = await db.runAsync(
        `
          INSERT INTO workout_plans
          (
            external_key,
            name,
            created_at
          )
          VALUES (?, ?, ?)
        `,
        externalKey,
        name,
        createdAt
      );

      const planId = result.lastInsertRowId;

      for (let index = 0; index < selected.length; index++) {
        const item = selected[index];

        await db.runAsync(
          `
            INSERT INTO workout_plan_items
            (
              plan_id,
              exercise_id,
              set_count,
              sort_order
            )
            VALUES (?, ?, ?, ?)
          `,
          planId,
          item.id,
          planDraft[item.id] ?? 3,
          index
        );
      }

      setPlanName('');
      setPlanDraft({});
      await loadPlans(db);

      showDialog(
        'План утверждён',
        'Бумага оформлена. Теперь осталось реально потренироваться.'
      );
    } catch (error) {
      console.error(error);

      showDialog(
        'Ошибка',
        'План не прошёл через канцелярию.'
      );
    }
  };

  const applyPlan = (plan: WorkoutPlan) => {
    const nextWorkout: WorkoutExercise[] =
      plan.items.map(item => ({
        id: item.id,
        name: item.name,
        muscleGroup: item.muscleGroup,
        factor: item.factor,
        loadType: item.loadType,
        sets: Array.from(
          { length: item.setCount },
          () => ({
            weight: '',
            reps: '',
            bodyWeight:
              undefined,
          })
        ),
      }));

    setCompletedExercises([]);
    setWorkout(nextWorkout);
    setResumedWorkout(null);

    if (db) {
      db.runAsync(
        `
          INSERT INTO app_state
          (key, value)
          VALUES (?, ?)
          ON CONFLICT(key)
          DO UPDATE SET
            value = excluded.value
        `,
        'completed_draft',
        '[]'
      ).catch(error =>
        console.error(
          'Clear completed draft:',
          error
        )
      );

      db.runAsync(
        'DELETE FROM app_state WHERE key = ?',
        'resumed_workout'
      ).catch(error =>
        console.error(
          'Clear resumed workout:',
          error
        )
      );
    }

    goToScreen('workout');
  };

  const startPlan = (plan: WorkoutPlan) => {
    if (plan.items.length === 0) {
      showDialog(
        'План пуст',
        'В этом документе уже нечего выполнять.'
      );
      return;
    }

    const hasEnteredData =
      completedExercises.length > 0 ||
      workout.some(
        exercise =>
          exercise.sets.some(
            set =>
              set.weight.trim() !== '' ||
              set.reps.trim() !== ''
          )
      );

    if (!hasEnteredData) {
      applyPlan(plan);
      return;
    }

    showDialog(
      'Заменить текущую задачу?',
      'В текущей тренировке уже есть введённые или закрытые упражнения. Новый план их заменит.',
      [
        {
          text: 'ОТМЕНА',
          style: 'cancel',
        },
        {
          text: 'РАЗВЕРНУТЬ ПЛАН',
          onPress: () => applyPlan(plan),
        },
      ]
    );
  };

  const deletePlan = (plan: WorkoutPlan) => {
    showDialog(
      'Аннулировать план?',
      `Удалить «${plan.name}»?`,
      [
        {
          text: 'ОТМЕНА',
          style: 'cancel',
        },
        {
          text: 'УДАЛИТЬ',
          style: 'destructive',
          onPress: async () => {
            if (!db) return;

            try {
              await db.runAsync(
                'DELETE FROM workout_plans WHERE id = ?',
                plan.id
              );

              await loadPlans(db);
              await loadSchedule(db);
            } catch (error) {
              console.error(error);

              showDialog(
                'Ошибка',
                'Документ отказался уничтожаться.'
              );
            }
          },
        },
      ]
    );
  };

  const startHistoryEdit = (
    item: HistoryItem,
    detail: ArchiveExercise[]
  ) => {
    if (
      resumedWorkout?.id === item.id
    ) {
      showDialog(
        'Доклад находится в работе',
        'Исправляй его через возобновлённую тренировку или сначала отмени возобновление.'
      );
      return;
    }

    setEditingHistoryId(item.id);
    setHistoryEditDraft(
      detail.map(exercise => ({
        ...exercise,
        sets: exercise.sets.map(set => ({ ...set })),
      }))
    );
  };

  const cancelHistoryEdit = () => {
    setEditingHistoryId(null);
    setHistoryEditDraft(null);
  };

  const updateHistorySet = (
    exerciseIndex: number,
    setIndex: number,
    field: 'weight' | 'reps',
    value: string
  ) => {
    setHistoryEditDraft(current => {
      if (!current) return current;

      return current.map((exercise, exIndex) => {
        if (exIndex !== exerciseIndex) return exercise;

        return {
          ...exercise,
          sets: exercise.sets.map((set, index) => {
            if (index !== setIndex) return set;

            if (
              field === 'weight' &&
              exercise.loadType ===
                'bodyweight'
            ) {
              const additionalWeight =
                Math.max(
                  0,
                  parseNumber(value)
                );
              const bodyWeight =
                set.bodyWeight ??
                settings.bodyWeight;

              return {
                ...set,
                additionalWeight,
                bodyWeight,
                weight:
                  bodyWeight +
                  additionalWeight,
              };
            }

            return {
              ...set,
              [field]:
                field === 'reps'
                  ? Math.max(0, Math.floor(parseNumber(value)))
                  : Math.max(0, parseNumber(value)),
            };
          }),
        };
      });
    });
  };

  const saveHistoryEdit = async (
    item: HistoryItem
  ) => {
    if (!db || !historyEditDraft) return;

    const valid = historyEditDraft.flatMap(exercise =>
      exercise.sets
        .filter(set => set.weight > 0 && set.reps > 0)
        .map(set => ({ exercise, set }))
    );

    if (valid.length === 0) {
      showDialog(
        'Пустой доклад',
        'После исправлений не осталось ни одного нормального подхода.'
      );
      return;
    }

    try {
      await db.execAsync('BEGIN TRANSACTION;');

      await db.runAsync(
        'DELETE FROM workout_sets WHERE workout_id = ?',
        item.id
      );

      let totalVolume = 0;

      for (const exercise of historyEditDraft) {
        const validSets = exercise.sets.filter(
          set => set.weight > 0 && set.reps > 0
        );

        for (let index = 0; index < validSets.length; index++) {
          const set = validSets[index];
          const volume =
            set.weight * set.reps * set.factor;

          totalVolume += volume;

          await db.runAsync(
            `
              INSERT INTO workout_sets (
                workout_id,
                exercise_id,
                exercise_name,
                set_number,
                weight,
                reps,
                factor,
                load_type,
                body_weight,
                additional_weight
              )
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `,
            item.id,
            exercise.exerciseId,
            exercise.exerciseName,
            index + 1,
            set.weight,
            set.reps,
            set.factor,
            set.loadType,
            set.bodyWeight,
            set.additionalWeight
          );
        }
      }

      await db.runAsync(
        'UPDATE workouts SET total_volume = ? WHERE id = ?',
        totalVolume,
        item.id
      );

      await db.execAsync('COMMIT;');

      setArchiveDetails(current => {
        const next = { ...current };
        delete next[item.id];
        return next;
      });

      cancelHistoryEdit();
      await loadHistory(db);
      await loadStats(db);
      await loadPersonalRecords(db);
      await loadExerciseProgress(db);
      await loadPreviousResults(db);
      await toggleHistoryDetails(item);

      showDialog(
        'Доклад исправлен',
        'Пересчёт тоннажа, нормативов и статистики выполнен.'
      );
    } catch (error) {
      console.error(error);

      try {
        await db.execAsync('ROLLBACK;');
      } catch {}

      showDialog(
        'Ошибка',
        'Канцелярия не смогла внести исправления.'
      );
    }
  };

  const resumeHistoryWorkout = async (
    item: HistoryItem,
    detail: ArchiveExercise[]
  ) => {
    if (!db) return;

    if (resumedWorkout) {
      showDialog(
        'Доклад уже открыт',
        resumedWorkout.id === item.id
          ? 'Эта тренировка уже возвращена в работу. Добавь упражнения и снова нажми «Завершить задачу».'
          : 'Сначала закончи или отмени уже возобновлённую тренировку.'
      );
      return;
    }

    const hasEnteredData =
      completedExercises.length > 0 ||
      workout.some(exercise =>
        exercise.sets.some(
          set =>
            set.weight.trim() !== '' ||
            set.reps.trim() !== ''
        )
      );

    if (hasEnteredData) {
      showDialog(
        'Текущая задача не пуста',
        'Сначала заверши текущую тренировку или убери введённые подходы. Два доклада в один пакет канцелярия не склеивает.'
      );
      return;
    }

    const workoutRow =
      await db.getFirstAsync<{
        startedAt: string;
      }>(
        `
          SELECT started_at AS startedAt
          FROM workouts
          WHERE id = ?
        `,
        item.id
      );

    if (!workoutRow) {
      showDialog(
        'Доклад не найден',
        'Пока открывали папку, тренировка куда-то испарилась.'
      );
      return;
    }

    const reopened: WorkoutExercise[] =
      detail.map((exercise, index) => {
        const catalogItem =
          exercise.exerciseId === null
            ? undefined
            : catalog.find(
                candidate =>
                  candidate.id ===
                  exercise.exerciseId
              );

        return {
          id:
            exercise.exerciseId ??
            -(item.id * 1000 + index + 1),
          databaseExerciseId:
            exercise.exerciseId,
          name: exercise.exerciseName,
          muscleGroup:
            catalogItem?.muscleGroup ??
            'Архив',
          factor: exercise.factor,
          loadType: exercise.loadType,
          sets: exercise.sets.map(set => ({
            weight:
              exercise.loadType ===
              'bodyweight'
                ? String(
                    set.additionalWeight ??
                      Math.max(
                        0,
                        set.weight -
                          (set.bodyWeight ??
                            settings.bodyWeight)
                      )
                  )
                : String(set.weight),
            reps: String(set.reps),
            bodyWeight:
              exercise.loadType ===
              'bodyweight'
                ? String(
                    set.bodyWeight ??
                      settings.bodyWeight
                  )
                : undefined,
          })),
        };
      });

    const resumed: ResumedWorkout = {
      id: item.id,
      startedAt: workoutRow.startedAt,
      originalVolume: item.totalVolume,
    };

    try {
      await db.withTransactionAsync(
        async () => {
          await db.runAsync(
            `
              INSERT INTO app_state (key, value)
              VALUES (?, ?)
              ON CONFLICT(key)
              DO UPDATE SET value = excluded.value
            `,
            'completed_draft',
            JSON.stringify(reopened)
          );

          await db.runAsync(
            `
              INSERT INTO app_state (key, value)
              VALUES (?, ?)
              ON CONFLICT(key)
              DO UPDATE SET value = excluded.value
            `,
            'draft',
            '[]'
          );

          await db.runAsync(
            `
              INSERT INTO app_state (key, value)
              VALUES (?, ?)
              ON CONFLICT(key)
              DO UPDATE SET value = excluded.value
            `,
            'resumed_workout',
            JSON.stringify(resumed)
          );
        }
      );

      setCompletedExercises(reopened);
      setWorkout([]);
      setResumedWorkout(resumed);
      setEditingHistoryId(null);
      setHistoryEditDraft(null);

      showBanner(
        'ТРЕНИРОВКА ВОЗОБНОВЛЕНА',
        'Старые подходы сохранены. Добавь недостающее упражнение и заверши задачу повторно.',
        'warning',
        4200
      );
      goToScreen('workout');
    } catch (error) {
      console.error(error);
      showDialog(
        'Не удалось возобновить',
        'Архив не отдал тренировку обратно в работу.'
      );
    }
  };

  const cancelResumedWorkout = () => {
    if (!resumedWorkout || !db) return;

    showDialog(
      'Отменить возобновление?',
      'Добавленные после возобновления подходы будут отброшены. Исходная запись в архиве останется как была.',
      [
        {
          text: 'НЕ ОТМЕНЯТЬ',
          style: 'cancel',
        },
        {
          text: 'ОТМЕНИТЬ',
          style: 'destructive',
          onPress: async () => {
            const nextDraft =
              completedExercises.map(
                exercise => ({
                  ...exercise,
                  sets: [
                    {
                      weight: '',
                      reps: '',
                      bodyWeight:
                        undefined,
                    },
                  ],
                })
              );

            await db.withTransactionAsync(
              async () => {
                await db.runAsync(
                  `
                    INSERT INTO app_state (key, value)
                    VALUES (?, ?)
                    ON CONFLICT(key)
                    DO UPDATE SET value = excluded.value
                  `,
                  'draft',
                  JSON.stringify(nextDraft)
                );
                await db.runAsync(
                  `
                    INSERT INTO app_state (key, value)
                    VALUES (?, '[]')
                    ON CONFLICT(key)
                    DO UPDATE SET value = excluded.value
                  `,
                  'completed_draft'
                );
                await db.runAsync(
                  'DELETE FROM app_state WHERE key = ?',
                  'resumed_workout'
                );
              }
            );

            setCompletedExercises([]);
            setWorkout(nextDraft);
            setResumedWorkout(null);
            showBanner(
              'ВОЗОБНОВЛЕНИЕ ОТМЕНЕНО',
              'Архивная тренировка не изменена.',
              'normal'
            );
          },
        },
      ]
    );
  };

  const deleteHistoryWorkout = (
    item: HistoryItem
  ) => {
    if (
      resumedWorkout?.id === item.id
    ) {
      showDialog(
        'Доклад находится в работе',
        'Сначала заверши или отмени возобновление этой тренировки, потом её можно будет удалить.'
      );
      return;
    }

    showDialog(
      'Уничтожить документ?',
      `Удалить тренировку от ${formatDate(item.finishedAt)}?\n\nТоннаж, уровни и рекорды будут пересчитаны.`,
      [
        {
          text: 'ОТМЕНА',
          style: 'cancel',
        },
        {
          text: 'УДАЛИТЬ',
          style: 'destructive',
          onPress: async () => {
            if (!db) return;

            try {
              await db.runAsync(
                'DELETE FROM workouts WHERE id = ?',
                item.id
              );

              setExpandedHistoryId(null);
              setEditingHistoryId(null);
              setHistoryEditDraft(null);
              setArchiveDetails(current => {
                const next = { ...current };
                delete next[item.id];
                return next;
              });

              await loadHistory(db);
              await loadStats(db);
              await loadPersonalRecords(db);
              await loadExerciseProgress(db);
              await loadPreviousResults(db);

              showDialog(
                'Документ уничтожен',
                'Официально этой тренировки больше не существовало.'
              );
            } catch (error) {
              console.error(error);
              showDialog(
                'Ошибка',
                'Архив отказался сжигать документ.'
              );
            }
          },
        },
      ]
    );
  };

  const finishWorkout = async () => {
    if (!db || saving) return;

    const missingBodyWeight =
      allWorkoutExercises.some(
        exercise =>
          exercise.loadType ===
            'bodyweight' &&
          exercise.sets.some(
            set =>
              Math.floor(
                parseNumber(set.reps)
              ) > 0 &&
              getSetBodyWeight(
                set,
                settings.bodyWeight
              ) <= 0
          )
      );

    if (missingBodyWeight) {
      showDialog(
        'Не указан вес тела',
        'Для упражнения с собственным весом сначала укажи массу тела в настройках. Иначе тоннаж получится из воздуха.'
      );
      return;
    }

    const validSets =
      allWorkoutExercises.flatMap(
      exercise =>
        exercise.sets
          .map((set, index) => ({
            exercise,
            set,
            index,
            weight: getSetEffectiveWeight(
              exercise,
              set,
              settings.bodyWeight
            ),
            loadType: exercise.loadType,
            bodyWeight:
              exercise.loadType ===
              'bodyweight'
                ? getSetBodyWeight(
                    set,
                    settings.bodyWeight
                  )
                : null,
            additionalWeight:
              exercise.loadType ===
              'bodyweight'
                ? Math.max(
                    0,
                    parseNumber(set.weight)
                  )
                : null,
            reps: Math.floor(parseNumber(set.reps)),
          }))
          .filter(
            item =>
              item.weight > 0 &&
              item.reps > 0
          )
    );

    if (validSets.length === 0) {
      showDialog(
        'Задача не выполнена',
        'Поднять хотя бы что-нибудь всё-таки придётся.'
      );
      return;
    }

    setSaving(true);

    try {
      const previousPerformance =
        await getPreviousPerformance(
          db,
          resumedWorkout?.id ?? null
        );

      const newRecordMessages =
        detectNewRecords(
          previousPerformance,
          allWorkoutExercises
        );

      const workoutVolume =
        calculateVolume(
          allWorkoutExercises,
          settings.bodyWeight
        );

      const totalAfterSave =
        stats.totalVolume -
        (resumedWorkout?.originalVolume ?? 0) +
        workoutVolume;

      const oldLevel = getLevelInfo(
        stats.totalVolume
      ).level;

      const newLevel = getLevelInfo(
        totalAfterSave
      ).level;

      const now = new Date().toISOString();

      const nextDraft =
        allWorkoutExercises
        .filter(
          exercise =>
            exercise.databaseExerciseId !==
            null
        )
        .map(
          exercise => ({
          ...exercise,
          sets: [
            {
              weight: '',
              reps: '',
              bodyWeight:
                undefined,
            },
          ],
        })
        );

      let workoutId =
        resumedWorkout?.id ?? 0;

      await db.withTransactionAsync(
        async () => {
          if (resumedWorkout) {
            await db.runAsync(
              `
                UPDATE workouts
                SET total_volume = ?
                WHERE id = ?
              `,
              workoutVolume,
              resumedWorkout.id
            );

            await db.runAsync(
              `
                DELETE FROM workout_sets
                WHERE workout_id = ?
              `,
              resumedWorkout.id
            );
          } else {
            const result = await db.runAsync(
              `
                INSERT INTO workouts (
                  started_at,
                  finished_at,
                  total_volume
                )
                VALUES (?, ?, ?)
              `,
              now,
              now,
              workoutVolume
            );

            workoutId =
              result.lastInsertRowId;
          }

          for (const item of validSets) {
            await db.runAsync(
              `
                INSERT INTO workout_sets (
                  workout_id,
                  exercise_id,
                  exercise_name,
                  set_number,
                  weight,
                  reps,
                  factor,
                  load_type,
                  body_weight,
                  additional_weight
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
              `,
              workoutId,
              item.exercise.databaseExerciseId ===
              null
                ? null
                : item.exercise.databaseExerciseId ??
                  (
                    item.exercise.id > 0
                      ? item.exercise.id
                      : null
                  ),
              item.exercise.name,
              item.index + 1,
              item.weight,
              item.reps,
              item.exercise.factor,
              item.loadType,
              item.bodyWeight,
              item.additionalWeight
            );
          }

          await db.runAsync(
            `
              INSERT INTO app_state
              (key, value)
              VALUES (?, ?)
              ON CONFLICT(key)
              DO UPDATE SET
                value = excluded.value
            `,
            'draft',
            JSON.stringify(
              nextDraft
            )
          );

          await db.runAsync(
            `
              INSERT INTO app_state
              (key, value)
              VALUES (?, ?)
              ON CONFLICT(key)
              DO UPDATE SET
                value = excluded.value
            `,
            'completed_draft',
            '[]'
          );

          await db.runAsync(
            `
              DELETE FROM app_state
              WHERE key = ?
            `,
            'resumed_workout'
          );
        }
      );

      setCompletedExercises([]);
      setWorkout(nextDraft);
      setResumedWorkout(null);

      if (resumedWorkout) {
        setArchiveDetails(current => {
          const next = { ...current };
          delete next[resumedWorkout.id];
          return next;
        });
      }

      await loadHistory(db);
      await loadStats(db);
      await loadPersonalRecords(db);
      await loadExerciseProgress(db);
      await loadPreviousResults(db);

      if (newLevel > oldLevel) {
        const promoted =
          getLevelInfo(
            totalAfterSave
          );

        const recordBlock =
          newRecordMessages.length > 0
            ? `\n\nНОРМАТИВЫ ПРЕВЫШЕНЫ:\n${newRecordMessages
                .slice(0, 5)
                .join('\n')}`
            : '';

        const footer = settings.randomMessages
          ? `\n\n${pickRandom(RECORD_FOOTERS)}`
          : '';

        showEvent({
          kind: 'level',
          eyebrow:
            'ПРИКАЗ О ПОВЫШЕНИИ',
          title:
            `УРОВЕНЬ ${promoted.level}`,
          subtitle:
            promoted.title,
          body:
            `Основание: перемещено достаточно тяжёлых предметов.\n\nЗа тренировку: ${formatWeight(workoutVolume)}${recordBlock}${footer}`,
        });
      } else if (
        newRecordMessages.length > 0
      ) {
        const footer = settings.randomMessages
          ? pickRandom(RECORD_FOOTERS)
          : 'Начальство вынуждено заметить.';

        showEvent({
          kind: 'record',
          eyebrow:
            'НОРМАТИВ ПРЕВЫШЕН',
          title:
            'ЛИЧНЫЙ РЕКОРД',
          subtitle:
            'Предыдущие показатели списаны в архив.',
          body:
            `${newRecordMessages
              .slice(0, 6)
              .join('\n\n')}\n\n${footer}`,
        });
      } else {
        const message = settings.randomMessages
          ? pickRandom(COMPLETION_MESSAGES)
          : 'Подходы учтены. Замечаний нет.';

        showBanner(
          resumedWorkout
            ? 'ДОКЛАД ДОПОЛНЕН'
            : 'ЗАДАЧА ВЫПОЛНЕНА',
          `${formatWeight(workoutVolume)} · ${resumedWorkout ? 'Исходная тренировка обновлена без дубля.' : message}`,
          'success',
          4200
        );
        runHaptic('success');
      }

      goToScreen('summary');
    } catch (error) {
      console.error(error);

      showDialog(
        'Ошибка',
        'Тренировка не попала в журнал. Канцелярия опять проебалась.'
      );
    } finally {
      setSaving(false);
    }
  };

  const goToScreen = (
    target: Screen
  ) => {
    const index =
      SCREEN_ORDER.indexOf(target);

    if (index === -1) {
      return;
    }

    setScreen(target);
    pagerRef.current?.setPage(index);
  };

  const renderNavigation = () => {
    const items: {
      key: Screen;
      title: string;
    }[] = [
      { key: 'summary', title: 'СВОДКА' },
      { key: 'workout', title: 'ЗАДАЧА' },
      { key: 'plans', title: 'ПЛАНЫ' },
      { key: 'calendar', title: 'ГРАФИК' },
      { key: 'exercises', title: 'ЖЕЛЕЗО' },
      { key: 'profile', title: 'Л/ДЕЛО' },
      { key: 'history', title: 'АРХИВ' },
    ];

    return (
      <View style={styles.navShell}>
        <View style={styles.nav}>
          {items.map(item => (
          <TouchableOpacity
            key={item.key}
            style={[
              styles.navButton,
              screen === item.key &&
                styles.navButtonActive,
            ]}
            onPress={() =>
              goToScreen(item.key)
            }
          >
            <Text
              style={[
                styles.navText,
                screen === item.key &&
                  styles.navTextActive,
              ]}
            >
              {item.title}
            </Text>
          </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          style={styles.settingsGear}
          onPress={() =>
            setSettingsOpen(true)
          }
          accessibilityLabel="Настройки"
        >
          <Text style={styles.settingsGearText}>
            ⚙
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderSummary = () => {
    return (
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
      >
        <Text style={styles.kicker}>
          СВОДКА ЛИЧНОГО СОСТАВА
        </Text>

        <Text style={styles.bigTitle}>
          Уровень {levelInfo.level}
        </Text>

        <Text style={styles.rank}>
          {levelInfo.title}
        </Text>

        <View style={styles.levelCard}>
          <View style={styles.levelTop}>
            <View>
              <Text style={styles.smallLabel}>
                ВСЕГО ПЕРЕМЕЩЕНО
              </Text>

              <Text style={styles.levelVolume}>
                {formatWeight(
                  stats.totalVolume
                )}
              </Text>
            </View>

            <View style={styles.levelRight}>
              <Text style={styles.smallLabel}>
                ДО ПОВЫШЕНИЯ
              </Text>

              <Text style={styles.levelRemaining}>
                {formatWeight(
                  levelInfo.remainingKg
                )}
              </Text>
            </View>
          </View>

          <View style={styles.progressTrack}>
            <Animated.View
              style={[
                styles.progressFill,
                {
                  width:
                    levelProgressAnim.interpolate(
                      {
                        inputRange: [
                          0,
                          1,
                        ],
                        outputRange: [
                          '0%',
                          '100%',
                        ],
                      }
                    ) as any,
                },
              ]}
            />
          </View>

          <Text style={styles.progressText}>
            {formatWeight(
              levelInfo.progressKg
            )}
            {' / '}
            {formatWeight(
              levelInfo.requiredKg
            )}
          </Text>
        </View>

        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.smallLabel}>
              СЕГОДНЯ
            </Text>

            <Text style={styles.statValue}>
              {formatWeight(
                stats.todayVolume
              )}
            </Text>
          </View>

          <View style={styles.statCard}>
            <Text style={styles.smallLabel}>
              7 ДНЕЙ
            </Text>

            <Text style={styles.statValue}>
              {formatWeight(
                stats.weekVolume
              )}
            </Text>
          </View>
        </View>

        <View style={styles.statCardWide}>
          <Text style={styles.smallLabel}>
            ВЫПОЛНЕНО ЗАДАЧ
          </Text>

          <Text style={styles.statValue}>
            {stats.workoutCount}
          </Text>
        </View>

        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() =>
            goToScreen('workout')
          }
        >
          <Text style={styles.primaryButtonText}>
            ПРИСТУПИТЬ К ВЫПОЛНЕНИЮ
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() =>
            goToScreen('plans')
          }
        >
          <Text style={styles.secondaryButtonText}>
            ОТКРЫТЬ ПЛАНЫ ЗАНЯТИЙ
          </Text>
        </TouchableOpacity>

        {stats.lastWorkout && (
          <View style={styles.lastMission}>
            <Text style={styles.smallLabel}>
              ПОСЛЕДНЯЯ ЗАДАЧА
            </Text>

            <Text style={styles.lastMissionDate}>
              {formatDate(
                stats.lastWorkout.finishedAt
              )}
            </Text>

            <Text style={styles.lastMissionText}>
              Перемещено:{' '}
              {formatWeight(
                stats.lastWorkout.totalVolume
              )}
            </Text>

            <Text style={styles.lastMissionText}>
              Упражнений:{' '}
              {stats.lastWorkout.exerciseCount}
            </Text>
          </View>
        )}


        <TouchableOpacity
          style={styles.dossierShortcut}
          onPress={() =>
            goToScreen('profile')
          }
        >
          <View>
            <Text style={styles.smallLabel}>
              ЛИЧНОЕ ДЕЛО
            </Text>

            <Text style={styles.dossierTitle}>
              Рекорды и динамика
            </Text>

            <Text style={styles.dossierMeta}>
              Нормативов: {records.length} ·
              достижений: {unlockedAchievements}/
              {achievements.length}
            </Text>
          </View>

          <Text style={styles.dossierArrow}>
            ›
          </Text>
        </TouchableOpacity>
      </ScrollView>
    );
  };

  const renderWorkout = () => {
    return (
      <ScrollView
        ref={workoutScrollRef}
        style={styles.container}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.kicker}>
          ТЕКУЩАЯ ЗАДАЧА
        </Text>

        <Text style={styles.bigTitle}>
          Тренировка
        </Text>

        {resumedWorkout && (
          <View style={styles.resumedWorkoutCard}>
            <View style={{ flex: 1 }}>
              <Text style={styles.resumedWorkoutTitle}>
                ДОКЛАД СНОВА В РАБОТЕ
              </Text>
              <Text style={styles.resumedWorkoutText}>
                Добавленные упражнения войдут в исходную тренировку №{resumedWorkout.id}. Новая запись-дубль не создаётся.
              </Text>
            </View>

            <TouchableOpacity
              style={styles.resumedWorkoutCancel}
              onPress={cancelResumedWorkout}
            >
              <Text style={styles.resumedWorkoutCancelText}>
                ОТМЕНА
              </Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.workoutSummary}>
          <View>
            <Text style={styles.smallLabel}>
              ОСТАЛОСЬ / ГОТОВО
            </Text>

            <Text style={styles.summaryValue}>
              {workout.length} /{' '}
              {completedExercises.length}
            </Text>
          </View>

          <View style={styles.summaryRight}>
            <Text style={styles.smallLabel}>
              ПЕРЕМЕЩЕНО
            </Text>

            <Text style={styles.summaryValue}>
              {formatVolumeExact(
                currentVolume
              )}
            </Text>
          </View>
        </View>

        <View style={styles.timerCard}>
          <View style={styles.timerTop}>
            <View>
              <Text style={styles.smallLabel}>
                ТАЙМЕР ОТДЫХА
              </Text>

              <Text style={styles.timerValue}>
                {formatTimer(restRemaining)}
              </Text>
            </View>

            <Text style={styles.timerState}>
              {restRunning
                ? 'ОТДЫХ ИДЁТ'
                : restRemaining === 0
                  ? 'ВРЕМЯ ВЫШЛО'
                  : 'ГОТОВ'}
            </Text>
          </View>

          <View style={styles.timerButtons}>
            <TouchableOpacity
              style={styles.timerMainButton}
              onPress={toggleRestTimer}
            >
              <Text style={styles.timerMainText}>
                {restRunning ? 'ПАУЗА' : 'СТАРТ'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.timerSmallButton}
              onPress={() =>
                addRestSeconds(30)
              }
            >
              <Text style={styles.timerSmallText}>
                +30
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.timerSmallButton}
              onPress={resetRestTimer}
            >
              <Text style={styles.timerSmallText}>
                СБРОС
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {workout.length === 0 && (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>
              {completedExercises.length > 0
                ? 'Все упражнения закрыты'
                : 'Наряд пуст'}
            </Text>

            <Text style={styles.emptyText}>
              {completedExercises.length > 0
                ? 'Подходы записаны. Осталось завершить тренировку целиком.'
                : 'Личный состав прибыл, а поднимать нечего.'}
            </Text>
          </View>
        )}

        {workout.map(exercise => (
          <View
            key={exercise.id}
            style={styles.exerciseCard}
          >
            <View style={styles.exerciseHeader}>
              <View style={styles.exerciseTitleWrap}>
                <Text style={styles.exerciseName}>
                  {exercise.name}
                </Text>

                <Text style={styles.exerciseGroup}>
                  {exercise.muscleGroup}
                </Text>
              </View>

              <View style={styles.exerciseBadges}>
                {exercise.loadType ===
                  'bodyweight' && (
                  <View style={styles.bodyweightBadge}>
                    <Text style={styles.bodyweightBadgeText}>
                      СВОЙ ВЕС
                    </Text>
                  </View>
                )}

                <View style={styles.factorBadge}>
                  <Text style={styles.factorText}>
                    ×{exercise.factor}
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.previousResultCard}>
              <Text style={styles.previousResultLabel}>
                {previousResults[exercise.id]
                  ? `ПРОШЛЫЙ РАЗ · ${formatShortDate(
                      previousResults[exercise.id]
                        .finishedAt
                    )}`
                  : 'ПРОШЛЫЙ РАЗ'}
              </Text>

              <Text style={styles.previousResultSets}>
                {formatPreviousSets(
                  previousResults[exercise.id]
                )}
              </Text>

              <Text
                style={[
                  styles.liveStatus,
                  getLiveStatus(
                    exercise,
                    previousResults[exercise.id],
                    settings.bodyWeight
                  ).tone === 'record' &&
                    styles.liveStatusRecord,
                  getLiveStatus(
                    exercise,
                    previousResults[exercise.id],
                    settings.bodyWeight
                  ).tone === 'done' &&
                    styles.liveStatusDone,
                  getLiveStatus(
                    exercise,
                    previousResults[exercise.id],
                    settings.bodyWeight
                  ).tone === 'progress' &&
                    styles.liveStatusProgress,
                ]}
              >
                {
                  getLiveStatus(
                    exercise,
                    previousResults[exercise.id],
                    settings.bodyWeight
                  ).text
                }
              </Text>
            </View>

            {exercise.loadType ===
              'bodyweight' && (
              <TouchableOpacity
                style={styles.bodyweightInfoCard}
                onPress={() =>
                  setSettingsOpen(true)
                }
              >
                <Text style={styles.bodyweightInfoTitle}>
                  ВЕС ТЕЛА: {settings.bodyWeight > 0
                    ? `${settings.bodyWeight} КГ`
                    : 'НЕ УКАЗАН'}
                </Text>
                <Text style={styles.bodyweightInfoText}>
                  В графе ниже — только дополнительный груз. Без блинов оставляй 0 или пусто. Нажми здесь, чтобы изменить вес тела.
                </Text>
              </TouchableOpacity>
            )}

            <View style={styles.tableHeader}>
              <Text
                style={[
                  styles.headerText,
                  styles.numberColumn,
                ]}
              >
                #
              </Text>

              <Text style={styles.headerText}>
                {exercise.loadType ===
                'bodyweight'
                  ? 'ДОП. ВЕС'
                  : 'ВЕС'}
              </Text>

              <Text style={styles.headerText}>
                ПОВТОРЫ
              </Text>

              <View style={styles.deleteColumn} />
            </View>

            {exercise.sets.map(
              (set, index) => (
                <View
                  key={index}
                  style={styles.setRow}
                >
                  <Text style={styles.setNumber}>
                    {index + 1}
                  </Text>

                  <TextInput
                    style={styles.input}
                    keyboardType="decimal-pad"
                    value={set.weight}
                    placeholder={
                      exercise.loadType ===
                      'bodyweight'
                        ? '0 кг'
                        : 'кг'
                    }
                    placeholderTextColor="#626972"
                    onChangeText={value =>
                      updateSet(
                        exercise.id,
                        index,
                        'weight',
                        value
                      )
                    }
                  />

                  <TextInput
                    style={styles.input}
                    keyboardType="number-pad"
                    value={set.reps}
                    placeholder="повт."
                    placeholderTextColor="#626972"
                    onChangeText={value =>
                      updateSet(
                        exercise.id,
                        index,
                        'reps',
                        value
                      )
                    }
                  />

                  <TouchableOpacity
                    style={styles.deleteSet}
                    onPress={() =>
                      deleteSet(
                        exercise.id,
                        index
                      )
                    }
                  >
                    <Text
                      style={
                        styles.deleteSetText
                      }
                    >
                      ×
                    </Text>
                  </TouchableOpacity>
                </View>
              )
            )}

            <TouchableOpacity
              style={styles.textButton}
              onPress={() =>
                addSet(exercise.id)
              }
            >
              <Text
                style={styles.textButtonText}
              >
                + ДОБАВИТЬ ПОДХОД
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.finishExerciseButton}
              onPress={() =>
                finishExercise(exercise)
              }
            >
              <Text
                style={
                  styles.finishExerciseButtonText
                }
              >
                ЗАКОНЧИТЬ УПРАЖНЕНИЕ
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.removeButton}
              onPress={() =>
                removeFromWorkout(
                  exercise.id
                )
              }
            >
              <Text
                style={styles.removeButtonText}
              >
                ИСКЛЮЧИТЬ ИЗ НАРЯДА
              </Text>
            </TouchableOpacity>
          </View>
        ))}

        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() =>
            goToScreen('exercises')
          }
        >
          <Text
            style={styles.secondaryButtonText}
          >
            + ДОБАВИТЬ ИЗ СПИСКА
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.primaryButton,
            saving &&
              styles.buttonDisabled,
          ]}
          onPress={finishWorkout}
          disabled={saving}
        >
          <Text style={styles.primaryButtonText}>
            {saving
              ? 'КАНЦЕЛЯРИЯ РАБОТАЕТ...'
              : 'ЗАВЕРШИТЬ ЗАДАЧУ'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    );
  };

  const renderPlanPickerItem = (
    item: CatalogExercise
  ) => {
    const selected =
      Boolean(planDraft[item.id]);

    const setCount =
      planDraft[item.id] ?? 3;

    return (
      <View
        key={item.id}
        style={[
          styles.planPickerRow,
          selected &&
            styles.planPickerRowActive,
        ]}
      >
        <TouchableOpacity
          style={styles.planPickerInfo}
          onPress={() =>
            togglePlanDraftExercise(
              item.id
            )
          }
        >
          <Text style={styles.planPickerName}>
            {item.name}
          </Text>

          <Text style={styles.planPickerGroup}>
            {item.muscleGroup} · ×
            {item.factor}
          </Text>
        </TouchableOpacity>

        {selected ? (
          <View style={styles.setCountControl}>
            <TouchableOpacity
              style={styles.setCountButton}
              onPress={() =>
                changePlanDraftSets(
                  item.id,
                  -1
                )
              }
            >
              <Text style={styles.setCountButtonText}>
                −
              </Text>
            </TouchableOpacity>

            <Text style={styles.setCountText}>
              {setCount}
            </Text>

            <TouchableOpacity
              style={styles.setCountButton}
              onPress={() =>
                changePlanDraftSets(
                  item.id,
                  1
                )
              }
            >
              <Text style={styles.setCountButtonText}>
                +
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            style={styles.planAddButton}
            onPress={() =>
              togglePlanDraftExercise(
                item.id
              )
            }
          >
            <Text style={styles.planAddButtonText}>
              +
            </Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const renderPlans = () => {
    return (
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.kicker}>
          ПЛАНЫ ЗАНЯТИЙ
        </Text>

        <Text style={styles.bigTitle}>
          Планы
        </Text>

        <TouchableOpacity
          style={styles.calendarShortcut}
          onPress={() =>
            goToScreen('calendar')
          }
        >
          <View style={{ flex: 1 }}>
            <Text style={styles.smallLabel}>
              ГРАФИК ЗАНЯТИЙ
            </Text>

            <Text style={styles.calendarShortcutTitle}>
              Привязать планы к датам
            </Text>
          </View>

          <Text style={styles.dossierArrow}>
            ›
          </Text>
        </TouchableOpacity>

        <View style={styles.createCard}>
          <Text style={styles.createTitle}>
            Новый план
          </Text>

          <TextInput
            style={styles.fullInput}
            value={planName}
            onChangeText={setPlanName}
            placeholder="Например: Грудь / руки"
            placeholderTextColor="#626972"
          />

          <Text style={styles.planSectionLabel}>
            СОСТАВ ПЛАНА
          </Text>

          {catalog.length === 0 ? (
            <Text style={styles.emptyText}>
              Сначала добавь упражнения
              во вкладке «ЖЕЛЕЗО».
            </Text>
          ) : (
            [
              ...folders.map(folder => ({
                key:
                  `plan-folder-${folder.id}`,
                title: folder.name,
                items: catalog.filter(
                  item =>
                    item.folderId ===
                    folder.id
                ),
              })),
              {
                key: 'plan-folder-none',
                title: 'БЕЗ ПАПКИ',
                items: catalog.filter(
                  item =>
                    item.folderId ===
                    null
                ),
              },
            ]
              .filter(
                section =>
                  section.items.length > 0
              )
              .map(section => (
                <View
                  key={section.key}
                  style={styles.planFolderBlock}
                >
                  <View style={styles.planFolderHeader}>
                    <Text style={styles.planFolderTitle}>
                      {section.title}
                    </Text>

                    <Text style={styles.planFolderCount}>
                      {section.items.length}
                    </Text>
                  </View>

                  {section.items.map(
                    renderPlanPickerItem
                  )}
                </View>
              ))
          )}

          <Text style={styles.factorExplanation}>
            Число справа — количество
            подходов, которое развернётся
            при запуске плана.
          </Text>

          <TouchableOpacity
            style={styles.createButton}
            onPress={createPlan}
          >
            <Text
              style={styles.createButtonText}
            >
              УТВЕРДИТЬ ПЛАН
            </Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.planSectionLabel}>
          УТВЕРЖДЁННЫЕ ПЛАНЫ
        </Text>

        {plans.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>
              Планов нет
            </Text>

            <Text style={styles.emptyText}>
              Пока тренировка проводится
              методом «что под руку попалось».
            </Text>
          </View>
        ) : (
          plans.map(plan => (
            <View
              key={plan.id}
              style={styles.planCard}
            >
              <Text style={styles.planTitle}>
                {plan.name}
              </Text>

              <Text style={styles.planMeta}>
                Упражнений: {plan.items.length}
              </Text>

              <View style={styles.planItems}>
                {plan.items.map(item => (
                  <View
                    key={item.id}
                    style={styles.planItemLine}
                  >
                    <Text
                      style={styles.planItemName}
                      numberOfLines={1}
                    >
                      {item.name}
                    </Text>

                    <Text
                      style={styles.planItemSets}
                    >
                      {item.setCount} подх.
                    </Text>
                  </View>
                ))}
              </View>

              <TouchableOpacity
                style={styles.planStartButton}
                onPress={() =>
                  startPlan(plan)
                }
              >
                <Text
                  style={styles.planStartText}
                >
                  РАЗВЕРНУТЬ ЗАДАЧУ
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.planDeleteButton}
                onPress={() =>
                  deletePlan(plan)
                }
              >
                <Text
                  style={styles.planDeleteText}
                >
                  АННУЛИРОВАТЬ ПЛАН
                </Text>
              </TouchableOpacity>
            </View>
          ))
        )}
      </ScrollView>
    );
  };

  const renderCalendar = () => {
    const selected =
      schedule[selectedCalendarDate];

    const selectedPlan = selected
      ? plans.find(
          plan =>
            plan.id === selected.planId
        )
      : null;

    const headerTitle =
      calendarMode === 'month'
        ? `${MONTH_NAMES[
            calendarCursor.getMonth()
          ]} ${calendarCursor.getFullYear()}`
        : formatWeekRange(
            selectedCalendarDate
          );

    return (
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
      >
        <Text style={styles.kicker}>
          ГРАФИК ЗАНЯТИЙ
        </Text>

        <Text style={styles.bigTitle}>
          Календарь
        </Text>

        <View style={styles.calendarModeRow}>
          <TouchableOpacity
            style={[
              styles.calendarModeButton,
              calendarMode === 'month' &&
                styles.calendarModeButtonActive,
            ]}
            onPress={() =>
              setCalendarMode('month')
            }
          >
            <Text
              style={[
                styles.calendarModeText,
                calendarMode === 'month' &&
                  styles.calendarModeTextActive,
              ]}
            >
              МЕСЯЦ
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.calendarModeButton,
              calendarMode === 'week' &&
                styles.calendarModeButtonActive,
            ]}
            onPress={() =>
              setCalendarMode('week')
            }
          >
            <Text
              style={[
                styles.calendarModeText,
                calendarMode === 'week' &&
                  styles.calendarModeTextActive,
              ]}
            >
              НЕДЕЛЯ
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.calendarHeaderCard}>
          <View style={styles.calendarPeriodRow}>
            <TouchableOpacity
              style={styles.calendarArrowButton}
              onPress={() =>
                moveCalendarPeriod(-1)
              }
            >
              <Text style={styles.calendarArrowText}>
                ‹
              </Text>
            </TouchableOpacity>

            <View style={styles.calendarPeriodCenter}>
              <Text style={styles.calendarPeriodTitle}>
                {headerTitle}
              </Text>

              <TouchableOpacity
                onPress={jumpCalendarToday}
              >
                <Text style={styles.calendarTodayText}>
                  ВЕРНУТЬСЯ К СЕГОДНЯ
                </Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.calendarArrowButton}
              onPress={() =>
                moveCalendarPeriod(1)
              }
            >
              <Text style={styles.calendarArrowText}>
                ›
              </Text>
            </TouchableOpacity>
          </View>

          {calendarMode === 'month' ? (
            <>
              <View style={styles.calendarWeekHeader}>
                {WEEKDAY_SHORT.map(day => (
                  <Text
                    key={day}
                    style={styles.calendarWeekday}
                  >
                    {day}
                  </Text>
                ))}
              </View>

              <View style={styles.calendarGrid}>
                {calendarDays.map(date => {
                  const key = toDateKey(date);
                  const scheduled = schedule[key];
                  const selectedDay =
                    key === selectedCalendarDate;
                  const today =
                    key === toDateKey(new Date());
                  const currentMonth =
                    date.getMonth() ===
                    calendarCursor.getMonth();
                  const completed =
                    completedDateKeys.has(key);

                  return (
                    <View
                      key={key}
                      style={styles.calendarCellWrap}
                    >
                      <TouchableOpacity
                        style={[
                          styles.calendarCell,
                          !currentMonth &&
                            styles.calendarCellOutside,
                          today &&
                            styles.calendarCellToday,
                          selectedDay &&
                            styles.calendarCellSelected,
                        ]}
                        onPress={() =>
                          selectCalendarDay(date)
                        }
                      >
                        <Text
                          style={[
                            styles.calendarDayNumber,
                            !currentMonth &&
                              styles.calendarDayNumberOutside,
                            selectedDay &&
                              styles.calendarDayNumberSelected,
                          ]}
                        >
                          {date.getDate()}
                        </Text>

                        {scheduled && (
                          <Text
                            numberOfLines={1}
                            style={[
                              styles.calendarPlanMini,
                              selectedDay &&
                                styles.calendarPlanMiniSelected,
                            ]}
                          >
                            {scheduled.planName}
                          </Text>
                        )}

                        {completed && (
                          <Text
                            style={[
                              styles.calendarDoneMark,
                              selectedDay &&
                                styles.calendarDoneMarkSelected,
                            ]}
                          >
                            ✓
                          </Text>
                        )}
                      </TouchableOpacity>
                    </View>
                  );
                })}
              </View>
            </>
          ) : (
            <View style={styles.weekList}>
              {calendarDays.map((date, index) => {
                const key = toDateKey(date);
                const scheduled = schedule[key];
                const selectedDay =
                  key === selectedCalendarDate;
                const today =
                  key === toDateKey(new Date());
                const completed =
                  completedDateKeys.has(key);

                return (
                  <TouchableOpacity
                    key={key}
                    style={[
                      styles.weekDayRow,
                      selectedDay &&
                        styles.weekDayRowSelected,
                    ]}
                    onPress={() =>
                      selectCalendarDay(date)
                    }
                  >
                    <View style={styles.weekDayDateBlock}>
                      <Text
                        style={[
                          styles.weekDayName,
                          selectedDay &&
                            styles.weekDayNameSelected,
                        ]}
                      >
                        {WEEKDAY_SHORT[index]}
                      </Text>

                      <Text
                        style={[
                          styles.weekDayNumber,
                          selectedDay &&
                            styles.weekDayNumberSelected,
                        ]}
                      >
                        {date.getDate()}
                      </Text>
                    </View>

                    <View style={styles.weekPlanBlock}>
                      <Text
                        style={[
                          styles.weekPlanName,
                          selectedDay &&
                            styles.weekPlanNameSelected,
                        ]}
                        numberOfLines={1}
                      >
                        {scheduled
                          ? scheduled.planName
                          : 'ЗАНЯТИЕ НЕ НАЗНАЧЕНО'}
                      </Text>

                      <Text
                        style={[
                          styles.weekPlanMeta,
                          selectedDay &&
                            styles.weekPlanMetaSelected,
                        ]}
                      >
                        {completed
                          ? 'ВЫПОЛНЕНО ✓'
                          : today
                          ? 'СЕГОДНЯ'
                          : scheduled
                          ? 'ПО ГРАФИКУ'
                          : 'СВОБОДНЫЙ ДЕНЬ'}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>

        {calendarMode === 'week' && (
          <View style={styles.weekCopyCard}>
            <View style={{ flex: 1 }}>
              <Text style={styles.smallLabel}>
                ПОВТОРЕНИЕ ГРАФИКА
              </Text>

              <Text style={styles.weekCopyTitle}>
                Скопировать эту неделю
              </Text>

              <Text style={styles.weekCopyText}>
                Все назначенные планы будут
                перенесены на те же дни
                следующей недели.
              </Text>
            </View>

            <TouchableOpacity
              style={styles.weekCopyButton}
              onPress={copySelectedWeekForward}
            >
              <Text style={styles.weekCopyButtonText}>
                +7 ДНЕЙ
              </Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.selectedDayCard}>
          <Text style={styles.smallLabel}>
            ВЫБРАННАЯ ДАТА
          </Text>

          <Text style={styles.selectedDayTitle}>
            {formatCalendarDate(
              selectedCalendarDate
            )}
          </Text>

          {completedDateKeys.has(
            selectedCalendarDate
          ) && (
            <Text style={styles.selectedDayDone}>
              ТРЕНИРОВКА В ЭТОТ ДЕНЬ УЖЕ ЗАФИКСИРОВАНА ✓
            </Text>
          )}

          {selected ? (
            <>
              <Text style={styles.selectedPlanLabel}>
                НАЗНАЧЕНО
              </Text>

              <Text style={styles.selectedPlanName}>
                {selected.planName}
              </Text>

              <Text style={styles.selectedPlanMeta}>
                {selectedPlan
                  ? `${selectedPlan.items.length} упражнений`
                  : 'План отсутствует в справочнике'}
              </Text>

              {selectedPlan && (
                <TouchableOpacity
                  style={styles.primaryButton}
                  onPress={startScheduledPlan}
                >
                  <Text style={styles.primaryButtonText}>
                    РАЗВЕРНУТЬ ЗАДАЧУ
                  </Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={styles.scheduleClearButton}
                onPress={() =>
                  clearScheduledDate(
                    selectedCalendarDate
                  )
                }
              >
                <Text style={styles.scheduleClearText}>
                  СНЯТЬ С ГРАФИКА
                </Text>
              </TouchableOpacity>
            </>
          ) : (
            <Text style={styles.selectedDayEmpty}>
              Занятие не назначено. Личный состав временно предоставлен сам себе.
            </Text>
          )}
        </View>

        <Text style={styles.planSectionLabel}>
          НАЗНАЧИТЬ / ЗАМЕНИТЬ ПЛАН
        </Text>

        {plans.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>
              Планов нет
            </Text>

            <Text style={styles.emptyText}>
              Сначала создай хотя бы один план занятий.
            </Text>
          </View>
        ) : (
          plans.map(plan => {
            const active =
              selected?.planId === plan.id;

            return (
              <TouchableOpacity
                key={plan.id}
                style={[
                  styles.schedulePlanRow,
                  active &&
                    styles.schedulePlanRowActive,
                ]}
                onPress={() =>
                  assignPlanToDate(
                    selectedCalendarDate,
                    plan
                  )
                }
              >
                <View style={{ flex: 1 }}>
                  <Text
                    style={[
                      styles.schedulePlanName,
                      active &&
                        styles.schedulePlanNameActive,
                    ]}
                  >
                    {plan.name}
                  </Text>

                  <Text
                    style={[
                      styles.schedulePlanMeta,
                      active &&
                        styles.schedulePlanMetaActive,
                    ]}
                  >
                    {plan.items.length} упражнений
                  </Text>
                </View>

                <Text
                  style={[
                    styles.schedulePlanAction,
                    active &&
                      styles.schedulePlanActionActive,
                  ]}
                >
                  {active
                    ? 'НАЗНАЧЕН'
                    : 'ЗАКРЕПИТЬ'}
                </Text>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>
    );
  };

  const renderExercises = () => {
    return (
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.kicker}>
          НОМЕНКЛАТУРА ЖЕЛЕЗА
        </Text>

        <Text style={styles.bigTitle}>
          Упражнения
        </Text>

        <View style={styles.folderManagerCard}>
          <Text style={styles.createTitle}>
            Папки
          </Text>

          <Text style={styles.folderHint}>
            Папки создаются вручную. Старые упражнения без назначения остаются в разделе «Без папки».
          </Text>

          <View style={styles.folderCreateRow}>
            <TextInput
              style={[
                styles.fullInput,
                styles.folderCreateInput,
              ]}
              value={newFolderName}
              onChangeText={setNewFolderName}
              placeholder="Новая папка"
              placeholderTextColor="#626972"
            />

            <TouchableOpacity
              style={styles.folderCreateButton}
              onPress={createFolder}
            >
              <Text style={styles.folderCreateButtonText}>
                + ПАПКА
              </Text>
            </TouchableOpacity>
          </View>

          {folders.length === 0 ? (
            <Text style={styles.folderEmptyText}>
              Папок пока нет.
            </Text>
          ) : (
            folders.map(folder => (
              <View
                key={folder.id}
                style={styles.folderManageRow}
              >
                <TextInput
                  style={styles.folderNameInput}
                  defaultValue={folder.name}
                  onEndEditing={event =>
                    renameFolder(
                      folder,
                      event.nativeEvent.text
                    )
                  }
                />

                <TouchableOpacity
                  style={styles.folderDeleteButton}
                  onPress={() =>
                    deleteFolder(folder)
                  }
                >
                  <Text style={styles.folderDeleteText}>
                    УДАЛИТЬ
                  </Text>
                </TouchableOpacity>
              </View>
            ))
          )}
        </View>

        <View style={styles.createCard}>
          <Text style={styles.createTitle}>
            Новая единица имущества
          </Text>

          <TextInput
            style={styles.fullInput}
            value={newName}
            onChangeText={setNewName}
            placeholder="Название упражнения"
            placeholderTextColor="#626972"
          />

          <TextInput
            style={styles.fullInput}
            value={newGroup}
            onChangeText={setNewGroup}
            placeholder="Группа мышц"
            placeholderTextColor="#626972"
          />

          <Text style={styles.fieldCaption}>
            В КАКУЮ ПАПКУ ДОБАВИТЬ
          </Text>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.folderChoiceRow}
          >
            <TouchableOpacity
              style={[
                styles.folderChoice,
                newExerciseFolderId === null &&
                  styles.folderChoiceActive,
              ]}
              onPress={() =>
                setNewExerciseFolderId(
                  null
                )
              }
            >
              <Text
                style={[
                  styles.folderChoiceText,
                  newExerciseFolderId === null &&
                    styles.folderChoiceTextActive,
                ]}
              >
                БЕЗ ПАПКИ
              </Text>
            </TouchableOpacity>

            {folders.map(folder => (
              <TouchableOpacity
                key={folder.id}
                style={[
                  styles.folderChoice,
                  newExerciseFolderId ===
                    folder.id &&
                    styles.folderChoiceActive,
                ]}
                onPress={() =>
                  setNewExerciseFolderId(
                    folder.id
                  )
                }
              >
                <Text
                  style={[
                    styles.folderChoiceText,
                    newExerciseFolderId ===
                      folder.id &&
                      styles.folderChoiceTextActive,
                  ]}
                >
                  {folder.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <Text style={styles.fieldCaption}>
            ТИП НАГРУЗКИ
          </Text>

          <View style={styles.factorSelector}>
            <TouchableOpacity
              style={[
                styles.factorSelectButton,
                newLoadType ===
                  'external' &&
                  styles.factorSelectActive,
              ]}
              onPress={() =>
                setNewLoadType(
                  'external'
                )
              }
            >
              <Text
                style={[
                  styles.factorSelectText,
                  newLoadType ===
                    'external' &&
                    styles.factorSelectTextActive,
                ]}
              >
                СНАРЯД
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.factorSelectButton,
                newLoadType ===
                  'bodyweight' &&
                  styles.factorSelectActive,
              ]}
              onPress={() => {
                setNewLoadType(
                  'bodyweight'
                );
                setNewFactor(1);
              }}
            >
              <Text
                style={[
                  styles.factorSelectText,
                  newLoadType ===
                    'bodyweight' &&
                    styles.factorSelectTextActive,
                ]}
              >
                СВОЙ ВЕС
              </Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.factorExplanation}>
            Для «Свой вес» в подходе указываются повторы и только дополнительный груз. Ноль килограммов — нормальный подход.
          </Text>

          <View style={styles.factorSelector}>
            <TouchableOpacity
              style={[
                styles.factorSelectButton,
                newFactor === 1 &&
                  styles.factorSelectActive,
              ]}
              onPress={() =>
                setNewFactor(1)
              }
            >
              <Text
                style={[
                  styles.factorSelectText,
                  newFactor === 1 &&
                    styles.factorSelectTextActive,
                ]}
              >
                ×1
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.factorSelectButton,
                newFactor === 2 &&
                  styles.factorSelectActive,
                newLoadType ===
                  'bodyweight' &&
                  styles.buttonDisabled,
              ]}
              onPress={() =>
                setNewFactor(2)
              }
              disabled={
                newLoadType ===
                'bodyweight'
              }
            >
              <Text
                style={[
                  styles.factorSelectText,
                  newFactor === 2 &&
                    styles.factorSelectTextActive,
                ]}
              >
                ×2
              </Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.factorExplanation}>
            ×1 — одна нагрузка. ×2 —
            вес одной гантели, считаем
            обе.
          </Text>

          <TouchableOpacity
            style={styles.createButton}
            onPress={createExercise}
          >
            <Text
              style={styles.createButtonText}
            >
              ПРИНЯТЬ НА СНАБЖЕНИЕ
            </Text>
          </TouchableOpacity>
        </View>

        {[
          ...folders.map(folder => ({
            key: `folder-${folder.id}`,
            title: folder.name,
            items: catalog.filter(
              item =>
                item.folderId ===
                folder.id
            ),
          })),
          {
            key: 'folder-none',
            title: 'БЕЗ ПАПКИ',
            items: catalog.filter(
              item =>
                item.folderId ===
                null
            ),
          },
        ]
          .filter(
            section =>
              section.items.length > 0
          )
          .map(section => (
            <View
              key={section.key}
              style={styles.folderSection}
            >
              <View style={styles.folderSectionHeader}>
                <Text style={styles.folderSectionTitle}>
                  {section.title}
                </Text>

                <Text style={styles.folderSectionCount}>
                  {section.items.length}
                </Text>
              </View>

              {section.items.map(item => {
                const isCompleted =
                  completedExercises.some(
                    exercise =>
                      exercise.id ===
                      item.id
                  );

                const inWorkout =
                  workout.some(
                    exercise =>
                      exercise.id ===
                      item.id
                  ) ||
                  isCompleted;

                return (
                  <View
                    key={item.id}
                    style={styles.catalogCard}
                  >
                    <View style={styles.catalogTop}>
                      <View style={styles.catalogFields}>
                        <TextInput
                          style={styles.catalogName}
                          value={item.name}
                          onChangeText={value =>
                            updateCatalogLocal(
                              item.id,
                              'name',
                              value
                            )
                          }
                          onBlur={() =>
                            persistCatalogExercise(
                              item
                            )
                          }
                        />

                        <TextInput
                          style={styles.catalogGroup}
                          value={item.muscleGroup}
                          onChangeText={value =>
                            updateCatalogLocal(
                              item.id,
                              'muscleGroup',
                              value
                            )
                          }
                          onBlur={() =>
                            persistCatalogExercise(
                              item
                            )
                          }
                        />
                      </View>

                      <TouchableOpacity
                        style={styles.factorBadgeBig}
                        onPress={() =>
                          toggleCatalogFactor(
                            item
                          )
                        }
                      >
                        <Text style={styles.factorText}>
                          ×{item.factor}
                        </Text>
                      </TouchableOpacity>
                    </View>

                    <TouchableOpacity
                      style={[
                        styles.loadTypeButton,
                        item.loadType ===
                          'bodyweight' &&
                          styles.loadTypeButtonBodyweight,
                      ]}
                      onPress={() =>
                        toggleCatalogLoadType(
                          item
                        )
                      }
                    >
                      <Text
                        style={styles.loadTypeButtonText}
                      >
                        {item.loadType ===
                        'bodyweight'
                          ? 'СОБСТВЕННЫЙ ВЕС'
                          : 'ВЕС СНАРЯДА'}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.exerciseFolderButton}
                      onPress={() =>
                        chooseExerciseFolder(
                          item
                        )
                      }
                    >
                      <Text style={styles.exerciseFolderLabel}>
                        ПАПКА
                      </Text>

                      <Text style={styles.exerciseFolderValue}>
                        {item.folderName ||
                          'Без папки'}
                      </Text>

                      <Text style={styles.exerciseFolderChevron}>
                        ›
                      </Text>
                    </TouchableOpacity>

                    <View style={styles.catalogActions}>
                      <TouchableOpacity
                        style={[
                          styles.catalogAdd,
                          inWorkout &&
                            styles.catalogAdded,
                        ]}
                        onPress={() =>
                          addToWorkout(item)
                        }
                      >
                        <Text
                          style={[
                            styles.catalogAddText,
                            inWorkout &&
                              styles.catalogAddedText,
                          ]}
                        >
                          {isCompleted
                            ? 'УПРАЖНЕНИЕ ЗАКРЫТО'
                            : inWorkout
                              ? 'УЖЕ В НАРЯДЕ'
                              : 'В ТЕКУЩУЮ ЗАДАЧУ'}
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.catalogDelete}
                        onPress={() =>
                          deleteCatalogExercise(
                            item
                          )
                        }
                      >
                        <Text style={styles.catalogDeleteText}>
                          СПИСАТЬ
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })}
            </View>
          ))}
      </ScrollView>
    );
  };

  const renderProgressChart = (
    points: ProgressPoint[],
    field: 'maxWeight' | 'volume',
    title: string
  ) => {
    const visible =
      points.slice(-8);

    const values = visible.map(
      point => point[field]
    );

    const maxValue = Math.max(
      1,
      ...values
    );

    const latest =
      values.length > 0
        ? values[
            values.length - 1
          ]
        : 0;

    return (
      <View style={styles.chartCard}>
        <View style={styles.chartHeader}>
          <Text style={styles.chartTitle}>
            {title}
          </Text>

          <Text style={styles.chartLatest}>
            {field === 'volume'
              ? formatWeight(latest)
              : `${latest} кг`}
          </Text>
        </View>

        <View style={styles.chartBars}>
          {visible.map(point => {
            const value =
              point[field];

            const height = Math.max(
              4,
              Math.round(
                (value / maxValue) *
                  82
              )
            );

            return (
              <View
                key={`${field}-${point.workoutId}`}
                style={
                  styles.chartColumn
                }
              >
                <View
                  style={[
                    styles.chartBar,
                    {
                      height,
                    },
                  ]}
                />

                <Text
                  style={
                    styles.chartDate
                  }
                >
                  {formatShortDate(
                    point.finishedAt
                  )}
                </Text>
              </View>
            );
          })}
        </View>
      </View>
    );
  };

  const makePackageKey = (
    prefix: string
  ) =>
    `${prefix}-${Date.now().toString(36)}-${Math.random()
      .toString(36)
      .slice(2, 9)}`;

  const isDateKey = (
    value: unknown
  ): value is string =>
    typeof value === 'string' &&
    /^\d{4}-\d{2}-\d{2}$/.test(value);

  const normalizePlanningPackage = (
    raw: any
  ): TonnagePlanningPackage => {
    if (
      !raw ||
      raw.format !==
        'tonnage-planning' ||
      (
        raw.formatVersion !== 1 &&
        raw.formatVersion !== 2
      ) ||
      !raw.data
    ) {
      throw new Error(
        'Неподдерживаемый формат пакета'
      );
    }

    const packageVersion:
      1 | 2 =
      raw.formatVersion === 2
        ? 2
        : 1;

    const foldersRaw =
      Array.isArray(
        raw.data.folders
      )
        ? raw.data.folders
        : [];

    const packageFolders:
      TonnagePackageFolder[] =
      foldersRaw
        .map(
          (
            item: any,
            index: number
          ) => ({
            key:
              String(
                item?.key ?? ''
              ).trim() ||
              `import-folder-${index}`,
            name:
              String(
                item?.name ?? ''
              ).trim(),
            sortOrder:
              Math.max(
                0,
                Math.round(
                  Number(
                    item?.sortOrder
                  ) || index
                )
              ),
          })
        )
        .filter(
          item =>
            item.name.length > 0
        );

    const folderKeys =
      new Set(
        packageFolders.map(
          item => item.key
        )
      );

    const exercisesRaw =
      Array.isArray(
        raw.data.exercises
      )
        ? raw.data.exercises
        : [];

    const exercises: TonnagePackageExercise[] =
      exercisesRaw
        .map((item: any) => ({
          key:
            String(
              item?.key ?? ''
            ).trim() ||
            makePackageKey(
              'import-exercise'
            ),
          name:
            String(
              item?.name ?? ''
            ).trim(),
          muscleGroup:
            String(
              item?.muscleGroup ??
                'Другое'
            ).trim() ||
            'Другое',
          factor:
            item?.factor === 2
              ? 2
              : 1,
          loadType:
            item?.loadType ===
              'bodyweight' ||
            item?.loadType ===
              'external'
              ? item.loadType
              : undefined,
          folderKey:
            packageVersion === 2 &&
            typeof item?.folderKey ===
              'string' &&
            folderKeys.has(
              item.folderKey
            )
              ? item.folderKey
              : null,
        }))
        .filter(
          item => item.name.length > 0
        );

    const exerciseKeys =
      new Set(
        exercises.map(
          item => item.key
        )
      );

    const plansRaw =
      Array.isArray(raw.data.plans)
        ? raw.data.plans
        : [];

    const plans: TonnagePackagePlan[] =
      plansRaw
        .map((plan: any) => {
          const itemsRaw =
            Array.isArray(
              plan?.items
            )
              ? plan.items
              : [];

          return {
            key:
              String(
                plan?.key ?? ''
              ).trim() ||
              makePackageKey(
                'import-plan'
              ),
            name:
              String(
                plan?.name ?? ''
              ).trim(),
            items:
              itemsRaw
                .map(
                  (
                    item: any,
                    index: number
                  ) => ({
                    exerciseKey:
                      String(
                        item?.exerciseKey ??
                          ''
                      ).trim(),
                    setCount:
                      Math.min(
                        20,
                        Math.max(
                          1,
                          Math.round(
                            Number(
                              item?.setCount
                            ) || 3
                          )
                        )
                      ),
                    sortOrder:
                      Math.max(
                        0,
                        Math.round(
                          Number(
                            item?.sortOrder
                          ) || index
                        )
                      ),
                  })
                )
                .filter(
                  (
                    item: TonnagePackagePlanItem
                  ) =>
                    exerciseKeys.has(
                      item.exerciseKey
                    )
                ),
          };
        })
        .filter(
          (plan: TonnagePackagePlan) =>
            plan.name.length > 0
        );

    const planKeys =
      new Set(
        plans.map(item => item.key)
      );

    const scheduleRaw =
      Array.isArray(
        raw.data.schedule
      )
        ? raw.data.schedule
        : [];

    const schedule =
      scheduleRaw
        .map((item: any) => ({
          dateKey:
            String(
              item?.dateKey ?? ''
            ).trim(),
          planKey:
            String(
              item?.planKey ?? ''
            ).trim(),
        }))
        .filter(
          (
            item: {
              dateKey: string;
              planKey: string;
            }
          ) =>
            isDateKey(
              item.dateKey
            ) &&
            planKeys.has(
              item.planKey
            )
        );

    const removeScheduleDates =
      (
        Array.isArray(
          raw.data
            .removeScheduleDates
        )
          ? raw.data
              .removeScheduleDates
          : []
      )
        .map((value: any) =>
          String(value).trim()
        )
        .filter(isDateKey);

    const removeExerciseKeys =
      (
        Array.isArray(
          raw.data
            .removeExerciseKeys
        )
          ? raw.data
              .removeExerciseKeys
          : []
      )
        .map((value: any) =>
          String(value).trim()
        )
        .filter(
          (value: string) =>
            value.length > 0 &&
            !exerciseKeys.has(value)
        );

    const removePlanKeys =
      (
        Array.isArray(
          raw.data
            .removePlanKeys
        )
          ? raw.data
              .removePlanKeys
          : []
      )
        .map((value: any) =>
          String(value).trim()
        )
        .filter(
          (value: string) =>
            value.length > 0 &&
            !planKeys.has(value)
        );

    const removeFolderKeys =
      (
        Array.isArray(
          raw.data
            .removeFolderKeys
        )
          ? raw.data
              .removeFolderKeys
          : []
      )
        .map((value: any) =>
          String(value).trim()
        )
        .filter(
          (value: string) =>
            value.length > 0 &&
            !folderKeys.has(value)
        );

    return {
      format:
        'tonnage-planning',
      formatVersion:
        packageVersion,
      createdAt:
        typeof raw.createdAt ===
        'string'
          ? raw.createdAt
          : new Date().toISOString(),
      source: {
        platform:
          typeof raw.source
            ?.platform ===
          'string'
            ? raw.source.platform
            : 'unknown',
        appVersion:
          typeof raw.source
            ?.appVersion ===
          'string'
            ? raw.source.appVersion
            : 'unknown',
      },
      data: {
        folders:
          packageVersion === 2
            ? packageFolders
            : undefined,
        exercises,
        plans,
        schedule,
        removeScheduleDates,
        removeExerciseKeys,
        removePlanKeys,
        removeFolderKeys,
      },
    };
  };

  const buildPlanningPackage =
    (): TonnagePlanningPackage => ({
      format:
        'tonnage-planning',
      formatVersion: 2,
      createdAt:
        new Date().toISOString(),
      source: {
        platform: 'android',
        appVersion: '0.11.0',
      },
      data: {
        folders:
          folders.map(
            folder => ({
              key:
                folder.externalKey,
              name:
                folder.name,
              sortOrder:
                folder.sortOrder,
            })
          ),
        exercises:
          catalog.map(item => ({
            key:
              item.externalKey ||
              `android-exercise-${item.id}`,
            name: item.name,
            muscleGroup:
              item.muscleGroup,
            factor: item.factor,
            loadType: item.loadType,
            folderKey:
              item.folderKey,
          })),
        plans:
          plans.map(plan => ({
            key:
              plan.externalKey ||
              `android-plan-${plan.id}`,
            name: plan.name,
            items:
              plan.items.map(
                (item, index) => ({
                  exerciseKey:
                    item.externalKey ||
                    `android-exercise-${item.id}`,
                  setCount:
                    item.setCount,
                  sortOrder:
                    index,
                })
              ),
          })),
        schedule:
          Object.values(schedule)
            .map(item => {
              const plan =
                plans.find(
                  candidate =>
                    candidate.id ===
                    item.planId
                );

              return plan
                ? {
                    dateKey:
                      item.dateKey,
                    planKey:
                      plan.externalKey ||
                      `android-plan-${plan.id}`,
                  }
                : null;
            })
            .filter(
              (
                item
              ): item is {
                dateKey: string;
                planKey: string;
              } => item !== null
            ),
        removeScheduleDates: [],
        removeExerciseKeys: [],
        removePlanKeys: [],
        removeFolderKeys: [],
      },
    });

  const exportPcDatabase =
    async () => {
      if (!db) return;

      try {
        const workoutRows =
          await db.getAllAsync<{
            id: number;
            startedAt: string;
            finishedAt: string;
            totalVolume: number;
          }>(`
            SELECT
              id,
              started_at AS startedAt,
              finished_at AS finishedAt,
              total_volume AS totalVolume
            FROM workouts
            ORDER BY finished_at ASC
          `);

        const setRows =
          await db.getAllAsync<{
            id: number;
            workoutId: number;
            exerciseId: number | null;
            exerciseName: string;
            setNumber: number;
            weight: number;
            reps: number;
            factor: number;
            loadType: string | null;
            bodyWeight: number | null;
            additionalWeight: number | null;
          }>(`
            SELECT
              id,
              workout_id AS workoutId,
              exercise_id AS exerciseId,
              exercise_name AS exerciseName,
              set_number AS setNumber,
              weight,
              reps,
              factor,
              load_type AS loadType,
              body_weight AS bodyWeight,
              additional_weight AS additionalWeight
            FROM workout_sets
            ORDER BY
              workout_id ASC,
              id ASC
          `);

        const planning =
          buildPlanningPackage().data;

        const payload:
          TonnagePcDatabase = {
            format:
              'tonnage-database',
            formatVersion: 1,
            createdAt:
              new Date().toISOString(),
            source: {
              platform: 'android',
              appVersion: '0.11.0',
            },
            planning,
            database: {
              folders:
                folders.map(
                  folder => ({
                    key:
                      folder.externalKey,
                    name:
                      folder.name,
                    sortOrder:
                      folder.sortOrder,
                  })
                ),
              exercises:
                catalog.map(
                  item => ({
                    id: item.id,
                    externalKey:
                      item.externalKey ||
                      `android-exercise-${item.id}`,
                    name: item.name,
                    muscleGroup:
                      item.muscleGroup,
                    factor:
                      item.factor,
                    loadType:
                      item.loadType,
                    folderKey:
                      item.folderKey,
                    folderName:
                      item.folderName,
                  })
                ),
              workouts:
                workoutRows.map(
                  row => ({
                    id: row.id,
                    startedAt:
                      row.startedAt,
                    finishedAt:
                      row.finishedAt,
                    totalVolume:
                      Number(
                        row.totalVolume
                      ) || 0,
                  })
                ),
              sets:
                setRows.map(
                  row => ({
                    id: row.id,
                    workoutId:
                      row.workoutId,
                    exerciseId:
                      row.exerciseId,
                    exerciseName:
                      row.exerciseName,
                    setNumber:
                      row.setNumber,
                    weight:
                      Number(
                        row.weight
                      ) || 0,
                    reps:
                      Number(
                        row.reps
                      ) || 0,
                    factor:
                      row.factor === 2
                        ? 2
                        : 1,
                    loadType:
                      normalizeLoadType(
                        row.loadType
                      ),
                    bodyWeight:
                      row.bodyWeight ?? null,
                    additionalWeight:
                      row.additionalWeight ?? null,
                  })
                ),
            },
          };

        const stamp =
          new Date()
            .toISOString()
            .slice(0, 19)
            .replace(
              /[:T]/g,
              '-'
            );

        const file =
          new File(
            Paths.cache,
            `tonnage-database-${stamp}.tonnage-db`
          );

        file.create({
          overwrite: true,
          intermediates: true,
        });

        file.write(
          JSON.stringify(
            payload,
            null,
            2
          )
        );

        const available =
          await Sharing.isAvailableAsync();

        if (!available) {
          showDialog(
            'БАЗА ВЫГРУЖЕНА',
            `Файл сформирован:\n${file.uri}`
          );
          return;
        }

        await Sharing.shareAsync(
          file.uri,
          {
            dialogTitle:
              'Выгрузить базу для штаба',
            mimeType:
              'application/json',
          }
        );

        showBanner(
          'БАЗА ВЫГРУЖЕНА',
          `${payload.database.workouts.length} тренировок · ${payload.database.sets.length} подходов · ${payload.database.exercises.length} упражнений`,
          'success',
          4200
        );

        runHaptic('success');
      } catch (error) {
        console.error(
          'PC database export:',
          error
        );

        showDialog(
          'Ошибка выгрузки',
          'Не удалось сформировать базу для Windows-штаба.'
        );
      }
    };

  const exportPlanningPackage =
    async () => {
      try {
        const payload =
          buildPlanningPackage();

        const stamp =
          new Date()
            .toISOString()
            .slice(0, 19)
            .replace(
              /[:T]/g,
              '-'
            );

        const file =
          new File(
            Paths.cache,
            `tonnage-planning-${stamp}.tonnage`
          );

        file.create({
          overwrite: true,
          intermediates: true,
        });

        file.write(
          JSON.stringify(
            payload,
            null,
            2
          )
        );

        const available =
          await Sharing.isAvailableAsync();

        if (!available) {
          showDialog(
            'ПАКЕТ СОЗДАН',
            `Файл сформирован во внутреннем хранилище:\n${file.uri}`
          );
          return;
        }

        await Sharing.shareAsync(
          file.uri,
          {
            dialogTitle:
              'Передать штабной пакет',
            mimeType:
              'application/json',
          }
        );

        showBanner(
          'ПАКЕТ СФОРМИРОВАН',
          `${payload.data.exercises.length} упражнений · ${payload.data.plans.length} планов · ${payload.data.schedule.length} назначений`,
          'success',
          3800
        );

        runHaptic('success');
      } catch (error) {
        console.error(
          'Planning export:',
          error
        );

        showDialog(
          'Ошибка экспорта',
          'Не удалось сформировать штабной пакет.'
        );
      }
    };

  const applyPlanningPackage =
    async (
      packageData: TonnagePlanningPackage
    ) => {
      if (!db) return;

      const exerciseIdByKey =
        new Map<string, number>();
      const planIdByKey =
        new Map<string, number>();
      const folderIdByKey =
        new Map<string, number>();

      try {
        await db.withTransactionAsync(
          async () => {
            if (
              packageData.formatVersion ===
              2
            ) {
              for (
                const key
                of packageData.data
                  .removeFolderKeys ?? []
              ) {
                const folder =
                  await db.getFirstAsync<{
                    id: number;
                  }>(
                    `
                      SELECT id
                      FROM exercise_folders
                      WHERE external_key = ?
                      LIMIT 1
                    `,
                    key
                  );

                if (folder) {
                  await db.runAsync(
                    `
                      UPDATE exercises
                      SET folder_id = NULL
                      WHERE folder_id = ?
                    `,
                    folder.id
                  );

                  await db.runAsync(
                    `
                      DELETE FROM exercise_folders
                      WHERE id = ?
                    `,
                    folder.id
                  );
                }
              }

              for (
                const incomingFolder
                of packageData.data
                  .folders ?? []
              ) {
                const byKey =
                  await db.getFirstAsync<{
                    id: number;
                  }>(
                    `
                      SELECT id
                      FROM exercise_folders
                      WHERE external_key = ?
                      LIMIT 1
                    `,
                    incomingFolder.key
                  );

                const byName =
                  byKey
                    ? null
                    : await db.getFirstAsync<{
                        id: number;
                      }>(
                        `
                          SELECT id
                          FROM exercise_folders
                          WHERE LOWER(TRIM(name)) =
                            LOWER(TRIM(?))
                          LIMIT 1
                        `,
                        incomingFolder.name
                      );

                let folderId =
                  byKey?.id ??
                  byName?.id ??
                  null;

                if (
                  folderId === null
                ) {
                  const result =
                    await db.runAsync(
                      `
                        INSERT INTO exercise_folders
                        (
                          external_key,
                          name,
                          sort_order
                        )
                        VALUES (?, ?, ?)
                      `,
                      incomingFolder.key,
                      incomingFolder.name,
                      incomingFolder.sortOrder
                    );

                  folderId =
                    result.lastInsertRowId;
                } else {
                  await db.runAsync(
                    `
                      UPDATE exercise_folders
                      SET
                        external_key = ?,
                        name = ?,
                        sort_order = ?
                      WHERE id = ?
                    `,
                    incomingFolder.key,
                    incomingFolder.name,
                    incomingFolder.sortOrder,
                    folderId
                  );
                }

                folderIdByKey.set(
                  incomingFolder.key,
                  folderId
                );
              }
            }

            for (
              const key
              of packageData.data
                .removePlanKeys ?? []
            ) {
              await db.runAsync(
                `
                  DELETE FROM workout_plans
                  WHERE external_key = ?
                `,
                key
              );
            }

            for (
              const key
              of packageData.data
                .removeExerciseKeys ??
                []
            ) {
              await db.runAsync(
                `
                  DELETE FROM exercises
                  WHERE external_key = ?
                `,
                key
              );
            }

            let generatedId =
              Date.now();

            for (
              const incoming
              of packageData.data
                .exercises
            ) {
              const byKey =
                await db.getFirstAsync<{
                  id: number;
                }>(
                  `
                    SELECT id
                    FROM exercises
                    WHERE external_key = ?
                    LIMIT 1
                  `,
                  incoming.key
                );

              const byName =
                byKey
                  ? null
                  : await db.getFirstAsync<{
                      id: number;
                    }>(
                      `
                        SELECT id
                        FROM exercises
                        WHERE LOWER(TRIM(name)) =
                          LOWER(TRIM(?))
                        LIMIT 1
                      `,
                      incoming.name
                    );

              const existingId =
                byKey?.id ??
                byName?.id ??
                null;

              if (
                existingId !==
                null
              ) {
                if (
                  packageData.formatVersion ===
                  2
                ) {
                  await db.runAsync(
                    `
                      UPDATE exercises
                      SET
                        external_key = ?,
                        name = ?,
                        factor = ?,
                        load_type = COALESCE(?, load_type),
                        muscle_group = ?,
                        folder_id = ?
                      WHERE id = ?
                    `,
                    incoming.key,
                    incoming.name,
                    incoming.loadType ===
                      'bodyweight'
                      ? 1
                      : incoming.factor,
                    incoming.loadType ?? null,
                    incoming.muscleGroup,
                    incoming.folderKey
                      ? folderIdByKey.get(
                          incoming.folderKey
                        ) ?? null
                      : null,
                    existingId
                  );
                } else {
                  await db.runAsync(
                    `
                      UPDATE exercises
                      SET
                        external_key = ?,
                        name = ?,
                        factor = ?,
                        load_type = COALESCE(?, load_type),
                        muscle_group = ?
                      WHERE id = ?
                    `,
                    incoming.key,
                    incoming.name,
                    incoming.loadType ===
                      'bodyweight'
                      ? 1
                      : incoming.factor,
                    incoming.loadType ?? null,
                    incoming.muscleGroup,
                    existingId
                  );
                }

                exerciseIdByKey.set(
                  incoming.key,
                  existingId
                );
              } else {
                generatedId += 1;

                await db.runAsync(
                  `
                    INSERT INTO exercises
                    (
                      id,
                      external_key,
                      name,
                      factor,
                      load_type,
                      muscle_group,
                      folder_id
                    )
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                  `,
                  generatedId,
                  incoming.key,
                  incoming.name,
                  incoming.loadType ===
                    'bodyweight'
                    ? 1
                    : incoming.factor,
                  incoming.loadType ?? 'external',
                  incoming.muscleGroup,
                  packageData.formatVersion ===
                    2 &&
                  incoming.folderKey
                    ? folderIdByKey.get(
                        incoming.folderKey
                      ) ?? null
                    : null
                );

                exerciseIdByKey.set(
                  incoming.key,
                  generatedId
                );
              }
            }

            for (
              const incoming
              of packageData.data
                .plans
            ) {
              const byKey =
                await db.getFirstAsync<{
                  id: number;
                }>(
                  `
                    SELECT id
                    FROM workout_plans
                    WHERE external_key = ?
                    LIMIT 1
                  `,
                  incoming.key
                );

              const byName =
                byKey
                  ? null
                  : await db.getFirstAsync<{
                      id: number;
                    }>(
                      `
                        SELECT id
                        FROM workout_plans
                        WHERE LOWER(TRIM(name)) =
                          LOWER(TRIM(?))
                        LIMIT 1
                      `,
                      incoming.name
                    );

              let planId =
                byKey?.id ??
                byName?.id ??
                null;

              if (
                planId === null
              ) {
                const result =
                  await db.runAsync(
                    `
                      INSERT INTO workout_plans
                      (
                        external_key,
                        name,
                        created_at
                      )
                      VALUES (?, ?, ?)
                    `,
                    incoming.key,
                    incoming.name,
                    new Date().toISOString()
                  );

                planId =
                  result.lastInsertRowId;
              } else {
                await db.runAsync(
                  `
                    UPDATE workout_plans
                    SET
                      external_key = ?,
                      name = ?
                    WHERE id = ?
                  `,
                  incoming.key,
                  incoming.name,
                  planId
                );

                await db.runAsync(
                  `
                    DELETE FROM workout_plan_items
                    WHERE plan_id = ?
                  `,
                  planId
                );
              }

              planIdByKey.set(
                incoming.key,
                planId
              );

              const sortedItems =
                [...incoming.items]
                  .sort(
                    (a, b) =>
                      a.sortOrder -
                      b.sortOrder
                  );

              for (
                let index = 0;
                index <
                sortedItems.length;
                index++
              ) {
                const item =
                  sortedItems[index];

                const exerciseId =
                  exerciseIdByKey.get(
                    item.exerciseKey
                  );

                if (!exerciseId) {
                  continue;
                }

                await db.runAsync(
                  `
                    INSERT INTO workout_plan_items
                    (
                      plan_id,
                      exercise_id,
                      set_count,
                      sort_order
                    )
                    VALUES (?, ?, ?, ?)
                  `,
                  planId,
                  exerciseId,
                  item.setCount,
                  index
                );
              }
            }

            for (
              const dateKey
              of packageData.data
                .removeScheduleDates ??
                []
            ) {
              await db.runAsync(
                `
                  DELETE FROM training_schedule
                  WHERE date_key = ?
                `,
                dateKey
              );
            }

            for (
              const assignment
              of packageData.data
                .schedule
            ) {
              const planId =
                planIdByKey.get(
                  assignment.planKey
                );

              if (!planId) {
                continue;
              }

              await db.runAsync(
                `
                  INSERT INTO training_schedule
                  (date_key, plan_id)
                  VALUES (?, ?)
                  ON CONFLICT(date_key)
                  DO UPDATE SET
                    plan_id =
                      excluded.plan_id
                `,
                assignment.dateKey,
                planId
              );
            }
          }
        );

        await loadFolders(db);
        await loadCatalog(db);
        await loadPlans(db);
        await loadSchedule(db);
        await loadPersonalRecords(
          db
        );
        await loadExerciseProgress(
          db
        );
        await loadPreviousResults(db);

        showBanner(
          'ПАКЕТ ПРИНЯТ',
          `${packageData.data.exercises.length} упражнений · ${packageData.data.plans.length} планов · ${packageData.data.schedule.length} назначений`,
          'success',
          4200
        );

        runHaptic('success');
      } catch (error) {
        console.error(
          'Planning import:',
          error
        );

        showDialog(
          'Ошибка импорта',
          'Пакет не удалось применить. Транзакция отменена, база не должна быть частично изменена.'
        );
      }
    };

  const importPlanningPackage =
    async () => {
      try {
        const result =
          await DocumentPicker.getDocumentAsync(
            {
              copyToCacheDirectory:
                true,
              multiple: false,
              type: '*/*',
            }
          );

        if (
          result.canceled ||
          !result.assets?.length
        ) {
          return;
        }

        const asset =
          result.assets[0];
        const file =
          new File(asset.uri);
        const rawText =
          await file.text();
        const parsed =
          normalizePlanningPackage(
            JSON.parse(rawText)
          );

        showDialog(
          'ПРИНЯТЬ ШТАБНОЙ ПАКЕТ?',
          `Источник: ${parsed.source.platform} · ${parsed.source.appVersion}\n\nПапок: ${parsed.data.folders?.length ?? 0}\nУпражнений: ${parsed.data.exercises.length}\nПланов: ${parsed.data.plans.length}\nНазначений: ${parsed.data.schedule.length}\nСнять назначений: ${parsed.data.removeScheduleDates?.length ?? 0}\nСписать упражнений: ${parsed.data.removeExerciseKeys?.length ?? 0}\nУдалить планов: ${parsed.data.removePlanKeys?.length ?? 0}\nУдалить папок: ${parsed.data.removeFolderKeys?.length ?? 0}\n\nИстория тренировок и текущие результаты не затрагиваются.`,
          [
            {
              text: 'ОТМЕНА',
              style: 'cancel',
            },
            {
              text: 'ПРИНЯТЬ',
              onPress: async () => {
                await applyPlanningPackage(
                  parsed
                );
              },
            },
          ]
        );
      } catch (error) {
        console.error(
          'Planning import parse:',
          error
        );

        showDialog(
          'ПАКЕТ НЕ ПРИНЯТ',
          'Файл повреждён или имеет неподдерживаемую структуру .tonnage.'
        );
      }
    };

  const renderProfile = () => {
    return (
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
      >
        <Text style={styles.kicker}>
          ЛИЧНОЕ ДЕЛО
        </Text>

        <Text style={styles.bigTitle}>
          Боеготовность
        </Text>

        <View style={styles.profileSummary}>
          <View style={styles.profileSummaryCell}>
            <Text style={styles.smallLabel}>
              УРОВЕНЬ
            </Text>

            <Text style={styles.profileSummaryValue}>
              {levelInfo.level}
            </Text>

            <Text style={styles.profileSummarySub}>
              {levelInfo.title}
            </Text>
          </View>

          <View style={styles.profileSummaryCell}>
            <Text style={styles.smallLabel}>
              ВСЕГО
            </Text>

            <Text style={styles.profileSummaryValue}>
              {formatWeight(
                stats.totalVolume
              )}
            </Text>

            <Text style={styles.profileSummarySub}>
              {stats.workoutCount} задач
            </Text>
          </View>
        </View>

        <Text style={styles.profileSectionTitle}>
          СТАТИСТИКА
        </Text>

        <View style={styles.statsDetailGrid}>
          <View style={styles.statsDetailCard}>
            <Text style={styles.smallLabel}>
              7 ДНЕЙ
            </Text>
            <Text style={styles.statsDetailValue}>
              {formatWeight(stats.weekVolume)}
            </Text>
            <Text style={styles.statsDetailSub}>
              {stats.weekWorkoutCount} тренировок
            </Text>
          </View>

          <View style={styles.statsDetailCard}>
            <Text style={styles.smallLabel}>
              30 ДНЕЙ
            </Text>
            <Text style={styles.statsDetailValue}>
              {formatWeight(stats.monthVolume)}
            </Text>
            <Text style={styles.statsDetailSub}>
              {stats.monthWorkoutCount} тренировок
            </Text>
          </View>
        </View>

        <View style={styles.statsDetailGrid}>
          <View style={styles.statsDetailCard}>
            <Text style={styles.smallLabel}>
              СРЕДНЯЯ ЗАДАЧА
            </Text>
            <Text style={styles.statsDetailValue}>
              {formatWeight(
                stats.workoutCount > 0
                  ? stats.totalVolume / stats.workoutCount
                  : 0
              )}
            </Text>
          </View>

          <View style={styles.statsDetailCard}>
            <Text style={styles.smallLabel}>
              ЛУЧШАЯ ЗАДАЧА
            </Text>
            <Text style={styles.statsDetailValue}>
              {formatWeight(stats.bestWorkoutVolume)}
            </Text>
          </View>
        </View>

        <View style={styles.statWideRow}>
          <View>
            <Text style={styles.smallLabel}>
              ВСЕГО ПОДХОДОВ
            </Text>
            <Text style={styles.statsDetailValue}>
              {stats.totalSets}
            </Text>
          </View>

          <View style={styles.levelRight}>
            <Text style={styles.smallLabel}>
              ВСЕГО ПОВТОРОВ
            </Text>
            <Text style={styles.statsDetailValue}>
              {stats.totalReps}
            </Text>
          </View>
        </View>

        <View style={styles.weekCompareCard}>
          <Text style={styles.smallLabel}>
            К ПРЕДЫДУЩИМ 7 ДНЯМ
          </Text>

          <Text style={styles.weekCompareValue}>
            {stats.previousWeekVolume > 0
              ? `${stats.weekVolume >= stats.previousWeekVolume ? '+' : ''}${(
                  ((stats.weekVolume - stats.previousWeekVolume) /
                    stats.previousWeekVolume) *
                  100
                ).toFixed(1)}%`
              : stats.weekVolume > 0
                ? 'НОВАЯ АКТИВНОСТЬ'
                : 'НЕТ ДАННЫХ'}
          </Text>
        </View>

        <Text style={styles.profileSectionTitle}>
          ЗНАКИ ОТЛИЧИЯ
        </Text>

        {achievements.map(item => {
          const percent = Math.min(
            100,
            (item.current /
              item.target) *
              100
          );

          return (
            <View
              key={item.id}
              style={[
                styles.achievementCard,
                item.unlocked &&
                  styles.achievementUnlocked,
              ]}
            >
              <View style={styles.achievementTop}>
                <View style={{ flex: 1 }}>
                  <Text
                    style={[
                      styles.achievementTitle,
                      item.unlocked &&
                        styles.achievementTitleUnlocked,
                    ]}
                  >
                    {item.title}
                  </Text>

                  <Text style={styles.achievementDescription}>
                    {item.description}
                  </Text>
                </View>

                <Text
                  style={[
                    styles.achievementState,
                    item.unlocked &&
                      styles.achievementStateUnlocked,
                  ]}
                >
                  {item.unlocked
                    ? 'ПОЛУЧЕНО'
                    : 'В РАБОТЕ'}
                </Text>
              </View>

              <View style={styles.achievementTrack}>
                <View
                  style={[
                    styles.achievementFill,
                    {
                      width:
                        `${percent}%` as any,
                    },
                  ]}
                />
              </View>

              <Text style={styles.achievementProgress}>
                {formatAchievementProgress(
                  item
                )}
              </Text>
            </View>
          );
        })}

        <Text style={styles.profileSectionTitle}>
          ЛИЧНЫЕ РЕКОРДЫ
        </Text>

        {records.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>
              Нормативы не установлены
            </Text>

            <Text style={styles.emptyText}>
              Сначала проведи хотя бы одну
              тренировку.
            </Text>
          </View>
        ) : (
          records.map(record => (
            <View
              key={record.exerciseId}
              style={styles.recordCard}
            >
              <View style={styles.recordHeader}>
                <View style={styles.recordTitleWrap}>
                  <Text style={styles.recordName}>
                    {record.exerciseName}
                  </Text>

                  <Text style={styles.recordGroup}>
                    {record.muscleGroup}
                  </Text>
                </View>

                <View style={styles.recordFactor}>
                  <Text style={styles.recordFactorText}>
                    ×{record.factor}
                  </Text>
                </View>
              </View>

              <View style={styles.recordStatsRow}>
                <View style={styles.recordStat}>
                  <Text style={styles.smallLabel}>
                    {record.loadType ===
                    'bodyweight'
                      ? 'МАКС. ДОП. ВЕС'
                      : 'МАКС. ВЕС'}
                  </Text>

                  <Text style={styles.recordValue}>
                    {record.loadType ===
                      'bodyweight' &&
                    record.maxWeight === 0
                      ? 'без груза'
                      : `${record.maxWeight} кг`}
                  </Text>

                  <Text style={styles.recordSubvalue}>
                    × {record.repsAtMaxWeight} повт.
                  </Text>
                </View>

                <View style={styles.recordStat}>
                  <Text style={styles.smallLabel}>
                    ЛУЧШИЙ ТОННАЖ
                  </Text>

                  <Text style={styles.recordValue}>
                    {formatWeight(
                      record.bestWorkoutVolume
                    )}
                  </Text>

                  <Text style={styles.recordSubvalue}>
                    за одну задачу
                  </Text>
                </View>
              </View>
            </View>
          ))
        )}

        <Text style={styles.profileSectionTitle}>
          ДИНАМИКА БОЕГОТОВНОСТИ
        </Text>

        {exerciseProgress.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>
              Графики пусты
            </Text>

            <Text style={styles.emptyText}>
              Дай системе хотя бы одну
              сохранённую тренировку.
            </Text>
          </View>
        ) : (
          exerciseProgress.map(progress => {
            const last =
              progress.points[
                progress.points.length - 1
              ];

            return (
              <View
                key={progress.exerciseId}
                style={styles.progressExerciseCard}
              >
                <View style={styles.progressExerciseHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.progressExerciseName}>
                      {progress.exerciseName}
                    </Text>

                    <Text style={styles.progressExerciseGroup}>
                      {progress.muscleGroup} · ×
                      {progress.factor} ·{' '}
                      {progress.loadType ===
                      'bodyweight'
                        ? 'свой вес'
                        : 'снаряд'}
                    </Text>
                  </View>

                  {last && (
                    <Text style={styles.progressLastDate}>
                      {formatShortDate(
                        last.finishedAt
                      )}
                    </Text>
                  )}
                </View>

                {renderProgressChart(
                  progress.points,
                  'maxWeight',
                  progress.loadType ===
                    'bodyweight'
                    ? 'ДОПОЛНИТЕЛЬНЫЙ ВЕС'
                    : 'МАКСИМАЛЬНЫЙ ВЕС'
                )}

                {renderProgressChart(
                  progress.points,
                  'volume',
                  'ТОННАЖ УПРАЖНЕНИЯ'
                )}
              </View>
            );
          })
        )}

        <Text style={styles.profileSectionTitle}>
          ОБМЕН ДАННЫМИ
        </Text>

        <View style={styles.exchangeCard}>
          <Text style={styles.exchangeTitle}>
            ШТАБНОЙ ПАКЕТ
          </Text>

          <Text style={styles.exchangeDescription}>
            Переносит упражнения, планы и график между устройствами. История тренировок и рекорды не затираются.
          </Text>

          <TouchableOpacity
            style={styles.primaryButton}
            onPress={
              exportPlanningPackage
            }
          >
            <Text style={styles.primaryButtonText}>
              ПЕРЕДАТЬ .TONNAGE
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={
              exportPcDatabase
            }
          >
            <Text style={styles.secondaryButtonText}>
              ВЫГРУЗИТЬ БАЗУ ДЛЯ ПК
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={
              importPlanningPackage
            }
          >
            <Text style={styles.secondaryButtonText}>
              ПРИНЯТЬ .TONNAGE
            </Text>
          </TouchableOpacity>

          <Text style={styles.exchangeFootnote}>
            .tonnage v2 — папки, упражнения, планы и график в обе стороны. .tonnage-db — полная история тренировок для расширенной статистики на ПК. Локально, без сервера.
          </Text>
        </View>
      </ScrollView>
    );
  };

  const renderSettingsScreen = () => {
    return (
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
      >
        <View style={styles.settingsScreenHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.kicker}>
              ПАРАМЕТРЫ ПРИЛОЖЕНИЯ
            </Text>

            <Text style={styles.bigTitle}>
              Настройки
            </Text>
          </View>

          <TouchableOpacity
            style={styles.settingsCloseButton}
            onPress={() =>
              setSettingsOpen(false)
            }
          >
            <Text style={styles.settingsCloseText}>
              ×
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.settingsCard}>
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingTitle}>
                Вес тела
              </Text>
              <Text style={styles.settingDescription}>
                Используется для подтягиваний, отжиманий и других упражнений с собственным весом. В истории фиксируется отдельно для каждой тренировки.
              </Text>
            </View>

            <View style={styles.bodyWeightInputWrap}>
              <TextInput
                style={styles.bodyWeightInput}
                keyboardType="decimal-pad"
                value={bodyWeightInput}
                onChangeText={setBodyWeightInput}
                onEndEditing={event =>
                  commitBodyWeight(
                    event.nativeEvent.text
                  )
                }
                placeholder="кг"
                placeholderTextColor="#626972"
              />
              <Text style={styles.bodyWeightUnit}>
                КГ
              </Text>
            </View>
          </View>

          <View style={styles.settingDivider} />

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingTitle}>
                Отдых по умолчанию
              </Text>
              <Text style={styles.settingDescription}>
                Время, на которое сбрасывается таймер.
              </Text>
            </View>

            <View style={styles.settingStepper}>
              <TouchableOpacity
                style={styles.settingStepButton}
                onPress={() => changeRestSeconds(-15)}
              >
                <Text style={styles.settingStepText}>−</Text>
              </TouchableOpacity>

              <Text style={styles.settingNumber}>
                {settings.restSeconds} с
              </Text>

              <TouchableOpacity
                style={styles.settingStepButton}
                onPress={() => changeRestSeconds(15)}
              >
                <Text style={styles.settingStepText}>+</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.settingDivider} />

          <TouchableOpacity
            style={styles.settingRow}
            onPress={() =>
              persistSettings({
                ...settings,
                randomMessages: !settings.randomMessages,
              })
            }
          >
            <View style={styles.settingInfo}>
              <Text style={styles.settingTitle}>
                Армейские сообщения
              </Text>
              <Text style={styles.settingDescription}>
                Рандомные доклады после тренировки.
              </Text>
            </View>

            <View
              style={[
                styles.settingToggle,
                settings.randomMessages && styles.settingToggleActive,
              ]}
            >
              <Text
                style={[
                  styles.settingToggleText,
                  settings.randomMessages && styles.settingToggleTextActive,
                ]}
              >
                {settings.randomMessages ? 'ВКЛ' : 'ВЫКЛ'}
              </Text>
            </View>
          </TouchableOpacity>

          <View style={styles.settingDivider} />

          <TouchableOpacity
            style={styles.settingRow}
            onPress={() =>
              persistSettings({
                ...settings,
                vibration: !settings.vibration,
              })
            }
          >
            <View style={styles.settingInfo}>
              <Text style={styles.settingTitle}>
                Тактильный отклик
              </Text>
              <Text style={styles.settingDescription}>
                Лёгкая отдача на таймер, рекорды и важные события.
              </Text>
            </View>

            <View
              style={[
                styles.settingToggle,
                settings.vibration && styles.settingToggleActive,
              ]}
            >
              <Text
                style={[
                  styles.settingToggleText,
                  settings.vibration && styles.settingToggleTextActive,
                ]}
              >
                {settings.vibration ? 'ВКЛ' : 'ВЫКЛ'}
              </Text>
            </View>
          </TouchableOpacity>

          <View style={styles.settingDivider} />

          <TouchableOpacity
            style={styles.settingRow}
            onPress={() =>
              persistSettings({
                ...settings,
                animations:
                  !settings.animations,
              })
            }
          >
            <View style={styles.settingInfo}>
              <Text style={styles.settingTitle}>
                Анимации интерфейса
              </Text>
              <Text style={styles.settingDescription}>
                Приказы, баннеры и плавный прогресс уровня.
              </Text>
            </View>

            <View
              style={[
                styles.settingToggle,
                settings.animations &&
                  styles.settingToggleActive,
              ]}
            >
              <Text
                style={[
                  styles.settingToggleText,
                  settings.animations &&
                    styles.settingToggleTextActive,
                ]}
              >
                {settings.animations
                  ? 'ВКЛ'
                  : 'ВЫКЛ'}
              </Text>
            </View>
          </TouchableOpacity>

          <View style={styles.settingDivider} />

          <TouchableOpacity
            style={styles.settingRow}
            onPress={
              toggleSystemNotifications
            }
          >
            <View style={styles.settingInfo}>
              <Text style={styles.settingTitle}>
                Системные уведомления
              </Text>
              <Text style={styles.settingDescription}>
                График, таймер отдыха и недельная сводка.
              </Text>
            </View>

            <View
              style={[
                styles.settingToggle,
                settings.notificationsEnabled &&
                  styles.settingToggleActive,
              ]}
            >
              <Text
                style={[
                  styles.settingToggleText,
                  settings.notificationsEnabled &&
                    styles.settingToggleTextActive,
                ]}
              >
                {settings.notificationsEnabled
                  ? 'ВКЛ'
                  : notificationStatus ===
                      'denied'
                    ? 'ЗАПРЕЩ.'
                    : 'ВЫКЛ'}
              </Text>
            </View>
          </TouchableOpacity>

          {settings.notificationsEnabled && (
            <>
              <View style={styles.settingDivider} />

              <View style={styles.settingRow}>
                <View style={styles.settingInfo}>
                  <Text style={styles.settingTitle}>
                    Время занятия
                  </Text>
                  <Text style={styles.settingDescription}>
                    Базовое время для дней из графика.
                  </Text>
                </View>

                <View style={styles.settingStepper}>
                  <TouchableOpacity
                    style={styles.settingStepButton}
                    onPress={() =>
                      persistSettings({
                        ...settings,
                        workoutHour:
                          (
                            settings.workoutHour +
                            23
                          ) % 24,
                      })
                    }
                  >
                    <Text style={styles.settingStepText}>
                      −
                    </Text>
                  </TouchableOpacity>

                  <Text style={styles.settingNumber}>
                    {String(
                      settings.workoutHour
                    ).padStart(2, '0')}
                    :00
                  </Text>

                  <TouchableOpacity
                    style={styles.settingStepButton}
                    onPress={() =>
                      persistSettings({
                        ...settings,
                        workoutHour:
                          (
                            settings.workoutHour +
                            1
                          ) % 24,
                      })
                    }
                  >
                    <Text style={styles.settingStepText}>
                      +
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.settingDivider} />

              <View style={styles.settingRow}>
                <View style={styles.settingInfo}>
                  <Text style={styles.settingTitle}>
                    Напомнить заранее
                  </Text>
                  <Text style={styles.settingDescription}>
                    За сколько минут до занятия поднять тревогу.
                  </Text>
                </View>

                <View style={styles.settingStepper}>
                  <TouchableOpacity
                    style={styles.settingStepButton}
                    onPress={() =>
                      persistSettings({
                        ...settings,
                        reminderMinutes:
                          Math.max(
                            0,
                            settings.reminderMinutes -
                              15
                          ),
                      })
                    }
                  >
                    <Text style={styles.settingStepText}>
                      −
                    </Text>
                  </TouchableOpacity>

                  <Text style={styles.settingNumber}>
                    {settings.reminderMinutes}{' '}
                    мин
                  </Text>

                  <TouchableOpacity
                    style={styles.settingStepButton}
                    onPress={() =>
                      persistSettings({
                        ...settings,
                        reminderMinutes:
                          Math.min(
                            120,
                            settings.reminderMinutes +
                              15
                          ),
                      })
                    }
                  >
                    <Text style={styles.settingStepText}>
                      +
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.settingDivider} />

              <TouchableOpacity
                style={styles.settingRow}
                onPress={() =>
                  persistSettings({
                    ...settings,
                    missedReminder:
                      !settings.missedReminder,
                  })
                }
              >
                <View style={styles.settingInfo}>
                  <Text style={styles.settingTitle}>
                    Вечерняя проверка
                  </Text>
                  <Text style={styles.settingDescription}>
                    В 22:00 напомнить, если план на день не закрыт.
                  </Text>
                </View>

                <View
                  style={[
                    styles.settingToggle,
                    settings.missedReminder &&
                      styles.settingToggleActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.settingToggleText,
                      settings.missedReminder &&
                        styles.settingToggleTextActive,
                    ]}
                  >
                    {settings.missedReminder
                      ? 'ВКЛ'
                      : 'ВЫКЛ'}
                  </Text>
                </View>
              </TouchableOpacity>

              <View style={styles.settingDivider} />

              <TouchableOpacity
                style={styles.settingRow}
                onPress={() =>
                  persistSettings({
                    ...settings,
                    weeklySummary:
                      !settings.weeklySummary,
                  })
                }
              >
                <View style={styles.settingInfo}>
                  <Text style={styles.settingTitle}>
                    Недельная сводка
                  </Text>
                  <Text style={styles.settingDescription}>
                    В воскресенье вечером напомнить открыть статистику.
                  </Text>
                </View>

                <View
                  style={[
                    styles.settingToggle,
                    settings.weeklySummary &&
                      styles.settingToggleActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.settingToggleText,
                      settings.weeklySummary &&
                        styles.settingToggleTextActive,
                    ]}
                  >
                    {settings.weeklySummary
                      ? 'ВКЛ'
                      : 'ВЫКЛ'}
                  </Text>
                </View>
              </TouchableOpacity>
            </>
          )}
        </View>


      </ScrollView>
    );
  };

  const renderHistory = () => {
    return (
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
      >
        <Text style={styles.kicker}>
          АРХИВ ВЫПОЛНЕННЫХ ЗАДАЧ
        </Text>

        <Text style={styles.bigTitle}>
          Журнал
        </Text>

        {history.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>
              Архив пуст
            </Text>

            <Text style={styles.emptyText}>
              Документов нет.
              Значит, никто ничего
              официально не поднимал.
            </Text>
          </View>
        ) : (
          history.map(item => {
            const expanded =
              expandedHistoryId ===
              item.id;

            const detail =
              archiveDetails[item.id];

            return (
              <View
                key={item.id}
                style={styles.historyCard}
              >
                <TouchableOpacity
                  activeOpacity={0.75}
                  onPress={() =>
                    toggleHistoryDetails(
                      item
                    )
                  }
                >
                  <Text
                    style={styles.historyDate}
                  >
                    {formatDate(
                      item.finishedAt
                    )}
                  </Text>

                  <View
                    style={styles.historyStats}
                  >
                    <View>
                      <Text
                        style={styles.smallLabel}
                      >
                        УПРАЖНЕНИЙ
                      </Text>

                      <Text
                        style={
                          styles.historyValue
                        }
                      >
                        {item.exerciseCount}
                      </Text>
                    </View>

                    <View
                      style={styles.levelRight}
                    >
                      <Text
                        style={styles.smallLabel}
                      >
                        ПЕРЕМЕЩЕНО
                      </Text>

                      <Text
                        style={
                          styles.historyValue
                        }
                      >
                        {formatWeight(
                          item.totalVolume
                        )}
                      </Text>
                    </View>
                  </View>

                  <Text
                    style={
                      styles.historyExpandText
                    }
                  >
                    {expanded
                      ? 'СВЕРНУТЬ ДОКЛАД'
                      : 'ОТКРЫТЬ ПОДРОБНЫЙ ДОКЛАД'}
                  </Text>
                </TouchableOpacity>

                {expanded && (
                  <View
                    style={
                      styles.historyDetailWrap
                    }
                  >
                    {loadingHistoryId ===
                    item.id ? (
                      <Text
                        style={
                          styles.historyLoading
                        }
                      >
                        Канцелярия поднимает
                        документы...
                      </Text>
                    ) : detail &&
                      detail.length > 0 ? (
                      (editingHistoryId === item.id && historyEditDraft
                        ? historyEditDraft
                        : detail
                      ).map(
                        (
                          exercise,
                          exerciseIndex
                        ) => (
                          <View
                            key={`${item.id}-${exercise.exerciseId}-${exerciseIndex}`}
                            style={
                              styles.archiveExercise
                            }
                          >
                            <View
                              style={
                                styles.archiveExerciseHeader
                              }
                            >
                              <View
                                style={{
                                  flex: 1,
                                }}
                              >
                                <Text
                                  style={
                                    styles.archiveExerciseName
                                  }
                                >
                                  {
                                    exercise.exerciseName
                                  }
                                </Text>

                                <Text
                                  style={
                                    styles.archiveExerciseMeta
                                  }
                                >
                                  множитель ×
                                  {exercise.factor} ·{' '}
                                  {exercise.loadType ===
                                  'bodyweight'
                                    ? 'собственный вес'
                                    : 'вес снаряда'}
                                </Text>
                              </View>

                              <Text
                                style={
                                  styles.archiveExerciseVolume
                                }
                              >
                                {formatWeight(
                                  exercise.volume
                                )}
                              </Text>
                            </View>

                            <View
                              style={
                                styles.archiveTableHeader
                              }
                            >
                              <Text
                                style={[
                                  styles.archiveHeaderText,
                                  {
                                    width: 34,
                                  },
                                ]}
                              >
                                #
                              </Text>

                              <Text
                                style={
                                  styles.archiveHeaderText
                                }
                              >
                                {exercise.loadType ===
                                'bodyweight'
                                  ? 'ДОП.КГ'
                                  : 'ВЕС'}
                              </Text>

                              <Text
                                style={
                                  styles.archiveHeaderText
                                }
                              >
                                ПОВТ.
                              </Text>

                              <Text
                                style={
                                  styles.archiveHeaderText
                                }
                              >
                                ОБЪЁМ
                              </Text>
                            </View>

                            {exercise.sets.map(
                              set => (
                                <View
                                  key={`${exerciseIndex}-${set.setNumber}`}
                                  style={
                                    styles.archiveSetRow
                                  }
                                >
                                  <Text
                                    style={[
                                      styles.archiveSetText,
                                      {
                                        width: 34,
                                      },
                                    ]}
                                  >
                                    {
                                      set.setNumber
                                    }
                                  </Text>

                                  {editingHistoryId === item.id ? (
                                    <TextInput
                                      style={styles.archiveEditInput}
                                      keyboardType="decimal-pad"
                                      value={String(
                                        exercise.loadType ===
                                        'bodyweight'
                                          ? set.additionalWeight ?? 0
                                          : set.weight
                                      )}
                                      onChangeText={value =>
                                        updateHistorySet(
                                          exerciseIndex,
                                          exercise.sets.indexOf(set),
                                          'weight',
                                          value
                                        )
                                      }
                                    />
                                  ) : (
                                    <Text
                                      style={styles.archiveSetText}
                                    >
                                      {exercise.loadType ===
                                      'bodyweight'
                                        ? `СВ ${set.bodyWeight ?? set.weight}${(set.additionalWeight ?? 0) > 0 ? ` +${set.additionalWeight}` : ''}`
                                        : set.weight}
                                    </Text>
                                  )}

                                  {editingHistoryId === item.id ? (
                                    <TextInput
                                      style={styles.archiveEditInput}
                                      keyboardType="number-pad"
                                      value={String(set.reps)}
                                      onChangeText={value =>
                                        updateHistorySet(
                                          exerciseIndex,
                                          exercise.sets.indexOf(set),
                                          'reps',
                                          value
                                        )
                                      }
                                    />
                                  ) : (
                                    <Text
                                      style={styles.archiveSetText}
                                    >
                                      {set.reps}
                                    </Text>
                                  )}

                                  <Text
                                    style={
                                      styles.archiveSetText
                                    }
                                  >
                                    {formatWeight(
                                      set.weight *
                                        set.reps *
                                        set.factor
                                    )}
                                  </Text>
                                </View>
                              )
                            )}
                          </View>
                        )
                      )
                    ) : (
                      <Text
                        style={
                          styles.historyLoading
                        }
                      >
                        Подробных данных нет.
                      </Text>
                    )}

                    {detail && detail.length > 0 && (
                      <View style={styles.historyActions}>
                        {editingHistoryId === item.id ? (
                          <>
                            <TouchableOpacity
                              style={styles.historySaveButton}
                              onPress={() => saveHistoryEdit(item)}
                            >
                              <Text style={styles.historySaveText}>
                                СОХРАНИТЬ ИСПРАВЛЕНИЯ
                              </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                              style={styles.historyCancelButton}
                              onPress={cancelHistoryEdit}
                            >
                              <Text style={styles.historyCancelText}>
                                ОТМЕНА
                              </Text>
                            </TouchableOpacity>
                          </>
                        ) : (
                          <>
                            <TouchableOpacity
                              style={styles.historyResumeButton}
                              onPress={() =>
                                resumeHistoryWorkout(
                                  item,
                                  detail
                                )
                              }
                            >
                              <Text style={styles.historyResumeText}>
                                ВОЗОБНОВИТЬ И ДОБАВИТЬ УПРАЖНЕНИЯ
                              </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                              style={styles.historyEditButton}
                              onPress={() => startHistoryEdit(item, detail)}
                            >
                              <Text style={styles.historyEditText}>
                                ИСПРАВИТЬ ДОКЛАД
                              </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                              style={styles.historyDeleteButton}
                              onPress={() => deleteHistoryWorkout(item)}
                            >
                              <Text style={styles.historyDeleteText}>
                                УДАЛИТЬ ТРЕНИРОВКУ
                              </Text>
                            </TouchableOpacity>
                          </>
                        )}
                      </View>
                    )}
                  </View>
                )}
              </View>
            );
          })
        )}
      </ScrollView>
    );
  };

  if (!ready) {
    return (
      <SafeAreaView
        style={styles.loading}
        edges={[
          'top',
          'bottom',
          'left',
          'right',
        ]}
      >
        <StatusBar
          barStyle="light-content"
          backgroundColor="#090b0e"
        />

        <Text style={styles.loadingTitle}>
          ФОРМИРУЕМ СВОДКУ
        </Text>

        <Text style={styles.loadingText}>
          Канцелярия ищет журнал...
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={styles.safe}
      edges={['top', 'left', 'right']}
    >
      <StatusBar
        barStyle="light-content"
        backgroundColor="#090b0e"
      />

      {!settingsOpen &&
        renderNavigation()}

      {settingsOpen ? (
        <View style={styles.settingsPage}>
          {renderSettingsScreen()}
        </View>
      ) : (
      <PagerView
        ref={pagerRef}
        style={styles.pager}
        initialPage={SCREEN_ORDER.indexOf(screen)}
        onPageSelected={event => {
          const index =
            event.nativeEvent.position;

          const selected =
            SCREEN_ORDER[index];

          if (selected) {
            setScreen(selected);
          }
        }}
        overScrollMode="never"
      >
        <View
          key="summary"
          style={styles.page}
          collapsable={false}
        >
          {renderSummary()}
        </View>

        <View
          key="workout"
          style={styles.page}
          collapsable={false}
        >
          {renderWorkout()}
        </View>

        <View
          key="plans"
          style={styles.page}
          collapsable={false}
        >
          {renderPlans()}
        </View>

        <View
          key="calendar"
          style={styles.page}
          collapsable={false}
        >
          {renderCalendar()}
        </View>

        <View
          key="exercises"
          style={styles.page}
          collapsable={false}
        >
          {renderExercises()}
        </View>

        <View
          key="profile"
          style={styles.page}
          collapsable={false}
        >
          {renderProfile()}
        </View>

        <View
          key="history"
          style={styles.page}
          collapsable={false}
        >
          {renderHistory()}
        </View>
      </PagerView>
      )}

      {banner && (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.uiBanner,
            banner.tone === 'record' &&
              styles.uiBannerRecord,
            banner.tone === 'warning' &&
              styles.uiBannerWarning,
            {
              opacity: bannerAnim,
              transform: [
                {
                  translateY:
                    bannerAnim.interpolate(
                      {
                        inputRange: [0, 1],
                        outputRange: [
                          -28,
                          0,
                        ],
                      }
                    ),
                },
              ],
            },
          ]}
        >
          <Text style={styles.uiBannerTitle}>
            {banner.title}
          </Text>

          <Text style={styles.uiBannerBody}>
            {banner.body}
          </Text>
        </Animated.View>
      )}

      {eventOverlay && (
        <View style={styles.eventBackdrop}>
          <Animated.View
            style={[
              styles.eventCard,
              {
                opacity: overlayAnim,
                transform: [
                  {
                    scale:
                      overlayAnim.interpolate(
                        {
                          inputRange: [
                            0,
                            1,
                          ],
                          outputRange: [
                            0.92,
                            1,
                          ],
                        }
                      ),
                  },
                  {
                    translateY:
                      overlayAnim.interpolate(
                        {
                          inputRange: [
                            0,
                            1,
                          ],
                          outputRange: [
                            20,
                            0,
                          ],
                        }
                      ),
                  },
                ],
              },
            ]}
          >
            <Text style={styles.eventEyebrow}>
              {eventOverlay.eyebrow}
            </Text>

            <Text style={styles.eventTitle}>
              {eventOverlay.title}
            </Text>

            <Text style={styles.eventSubtitle}>
              {eventOverlay.subtitle}
            </Text>

            <View style={styles.eventRule} />

            <Text style={styles.eventBody}>
              {eventOverlay.body}
            </Text>

            <TouchableOpacity
              style={styles.eventButton}
              onPress={closeEvent}
            >
              <Text style={styles.eventButtonText}>
                ПРИКАЗ ПРИНЯТ
              </Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      )}

      <Modal
        visible={Boolean(dialog)}
        transparent
        animationType="none"
        statusBarTranslucent
        onRequestClose={() => {
          const cancelAction =
            dialog?.actions.find(
              action =>
                action.style === 'cancel'
            );

          if (cancelAction) {
            pressDialogAction(cancelAction);
          } else {
            dismissDialog();
          }
        }}
      >
        <View style={styles.dialogBackdrop}>
          {dialog && (
            <Animated.View
              style={[
                styles.dialogCard,
                {
                  opacity: dialogAnim,
                  transform: [
                    {
                      scale:
                        dialogAnim.interpolate(
                          {
                            inputRange: [0, 1],
                            outputRange: [
                              0.94,
                              1,
                            ],
                          }
                        ),
                    },
                    {
                      translateY:
                        dialogAnim.interpolate(
                          {
                            inputRange: [0, 1],
                            outputRange: [
                              18,
                              0,
                            ],
                          }
                        ),
                    },
                  ],
                },
              ]}
            >
              <View style={styles.dialogHeaderRow}>
                <View style={styles.dialogHeaderMark} />

                <Text style={styles.dialogTitle}>
                  {dialog.title}
                </Text>
              </View>

              {dialog.message ? (
                <Text style={styles.dialogMessage}>
                  {dialog.message}
                </Text>
              ) : null}

              <View style={styles.dialogActions}>
                {dialog.actions.map(
                  (action, index) => (
                    <TouchableOpacity
                      key={`${dialog.id}:${index}:${action.text}`}
                      style={[
                        styles.dialogButton,
                        action.style ===
                          'cancel' &&
                          styles.dialogButtonCancel,
                        action.style ===
                          'destructive' &&
                          styles.dialogButtonDestructive,
                        dialog.actions.length ===
                          1 &&
                          styles.dialogButtonSingle,
                      ]}
                      activeOpacity={0.78}
                      onPress={() =>
                        pressDialogAction(
                          action
                        )
                      }
                    >
                      <Text
                        style={[
                          styles.dialogButtonText,
                          action.style ===
                            'cancel' &&
                            styles.dialogButtonTextCancel,
                          action.style ===
                            'destructive' &&
                            styles.dialogButtonTextDestructive,
                        ]}
                      >
                        {action.text}
                      </Text>
                    </TouchableOpacity>
                  )
                )}
              </View>
            </Animated.View>
          )}
        </View>
      </Modal>
    </SafeAreaView>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <WorkoutApp />
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#090b0e',
  },

  pager: {
    flex: 1,
  },

  page: {
    flex: 1,
    backgroundColor: '#090b0e',
  },

  loading: {
    flex: 1,
    backgroundColor: '#090b0e',
    justifyContent: 'center',
    alignItems: 'center',
  },

  loadingTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 1,
  },

  loadingText: {
    color: '#747b84',
    fontSize: 13,
    marginTop: 8,
  },

  navShell: {
    position: 'relative',
    paddingRight: 42,
  },

  settingsGear: {
    position: 'absolute',
    right: 7,
    top: 8,
    width: 36,
    height: 36,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: '#2e353d',
    backgroundColor: '#15191e',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 20,
  },

  settingsGearText: {
    color: '#d8dde2',
    fontSize: 18,
    lineHeight: 21,
  },

  settingsPage: {
    flex: 1,
    backgroundColor: '#090b0e',
  },

  settingsScreenHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },

  settingsCloseButton: {
    width: 42,
    height: 42,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#303740',
    backgroundColor: '#15191e',
    alignItems: 'center',
    justifyContent: 'center',
  },

  settingsCloseText: {
    color: '#ffffff',
    fontSize: 25,
    lineHeight: 28,
    fontWeight: '500',
  },

  nav: {
    flexDirection: 'row',
    paddingLeft: 14,
    paddingRight: 2,
    paddingTop: 8,
    paddingBottom: 8,
    gap: 6,
  },

  navButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 3,
    borderRadius: 10,
    alignItems: 'center',
  },

  navButtonActive: {
    backgroundColor: '#1a1e23',
  },

  navText: {
    color: '#626972',
    fontSize: 7,
    fontWeight: '900',
    letterSpacing: 0,
  },

  navTextActive: {
    color: '#ffffff',
  },

  container: {
    flex: 1,
    backgroundColor: '#090b0e',
  },

  content: {
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 70,
  },

  kicker: {
    color: '#737a83',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.8,
  },

  bigTitle: {
    color: '#ffffff',
    fontSize: 36,
    fontWeight: '900',
    marginTop: 5,
  },

  rank: {
    color: '#969da6',
    fontSize: 17,
    fontWeight: '700',
    marginTop: 2,
    marginBottom: 20,
  },

  smallLabel: {
    color: '#6e757e',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
  },

  levelCard: {
    backgroundColor: '#15191e',
    borderRadius: 18,
    padding: 20,
    marginBottom: 12,
  },

  levelTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },

  levelRight: {
    alignItems: 'flex-end',
  },

  levelVolume: {
    color: '#ffffff',
    fontSize: 28,
    fontWeight: '900',
    marginTop: 5,
  },

  levelRemaining: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '900',
    marginTop: 8,
  },

  progressTrack: {
    height: 10,
    backgroundColor: '#090b0e',
    borderRadius: 999,
    overflow: 'hidden',
    marginTop: 20,
  },

  progressFill: {
    height: '100%',
    backgroundColor: '#ffffff',
    borderRadius: 999,
  },

  progressText: {
    color: '#7c838c',
    fontSize: 11,
    fontWeight: '700',
    marginTop: 8,
    textAlign: 'right',
  },

  statsGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },

  statCard: {
    flex: 1,
    backgroundColor: '#15191e',
    borderRadius: 16,
    padding: 18,
  },

  statCardWide: {
    backgroundColor: '#15191e',
    borderRadius: 16,
    padding: 18,
    marginBottom: 14,
  },

  statValue: {
    color: '#ffffff',
    fontSize: 23,
    fontWeight: '900',
    marginTop: 6,
  },

  primaryButton: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
    marginTop: 4,
  },

  primaryButtonText: {
    color: '#090b0e',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 0.4,
  },

  secondaryButton: {
    borderWidth: 1,
    borderColor: '#383e46',
    borderRadius: 16,
    paddingVertical: 17,
    alignItems: 'center',
    marginTop: 10,
  },

  secondaryButtonText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '900',
  },

  buttonDisabled: {
    opacity: 0.5,
  },

  lastMission: {
    backgroundColor: '#111419',
    borderRadius: 16,
    padding: 18,
    marginTop: 14,
  },

  lastMissionDate: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '800',
    marginTop: 8,
    marginBottom: 10,
  },

  lastMissionText: {
    color: '#8b929b',
    fontSize: 13,
    lineHeight: 21,
  },

  calendarShortcut: {
    backgroundColor: '#15191e',
    borderRadius: 16,
    padding: 16,
    marginTop: 18,
    marginBottom: 2,
    flexDirection: 'row',
    alignItems: 'center',
  },

  calendarShortcutTitle: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '900',
    marginTop: 5,
  },

  calendarModeRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 18,
  },

  calendarModeButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#343a42',
    borderRadius: 11,
    paddingVertical: 11,
    alignItems: 'center',
  },

  calendarModeButtonActive: {
    backgroundColor: '#ffffff',
    borderColor: '#ffffff',
  },

  calendarModeText: {
    color: '#777e87',
    fontSize: 11,
    fontWeight: '900',
  },

  calendarModeTextActive: {
    color: '#090b0e',
  },

  calendarHeaderCard: {
    backgroundColor: '#15191e',
    borderRadius: 18,
    padding: 12,
    marginTop: 10,
  },

  calendarPeriodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },

  calendarArrowButton: {
    width: 44,
    height: 44,
    borderRadius: 11,
    backgroundColor: '#0d1013',
    alignItems: 'center',
    justifyContent: 'center',
  },

  calendarArrowText: {
    color: '#ffffff',
    fontSize: 30,
    fontWeight: '300',
    marginTop: -3,
  },

  calendarPeriodCenter: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 8,
  },

  calendarPeriodTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '900',
    textAlign: 'center',
  },

  calendarTodayText: {
    color: '#6f767f',
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 0.5,
    marginTop: 4,
  },

  calendarWeekHeader: {
    flexDirection: 'row',
    paddingBottom: 6,
  },

  calendarWeekday: {
    width: '14.2857%',
    color: '#666d76',
    fontSize: 9,
    fontWeight: '900',
    textAlign: 'center',
  },

  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },

  calendarCellWrap: {
    width: '14.2857%',
    padding: 2,
  },

  calendarCell: {
    height: 58,
    backgroundColor: '#0d1013',
    borderRadius: 9,
    paddingHorizontal: 5,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: 'transparent',
  },

  calendarCellOutside: {
    opacity: 0.33,
  },

  calendarCellToday: {
    borderColor: '#707780',
  },

  calendarCellSelected: {
    backgroundColor: '#ffffff',
    borderColor: '#ffffff',
    opacity: 1,
  },

  calendarDayNumber: {
    color: '#d8dadd',
    fontSize: 12,
    fontWeight: '900',
  },

  calendarDayNumberOutside: {
    color: '#747b84',
  },

  calendarDayNumberSelected: {
    color: '#090b0e',
  },

  calendarPlanMini: {
    color: '#8f969e',
    fontSize: 7,
    fontWeight: '800',
    marginTop: 5,
  },

  calendarPlanMiniSelected: {
    color: '#3e444b',
  },

  calendarDoneMark: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '900',
    position: 'absolute',
    right: 5,
    bottom: 4,
  },

  calendarDoneMarkSelected: {
    color: '#090b0e',
  },

  weekList: {
    gap: 6,
  },

  weekCopyCard: {
    backgroundColor: '#15191e',
    borderRadius: 16,
    padding: 16,
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },

  weekCopyTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '900',
    marginTop: 5,
  },

  weekCopyText: {
    color: '#737a83',
    fontSize: 10,
    lineHeight: 15,
    marginTop: 5,
  },

  weekCopyButton: {
    minWidth: 82,
    minHeight: 48,
    backgroundColor: '#ffffff',
    borderRadius: 11,
    paddingHorizontal: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },

  weekCopyButtonText: {
    color: '#090b0e',
    fontSize: 11,
    fontWeight: '900',
  },

  weekDayRow: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0d1013',
    borderRadius: 11,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: 'transparent',
  },

  weekDayRowSelected: {
    backgroundColor: '#ffffff',
    borderColor: '#ffffff',
  },

  weekDayDateBlock: {
    width: 50,
    alignItems: 'center',
  },

  weekDayName: {
    color: '#6d747c',
    fontSize: 8,
    fontWeight: '900',
  },

  weekDayNameSelected: {
    color: '#50565d',
  },

  weekDayNumber: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '900',
    marginTop: 1,
  },

  weekDayNumberSelected: {
    color: '#090b0e',
  },

  weekPlanBlock: {
    flex: 1,
    minWidth: 0,
    paddingLeft: 8,
  },

  weekPlanName: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '900',
  },

  weekPlanNameSelected: {
    color: '#090b0e',
  },

  weekPlanMeta: {
    color: '#656c75',
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 0.4,
    marginTop: 4,
  },

  weekPlanMetaSelected: {
    color: '#555c63',
  },

  selectedDayCard: {
    backgroundColor: '#15191e',
    borderRadius: 18,
    padding: 18,
    marginTop: 12,
  },

  selectedDayTitle: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '900',
    marginTop: 6,
  },

  selectedDayDone: {
    color: '#aeb4ba',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.5,
    marginTop: 9,
  },

  selectedPlanLabel: {
    color: '#686f78',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.8,
    marginTop: 17,
  },

  selectedPlanName: {
    color: '#ffffff',
    fontSize: 21,
    fontWeight: '900',
    marginTop: 5,
  },

  selectedPlanMeta: {
    color: '#777e87',
    fontSize: 11,
    marginTop: 4,
    marginBottom: 13,
  },

  selectedDayEmpty: {
    color: '#777e87',
    fontSize: 13,
    lineHeight: 19,
    marginTop: 13,
  },

  scheduleClearButton: {
    alignItems: 'center',
    paddingTop: 14,
    paddingBottom: 2,
  },

  scheduleClearText: {
    color: '#747b84',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
  },

  schedulePlanRow: {
    backgroundColor: '#15191e',
    borderRadius: 14,
    padding: 15,
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },

  schedulePlanRowActive: {
    backgroundColor: '#ffffff',
    borderColor: '#ffffff',
  },

  schedulePlanName: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '900',
  },

  schedulePlanNameActive: {
    color: '#090b0e',
  },

  schedulePlanMeta: {
    color: '#6f767f',
    fontSize: 10,
    marginTop: 4,
  },

  schedulePlanMetaActive: {
    color: '#555c63',
  },

  schedulePlanAction: {
    color: '#7e858e',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.4,
    marginLeft: 12,
  },

  schedulePlanActionActive: {
    color: '#090b0e',
  },

  timerCard: {
    backgroundColor: '#15191e',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },

  timerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },

  timerValue: {
    color: '#ffffff',
    fontSize: 34,
    fontWeight: '900',
    marginTop: 4,
    letterSpacing: 1,
  },

  timerState: {
    color: '#737a83',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.6,
    marginTop: 3,
  },

  timerButtons: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 14,
  },

  timerMainButton: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },

  timerMainText: {
    color: '#090b0e',
    fontSize: 11,
    fontWeight: '900',
  },

  timerSmallButton: {
    minWidth: 68,
    backgroundColor: '#0c0f12',
    borderRadius: 10,
    paddingHorizontal: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },

  timerSmallText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '900',
  },

  workoutSummary: {
    backgroundColor: '#15191e',
    borderRadius: 18,
    padding: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 18,
    marginBottom: 18,
  },

  resumedWorkoutCard: {
    backgroundColor: '#2a2213',
    borderWidth: 1,
    borderColor: '#7f6425',
    borderRadius: 14,
    padding: 14,
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },

  resumedWorkoutTitle: {
    color: '#f0c45c',
    fontSize: 11,
    fontWeight: '900',
  },

  resumedWorkoutText: {
    color: '#b5a77f',
    fontSize: 10,
    lineHeight: 15,
    marginTop: 4,
  },

  resumedWorkoutCancel: {
    borderWidth: 1,
    borderColor: '#7f6425',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },

  resumedWorkoutCancelText: {
    color: '#f0c45c',
    fontSize: 9,
    fontWeight: '900',
  },

  summaryRight: {
    alignItems: 'flex-end',
  },

  summaryValue: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: '900',
    marginTop: 5,
  },

  emptyCard: {
    backgroundColor: '#15191e',
    borderRadius: 18,
    padding: 22,
    marginTop: 18,
    marginBottom: 14,
  },

  emptyTitle: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '900',
  },

  emptyText: {
    color: '#777e87',
    fontSize: 14,
    lineHeight: 21,
    marginTop: 8,
  },

  exerciseCard: {
    backgroundColor: '#15191e',
    borderRadius: 18,
    padding: 16,
    marginBottom: 14,
  },

  exerciseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },

  exerciseTitleWrap: {
    flex: 1,
  },

  exerciseName: {
    color: '#ffffff',
    fontSize: 19,
    fontWeight: '800',
  },

  exerciseGroup: {
    color: '#6c737c',
    fontSize: 11,
    fontWeight: '700',
    marginTop: 4,
  },

  exerciseBadges: {
    alignItems: 'flex-end',
    gap: 6,
  },

  bodyweightBadge: {
    backgroundColor: '#173129',
    borderWidth: 1,
    borderColor: '#2e715d',
    borderRadius: 7,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },

  bodyweightBadgeText: {
    color: '#78d6b8',
    fontSize: 8,
    fontWeight: '900',
  },

  bodyweightInfoCard: {
    backgroundColor: '#101a17',
    borderWidth: 1,
    borderColor: '#244b40',
    borderRadius: 11,
    padding: 11,
    marginBottom: 12,
  },

  bodyweightInfoTitle: {
    color: '#78d6b8',
    fontSize: 10,
    fontWeight: '900',
  },

  bodyweightInfoText: {
    color: '#7f9c92',
    fontSize: 9,
    lineHeight: 14,
    marginTop: 4,
  },

  factorBadge: {
    backgroundColor: '#0c0f12',
    borderRadius: 9,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },

  factorBadgeBig: {
    backgroundColor: '#0c0f12',
    borderRadius: 10,
    minWidth: 56,
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 11,
  },

  factorText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '900',
  },

  tableHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
    paddingHorizontal: 4,
  },

  headerText: {
    flex: 1,
    color: '#606770',
    fontSize: 10,
    fontWeight: '900',
    textAlign: 'center',
  },

  numberColumn: {
    flex: 0.3,
  },

  deleteColumn: {
    width: 34,
  },

  setRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },

  setNumber: {
    flex: 0.3,
    color: '#8a919a',
    fontSize: 13,
    fontWeight: '800',
    textAlign: 'center',
  },

  input: {
    flex: 1,
    backgroundColor: '#0c0f12',
    color: '#ffffff',
    borderRadius: 10,
    paddingVertical: 11,
    fontSize: 17,
    fontWeight: '800',
    textAlign: 'center',
  },

  deleteSet: {
    width: 34,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },

  deleteSetText: {
    color: '#747b84',
    fontSize: 24,
  },

  textButton: {
    paddingVertical: 12,
    alignItems: 'center',
  },

  textButtonText: {
    color: '#969da6',
    fontSize: 12,
    fontWeight: '900',
  },

  finishExerciseButton: {
    marginTop: 11,
    minHeight: 48,
    borderRadius: 12,
    backgroundColor: '#e9edf0',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
  },

  finishExerciseButtonText: {
    color: '#090b0e',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.55,
  },

  removeButton: {
    paddingTop: 9,
    paddingBottom: 2,
    alignItems: 'center',
  },

  removeButtonText: {
    color: '#626972',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
  },

  folderManagerCard: {
    backgroundColor: '#15191e',
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
  },

  folderHint: {
    color: '#7c848d',
    fontSize: 11,
    lineHeight: 17,
    marginTop: 5,
    marginBottom: 12,
  },

  folderCreateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  folderCreateInput: {
    flex: 1,
    marginBottom: 0,
  },

  folderCreateButton: {
    minHeight: 46,
    borderRadius: 11,
    backgroundColor: '#eef1f3',
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },

  folderCreateButtonText: {
    color: '#090b0e',
    fontSize: 10,
    fontWeight: '900',
  },

  folderEmptyText: {
    color: '#626a73',
    fontSize: 10,
    marginTop: 11,
  },

  folderManageRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    marginTop: 9,
  },

  folderNameInput: {
    flex: 1,
    backgroundColor: '#0e1115',
    borderWidth: 1,
    borderColor: '#292f36',
    borderRadius: 10,
    color: '#ffffff',
    paddingHorizontal: 11,
    paddingVertical: 10,
    fontSize: 12,
  },

  folderDeleteButton: {
    borderWidth: 1,
    borderColor: '#55373b',
    backgroundColor: '#221719',
    borderRadius: 9,
    paddingHorizontal: 10,
    paddingVertical: 10,
  },

  folderDeleteText: {
    color: '#c6878e',
    fontSize: 9,
    fontWeight: '900',
  },

  fieldCaption: {
    color: '#717983',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.65,
    marginTop: 2,
    marginBottom: 8,
  },

  folderChoiceRow: {
    gap: 7,
    paddingBottom: 12,
  },

  folderChoice: {
    borderWidth: 1,
    borderColor: '#313841',
    backgroundColor: '#101419',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },

  folderChoiceActive: {
    backgroundColor: '#eef1f3',
    borderColor: '#eef1f3',
  },

  folderChoiceText: {
    color: '#8a929b',
    fontSize: 9,
    fontWeight: '900',
  },

  folderChoiceTextActive: {
    color: '#090b0e',
  },

  folderSection: {
    marginTop: 10,
  },

  folderSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 3,
    marginBottom: 8,
  },

  folderSectionTitle: {
    color: '#8a929c',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.8,
  },

  folderSectionCount: {
    color: '#626a73',
    fontSize: 10,
    fontWeight: '800',
  },

  exerciseFolderButton: {
    minHeight: 42,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#292f36',
    backgroundColor: '#101419',
    marginTop: 9,
    paddingHorizontal: 11,
    flexDirection: 'row',
    alignItems: 'center',
  },

  exerciseFolderLabel: {
    color: '#626a73',
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 0.7,
    marginRight: 10,
  },

  exerciseFolderValue: {
    flex: 1,
    color: '#c6cbd0',
    fontSize: 11,
    fontWeight: '800',
  },

  exerciseFolderChevron: {
    color: '#707881',
    fontSize: 20,
  },

  createCard: {
    backgroundColor: '#15191e',
    borderRadius: 18,
    padding: 16,
    marginTop: 18,
    marginBottom: 18,
  },

  createTitle: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '900',
    marginBottom: 14,
  },

  fullInput: {
    backgroundColor: '#0c0f12',
    color: '#ffffff',
    borderRadius: 11,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    marginBottom: 9,
  },

  factorSelector: {
    flexDirection: 'row',
    gap: 8,
  },

  factorSelectButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#353b43',
    borderRadius: 10,
    paddingVertical: 11,
    alignItems: 'center',
  },

  factorSelectActive: {
    backgroundColor: '#ffffff',
    borderColor: '#ffffff',
  },

  factorSelectText: {
    color: '#8a919a',
    fontWeight: '900',
  },

  factorSelectTextActive: {
    color: '#090b0e',
  },

  factorExplanation: {
    color: '#686f78',
    fontSize: 10,
    lineHeight: 16,
    marginTop: 10,
  },

  createButton: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 14,
  },

  createButtonText: {
    color: '#090b0e',
    fontSize: 12,
    fontWeight: '900',
  },

  catalogCard: {
    backgroundColor: '#15191e',
    borderRadius: 16,
    padding: 15,
    marginBottom: 10,
  },

  catalogTop: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },

  catalogFields: {
    flex: 1,
  },

  loadTypeButton: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: '#394049',
    borderRadius: 8,
    paddingHorizontal: 9,
    paddingVertical: 6,
    marginTop: 10,
  },

  loadTypeButtonBodyweight: {
    backgroundColor: '#173129',
    borderColor: '#2e715d',
  },

  loadTypeButtonText: {
    color: '#c8ced5',
    fontSize: 8,
    fontWeight: '900',
  },

  catalogName: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '800',
    paddingVertical: 2,
  },

  catalogGroup: {
    color: '#747b84',
    fontSize: 12,
    paddingVertical: 2,
    marginTop: 2,
  },

  catalogActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 14,
  },

  catalogAdd: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 10,
    paddingVertical: 11,
    alignItems: 'center',
  },

  catalogAdded: {
    backgroundColor: '#24292f',
  },

  catalogAddText: {
    color: '#090b0e',
    fontSize: 10,
    fontWeight: '900',
  },

  catalogAddedText: {
    color: '#777e87',
  },

  catalogDelete: {
    borderWidth: 1,
    borderColor: '#3a4048',
    borderRadius: 10,
    paddingHorizontal: 14,
    justifyContent: 'center',
  },

  catalogDeleteText: {
    color: '#7b828b',
    fontSize: 10,
    fontWeight: '900',
  },

  planSectionLabel: {
    color: '#737a83',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.1,
    marginTop: 12,
    marginBottom: 9,
  },

  planFolderBlock: {
    marginTop: 9,
  },

  planFolderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 4,
    paddingVertical: 7,
  },

  planFolderTitle: {
    color: '#747c85',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.7,
  },

  planFolderCount: {
    color: '#59616a',
    fontSize: 9,
    fontWeight: '800',
  },

  planPickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0c0f12',
    borderWidth: 1,
    borderColor: '#20252b',
    borderRadius: 12,
    paddingLeft: 13,
    paddingRight: 9,
    paddingVertical: 9,
    marginBottom: 7,
  },

  planPickerRowActive: {
    borderColor: '#4b525b',
  },

  planPickerInfo: {
    flex: 1,
    paddingVertical: 3,
  },

  planPickerName: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
  },

  planPickerGroup: {
    color: '#686f78',
    fontSize: 10,
    marginTop: 3,
  },

  planAddButton: {
    width: 42,
    height: 38,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: '#343b43',
    alignItems: 'center',
    justifyContent: 'center',
  },

  planAddButtonText: {
    color: '#ffffff',
    fontSize: 22,
    fontWeight: '600',
  },

  setCountControl: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },

  setCountButton: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: '#20252b',
    alignItems: 'center',
    justifyContent: 'center',
  },

  setCountButtonText: {
    color: '#ffffff',
    fontSize: 19,
    fontWeight: '700',
  },

  setCountText: {
    minWidth: 22,
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '900',
    textAlign: 'center',
  },

  planCard: {
    backgroundColor: '#15191e',
    borderRadius: 18,
    padding: 17,
    marginTop: 10,
  },

  planTitle: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '900',
  },

  planMeta: {
    color: '#737a83',
    fontSize: 11,
    fontWeight: '700',
    marginTop: 4,
  },

  planItems: {
    marginTop: 14,
    marginBottom: 12,
  },

  planItemLine: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#20252b',
  },

  planItemName: {
    flex: 1,
    color: '#a0a6ad',
    fontSize: 12,
    marginRight: 12,
  },

  planItemSets: {
    color: '#777e87',
    fontSize: 11,
    fontWeight: '800',
  },

  planStartButton: {
    backgroundColor: '#ffffff',
    borderRadius: 11,
    paddingVertical: 13,
    alignItems: 'center',
    marginTop: 4,
  },

  planStartText: {
    color: '#090b0e',
    fontSize: 12,
    fontWeight: '900',
  },

  planDeleteButton: {
    alignItems: 'center',
    paddingTop: 13,
    paddingBottom: 2,
  },

  planDeleteText: {
    color: '#646b74',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
  },

  dossierShortcut: {
    backgroundColor: '#15191e',
    borderRadius: 16,
    padding: 18,
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  dossierTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '900',
    marginTop: 6,
  },

  dossierMeta: {
    color: '#737a83',
    fontSize: 11,
    marginTop: 5,
  },

  dossierArrow: {
    color: '#ffffff',
    fontSize: 34,
    fontWeight: '300',
    marginLeft: 12,
  },

  previousResultCard: {
    backgroundColor: '#0f1216',
    borderRadius: 11,
    padding: 12,
    marginBottom: 14,
  },

  previousResultLabel: {
    color: '#666d76',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.7,
  },

  previousResultSets: {
    color: '#b0b5bb',
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 18,
    marginTop: 5,
  },

  liveStatus: {
    color: '#6f767f',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.35,
    marginTop: 8,
  },

  liveStatusRecord: {
    color: '#ffffff',
  },

  liveStatusDone: {
    color: '#b8bdc3',
  },

  liveStatusProgress: {
    color: '#858c95',
  },

  profileSummary: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 18,
  },

  profileSummaryCell: {
    flex: 1,
    backgroundColor: '#15191e',
    borderRadius: 16,
    padding: 17,
  },

  profileSummaryValue: {
    color: '#ffffff',
    fontSize: 23,
    fontWeight: '900',
    marginTop: 6,
  },

  profileSummarySub: {
    color: '#747b84',
    fontSize: 10,
    marginTop: 4,
  },

  statsDetailGrid: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },

  statsDetailCard: {
    flex: 1,
    backgroundColor: '#15191e',
    borderRadius: 14,
    padding: 15,
  },

  statsDetailValue: {
    color: '#ffffff',
    fontSize: 19,
    fontWeight: '900',
    marginTop: 6,
  },

  statsDetailSub: {
    color: '#6f767f',
    fontSize: 9,
    marginTop: 4,
  },

  statWideRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#15191e',
    borderRadius: 14,
    padding: 15,
    marginTop: 10,
  },

  weekCompareCard: {
    backgroundColor: '#111419',
    borderRadius: 14,
    padding: 15,
    marginTop: 10,
  },

  weekCompareValue: {
    color: '#ffffff',
    fontSize: 21,
    fontWeight: '900',
    marginTop: 6,
  },

  dialogBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.72)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 22,
  },

  dialogCard: {
    width: '100%',
    maxWidth: 520,
    backgroundColor: '#15191e',
    borderWidth: 1,
    borderColor: '#353c45',
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    elevation: 18,
  },

  dialogHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  dialogHeaderMark: {
    width: 4,
    height: 24,
    borderRadius: 2,
    backgroundColor: '#ffffff',
    marginRight: 11,
  },

  dialogTitle: {
    flex: 1,
    color: '#ffffff',
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '900',
    letterSpacing: 0.25,
  },

  dialogMessage: {
    color: '#a5abb3',
    fontSize: 13,
    lineHeight: 20,
    marginTop: 14,
  },

  dialogActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    flexWrap: 'wrap',
    gap: 9,
    marginTop: 20,
  },

  dialogButton: {
    minHeight: 42,
    minWidth: 112,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: '#464e58',
    backgroundColor: '#f0f2f4',
    paddingHorizontal: 16,
    paddingVertical: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },

  dialogButtonSingle: {
    minWidth: 132,
  },

  dialogButtonCancel: {
    backgroundColor: '#1b2026',
    borderColor: '#353c45',
  },

  dialogButtonDestructive: {
    backgroundColor: '#2a1719',
    borderColor: '#704249',
  },

  dialogButtonText: {
    color: '#090b0e',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.45,
    textAlign: 'center',
  },

  dialogButtonTextCancel: {
    color: '#a8afb7',
  },

  dialogButtonTextDestructive: {
    color: '#f1b9be',
  },

  uiBanner: {
    position: 'absolute',
    top: 72,
    left: 18,
    right: 18,
    zIndex: 50,
    elevation: 12,
    backgroundColor: '#20252b',
    borderWidth: 1,
    borderColor: '#3b424b',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 13,
  },

  uiBannerRecord: {
    borderColor: '#7b838d',
    backgroundColor: '#252a30',
  },

  uiBannerWarning: {
    borderColor: '#555d66',
    backgroundColor: '#1c2025',
  },

  uiBannerTitle: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.7,
  },

  uiBannerBody: {
    color: '#a4aab1',
    fontSize: 11,
    lineHeight: 17,
    marginTop: 4,
  },

  eventBackdrop: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 100,
    elevation: 20,
    backgroundColor: 'rgba(0,0,0,0.78)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 22,
  },

  eventCard: {
    width: '100%',
    maxWidth: 520,
    backgroundColor: '#15191e',
    borderWidth: 1,
    borderColor: '#505761',
    borderRadius: 20,
    padding: 22,
  },

  eventEyebrow: {
    color: '#7b828b',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.7,
    textAlign: 'center',
  },

  eventTitle: {
    color: '#ffffff',
    fontSize: 34,
    fontWeight: '900',
    textAlign: 'center',
    marginTop: 12,
  },

  eventSubtitle: {
    color: '#a4aab1',
    fontSize: 16,
    fontWeight: '800',
    textAlign: 'center',
    marginTop: 5,
  },

  eventRule: {
    height: 1,
    backgroundColor: '#30363e',
    marginVertical: 18,
  },

  eventBody: {
    color: '#9aa1a9',
    fontSize: 12,
    lineHeight: 19,
    textAlign: 'center',
  },

  eventButton: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 20,
  },

  eventButtonText: {
    color: '#090b0e',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.5,
  },

  exchangeCard: {
    backgroundColor: '#15191e',
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
  },

  exchangeTitle: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.8,
  },

  exchangeDescription: {
    color: '#8f969f',
    fontSize: 12,
    lineHeight: 18,
    marginTop: 7,
    marginBottom: 12,
  },

  exchangeFootnote: {
    color: '#606871',
    fontSize: 10,
    lineHeight: 15,
    marginTop: 12,
  },

  settingsCard: {
    backgroundColor: '#15191e',
    borderRadius: 16,
    paddingHorizontal: 15,
    marginTop: 10,
    overflow: 'hidden',
  },

  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 15,
  },

  settingInfo: {
    flex: 1,
  },

  settingTitle: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '900',
  },

  settingDescription: {
    color: '#6f767f',
    fontSize: 9,
    lineHeight: 14,
    marginTop: 4,
  },

  settingStepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },

  settingStepButton: {
    width: 32,
    height: 32,
    backgroundColor: '#0c0f12',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },

  settingStepText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '800',
  },

  settingNumber: {
    minWidth: 52,
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '900',
    textAlign: 'center',
  },

  bodyWeightInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0c0f12',
    borderRadius: 9,
    paddingRight: 10,
  },

  bodyWeightInput: {
    width: 62,
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '900',
    textAlign: 'center',
    paddingHorizontal: 8,
    paddingVertical: 9,
  },

  bodyWeightUnit: {
    color: '#727983',
    fontSize: 9,
    fontWeight: '900',
  },

  settingDivider: {
    height: 1,
    backgroundColor: '#252a31',
  },

  settingToggle: {
    minWidth: 54,
    borderWidth: 1,
    borderColor: '#343a42',
    borderRadius: 9,
    paddingVertical: 8,
    paddingHorizontal: 9,
    alignItems: 'center',
  },

  settingToggleActive: {
    backgroundColor: '#ffffff',
    borderColor: '#ffffff',
  },

  settingToggleText: {
    color: '#777e87',
    fontSize: 9,
    fontWeight: '900',
  },

  settingToggleTextActive: {
    color: '#090b0e',
  },

  profileSectionTitle: {
    color: '#737a83',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.5,
    marginTop: 26,
    marginBottom: 2,
  },

  achievementCard: {
    backgroundColor: '#111419',
    borderWidth: 1,
    borderColor: '#22272e',
    borderRadius: 14,
    padding: 15,
    marginTop: 9,
  },

  achievementUnlocked: {
    backgroundColor: '#171b20',
    borderColor: '#444b54',
  },

  achievementTop: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
  },

  achievementTitle: {
    color: '#8a919a',
    fontSize: 15,
    fontWeight: '900',
  },

  achievementTitleUnlocked: {
    color: '#ffffff',
  },

  achievementDescription: {
    color: '#686f78',
    fontSize: 10,
    lineHeight: 15,
    marginTop: 4,
  },

  achievementState: {
    color: '#626972',
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 0.5,
    marginTop: 2,
  },

  achievementStateUnlocked: {
    color: '#ffffff',
  },

  achievementTrack: {
    height: 6,
    backgroundColor: '#090b0e',
    borderRadius: 999,
    overflow: 'hidden',
    marginTop: 13,
  },

  achievementFill: {
    height: '100%',
    backgroundColor: '#ffffff',
    borderRadius: 999,
  },

  achievementProgress: {
    color: '#6e757e',
    fontSize: 9,
    fontWeight: '700',
    textAlign: 'right',
    marginTop: 5,
  },

  progressExerciseCard: {
    backgroundColor: '#15191e',
    borderRadius: 17,
    padding: 16,
    marginTop: 10,
  },

  progressExerciseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 4,
  },

  progressExerciseName: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '900',
  },

  progressExerciseGroup: {
    color: '#6c737c',
    fontSize: 10,
    marginTop: 3,
  },

  progressLastDate: {
    color: '#7d848d',
    fontSize: 10,
    fontWeight: '800',
  },

  chartCard: {
    backgroundColor: '#0f1216',
    borderRadius: 12,
    padding: 12,
    marginTop: 11,
  },

  chartHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  chartTitle: {
    color: '#686f78',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.6,
  },

  chartLatest: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '900',
  },

  chartBars: {
    height: 112,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 5,
    marginTop: 10,
  },

  chartColumn: {
    flex: 1,
    height: 108,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },

  chartBar: {
    width: '70%',
    minWidth: 5,
    maxWidth: 24,
    backgroundColor: '#ffffff',
    borderRadius: 4,
  },

  chartDate: {
    color: '#5f6670',
    fontSize: 7,
    marginTop: 5,
  },

  recordsHeading: {
    color: '#737a83',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.5,
    marginTop: 24,
    marginBottom: 2,
  },

  recordCard: {
    backgroundColor: '#15191e',
    borderRadius: 16,
    padding: 17,
    marginTop: 10,
  },

  recordHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  recordTitleWrap: {
    flex: 1,
  },

  recordName: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '900',
  },

  recordGroup: {
    color: '#6f767f',
    fontSize: 11,
    marginTop: 3,
  },

  recordFactor: {
    backgroundColor: '#0c0f12',
    borderRadius: 9,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },

  recordFactorText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '900',
  },

  recordStatsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 15,
  },

  recordStat: {
    flex: 1,
    backgroundColor: '#0f1216',
    borderRadius: 12,
    padding: 13,
  },

  recordValue: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '900',
    marginTop: 6,
  },

  recordSubvalue: {
    color: '#737a83',
    fontSize: 10,
    marginTop: 3,
  },

  archiveEditInput: {
    flex: 1,
    backgroundColor: '#15191e',
    color: '#ffffff',
    borderRadius: 7,
    paddingVertical: 5,
    marginHorizontal: 3,
    fontSize: 11,
    fontWeight: '800',
    textAlign: 'center',
  },

  historyActions: {
    marginTop: 14,
    gap: 8,
  },

  historyResumeButton: {
    backgroundColor: '#ffffff',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 10,
    alignItems: 'center',
  },

  historyResumeText: {
    color: '#090b0e',
    fontSize: 9,
    fontWeight: '900',
    textAlign: 'center',
  },

  historyEditButton: {
    borderWidth: 1,
    borderColor: '#3b424a',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },

  historyEditText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '900',
  },

  historyDeleteButton: {
    paddingVertical: 10,
    alignItems: 'center',
  },

  historyDeleteText: {
    color: '#7d7477',
    fontSize: 9,
    fontWeight: '900',
  },

  historySaveButton: {
    backgroundColor: '#ffffff',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },

  historySaveText: {
    color: '#090b0e',
    fontSize: 10,
    fontWeight: '900',
  },

  historyCancelButton: {
    paddingVertical: 10,
    alignItems: 'center',
  },

  historyCancelText: {
    color: '#777e87',
    fontSize: 9,
    fontWeight: '900',
  },

  historyExpandText: {
    color: '#7c838c',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
    marginTop: 15,
  },

  historyDetailWrap: {
    borderTopWidth: 1,
    borderTopColor: '#272c33',
    marginTop: 15,
    paddingTop: 4,
  },

  historyLoading: {
    color: '#747b84',
    fontSize: 12,
    paddingVertical: 15,
  },

  archiveExercise: {
    backgroundColor: '#0f1216',
    borderRadius: 12,
    padding: 13,
    marginTop: 10,
  },

  archiveExerciseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },

  archiveExerciseName: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '900',
  },

  archiveExerciseMeta: {
    color: '#676e77',
    fontSize: 9,
    marginTop: 3,
  },

  archiveExerciseVolume: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '900',
  },

  archiveTableHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 5,
  },

  archiveHeaderText: {
    flex: 1,
    color: '#5f6670',
    fontSize: 9,
    fontWeight: '900',
    textAlign: 'center',
  },

  archiveSetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0b0e11',
    borderRadius: 8,
    paddingVertical: 8,
    marginTop: 5,
  },

  archiveSetText: {
    flex: 1,
    color: '#a0a6ad',
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
  },

  historyCard: {
    backgroundColor: '#15191e',
    borderRadius: 16,
    padding: 18,
    marginTop: 12,
  },

  historyDate: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 15,
  },

  historyStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },

  historyValue: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '900',
    marginTop: 5,
  },
});
