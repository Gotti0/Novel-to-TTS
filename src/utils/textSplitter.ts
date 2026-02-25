export async function split_async(text: string, maxChars: number): Promise<string[]> {
  // 1. KSS 문장 분리 (Simulated with Regex for JS)
  const sentences = splitIntoSentences(text);
  
  if (sentences.length === 0) return [];
  if (sentences.length === 1) return chunkTextByLength(sentences[0], maxChars);

  // 2. 슬라이딩 윈도우 (Sliding Window)
  const windowSize = 2;
  const windows: string[] = [];
  for (let i = 0; i < sentences.length; i++) {
    const window = sentences.slice(i, i + windowSize).join(' ');
    windows.push(window);
  }

  // 3. 벡터 임베딩 (Vector Embedding - using TF-IDF / BoW for client-side speed)
  const embeddings = computeEmbeddings(windows);

  // 4. 유사도 (Similarity)
  const similarities: number[] = [];
  for (let i = 0; i < embeddings.length - 1; i++) {
    similarities.push(cosineSimilarity(embeddings[i], embeddings[i + 1]));
  }

  // 5. 분할점 결정 (Determine Split Points)
  const chunks: string[] = [];
  let currentChunk = sentences[0];

  for (let i = 1; i < sentences.length; i++) {
    const sentence = sentences[i];
    const sim = similarities[i - 1] || 0;
    
    // Threshold for topic change, e.g., similarity < 0.1
    const isTopicChange = sim < 0.1;
    const isOverLength = (currentChunk.length + sentence.length + 1) > maxChars;

    if (isOverLength || (isTopicChange && currentChunk.length > maxChars * 0.5)) {
      chunks.push(currentChunk);
      currentChunk = sentence;
    } else {
      currentChunk += ' ' + sentence;
    }
  }
  if (currentChunk) {
    chunks.push(currentChunk);
  }

  // Final pass to ensure no chunk exceeds maxChars (fallback)
  return chunks.flatMap(c => chunkTextByLength(c, maxChars));
}

function splitIntoSentences(text: string): string[] {
  // Basic Korean/English sentence splitter
  return text.match(/[^.!?\n]+[.!?\n]+/g)?.map(s => s.trim()).filter(Boolean) || [text];
}

function computeEmbeddings(texts: string[]): number[][] {
  // Simple Bag of Words vector embedding
  const vocab = new Set<string>();
  const tokenizedTexts = texts.map(t => {
    const tokens = t.toLowerCase().match(/[\w가-힣]+/g) || [];
    tokens.forEach(token => vocab.add(token));
    return tokens;
  });

  const vocabArray = Array.from(vocab);
  return tokenizedTexts.map(tokens => {
    const vec = new Array(vocabArray.length).fill(0);
    tokens.forEach(token => {
      const idx = vocabArray.indexOf(token);
      if (idx !== -1) vec[idx] += 1;
    });
    return vec;
  });
}

function cosineSimilarity(vecA: number[], vecB: number[]): number {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

function chunkTextByLength(text: string, maxChars: number): string[] {
  const chunks: string[] = [];
  let current = '';
  const words = text.split(' ');
  for (const word of words) {
    if ((current + ' ' + word).length > maxChars) {
      if (current) chunks.push(current.trim());
      current = word;
    } else {
      current += (current ? ' ' : '') + word;
    }
  }
  if (current) chunks.push(current.trim());
  return chunks;
}
