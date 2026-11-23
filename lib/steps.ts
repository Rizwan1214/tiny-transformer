import type { Entry } from "./i18n";

export interface StepMeta {
  id: string;
  title: string;
  formula: Entry;
  shape: Entry;
  explain: Entry;
}

const same = (s: string): Entry => ({ ur: s, en: s });

export const STEPS: StepMeta[] = [
  {
    id: "tokenize",
    title: "Tokenization",
    formula: same('"text" → [tokens]'),
    shape: same("string → n tokens"),
    explain: {
      ur: "Sentence ko chhote tukron (tokens) mein toda jata hai. Yahan har word aur punctuation ek token hai. Real models BPE use karte hain jo lambe words ko sub-words mein bhi tod deta hai.",
      en: "The sentence is split into small pieces called tokens. Here every word and punctuation mark is a token. Real models use BPE, which also splits long words into sub-words.",
    },
  },
  {
    id: "ids",
    title: "Token IDs",
    formula: same("token → vocab[token]"),
    shape: same("n tokens → n integers"),
    explain: {
      ur: "Model text nahi samajhta, sirf numbers. Har token ko vocabulary mein uska ID milta hai. Same word ka ID hamesha same hota hai.",
      en: "The model doesn't understand text, only numbers. Each token gets its ID in the vocabulary. The same word always gets the same ID.",
    },
  },
  {
    id: "embedding",
    title: "Embedding",
    formula: same("E = EmbeddingTable[id]"),
    shape: same("n × 4"),
    explain: {
      ur: "Har ID ek vector ban jata hai. GPT-2 mein ye 768 numbers hote hain, yahan sirf 4 taake screen par dikh sakein. Har row ek token hai, har column ek dimension.",
      en: "Each ID becomes a vector. In GPT-2 that's 768 numbers; here it's just 4 so it fits on screen. Each row is a token, each column a dimension.",
    },
  },
  {
    id: "positional",
    title: "Positional Encoding",
    formula: same("X = E + PE"),
    shape: same("n × 4"),
    explain: {
      ur: 'Attention ko word order ka pata nahi hota. Is liye har position ka ek sin/cos pattern add kiya jata hai, taake "cat sat" aur "sat cat" alag samjhe jayein.',
      en: 'Attention has no sense of word order. So a sin/cos pattern is added for each position, which makes "cat sat" and "sat cat" different.',
    },
  },
  {
    id: "qkv",
    title: "Q, K, V",
    formula: same("Q = X·W_Q   K = X·W_K   V = X·W_V"),
    shape: same("3 × (n × 4)"),
    explain: {
      ur: "Har token teen roles leta hai: Query (main kya dhoond raha hoon), Key (mere paas kya hai), Value (main aage kya dunga). Teeno alag weight matrices se bante hain. Multi-head mein ye columns heads mein baant diye jate hain.",
      en: "Each token plays three roles: Query (what am I looking for), Key (what do I have), Value (what will I pass on). Each comes from its own weight matrix. With several heads, these columns are split between them.",
    },
  },
  {
    id: "scores",
    title: "Attention Scores",
    formula: same("S_h = Q_h·K_hᵀ / √d_head"),
    shape: { ur: "n × n  (har head ka apna)", en: "n × n  (one per head)" },
    explain: {
      ur: "Har Query ka har Key ke saath dot product. Bara number matlab zyada match. Har head ye kaam apne hisse ke columns par alag karta hai. Causal mask on ho to koi token apne baad wale tokens nahi dekh sakta, wahan −∞ lag jata hai.",
      en: "Every query is dot-multiplied with every key. A bigger number means a better match. Each head does this separately on its own columns. With the causal mask on, a token can't see the tokens after it; those get −∞.",
    },
  },
  {
    id: "softmax",
    title: "Softmax",
    formula: { ur: "A_h = softmax(S_h)  (har row)", en: "A_h = softmax(S_h)  (each row)" },
    shape: { ur: "n × n  (har head ka apna)", en: "n × n  (one per head)" },
    explain: {
      ur: "Har row ko probabilities mein badla jata hai, aur har row ka total 1 hota hai. Ye attention map hai: kaun sa token kis par kitna focus kar raha hai. 2 heads hon to dono ke maps compare karo, aksar wo alag tokens dekhte hain.",
      en: "Each row is turned into probabilities that add up to 1. This is the attention map: how much each token focuses on every other token. With 2 heads, compare their maps; they often look at different tokens.",
    },
  },
  {
    id: "weighted",
    title: "Weighted Sum",
    formula: same("Z_h = A_h·V_h   O = Concat(Z_h)·W_O"),
    shape: same("n × 4"),
    explain: {
      ur: "Har head apne attention weights se Values mix karta hai (Z_h). Phir sab heads ke Z ko saath jod kar (Concat) W_O se multiply karte hain, jo un ki info ko aapas mein milata hai. Ab har vector mein poore sentence ka context hai.",
      en: "Each head mixes the Values using its attention weights (Z_h). The heads' outputs are then joined (Concat) and multiplied by W_O, which mixes their information. Now every vector carries context from the whole sentence.",
    },
  },
  {
    id: "ffn",
    title: "Add & Norm + FFN",
    formula: same("Y = LN(X + O)   H = LN(Y + FFN(Y))"),
    shape: same("n × 4"),
    explain: {
      ur: "Residual connection (X + O) original info bachata hai, LayerNorm numbers ko stable rakhta hai, aur Feed-Forward network (4 → 8 → 4) har token ko alag se process karta hai.",
      en: "The residual connection (X + O) keeps the original information, LayerNorm keeps the numbers stable, and the feed-forward network (4 → 8 → 4) processes each token on its own.",
    },
  },
  {
    id: "next",
    title: "Next Token",
    formula: same("p = softmax(h_last · Eᵀ)"),
    shape: same("vocab probabilities"),
    explain: {
      ur: "Aakhri token ka vector har vocabulary word ke embedding se compare hota hai. Jis word ki probability sab se zyada ho, wahi agla predicted word hai.",
      en: "The last token's vector is compared with every vocabulary word's embedding. The word with the highest probability is the predicted next word.",
    },
  },
];
