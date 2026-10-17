// Decides which datasets and how much history a question needs, so the
// AI only receives the minimum relevant records.

export type Topic = "habits" | "sleep" | "steps" | "water" | "workouts" | "meditation" | "food";
export const ALL_TOPICS: Topic[] = ["habits", "sleep", "steps", "water", "workouts", "meditation", "food"];

const TOPIC_WORDS: Record<Topic, RegExp> = {
  habits: /\bhabit|consisten|streak|routine|complet|read(ing)?\b|study|learn/i,
  sleep: /sleep|slept|\bbed\b|rest\b|tired|night/i,
  steps: /\bsteps?\b|walk/i,
  water: /water|hydrat|drink/i,
  workouts: /workout|exercis|gym|\brun|football|cycl|train|fitness|sport|active|activity/i,
  meditation: /meditat|mindful|calm|breath/i,
  food: /food|\beat|\bate\b|meal|breakfast|lunch|dinner|snack|diet|nutrition|healthy/i,
};
const BROAD = /summar|overall|progress|everything|all my|week|compare|pattern|trend|improv|change|consisten|how am i|how did i|doing/i;

/** Picks only the datasets the question needs. Broad questions get all of them. */
export function detectTopics(question: string): Topic[] {
  const hits = ALL_TOPICS.filter((t) => TOPIC_WORDS[t].test(question));
  const namesSpecific = /\bhabit|sleep|slept|\bsteps?\b|water|hydrat|workout|exercis|gym|meditat|food|\beat|\bate\b|meal|breakfast|lunch|dinner|snack/i.test(question);
  if (hits.length === 0 || (BROAD.test(question) && !namesSpecific)) return ALL_TOPICS;
  return hits;
}

/** How many days of history to retrieve (capped at 90). */
export function detectWindowDays(question: string): number {
  const q = question.toLowerCase();
  if (/\b(year|all[- ]time|ever|since i started|90 days|three months|3 months|quarter)\b/.test(q)) return 90;
  if (/\b(month|30 days|four weeks|4 weeks)\b/.test(q)) return 35;
  if (/\b(today|yesterday)\b/.test(q) && !/\bweek\b/.test(q)) return 7;
  if (/\bweek\b/.test(q)) return 14;
  return 28;
}
