// UI strings in Roman Urdu ("ur") and English ("en").
// Placeholders like {name} are filled by `tr`.

export type Lang = "ur" | "en";
export const LANGS: { value: Lang; short: string; name: string }[] = [
  { value: "ur", short: "UR", name: "Roman Urdu" },
  { value: "en", short: "EN", name: "English" },
];

export interface Entry {
  ur: string;
  en: string;
}

const same = (s: string): Entry => ({ ur: s, en: s });

export const STRINGS = {
  // Header and navigation
  tagline: { ur: "Har step screen par, live math ke saath", en: "Every step on screen, with live math" },
  modeToy: same("Toy model"),
  modeGpt2: same("Real GPT-2"),
  sentence: same("Sentence"),
  try: same("Try:"),
  heads: same("heads"),
  mask: same("Causal mask: {state}"),
  on: same("On"),
  off: same("Off"),
  back: same("Back"),
  next: same("Next: {title}"),
  restart: { ur: "Shuru se dobara", en: "Start over" },
  stepOf: same("Step {n} / {total}"),
  pipeline: same("Pipeline"),
  language: same("Language"),

  // Step visuals
  positive: same("positive"),
  negative: same("negative"),
  legendNote: { ur: "Rang jitna gehra, number utna bara", en: "Darker color = bigger number" },
  headsNote: {
    ur: "{count} heads: har head ko {dHead} columns milte hain ({ranges}). Har head apne hisse se alag attention nikalta hai.",
    en: "{count} heads: each head gets {dHead} columns ({ranges}). Each head computes its own attention from its slice.",
  },
  rowsNote: {
    ur: "Rows = Queries (kaun dekh raha hai). Kisi row ke naam par click karo.",
    en: "Rows = queries (who is looking). Click a row's name to focus on it.",
  },
  headTitle: same("Head {n}"),
  tokensCount: { ur: "{n} tokens (is demo mein max {max})", en: "{n} tokens (max {max} in this demo)" },
  idsNote: {
    ur: "IDs ek 50,000 words wali vocabulary ke index hain (yahan hash se bane hain).",
    en: "IDs are indexes into a 50,000-word vocabulary (here they come from a hash).",
  },
  keysAxis: { ur: "Keys (kis ko dekha ja raha hai) →", en: "Keys (what is being looked at) →" },
  pickToken: { ur: "Token chuno:", en: "Pick a token:" },
  focusLine: {
    ur: "“{q}” sab se zyada “{t}” (position {pos}) ko dekh raha hai, weight {w}.",
    en: "“{q}” looks most at “{t}” (position {pos}), weight {w}.",
  },
  headsDisagree: {
    ur: "Dono heads alag tokens par focus kar rahe hain. Yahi multi-head ka faida hai: har head alag rishta pakad sakta hai.",
    en: "The heads focus on different tokens. That is the point of multi-head attention: each head can pick up a different relationship.",
  },
  headsAgree: {
    ur: "Is token ke liye dono heads ek hi token ko dekh rahe hain. Doosra token chuno, shayad wahan farq dikhe.",
    en: "For this token both heads look at the same token. Pick another one; you may see a difference there.",
  },
  calcLabel: same("Calculation"),
  calcHint: {
    ur: "Kisi bhi number par hover karo (phone par tap) aur yahan uska poora hisaab dikhega.",
    en: "Hover over any number (tap on a phone) to see exactly how it was calculated.",
  },
  randomNote: {
    ur: "Weights random hain, is liye prediction bhi random hai. Training ke baad yahi bars sahi word ko upar le aate hain.",
    en: "The weights are random, so the prediction is too. After training, these same bars would push the right word to the top.",
  },

  // Calculation panel lines
  keyAfterQuery: same("Key position {k} > query position {q}"),
  maskedFuture: { ur: "Future token, causal mask laga diya", en: "Future token, hidden by the causal mask" },
  expZero: { ur: "S = −∞, aur e^(−∞) = 0", en: "S = −∞, and e^(−∞) = 0" },
  stableSoftmax: {
    ur: "(stable softmax: har score se row ka max {m} minus kiya)",
    en: "(stable softmax: subtracted the row max {m} from every score)",
  },
  columnOfHead: { ur: "(column d{c} head {h} ka hissa hai)", en: "(column d{c} belongs to head {h})" },
  concatSingle: { ur: "Ek hi head hai, is liye Concat = Z", en: "Only one head, so Concat = Z" },
  concatColumn: { ur: "Column d{j} → head {h} ka column {c}", en: "Column d{j} → head {h}, column {c}" },
  woMix: {
    ur: "(W_O sab heads ki info ko aapas mein mix karta hai)",
    en: "(W_O mixes information across the heads)",
  },
  ffnHidden: {
    ur: "h = ReLU(Y[{tok}] · W1)   (4 → 8, negative values 0 ho jati hain)",
    en: "h = ReLU(Y[{tok}] · W1)   (4 → 8, negative values become 0)",
  },

  // GPT-2 explorer
  gptLoading: { ur: "GPT-2 data load ho raha hai…", en: "Loading GPT-2 data…" },
  gptError: { ur: "GPT-2 data load nahi hua: {e}", en: "Couldn't load GPT-2 data: {e}" },
  gptIntroBefore: {
    ur: "Ye asli, trained GPT-2 hai. Iske numbers pehle se nikale gaye hain (",
    en: "This is the real, trained GPT-2. Its numbers were computed ahead of time (",
  },
  gptIntroAfter: {
    ur: "), is liye sirf neeche wale sentences chalte hain. 768 dimensions screen par nahi aa sakte, is liye yahan tokens, attention aur predictions dikhaye gaye hain.",
    en: "), so only the sentences below work. 768 dimensions don't fit on a screen, so this shows the tokens, attention and predictions.",
  },
  gptTokensTitle: same("1. BPE tokens"),
  gptTokensHelp: {
    ur: "· ka matlab hai token ke shuru mein space hai. Har token ke neeche: uska ID, aur us jagah GPT-2 ne agla token kya socha tha.",
    en: "· marks a leading space. Under each token: its ID, and what GPT-2 expected next at that point.",
  },
  gptGuessTitle: { ur: "GPT-2 ka is position par agla guess", en: "GPT-2's next-token guess at this position" },
  gptLookTitle: { ur: "2. Kya dekhna hai", en: "2. What to look for" },
  gptTopHeads: {
    ur: "“{q}” → “{t}” sab se zyada dekhne wale heads:",
    en: "Heads that attend most from “{q}” to “{t}”:",
  },
  gptAttentionTitle: same("3. Attention: 144 heads"),
  gptHeadMapHelp: {
    ur: "Bayen wala grid har layer aur head ke liye batata hai ke “{q}” kitna “{t}” ko dekh raha hai. Kisi head par click karo to dayen uska poora attention map khulega. Map mein kisi cell par click karo to woh token pair chun liya jayega.",
    en: "The grid on the left shows, for every layer and head, how much “{q}” attends to “{t}”. Click a head to open its full attention map on the right. Click a cell in the map to choose that token pair.",
  },
  gptMapAxes: same("Rows = Queries, columns = Keys. Values .xx = 0.xx"),
  gptNextTitle: { ur: "4. Agla token", en: "4. Next token" },
  gptVocabNote: {
    ur: "Ye 50,257 tokens ki vocabulary mein se top 10 hain. Toy model ke ulat, ye weights trained hain, is liye predictions matlab rakhti hain.",
    en: "These are the top 10 of a 50,257-token vocabulary. Unlike the toy model, these weights are trained, so the predictions mean something.",
  },
} satisfies Record<string, Entry>;

export type StringKey = keyof typeof STRINGS;

/** Looks up a string and fills its {placeholders}. */
export function tr(lang: Lang, key: StringKey, vars: Record<string, string | number> = {}): string {
  return STRINGS[key][lang].replace(/\{(\w+)\}/g, (m, name: string) => (name in vars ? String(vars[name]) : m));
}

/** Picks the right language from an Entry. */
export function pick(lang: Lang, entry: Entry): string {
  return entry[lang];
}
