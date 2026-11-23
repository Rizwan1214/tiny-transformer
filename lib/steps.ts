export interface StepMeta {
  id: string;
  title: string;
  formula: string;
  shape: string;
  explain: string;
}

export const STEPS: StepMeta[] = [
  {
    id: "tokenize",
    title: "Tokenization",
    formula: '"text" → [tokens]',
    shape: "string → n tokens",
    explain:
      "Sentence ko chhote tukron (tokens) mein toda jata hai. Yahan har word aur punctuation ek token hai. Real models BPE use karte hain jo lambe words ko sub-words mein bhi tod deta hai.",
  },
  {
    id: "ids",
    title: "Token IDs",
    formula: "token → vocab[token]",
    shape: "n tokens → n integers",
    explain:
      "Model text nahi samajhta, sirf numbers. Har token ko vocabulary mein uska ID milta hai. Same word ka ID hamesha same hota hai.",
  },
  {
    id: "embedding",
    title: "Embedding",
    formula: "E = EmbeddingTable[id]",
    shape: "n × 4",
    explain:
      "Har ID ek vector ban jata hai. GPT-2 mein ye 768 numbers hote hain, yahan sirf 4 taake screen par dikh sakein. Har row ek token hai, har column ek dimension.",
  },
  {
    id: "positional",
    title: "Positional Encoding",
    formula: "X = E + PE",
    shape: "n × 4",
    explain:
      'Attention ko word order ka pata nahi hota. Is liye har position ka ek sin/cos pattern add kiya jata hai, taake "cat sat" aur "sat cat" alag samjhe jayein.',
  },
  {
    id: "qkv",
    title: "Q, K, V",
    formula: "Q = X·W_Q   K = X·W_K   V = X·W_V",
    shape: "3 × (n × 4)",
    explain:
      "Har token teen roles leta hai: Query (main kya dhoond raha hoon), Key (mere paas kya hai), Value (main aage kya dunga). Teeno alag weight matrices se bante hain.",
  },
  {
    id: "scores",
    title: "Attention Scores",
    formula: "S = Q·Kᵀ / √d",
    shape: "n × n",
    explain:
      "Har Query ka har Key ke saath dot product. Bara number matlab zyada match. Causal mask on ho to koi token apne baad wale tokens nahi dekh sakta, wahan −∞ lag jata hai.",
  },
  {
    id: "softmax",
    title: "Softmax",
    formula: "A = softmax(S)  (har row)",
    shape: "n × n",
    explain:
      "Har row ko probabilities mein badla jata hai, aur har row ka total 1 hota hai. Ye attention map hai: kaun sa token kis par kitna focus kar raha hai.",
  },
  {
    id: "weighted",
    title: "Weighted Sum",
    formula: "Z = A·V",
    shape: "n × 4",
    explain:
      "Har token apne attention weights ke hisaab se doosre tokens ki Values mix karta hai. Ab har vector mein sirf apna nahi, poore sentence ka context hai.",
  },
  {
    id: "ffn",
    title: "Add & Norm + FFN",
    formula: "Y = LN(X + Z)   H = LN(Y + FFN(Y))",
    shape: "n × 4",
    explain:
      "Residual connection (X + Z) original info bachata hai, LayerNorm numbers ko stable rakhta hai, aur Feed-Forward network (4 → 8 → 4) har token ko alag se process karta hai.",
  },
  {
    id: "next",
    title: "Next Token",
    formula: "p = softmax(h_last · Eᵀ)",
    shape: "vocab probabilities",
    explain:
      "Aakhri token ka vector har vocabulary word ke embedding se compare hota hai. Jis word ki probability sab se zyada ho, wahi agla predicted word hai.",
  },
];
