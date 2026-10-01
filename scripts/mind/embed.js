let extractor = null
async function getExtractor() {
  if (extractor) return extractor
  const tf = await import('@xenova/transformers')
  tf.env.allowLocalModels = false
  extractor = await tf.pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2', { quantized: true })
  return extractor
}
async function embed(text) {
  try {
    const ex = await getExtractor()
    const out = await ex(String(text).slice(0, 512), { pooling: 'mean', normalize: true })
    return Array.from(out.data)
  } catch (e) { return null }
}
function cosine(a, b) {
  if (!a || !b || a.length !== b.length) return 0
  let s = 0, na = 0, nb = 0
  for (let i = 0; i < a.length; i++) { s += a[i] * b[i]; na += a[i] * a[i]; nb += b[i] * b[i] }
  return s / (Math.sqrt(na) * Math.sqrt(nb) || 1)
}
module.exports = { embed, cosine }
