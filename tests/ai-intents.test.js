const assert = require('node:assert/strict')
const { ordinal, parseTypeIntent, route } = require('../scripts/ai-intents')

const table = []
function check (context, phrase, expected, got) {
  assert.deepEqual(got, expected, phrase)
  table.push([context, phrase, JSON.stringify(expected), JSON.stringify(got)])
}
function intent (phrase, text) { check('youtube.com', phrase, text, (parseTypeIntent(phrase) || {}).text) }

check('пусто', 'открой ютуб', 'https://youtube.com', route('открой ютуб', {}).target)
intent('напиши в поиск дбд', 'дбд')
intent('напиши дбд в поиск', 'дбд')
intent('введи слово дд', 'дд')
check('youtube/results', 'открой видео', 'agent', route('открой видео', { url: 'https://youtube.com/results' }).kind)
check('youtube/results', 'открой первое видео', 1, route('открой первое видео', { url: 'https://youtube.com/results' }).intent.ordinal)
check('youtube/results', 'нажми на 1 видео', 1, route('нажми на 1 видео', { url: 'https://youtube.com/results' }).intent.ordinal)
check('youtube/results', 'відкрий друге відео', 2, route('відкрий друге відео', { url: 'https://youtube.com/results' }).intent.ordinal)
check('youtube/results', 'open the third video', 3, route('open the third video', { url: 'https://youtube.com/results' }).intent.ordinal)
intent('type cats in search', 'cats')
check('google.com', 'нажми на второй результат', 2, route('нажми на второй результат', { url: 'https://google.com/search?q=x' }).intent.ordinal)
check('любая', 'відкрий ютуб', 'https://youtube.com', route('відкрий ютуб', {}).target)
check('любая', 'https://vio-browser.pages.dev/', 'https://vio-browser.pages.dev/', route('https://vio-browser.pages.dev/', {}).target)
check('пусто', 'открой видео', 'clarify', route('открой видео', {}).kind)
check('любая', 'гідхаб', 'https://github.com', route('гідхаб', {}).target)
check('youtube.com', 'назад', 'agent', route('назад', { url: 'https://youtube.com' }).kind)
check('youtube.com', 'поставь видео на паузу', 'video-control', route('поставь видео на паузу', { url: 'https://youtube.com/watch?v=x' }).intent.type)
check('youtube.com', 'закрий відео', 'video-control', route('закрий відео', { url: 'https://youtube.com/watch?v=x' }).intent.type)
check('любая', 'сколько будет 2+2*3', 'chat', route('сколько будет 2+2*3', {}).kind)
check('любая', 'привет', 'chat', route('привет', {}).kind)
intent('напиши в пошук дбд', 'дбд')
intent('введи дбд у пошуку', 'дбд')

for (const [word, expected] of [['первое', 1], ['друге', 2], ['third', 3], ['10th', 10], ['последнее', -1]]) check('ordinal', word, expected, ordinal(word))

console.log('| Контекст | Фраза | Ожидаемое | Получено |')
console.log('| --- | --- | --- | --- |')
for (const row of table) console.log('| ' + row.join(' | ') + ' |')
console.log('ai-intents: ' + table.length + ' cases passed')
