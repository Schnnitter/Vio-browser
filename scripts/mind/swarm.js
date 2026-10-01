/* Рой агентов: запускает N копий агента параллельно на разных углах задачи. */
function splitTask(task) {
  const t = String(task || '').trim()
  if (!t) return []
  return [
    { id: 'main', role: 'главный', task: t },
    { id: 'sources', role: 'источники', task: 'Найди 3-5 лучших источников по теме: ' + t },
    { id: 'facts', role: 'факты', task: 'Собери ключевые факты по теме: ' + t },
    { id: 'critic', role: 'критик', task: 'Найди противоречия и спорные места по теме: ' + t }
  ]
}
function mergeResults(results) {
  try {
    if (!Array.isArray(results) || !results.length) return ''
    const parts = []
    for (const r of results) {
      if (!r || !r.text) continue
      parts.push('[' + (r.role || 'агент') + ']\n' + String(r.text).slice(0, 1500))
    }
    return parts.join('\n\n---\n\n')
  } catch (e) { return '' }
}
module.exports = { splitTask, mergeResults }
window.VioSwarm = { splitTask, mergeResults }
