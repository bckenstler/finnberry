/**
 * Demo data generators for creating realistic baby tracking records.
 * Generates 14 days of data for a 6-month-old infant.
 */

// ============================================================================
// Helper utilities
// ============================================================================

/**
 * Returns a random integer between min and max (inclusive)
 */
function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Returns a random element from an array based on weights
 */
function weightedRandom<T>(items: T[], weights: number[]): T {
  const totalWeight = weights.reduce((a, b) => a + b, 0);
  let random = Math.random() * totalWeight;

  for (let i = 0; i < items.length; i++) {
    random -= weights[i];
    if (random <= 0) {
      return items[i];
    }
  }
  return items[items.length - 1];
}

/**
 * Adds random minutes to a date (for natural variation)
 */
function addVariation(date: Date, minutesRange: number): Date {
  const variation = randomInt(-minutesRange, minutesRange);
  return new Date(date.getTime() + variation * 60 * 1000);
}

/**
 * Maybe returns a note (20% chance)
 */
function maybeNote(notes: string[]): string | undefined {
  if (Math.random() < 0.2) {
    return notes[randomInt(0, notes.length - 1)];
  }
  return undefined;
}

// ============================================================================
// Sleep Records
// ============================================================================

const sleepNotes = [
  "Slept well",
  "Woke once but went back to sleep",
  "Needed extra soothing",
  "Slept through the night!",
  "Restless at first",
  "Fell asleep quickly",
];

export interface SleepRecordData {
  childId: string;
  startTime: Date;
  endTime: Date;
  sleepType: "NAP" | "NIGHT";
  quality: number;
  notes?: string;
}

export function generateSleepRecords(
  childId: string,
  startDate: Date,
  days: number
): SleepRecordData[] {
  const records: SleepRecordData[] = [];

  for (let day = 0; day < days; day++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() - day);

    // Morning nap (~9am, 45-90 min)
    const morningNapStart = new Date(date);
    morningNapStart.setHours(9, 0, 0, 0);
    const morningNapStartVaried = addVariation(morningNapStart, 30);
    const morningNapDuration = randomInt(45, 90);
    records.push({
      childId,
      startTime: morningNapStartVaried,
      endTime: new Date(morningNapStartVaried.getTime() + morningNapDuration * 60 * 1000),
      sleepType: "NAP",
      quality: randomInt(3, 5),
      notes: maybeNote(sleepNotes),
    });

    // Afternoon nap (~1pm, 60-120 min)
    const afternoonNapStart = new Date(date);
    afternoonNapStart.setHours(13, 0, 0, 0);
    const afternoonNapStartVaried = addVariation(afternoonNapStart, 30);
    const afternoonNapDuration = randomInt(60, 120);
    records.push({
      childId,
      startTime: afternoonNapStartVaried,
      endTime: new Date(afternoonNapStartVaried.getTime() + afternoonNapDuration * 60 * 1000),
      sleepType: "NAP",
      quality: randomInt(3, 5),
      notes: maybeNote(sleepNotes),
    });

    // Occasional third nap (~4pm, 30-45 min) - 40% chance
    if (Math.random() < 0.4) {
      const lateNapStart = new Date(date);
      lateNapStart.setHours(16, 30, 0, 0);
      const lateNapStartVaried = addVariation(lateNapStart, 20);
      const lateNapDuration = randomInt(30, 45);
      records.push({
        childId,
        startTime: lateNapStartVaried,
        endTime: new Date(lateNapStartVaried.getTime() + lateNapDuration * 60 * 1000),
        sleepType: "NAP",
        quality: randomInt(3, 5),
        notes: maybeNote(sleepNotes),
      });
    }

    // Night sleep (~7pm to ~6am next day)
    const nightStart = new Date(date);
    nightStart.setHours(19, 0, 0, 0);
    const nightStartVaried = addVariation(nightStart, 30);

    const nightEnd = new Date(date);
    nightEnd.setDate(nightEnd.getDate() + 1);
    nightEnd.setHours(6, 0, 0, 0);
    const nightEndVaried = addVariation(nightEnd, 30);

    records.push({
      childId,
      startTime: nightStartVaried,
      endTime: nightEndVaried,
      sleepType: "NIGHT",
      quality: randomInt(3, 5),
      notes: maybeNote(sleepNotes),
    });
  }

  return records;
}

// ============================================================================
// Feeding Records
// ============================================================================

const feedingNotes = [
  "Good appetite",
  "Fussy at first",
  "Took bottle well",
  "Tried new food",
  "Ate happily",
  "Needed burping",
];

const solidFoods = [
  ["sweet potato puree"],
  ["banana"],
  ["avocado"],
  ["oatmeal cereal"],
  ["carrot puree"],
  ["apple sauce"],
  ["pear puree"],
  ["peas"],
];

export interface FeedingRecordData {
  childId: string;
  feedingType: "BREAST" | "BOTTLE" | "SOLIDS";
  startTime: Date;
  endTime?: Date;
  side?: "LEFT" | "RIGHT" | "BOTH";
  leftDurationSeconds?: number;
  rightDurationSeconds?: number;
  amountMl?: number;
  bottleContentType?: "FORMULA" | "BREAST_MILK";
  foodItems?: string[];
  notes?: string;
}

export function generateFeedingRecords(
  childId: string,
  startDate: Date,
  days: number
): FeedingRecordData[] {
  const records: FeedingRecordData[] = [];

  for (let day = 0; day < days; day++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() - day);

    // Typical feeding schedule for 6-month-old: 7-8 feeds per day
    const feedingTimes = [6, 8, 10, 12, 14, 16, 18, 20]; // Hours of day

    for (const hour of feedingTimes) {
      const feedTime = new Date(date);
      feedTime.setHours(hour, 0, 0, 0);
      const feedTimeVaried = addVariation(feedTime, 30);

      // Determine feeding type based on time of day
      // Morning/evening: mostly breast or bottle
      // Midday: introduce solids
      const feedingType = weightedRandom<"BREAST" | "BOTTLE" | "SOLIDS">(
        ["BREAST", "BOTTLE", "SOLIDS"],
        hour >= 11 && hour <= 17 ? [0.3, 0.3, 0.4] : [0.5, 0.5, 0]
      );

      const record: FeedingRecordData = {
        childId,
        feedingType,
        startTime: feedTimeVaried,
        notes: maybeNote(feedingNotes),
      };

      if (feedingType === "BREAST") {
        const side = weightedRandom<"LEFT" | "RIGHT" | "BOTH">(
          ["LEFT", "RIGHT", "BOTH"],
          [0.35, 0.35, 0.3]
        );
        const durationMinutes = randomInt(10, 25);

        record.side = side;
        if (side === "LEFT") {
          record.leftDurationSeconds = durationMinutes * 60;
        } else if (side === "RIGHT") {
          record.rightDurationSeconds = durationMinutes * 60;
        } else {
          record.leftDurationSeconds = Math.floor(durationMinutes * 0.5 * 60);
          record.rightDurationSeconds = Math.floor(durationMinutes * 0.5 * 60);
        }
        record.endTime = new Date(feedTimeVaried.getTime() + durationMinutes * 60 * 1000);
      } else if (feedingType === "BOTTLE") {
        record.amountMl = randomInt(100, 180);
        record.bottleContentType = weightedRandom(["FORMULA", "BREAST_MILK"], [0.4, 0.6]);
        record.endTime = new Date(feedTimeVaried.getTime() + randomInt(15, 30) * 60 * 1000);
      } else {
        // SOLIDS
        record.foodItems = solidFoods[randomInt(0, solidFoods.length - 1)];
        record.endTime = new Date(feedTimeVaried.getTime() + randomInt(20, 40) * 60 * 1000);
      }

      records.push(record);
    }
  }

  return records;
}

// ============================================================================
// Diaper Records
// ============================================================================

const diaperNotes = [
  "Normal",
  "Diaper rash noticed",
  "Changed right after feeding",
  "Needed extra wipes",
  "Used barrier cream",
];

export interface DiaperRecordData {
  childId: string;
  time: Date;
  diaperType: "WET" | "DIRTY" | "BOTH" | "DRY";
  color?: "YELLOW" | "GREEN" | "BROWN";
  consistency?: "SOFT" | "FORMED" | "LOOSE";
  size?: "SIZE_3";
  amount?: "SMALL" | "MEDIUM" | "LARGE";
  notes?: string;
}

export function generateDiaperRecords(
  childId: string,
  startDate: Date,
  days: number
): DiaperRecordData[] {
  const records: DiaperRecordData[] = [];

  for (let day = 0; day < days; day++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() - day);

    // 8-10 diaper changes per day for 6-month-old
    const numChanges = randomInt(8, 10);
    const changeHours = [6, 7, 9, 10, 12, 14, 16, 17, 19, 21];

    for (let i = 0; i < numChanges && i < changeHours.length; i++) {
      const changeTime = new Date(date);
      changeTime.setHours(changeHours[i], randomInt(0, 59), 0, 0);

      // Distribution: 60% WET, 25% BOTH, 10% DIRTY, 5% DRY
      const diaperType = weightedRandom<"WET" | "DIRTY" | "BOTH" | "DRY">(
        ["WET", "DIRTY", "BOTH", "DRY"],
        [0.6, 0.1, 0.25, 0.05]
      );

      const record: DiaperRecordData = {
        childId,
        time: changeTime,
        diaperType,
        size: "SIZE_3",
        notes: maybeNote(diaperNotes),
      };

      // Add details for DIRTY or BOTH
      if (diaperType === "DIRTY" || diaperType === "BOTH") {
        record.color = weightedRandom(["YELLOW", "BROWN", "GREEN"], [0.5, 0.4, 0.1]);
        record.consistency = weightedRandom(["SOFT", "FORMED", "LOOSE"], [0.5, 0.3, 0.2]);
        record.amount = weightedRandom(["SMALL", "MEDIUM", "LARGE"], [0.3, 0.5, 0.2]);
      } else if (diaperType === "WET") {
        record.amount = weightedRandom(["SMALL", "MEDIUM", "LARGE"], [0.2, 0.5, 0.3]);
      }

      records.push(record);
    }
  }

  return records;
}

// ============================================================================
// Pumping Records
// ============================================================================

const pumpingNotes = [
  "Good session",
  "Used new flanges",
  "Pumped during lunch break",
  "Stored in freezer",
  "Lower output than usual",
];

export interface PumpingRecordData {
  childId: string;
  startTime: Date;
  endTime: Date;
  amountMl: number;
  side: "LEFT" | "RIGHT" | "BOTH";
  notes?: string;
}

export function generatePumpingRecords(
  childId: string,
  startDate: Date,
  days: number
): PumpingRecordData[] {
  const records: PumpingRecordData[] = [];

  for (let day = 0; day < days; day++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() - day);

    // 2-4 pumping sessions per day
    const numSessions = randomInt(2, 4);
    const sessionHours = [7, 11, 15, 20];

    for (let i = 0; i < numSessions; i++) {
      const pumpTime = new Date(date);
      pumpTime.setHours(sessionHours[i], randomInt(0, 30), 0, 0);

      const durationMinutes = randomInt(15, 30);
      const side = weightedRandom<"LEFT" | "RIGHT" | "BOTH">(
        ["LEFT", "RIGHT", "BOTH"],
        [0.2, 0.2, 0.6]
      );

      records.push({
        childId,
        startTime: pumpTime,
        endTime: new Date(pumpTime.getTime() + durationMinutes * 60 * 1000),
        amountMl: randomInt(60, 150),
        side,
        notes: maybeNote(pumpingNotes),
      });
    }
  }

  return records;
}

// ============================================================================
// Growth Records (weekly)
// ============================================================================

export interface GrowthRecordData {
  childId: string;
  date: Date;
  weightKg: number;
  heightCm: number;
  headCircumferenceCm: number;
  notes?: string;
}

export function generateGrowthRecords(
  childId: string,
  startDate: Date,
  days: number
): GrowthRecordData[] {
  const records: GrowthRecordData[] = [];

  // Weekly growth measurements (2 over 14 days)
  const weeks = Math.ceil(days / 7);

  // Baseline for 6-month-old: ~7.5kg, ~65cm, ~43cm head
  let baseWeight = 7.5;
  let baseHeight = 65;
  let baseHead = 43;

  for (let week = 0; week < weeks; week++) {
    const recordDate = new Date(startDate);
    recordDate.setDate(recordDate.getDate() - week * 7);
    recordDate.setHours(10, 0, 0, 0); // Typically measured in morning

    // Small weekly growth
    const weight = baseWeight + week * 0.15 + Math.random() * 0.1;
    const height = baseHeight + week * 0.5 + Math.random() * 0.3;
    const head = baseHead + week * 0.1 + Math.random() * 0.1;

    records.push({
      childId,
      date: recordDate,
      weightKg: Math.round(weight * 100) / 100,
      heightCm: Math.round(height * 10) / 10,
      headCircumferenceCm: Math.round(head * 10) / 10,
      notes: week === 0 ? "6-month checkup" : undefined,
    });
  }

  return records;
}

// ============================================================================
// Temperature Records
// ============================================================================

const temperatureNotes = [
  "Normal check",
  "Before bath",
  "After nap",
  "Seemed warm",
  "Rectal measurement",
];

export interface TemperatureRecordData {
  childId: string;
  time: Date;
  temperatureCelsius: number;
  notes?: string;
}

export function generateTemperatureRecords(
  childId: string,
  startDate: Date,
  days: number
): TemperatureRecordData[] {
  const records: TemperatureRecordData[] = [];

  for (let day = 0; day < days; day++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() - day);

    // 1-2 temperature checks per day (not every day)
    if (Math.random() > 0.3) {
      // Skip some days
      continue;
    }

    const numChecks = randomInt(1, 2);
    const checkHours = [8, 18]; // Morning and evening

    for (let i = 0; i < numChecks; i++) {
      const checkTime = new Date(date);
      checkTime.setHours(checkHours[i], randomInt(0, 30), 0, 0);

      // Normal range: 36.5-37.2°C
      const temp = 36.5 + Math.random() * 0.7;

      records.push({
        childId,
        time: checkTime,
        temperatureCelsius: Math.round(temp * 10) / 10,
        notes: maybeNote(temperatureNotes),
      });
    }
  }

  return records;
}

// ============================================================================
// Activity Records
// ============================================================================

const activityNotes: Record<string, string[]> = {
  TUMMY_TIME: ["Great head control", "Liked the play mat", "Practiced rolling"],
  BATH: ["Splashed a lot", "Very calm", "Used lavender soap"],
  OUTDOOR_PLAY: ["Nice weather", "Went to the park", "Enjoyed the stroller ride"],
  STORYTIME: ["Read 3 books", "Favorite: Goodnight Moon", "Very attentive"],
  INDOOR_PLAY: ["Played with blocks", "Explored new toys", "Sat up well"],
};

export interface ActivityRecordData {
  childId: string;
  activityType: "TUMMY_TIME" | "BATH" | "OUTDOOR_PLAY" | "INDOOR_PLAY" | "STORYTIME";
  startTime: Date;
  endTime: Date;
  notes?: string;
}

export function generateActivityRecords(
  childId: string,
  startDate: Date,
  days: number
): ActivityRecordData[] {
  const records: ActivityRecordData[] = [];

  for (let day = 0; day < days; day++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() - day);

    // 4-5 activities per day
    const activities: Array<{
      type: "TUMMY_TIME" | "BATH" | "OUTDOOR_PLAY" | "INDOOR_PLAY" | "STORYTIME";
      hour: number;
      duration: [number, number];
    }> = [
      { type: "TUMMY_TIME", hour: 8, duration: [10, 20] },
      { type: "INDOOR_PLAY", hour: 10, duration: [20, 40] },
      { type: "OUTDOOR_PLAY", hour: 15, duration: [30, 60] },
      { type: "BATH", hour: 18, duration: [15, 25] },
      { type: "STORYTIME", hour: 19, duration: [10, 20] },
    ];

    // Include most activities (80% chance each)
    for (const activity of activities) {
      if (Math.random() < 0.8) {
        const activityTime = new Date(date);
        activityTime.setHours(activity.hour, randomInt(0, 30), 0, 0);

        const durationMinutes = randomInt(activity.duration[0], activity.duration[1]);
        const notes = activityNotes[activity.type];

        records.push({
          childId,
          activityType: activity.type,
          startTime: activityTime,
          endTime: new Date(activityTime.getTime() + durationMinutes * 60 * 1000),
          notes: maybeNote(notes),
        });
      }
    }
  }

  return records;
}

// ============================================================================
// Medicine Records
// ============================================================================

export interface MedicineData {
  childId: string;
  name: string;
  dosage: string;
  frequency: string;
  notes?: string;
  isActive: boolean;
}

export interface MedicineRecordData {
  medicineId: string;
  time: Date;
  dosageGiven: string;
  skipped: boolean;
  notes?: string;
}

export function getMedicineDefinitions(childId: string): MedicineData[] {
  return [
    {
      childId,
      name: "Vitamin D",
      dosage: "400 IU (10 mcg)",
      frequency: "Once daily",
      notes: "Give with morning feeding",
      isActive: true,
    },
    {
      childId,
      name: "Infant Tylenol",
      dosage: "2.5 mL",
      frequency: "As needed for fever/pain",
      notes: "Max 5 doses in 24 hours",
      isActive: true,
    },
  ];
}

export function generateMedicineRecords(
  medicineId: string,
  medicineName: string,
  startDate: Date,
  days: number
): MedicineRecordData[] {
  const records: MedicineRecordData[] = [];

  for (let day = 0; day < days; day++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() - day);

    if (medicineName === "Vitamin D") {
      // Daily vitamin D
      const giveTime = new Date(date);
      giveTime.setHours(7, randomInt(0, 30), 0, 0);

      // Occasionally skip (5% chance)
      const skipped = Math.random() < 0.05;

      records.push({
        medicineId,
        time: giveTime,
        dosageGiven: "400 IU",
        skipped,
        notes: skipped ? "Forgot in the morning" : undefined,
      });
    } else if (medicineName === "Infant Tylenol") {
      // As-needed - only a few times over 14 days
      if (day === 3 || day === 10) {
        const giveTime = new Date(date);
        giveTime.setHours(14, 0, 0, 0);

        records.push({
          medicineId,
          time: giveTime,
          dosageGiven: "2.5 mL",
          skipped: false,
          notes: day === 3 ? "Teething discomfort" : "After vaccinations",
        });
      }
    }
  }

  return records;
}

// ============================================================================
// Main generator function
// ============================================================================

export interface GeneratedDemoData {
  sleepRecords: SleepRecordData[];
  feedingRecords: FeedingRecordData[];
  diaperRecords: DiaperRecordData[];
  pumpingRecords: PumpingRecordData[];
  growthRecords: GrowthRecordData[];
  temperatureRecords: TemperatureRecordData[];
  activityRecords: ActivityRecordData[];
  medicines: MedicineData[];
}

export function generateAllDemoData(childId: string, days: number = 14): GeneratedDemoData {
  const now = new Date();

  return {
    sleepRecords: generateSleepRecords(childId, now, days),
    feedingRecords: generateFeedingRecords(childId, now, days),
    diaperRecords: generateDiaperRecords(childId, now, days),
    pumpingRecords: generatePumpingRecords(childId, now, days),
    growthRecords: generateGrowthRecords(childId, now, days),
    temperatureRecords: generateTemperatureRecords(childId, now, days),
    activityRecords: generateActivityRecords(childId, now, days),
    medicines: getMedicineDefinitions(childId),
  };
}
